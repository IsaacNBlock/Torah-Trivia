import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserFromApiRequest } from '@/lib/server-auth'
import { CreateGameResponse } from '@/lib/types'

// Generate a random 6-character game code
function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude confusing chars
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

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

    // Generate unique game code
    let gameCode = generateGameCode()
    let attempts = 0
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('head_to_head_games')
        .select('id')
        .eq('game_code', gameCode)
        .single()
      
      if (!existing) break
      gameCode = generateGameCode()
      attempts++
    }

    if (attempts >= 10) {
      return NextResponse.json(
        { error: 'Failed to generate unique game code. Please try again.' },
        { status: 500 }
      )
    }

    // Create the game
    const { data: game, error: gameError } = await supabase
      .from('head_to_head_games')
      .insert({
        game_code: gameCode,
        player1_id: user.id,
        created_by: user.id,
        status: 'waiting',
        total_questions: 10, // Default 10 questions
      })
      .select()
      .single()

    if (gameError || !game) {
      console.error('Error creating game:', gameError)
      return NextResponse.json(
        { error: 'Failed to create game' },
        { status: 500 }
      )
    }

    const response: CreateGameResponse = {
      game,
      game_code: gameCode,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error creating head-to-head game:', error)
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    )
  }
}
