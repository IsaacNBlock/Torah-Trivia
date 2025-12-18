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
    if (game.player1_id !== user.id && game.player2_id !== user.id) {
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
    const isPlayer1 = game.player1_id === user.id
    const updateField = isPlayer1 ? 'player1_ready' : 'player2_ready'

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
