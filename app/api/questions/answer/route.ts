import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { calculatePoints, calculateTier } from '@/lib/utils'
import { AnswerRequest, AnswerResponse } from '@/lib/types'
import { getUserFromApiRequest } from '@/lib/server-auth'

export async function POST(request: NextRequest) {
  try {
    const body: AnswerRequest = await request.json()
    const { question, selectedAnswer, questionId } = body

    // Get user from session
    const user = await getUserFromApiRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      )
    }
    const userId = user.id

    const supabase = createServerClient()
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const correct = selectedAnswer === question.correct_answer
    const { pointsEarned, streakBonus, newStreak } = calculatePoints(
      correct,
      profile.streak,
      question.difficulty // Pass difficulty to calculate points
    )

    const newTotalPoints = Math.max(0, profile.points + pointsEarned)
    const newTier = calculateTier(newTotalPoints)

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        points: newTotalPoints,
        tier: newTier,
        streak: newStreak,
        questions_answered: profile.questions_answered + 1,
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Update question stats if questionId is provided
    if (questionId) {
      // Fetch current stats
      const { data: questionData } = await supabase
        .from('questions')
        .select('times_answered, times_correct')
        .eq('id', questionId)
        .single()

      if (questionData) {
        const updates: any = {
          times_answered: (questionData.times_answered || 0) + 1,
        }
        if (correct) {
          updates.times_correct = (questionData.times_correct || 0) + 1
        }
        
        await supabase
          .from('questions')
          .update(updates)
          .eq('id', questionId)
      }
    }

    const response: AnswerResponse = {
      correct,
      pointsEarned,
      newTotalPoints,
      newTier,
      streak: newStreak,
      streakBonus,
      explanation: question.explanation,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error processing answer:', error)
    return NextResponse.json(
      { error: 'Failed to process answer' },
      { status: 500 }
    )
  }
}

