import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserFromApiRequest } from '@/lib/server-auth'
import { GameStateResponse } from '@/lib/types'

export async function GET(
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

    // Get player names
    const { data: player1 } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', game.player1_id)
      .single()

    const { data: player2 } = game.player2_id ? await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', game.player2_id)
      .single() : { data: null }

    const gameWithNames = {
      ...game,
      player1_name: player1?.display_name || null,
      player2_name: player2?.display_name || null,
    }

    // If game is active, get current question and answers
    let currentQuestion = null
    let questionId = null
    let player1Answer = null
    let player2Answer = null

    if (game.status === 'active' && game.current_question_index < game.total_questions) {
      // Get current question
      const { data: gameQuestion } = await supabase
        .from('head_to_head_game_questions')
        .select(`
          *,
          questions (*)
        `)
        .eq('game_id', gameId)
        .eq('question_index', game.current_question_index)
        .single()

      if (gameQuestion) {
        questionId = gameQuestion.question_id
        currentQuestion = (gameQuestion.questions as any)
      }

      // Get answers for current question
      if (questionId) {
        const { data: answers } = await supabase
          .from('head_to_head_game_answers')
          .select('*')
          .eq('game_id', gameId)
          .eq('question_id', questionId)

        if (answers) {
          player1Answer = answers.find(a => a.user_id === game.player1_id) || null
          player2Answer = answers.find(a => a.user_id === game.player2_id) || null
        }
      }
    }

    const response: GameStateResponse = {
      game: gameWithNames,
      current_question: currentQuestion || undefined,
      question_id: questionId || undefined,
      player1_answer: player1Answer || undefined,
      player2_answer: player2Answer || undefined,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching game state:', error)
    return NextResponse.json(
      { error: 'Failed to fetch game state' },
      { status: 500 }
    )
  }
}
