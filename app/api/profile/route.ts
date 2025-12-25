import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserFromApiRequest } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const cacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  }

  try {
    // Get user from session
    const user = await getUserFromApiRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401, headers: cacheHeaders }
      )
    }

    const supabase = createServerClient()
    
    // Get user profile - use maybeSingle() to handle case where profile doesn't exist
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404, headers: cacheHeaders }
      )
    }

    if (!profile) {
      console.error('Profile not found for user:', user.id)
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404, headers: cacheHeaders }
      )
    }

    // Log profile data for debugging
    console.log(`Profile fetched for user ${user.id}:`, {
      plan: profile.plan,
      subscription_status: profile.subscription_status,
      updated_at: profile.updated_at
    })

    // Get wrong answers (questions user got wrong)
    const { data: wrongAnswers, error: wrongAnswersError } = await supabase
      .from('user_answers')
      .select(`
        id,
        selected_answer,
        created_at,
        questions (
          id,
          question,
          options,
          correct_answer,
          explanation,
          category,
          difficulty
        )
      `)
      .eq('user_id', user.id)
      .eq('correct', false)
      .order('created_at', { ascending: false })
      .limit(50) // Limit to most recent 50 wrong answers

    // Get points history (last 30 days or last 100 entries, whichever is more)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: pointsHistory, error: pointsHistoryError } = await supabase
      .from('points_history')
      .select('id, points, points_change, created_at')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })
      .limit(100)

    // Get head-to-head game history
    const { data: gamesAsPlayer1, error: games1Error } = await supabase
      .from('head_to_head_games')
      .select(`
        id,
        game_code,
        player1_id,
        player2_id,
        status,
        player1_score,
        player2_score,
        completed_at,
        created_at
      `)
      .eq('player1_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })

    const { data: gamesAsPlayer2, error: games2Error } = await supabase
      .from('head_to_head_games')
      .select(`
        id,
        game_code,
        player1_id,
        player2_id,
        status,
        player1_score,
        player2_score,
        completed_at,
        created_at
      `)
      .eq('player2_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })

    // Get player names separately
    const allPlayerIds = new Set<string>()
    if (gamesAsPlayer1) {
      gamesAsPlayer1.forEach(game => {
        allPlayerIds.add(game.player1_id)
        if (game.player2_id) allPlayerIds.add(game.player2_id)
      })
    }
    if (gamesAsPlayer2) {
      gamesAsPlayer2.forEach(game => {
        allPlayerIds.add(game.player1_id)
        if (game.player2_id) allPlayerIds.add(game.player2_id)
      })
    }

    const { data: playerProfiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', Array.from(allPlayerIds))

    const playerNamesMap = new Map<string, string>()
    if (playerProfiles) {
      playerProfiles.forEach(profile => {
        playerNamesMap.set(profile.id, profile.display_name || 'Unknown Player')
      })
    }

    // Combine and process games
    const allGames = [
      ...(gamesAsPlayer1 || []).map(game => ({ 
        ...game, 
        isPlayer1: true,
        player1_profile: { display_name: playerNamesMap.get(game.player1_id) || null },
        player2_profile: game.player2_id ? { display_name: playerNamesMap.get(game.player2_id) || null } : null,
      })),
      ...(gamesAsPlayer2 || []).map(game => ({ 
        ...game, 
        isPlayer1: false,
        player1_profile: { display_name: playerNamesMap.get(game.player1_id) || null },
        player2_profile: game.player2_id ? { display_name: playerNamesMap.get(game.player2_id) || null } : null,
      })),
    ].sort((a, b) => {
      const dateA = new Date(a.completed_at || a.created_at).getTime()
      const dateB = new Date(b.completed_at || b.created_at).getTime()
      return dateB - dateA
    })

    // Calculate records against each opponent
    const opponentRecords: Record<string, {
      opponentId: string
      opponentName: string
      wins: number
      losses: number
      ties: number
      games: any[]
    }> = {}

    allGames.forEach(game => {
      const isPlayer1 = game.isPlayer1
      const opponentId = isPlayer1 ? game.player2_id : game.player1_id
      const opponentName = isPlayer1 
        ? (game.player2_profile?.display_name || playerNamesMap.get(opponentId || '') || 'Player 2')
        : (game.player1_profile?.display_name || playerNamesMap.get(opponentId || '') || 'Player 1')
      
      if (!opponentId) return

      if (!opponentRecords[opponentId]) {
        opponentRecords[opponentId] = {
          opponentId,
          opponentName,
          wins: 0,
          losses: 0,
          ties: 0,
          games: [],
        }
      }

      const myScore = isPlayer1 ? game.player1_score : game.player2_score
      const opponentScore = isPlayer1 ? game.player2_score : game.player1_score

      if (myScore > opponentScore) {
        opponentRecords[opponentId].wins++
      } else if (myScore < opponentScore) {
        opponentRecords[opponentId].losses++
      } else {
        opponentRecords[opponentId].ties++
      }

      opponentRecords[opponentId].games.push({
        id: game.id,
        game_code: game.game_code,
        myScore,
        opponentScore,
        completed_at: game.completed_at,
        created_at: game.created_at,
        isPlayer1,
      })
    })

    // Convert to array and sort by total games
    const opponentRecordsArray = Object.values(opponentRecords)
      .map(record => {
        const totalGames = record.wins + record.losses + record.ties
        return {
          ...record,
          totalGames,
          winRate: totalGames > 0 
            ? ((record.wins / totalGames) * 100).toFixed(1)
            : '0.0',
        }
      })
      .sort((a, b) => b.totalGames - a.totalGames)

    return NextResponse.json({ 
      profile,
      wrongAnswers: wrongAnswers || [],
      pointsHistory: pointsHistory || [],
      headToHeadGames: allGames,
      opponentRecords: opponentRecordsArray,
    }, {
      headers: cacheHeaders,
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { 
        status: 500,
        headers: cacheHeaders,
      }
    )
  }
}





