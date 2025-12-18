import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserFromApiRequest } from '@/lib/server-auth'
import { GameStateResponse } from '@/lib/types'

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
    if (game.player1_id !== user.id && game.player2_id !== user.id) {
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

    // Check if both players have answered the current question
    const currentQuestionIndex = game.current_question_index
    if (currentQuestionIndex >= game.total_questions) {
      // Game is complete
      const { data: completedGame } = await supabase
        .from('head_to_head_games')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', gameId)
        .select()
        .single()

      return NextResponse.json({
        game: completedGame,
        game_complete: true,
      })
    }

    // Get current question
    const { data: gameQuestion } = await supabase
      .from('head_to_head_game_questions')
      .select(`
        *,
        questions (*)
      `)
      .eq('game_id', gameId)
      .eq('question_index', currentQuestionIndex)
      .single()

    if (!gameQuestion) {
      return NextResponse.json(
        { error: 'Current question not found' },
        { status: 404 }
      )
    }

    const questionId = gameQuestion.question_id

    // Get answers for current question
    const { data: answers } = await supabase
      .from('head_to_head_game_answers')
      .select('*')
      .eq('game_id', gameId)
      .eq('question_id', questionId)

    const player1Answer = answers?.find(a => a.user_id === game.player1_id)
    const player2Answer = answers?.find(a => a.user_id === game.player2_id)

    // Check if both players have answered
    const bothAnswered = player1Answer && player2Answer

    if (bothAnswered) {
      // Move to next question
      const nextIndex = currentQuestionIndex + 1
      const isComplete = nextIndex >= game.total_questions

      const updateData: any = {
        current_question_index: nextIndex,
      }

      if (isComplete) {
        updateData.status = 'completed'
        updateData.completed_at = new Date().toISOString()
      }

      const { data: updatedGame } = await supabase
        .from('head_to_head_games')
        .update(updateData)
        .eq('id', gameId)
        .select()
        .single()

      // Get next question if not complete
      let nextQuestion = null
      let nextQuestionId = null

      if (!isComplete) {
        const { data: nextGameQuestion } = await supabase
          .from('head_to_head_game_questions')
          .select(`
            *,
            questions (*)
          `)
          .eq('game_id', gameId)
          .eq('question_index', nextIndex)
          .single()

        if (nextGameQuestion) {
          nextQuestionId = nextGameQuestion.question_id
          nextQuestion = (nextGameQuestion.questions as any)
        }
      }

      return NextResponse.json({
        game: updatedGame,
        current_question: nextQuestion || undefined,
        question_id: nextQuestionId || undefined,
        game_complete: isComplete,
      })
    } else {
      // Return current question state
      const currentQuestion = (gameQuestion.questions as any)

      return NextResponse.json({
        game,
        current_question: currentQuestion,
        question_id: questionId,
        player1_answer: player1Answer || undefined,
        player2_answer: player2Answer || undefined,
        waiting_for_answers: true,
      })
    }
  } catch (error) {
    console.error('Error moving to next question:', error)
    return NextResponse.json(
      { error: 'Failed to move to next question' },
      { status: 500 }
    )
  }
}
