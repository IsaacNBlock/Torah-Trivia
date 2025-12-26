import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserFromApiRequest } from '@/lib/server-auth'
import { GameStateResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

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

    console.log('GET route - User retrieved:', {
      userId: user.id,
      userIdType: typeof user.id,
      userEmail: user.email,
      userObject: JSON.stringify(user),
    })

    const supabase = createServerClient()
    const gameId = params.gameId

    // Get the game
    const { data: game, error: gameError } = await supabase
      .from('head_to_head_games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      console.error('Game fetch error:', gameError)
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    console.log('Fetched game from DB:', {
      gameId: game.id,
      player1_id: game.player1_id,
      player2_id: game.player2_id,
      status: game.status,
    })

    // Verify user is a player in this game
    // Normalize UUIDs for comparison - handle multiple formats
    const normalizeId = (id: any): string | null => {
      if (!id) return null
      // Convert to string, normalize to lowercase, trim whitespace
      let normalized = String(id).trim().toLowerCase()
      // Remove hyphens for comparison (UUIDs can be stored with or without hyphens)
      normalized = normalized.replace(/-/g, '')
      return normalized || null
    }
    
    const userId = normalizeId(user.id)
    const player1Id = normalizeId(game.player1_id)
    const player2Id = normalizeId(game.player2_id)
    
    // Also do direct string comparison (case-insensitive) in case normalization doesn't work
    const directMatchPlayer1 = game.player1_id && String(user.id).toLowerCase().trim() === String(game.player1_id).toLowerCase().trim()
    const directMatchPlayer2 = game.player2_id && String(user.id).toLowerCase().trim() === String(game.player2_id).toLowerCase().trim()
    
    const isAuthorized = (userId === player1Id) || (userId === player2Id) || directMatchPlayer1 || directMatchPlayer2
    
    console.log('Authorization check:', {
      userId,
      player1Id,
      player2Id,
      gameId: game.id,
      isAuthorized,
      directMatchPlayer1,
      directMatchPlayer2,
      rawUserId: user.id,
      rawPlayer1Id: game.player1_id,
      rawPlayer2Id: game.player2_id,
      userIdType: typeof user.id,
      player1IdType: typeof game.player1_id,
      player2IdType: typeof game.player2_id,
    })
    
    if (!isAuthorized) {
      console.error('Authorization failed - detailed comparison:', {
        userId,
        player1Id,
        player2Id,
        gameId: game.id,
        directMatchPlayer1,
        directMatchPlayer2,
        userIdType: typeof user.id,
        player1IdType: typeof game.player1_id,
        player2IdType: typeof game.player2_id,
        rawUserId: user.id,
        rawPlayer1Id: game.player1_id,
        rawPlayer2Id: game.player2_id,
        userIdLength: String(user.id).length,
        player1IdLength: game.player1_id ? String(game.player1_id).length : 0,
        player2IdLength: game.player2_id ? String(game.player2_id).length : 0,
      })
      return NextResponse.json(
        { 
          error: 'Unauthorized - you are not a player in this game',
          // Always include debug info to help diagnose issues
          debug: {
            userId,
            player1Id,
            player2Id,
            rawUserId: user.id,
            rawPlayer1Id: game.player1_id,
            rawPlayer2Id: game.player2_id,
            isAuthorized,
            directMatchPlayer1,
            directMatchPlayer2,
          }
        },
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


