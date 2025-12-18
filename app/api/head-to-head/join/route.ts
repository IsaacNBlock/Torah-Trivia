import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserFromApiRequest } from '@/lib/server-auth'
import { JoinGameResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

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

    const supabase = createServerClient()
    
    // Check if user is a paid member
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, subscription_status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    if (profile.plan !== 'pro' || profile.subscription_status !== 'active') {
      return NextResponse.json(
        { error: 'Head-to-head games are only available for Pro members. Please upgrade to Pro.' },
        { status: 403 }
      )
    }

    // Get game code from request body
    const body = await request.json()
    const { game_code } = body

    if (!game_code || typeof game_code !== 'string') {
      return NextResponse.json(
        { error: 'Game code is required' },
        { status: 400 }
      )
    }

    // Find the game
    const { data: game, error: gameError } = await supabase
      .from('head_to_head_games')
      .select('*')
      .eq('game_code', game_code.toUpperCase())
      .single()

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Game not found. Please check the game code.' },
        { status: 404 }
      )
    }

    // Check if game is in waiting status
    if (game.status !== 'waiting') {
      return NextResponse.json(
        { error: 'This game is no longer accepting players.' },
        { status: 400 }
      )
    }

    // Check if user is trying to join their own game
    if (game.player1_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot join your own game.' },
        { status: 400 }
      )
    }

    // Check if game already has a second player
    if (game.player2_id) {
      return NextResponse.json(
        { error: 'This game is already full.' },
        { status: 400 }
      )
    }

    // Join the game as player 2
    const { data: updatedGame, error: updateError } = await supabase
      .from('head_to_head_games')
      .update({
        player2_id: user.id,
      })
      .eq('id', game.id)
      .select()
      .single()

    if (updateError || !updatedGame) {
      console.error('Error joining game:', updateError)
      return NextResponse.json(
        { error: 'Failed to join game' },
        { status: 500 }
      )
    }

    const response: JoinGameResponse = {
      game: updatedGame,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error joining head-to-head game:', error)
    return NextResponse.json(
      { error: 'Failed to join game' },
      { status: 500 }
    )
  }
}
