import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { calculatePoints, calculateTier } from '@/lib/utils'
import { AnswerRequest, AnswerResponse, Tier } from '@/lib/types'
import { getUserFromApiRequest } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

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
    
    // Get the tier for this question (from database if questionId exists, otherwise infer from difficulty)
    let questionTier: Tier = profile.tier // Default to user's tier
    if (questionId) {
      const { data: questionData } = await supabase
        .from('questions')
        .select('tier')
        .eq('id', questionId)
        .single()
      
      if (questionData?.tier) {
        questionTier = questionData.tier as Tier
      } else {
        // Fallback: infer tier from difficulty
        const difficultyToTier: Record<string, Tier> = {
          'easy': 'Beginner',
          'medium': 'Student',
          'hard': 'Scholar', // Default hard to Scholar (Chacham also uses hard)
        }
        questionTier = difficultyToTier[question.difficulty] || profile.tier
      }
    } else {
      // No questionId - infer tier from difficulty
      const difficultyToTier: Record<string, Tier> = {
        'easy': 'Beginner',
        'medium': 'Student',
        'hard': 'Scholar', // Default hard to Scholar
      }
      questionTier = difficultyToTier[question.difficulty] || profile.tier
    }
    
    // Use the question's tier to determine points (each tier has different point values)
    const { pointsEarned, streakBonus, newStreak } = calculatePoints(
      correct,
      profile.streak,
      questionTier // Pass question's tier to calculate points
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

    // Check if user is a paid member
    const isPaidMember = profile.plan === 'pro' && profile.subscription_status === 'active'

    // Fetch premium content if questionId is provided
    let premiumExplanation: string | undefined = undefined
    let sources: any[] | undefined = undefined

    if (questionId) {
      // Fetch current stats and premium content
      const { data: questionData } = await supabase
        .from('questions')
        .select('times_answered, times_correct, premium_explanation, sources')
        .eq('id', questionId)
        .single()

      if (questionData) {
        // Update question stats
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

        // Only include premium content for paid members
        if (isPaidMember) {
          premiumExplanation = questionData.premium_explanation || undefined
          sources = questionData.sources || undefined
        }

        // Save user answer to user_answers table
        await supabase
          .from('user_answers')
          .insert({
            user_id: userId,
            question_id: questionId,
            selected_answer: selectedAnswer,
            correct: correct,
            points_earned: pointsEarned,
          })
      }
    }

    // Save points history
    await supabase
      .from('points_history')
      .insert({
        user_id: userId,
        points: newTotalPoints,
        points_change: pointsEarned,
      })

    const response: AnswerResponse = {
      correct,
      pointsEarned,
      newTotalPoints,
      newTier,
      streak: newStreak,
      streakBonus,
      explanation: question.explanation,
      ...(isPaidMember && premiumExplanation && { premium_explanation: premiumExplanation }),
      ...(isPaidMember && sources && sources.length > 0 && { sources: sources }),
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




