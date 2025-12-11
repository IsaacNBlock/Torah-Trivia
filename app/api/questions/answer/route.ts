import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { calculatePoints, calculateTier } from '@/lib/utils'
import { AnswerRequest, AnswerResponse } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body: AnswerRequest = await request.json()
    const { question, selectedAnswer } = body

    // TODO: Get user from session/auth
    // For now, using placeholder user ID
    const userId = 'placeholder-user-id'

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
      profile.streak
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

