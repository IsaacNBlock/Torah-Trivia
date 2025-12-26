import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserFromApiRequest } from '@/lib/server-auth'

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

    // Verify user is a player in this game
    // Normalize UUIDs for comparison (handle case differences, whitespace, and hyphens)
    // Match the normalization used in the GET route for consistency
    const normalizeId = (id: any): string | null => {
      if (!id) return null
      return String(id).trim().toLowerCase().replace(/-/g, '')
    }
    
    const userId = normalizeId(user.id)

    // Get the game - with retry logic to handle read replica lag
    let game = null
    let gameError = null
    const maxRetries = 3
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = await supabase
        .from('head_to_head_games')
        .select('*')
        .eq('id', gameId)
        .single()
      
      game = result.data
      gameError = result.error
      
      if (!gameError && game) {
        // Check if player2_id is set and matches, or if user is player1
        const player1Id = normalizeId(game.player1_id)
        const player2Id = normalizeId(game.player2_id)
        const isPlayer1 = userId === player1Id
        
        // If user is player1, we're good
        if (isPlayer1) break
        
        // If user is player2 and player2_id is set and matches, we're good
        if (player2Id && userId === player2Id) break
        
        // If player2_id is null and user is not player1, try direct query
        if (!game.player2_id && !isPlayer1 && attempt < maxRetries - 1) {
          const { data: directCheck } = await supabase
            .from('head_to_head_games')
            .select('player2_id')
            .eq('id', gameId)
            .eq('player2_id', user.id)
            .single()
          
          if (directCheck?.player2_id) {
            game.player2_id = directCheck.player2_id
            break
          }
        }
      }
      
      if (game) break
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)))
      }
    }

    if (gameError || !game) {
      console.error('Game not found after retries:', gameError)
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }
    
    const player1Id = normalizeId(game.player1_id)
    let player2Id = normalizeId(game.player2_id)
    
    console.log('Ready route authorization check:', {
      rawUserId: user.id,
      rawPlayer1Id: game.player1_id,
      rawPlayer2Id: game.player2_id,
      normalizedUserId: userId,
      normalizedPlayer1Id: player1Id,
      normalizedPlayer2Id: player2Id,
      gameId: game.id,
      gameStatus: game.status,
    })
    
    // Check if user is player1
    const isPlayer1 = userId === player1Id
    
    // If user is not player1, they must be player2
    if (!isPlayer1) {
      // If player2_id is still null after retries, try one more direct query
      if (!game.player2_id) {
        const { data: directCheck } = await supabase
          .from('head_to_head_games')
          .select('player2_id')
          .eq('id', gameId)
          .eq('player2_id', user.id)
          .single()
        
        if (directCheck?.player2_id) {
          game.player2_id = directCheck.player2_id
          player2Id = normalizeId(directCheck.player2_id)
        } else {
          console.error('Authorization failed: User is not player1 and player2_id is not set', {
            userId: user.id,
            gameId: game.id,
          })
          return NextResponse.json(
            { error: 'Cannot mark ready - you are not a player in this game' },
            { status: 403 }
          )
        }
      }
      
      // Verify user is actually player2
      if (userId !== player2Id) {
        // Also try direct string comparison as fallback
        const directMatch = String(user.id).toLowerCase().trim() === String(game.player2_id).toLowerCase().trim()
        if (!directMatch) {
          console.error('Authorization failed: User does not match player2_id', {
            userId,
            player2Id,
            rawUserId: user.id,
            rawPlayer2Id: game.player2_id,
            gameId: game.id,
          })
          return NextResponse.json(
            { error: 'Unauthorized - you are not a player in this game' },
            { status: 403 }
          )
        }
      }
    }

    // Check if game is in waiting status
    if (game.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Game is not in waiting status' },
        { status: 400 }
      )
    }

    // Determine which player is marking ready
    const updateField = isPlayer1 ? 'player1_ready' : 'player2_ready'
    
    console.log('Marking player ready:', {
      isPlayer1,
      updateField,
      userId: user.id,
      gameId: game.id,
    })

    // Update ready status
    console.log('Attempting to update ready status:', {
      gameId,
      updateField,
      currentGameState: {
        player1_ready: game.player1_ready,
        player2_ready: game.player2_id ? game.player2_ready : 'N/A (player2_id is null)',
        status: game.status,
      }
    })
    
    const { data: updatedGame, error: updateError } = await supabase
      .from('head_to_head_games')
      .update({
        [updateField]: true,
      })
      .eq('id', gameId)
      .select()
      .single()

    console.log('Update result:', {
      success: !!updatedGame && !updateError,
      hasData: !!updatedGame,
      hasError: !!updateError,
      error: updateError,
      updatedGame: updatedGame ? {
        id: updatedGame.id,
        player1_ready: updatedGame.player1_ready,
        player2_ready: updatedGame.player2_ready,
        status: updatedGame.status,
      } : null,
    })

    if (updateError) {
      console.error('Error updating ready status:', {
        error: updateError,
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        gameId,
        updateField,
      })
      return NextResponse.json(
        { 
          error: 'Failed to update ready status',
          details: updateError.message || updateError.code,
        },
        { status: 500 }
      )
    }

    if (!updatedGame) {
      console.error('Update returned no data (possibly RLS policy blocking)', {
        gameId,
        updateField,
        userId: user.id,
      })
      return NextResponse.json(
        { error: 'Failed to update ready status - update returned no data' },
        { status: 500 }
      )
    }

    console.log('Successfully updated ready status:', {
      gameId: updatedGame.id,
      player1_ready: updatedGame.player1_ready,
      player2_ready: updatedGame.player2_ready,
      status: updatedGame.status,
    })

    return NextResponse.json({ 
      success: true,
      game: updatedGame,
    })
  } catch (error) {
    console.error('Error marking player ready:', error)
    return NextResponse.json(
      { error: 'Failed to mark player ready' },
      { status: 500 }
    )
  }
}


