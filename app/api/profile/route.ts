import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserFromApiRequest } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0 // Prevent any caching at Next.js level

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

    return NextResponse.json({ 
      profile,
      wrongAnswers: wrongAnswers || [],
      pointsHistory: pointsHistory || [],
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





