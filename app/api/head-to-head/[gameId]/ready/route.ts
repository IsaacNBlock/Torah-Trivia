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
    
    // If user is not player1, they must be player2, so player2_id must be set
    if (!isPlayer1) {
      if (!game.player2_id) {
        console.error('Authorization failed: User is not player1 and player2_id is not set', {
          userId: user.id,
          gameId: game.id,
        })
        return NextResponse.json(
          { error: 'Cannot mark ready - you are not a player in this game' },
          { status: 403 }
        )
      }
      
      // Verify user is actually player2
      if (userId !== player2Id) {
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
    
    // If user is not player1 and not player2 (shouldn't happen after above checks, but just in case)
    if (!isPlayer1 && userId !== player2Id) {
      console.error('Authorization failed: User is not player1 or player2', {
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
    const { data: updatedGame, error: updateError } = await supabase
      .from('head_to_head_games')
      .update({
        [updateField]: true,
      })
      .eq('id', gameId)
      .select()
      .single()

    if (updateError || !updatedGame) {
      console.error('Error updating ready status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update ready status' },
        { status: 500 }
      )
    }

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


