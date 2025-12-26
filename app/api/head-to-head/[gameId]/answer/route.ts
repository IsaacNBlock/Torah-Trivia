import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserFromApiRequest } from '@/lib/server-auth'
import { SubmitGameAnswerRequest, SubmitGameAnswerResponse } from '@/lib/types'
import { getTierPoints } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    // Get user from session
    const user = await getUserFromApiRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()
    const gameId = params.gameId

    // Get the game
    const { data: game, error: gameError } = await supabase
      .from('head_to_head_games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    // Verify user is a player in this game
    // Normalize UUIDs for comparison (handle case differences and whitespace)
    const normalizeId = (id: any): string | null => {
      if (!id) return null
      return String(id).trim().toLowerCase()
    }
    
    const userId = normalizeId(user.id)
    const player1Id = normalizeId(game.player1_id)
    const player2Id = normalizeId(game.player2_id)
    
    if (userId !== player1Id && userId !== player2Id) {
      console.error('Authorization failed:', {
        userId,
        player1Id,
        player2Id,
        gameId: game.id,
      })
      return NextResponse.json(
        { error: 'Unauthorized - you are not a player in this game' },
        { status: 403 }
      )
    }

    // Check if game is active
    if (game.status !== 'active') {
      return NextResponse.json(
        { error: 'Game is not active' },
        { status: 400 }
      )
    }

    // Get request body
    const body: SubmitGameAnswerRequest = await request.json()
    const { question_id, selected_answer } = body

    if (!question_id || !selected_answer) {
      return NextResponse.json(
        { error: 'question_id and selected_answer are required' },
        { status: 400 }
      )
    }

    // Get the question
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', question_id)
      .single()

    if (questionError || !question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // Get game question to get points value
    const { data: gameQuestion, error: gameQuestionError } = await supabase
      .from('head_to_head_game_questions')
      .select('points')
      .eq('game_id', gameId)
      .eq('question_id', question_id)
      .single()

    if (gameQuestionError || !gameQuestion) {
      return NextResponse.json(
        { error: 'Game question not found' },
        { status: 404 }
      )
    }

    // Check if user already answered this question
    const { data: existingAnswer } = await supabase
      .from('head_to_head_game_answers')
      .select('*')
      .eq('game_id', gameId)
      .eq('question_id', question_id)
      .eq('user_id', user.id)
      .single()

    if (existingAnswer) {
      return NextResponse.json(
        { error: 'You have already answered this question' },
        { status: 400 }
      )
    }

    // Check if answer is correct
    const correct = selected_answer === question.correct_answer
    const pointsEarned = correct ? gameQuestion.points : 0

    // Save answer
    const { data: answer, error: answerError } = await supabase
      .from('head_to_head_game_answers')
      .insert({
        game_id: gameId,
        question_id: question_id,
        user_id: user.id,
        selected_answer: selected_answer,
        correct: correct,
        points_earned: pointsEarned,
      })
      .select()
      .single()

    if (answerError || !answer) {
      console.error('Error saving answer:', answerError)
      return NextResponse.json(
        { error: 'Failed to save answer' },
        { status: 500 }
      )
    }

    // Update player score
    const isPlayer1 = normalizeId(game.player1_id) === userId
    const updateField = isPlayer1 ? 'player1_score' : 'player2_score'
    const newScore = (isPlayer1 ? game.player1_score : game.player2_score) + pointsEarned

    const { data: updatedGame, error: updateError } = await supabase
      .from('head_to_head_games')
      .update({
        [updateField]: newScore,
      })
      .eq('id', gameId)
      .select()
      .single()

    if (updateError || !updatedGame) {
      console.error('Error updating game score:', updateError)
      // Continue anyway - answer is saved
    }

    const response: SubmitGameAnswerResponse = {
      correct,
      points_earned: pointsEarned,
      game: updatedGame || game,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error submitting answer:', error)
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status: 500 }
    )
  }
}


