import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserFromApiRequest } from '@/lib/server-auth'

export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const user = await getUserFromApiRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { questionId } = body

    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Check if question exists
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('id')
      .eq('id', questionId)
      .single()

    if (questionError || !question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // Check if user already submitted a review for this question
    const { data: existingReview } = await supabase
      .from('rabinic_reviews')
      .select('id')
      .eq('question_id', questionId)
      .eq('submitted_by', user.id)
      .single()

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already submitted this question for review' },
        { status: 400 }
      )
    }

    // Create review submission
    const { data: review, error: reviewError } = await supabase
      .from('rabinic_reviews')
      .insert({
        question_id: questionId,
        submitted_by: user.id,
        review_status: 'pending',
      })
      .select('id')
      .single()

    if (reviewError) {
      console.error('Error creating review:', reviewError)
      return NextResponse.json(
        { error: 'Failed to submit question for review' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Question submitted for Rabbinic Review',
      reviewId: review.id,
    })
  } catch (error) {
    console.error('Error submitting review:', error)
    return NextResponse.json(
      { error: 'Failed to submit question for review' },
      { status: 500 }
    )
  }
}
