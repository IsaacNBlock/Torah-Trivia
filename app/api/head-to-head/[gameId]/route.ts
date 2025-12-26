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

    // Normalize function for ID comparison (define early for use in retry logic)
    const normalizeId = (id: any): string | null => {
      if (!id) return null
      return String(id).trim().toLowerCase().replace(/-/g, '')
    }
    const userId = normalizeId(user.id)

    // Get the game - with aggressive retry logic to handle read replica lag
    let game = null
    let gameError = null
    const maxRetries = 5
    const baseDelay = 500 // Start with 500ms, increase with each retry
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Create a fresh client for each attempt to ensure clean connection
      const freshSupabase = createServerClient()
      const result = await freshSupabase
        .from('head_to_head_games')
        .select('*')
        .eq('id', gameId)
        .single()
      
      game = result.data
      gameError = result.error
      
      if (gameError && gameError.code !== 'PGRST116') {
        // Real error (not "not found"), log and break
        console.error(`Game fetch error on attempt ${attempt + 1}:`, gameError)
        break
      }
      
      if (!game) {
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * (attempt + 1)
          console.log(`Game not found on attempt ${attempt + 1}, retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        console.error('Game not found after all retries:', gameError)
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        )
      }
      
      const player1Id = normalizeId(game.player1_id)
      const isPlayer1 = userId === player1Id
      
      // If player2_id is set, we can proceed (for both player1 and player2)
      if (game.player2_id) {
        if (isPlayer1) {
          // Player1 can see the game once player2 has joined
          console.log(`Attempt ${attempt + 1}: User is player1 (${user.id}), player2_id is set (${game.player2_id})`)
          break
        } else {
          // Check if player2_id matches the user
          const player2Id = normalizeId(game.player2_id)
          if (userId === player2Id) {
            console.log(`Attempt ${attempt + 1}: Game fetched successfully, player2_id matches user`)
            break
          } else {
            // player2_id is set but doesn't match - this user is not authorized
            console.log(`Attempt ${attempt + 1}: player2_id is set (${game.player2_id}) but doesn't match user (${user.id})`)
            break
          }
        }
      }
      
      // If we get here, player2_id is null
      // If user is player1, this is expected initially, but we should still retry to see if player2 has joined
      // If user is not player1, this might be a race condition
      const gameAge = game.created_at ? Date.now() - new Date(game.created_at).getTime() : Infinity
      const isRecentGame = gameAge < 10000 // Less than 10 seconds old
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * (attempt + 1) // 500ms, 1000ms, 1500ms, 2000ms, 2500ms
        if (isPlayer1) {
          console.log(`Attempt ${attempt + 1}: User is player1 (${user.id}), player2_id is null - retrying to check if player2 has joined...`)
        } else {
          console.log(`Attempt ${attempt + 1}: Game found but player2_id is null for user ${user.id}. Game age: ${gameAge}ms, isRecent: ${isRecentGame}. Retrying in ${delay}ms...`)
        }
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        // On final attempt, if user is player1, it's okay if player2_id is still null (they're waiting)
        if (isPlayer1) {
          console.log(`Max retries reached: User is player1, player2_id still null (waiting for player2 to join)`)
          break
        } else {
          console.error(`Max retries (${maxRetries}) reached, player2_id still null:`, {
            gameId: game.id,
            userId: user.id,
            player1Id: game.player1_id,
            player2Id: game.player2_id,
            gameAge: gameAge,
            isRecentGame: isRecentGame,
            attempts: maxRetries,
          })
          // If game is very recent (created < 5 seconds ago), allow access as a workaround
          if (isRecentGame && gameAge < 5000) {
            console.warn('Game is very recent (< 5s), allowing access despite player2_id being null (race condition workaround)')
          }
        }
      }
    }
    
    if (gameError || !game) {
      console.error('Game fetch error after retries:', gameError)
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
    // Recompute player IDs after retry loop (game object might have been updated)
    let finalPlayer1Id = normalizeId(game.player1_id)
    let finalPlayer2Id = normalizeId(game.player2_id)
    
    // Also do direct string comparison (case-insensitive) in case normalization doesn't work
    const directMatchPlayer1 = game.player1_id && String(user.id).toLowerCase().trim() === String(game.player1_id).toLowerCase().trim()
    let directMatchPlayer2 = game.player2_id && String(user.id).toLowerCase().trim() === String(game.player2_id).toLowerCase().trim()
    
    // Check if user might have just joined but the update isn't visible yet
    // This is a workaround for read replica lag or RLS issues
    let allowAccessAsWorkaround = false
    if (!game.player2_id && userId !== finalPlayer1Id && game.status === 'waiting') {
      // Try a direct query to verify if this user is actually player2
      // Sometimes the initial query doesn't see the update, but a direct query will
      console.log('player2_id is null but user is not player1, doing direct verification query...')
      const { data: directGameCheck } = await supabase
        .from('head_to_head_games')
        .select('player2_id')
        .eq('id', gameId)
        .eq('player2_id', user.id)
        .single()
      
      if (directGameCheck && directGameCheck.player2_id) {
        console.warn('Direct query found user as player2! Updating game object:', {
          userId: user.id,
          gameId: game.id,
          foundPlayer2Id: directGameCheck.player2_id,
        })
        // Update the game object with the found player2_id
        game.player2_id = directGameCheck.player2_id
        // Recompute player2Id and directMatchPlayer2 after updating game object
        finalPlayer2Id = normalizeId(directGameCheck.player2_id)
        directMatchPlayer2 = String(user.id).toLowerCase().trim() === String(directGameCheck.player2_id).toLowerCase().trim()
        if (userId === finalPlayer2Id || directMatchPlayer2) {
          console.log('Verified: User is player2 via direct query')
          allowAccessAsWorkaround = true
        }
      } else {
        // Check if game was recently updated (within last 60 seconds)
        // This suggests a join might have just happened
        const updatedAt = game.updated_at ? new Date(game.updated_at).getTime() : null
        const now = Date.now()
        const timeSinceUpdate = updatedAt ? now - updatedAt : Infinity
        
        if (timeSinceUpdate < 60000) { // 60 seconds
          console.warn('Workaround: Allowing access despite player2_id being null (recent update)', {
            userId: user.id,
            gameId: game.id,
            timeSinceUpdate,
            gameStatus: game.status,
          })
          allowAccessAsWorkaround = true
        }
      }
    }
    
    const isAuthorized = (userId === finalPlayer1Id) || (userId === finalPlayer2Id) || directMatchPlayer1 || directMatchPlayer2 || allowAccessAsWorkaround
    
    console.log('Authorization check:', {
      userId,
      player1Id: finalPlayer1Id,
      player2Id: finalPlayer2Id,
      gameId: game.id,
      isAuthorized,
      allowAccessAsWorkaround,
      directMatchPlayer1,
      directMatchPlayer2,
      rawUserId: user.id,
      rawPlayer1Id: game.player1_id,
      rawPlayer2Id: game.player2_id,
      gameUpdatedAt: game.updated_at,
      userIdType: typeof user.id,
      player1IdType: typeof game.player1_id,
      player2IdType: typeof game.player2_id,
    })
    
    if (!isAuthorized) {
      console.error('Authorization failed - detailed comparison:', {
        userId,
        player1Id: finalPlayer1Id,
        player2Id: finalPlayer2Id,
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
            player1Id: finalPlayer1Id,
            player2Id: finalPlayer2Id,
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


