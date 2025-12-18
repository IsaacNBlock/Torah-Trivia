import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserFromApiRequest } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
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
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

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

    return NextResponse.json({ 
      profile,
      wrongAnswers: wrongAnswers || [],
      pointsHistory: pointsHistory || [],
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}



