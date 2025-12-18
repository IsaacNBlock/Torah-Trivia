import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Get user from API request (for API routes)
 * Checks Authorization header first, then falls back to cookies
 */
export async function getUserFromApiRequest(request: NextRequest) {
  try {
    // First, try Authorization header (sent by client)
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '').trim()
      if (token && token !== 'undefined') {
        const supabase = createClient(supabaseUrl, supabaseAnonKey)
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (!error && user) return user
      }
    }

    // Fall back to cookies - parse Supabase session cookie
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) return null

    // Parse cookies manually
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = decodeURIComponent(value || '')
      return acc
    }, {} as Record<string, string>)

    // Find Supabase auth cookie
    // Cookie name format: sb-<project-ref>-auth-token
    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || ''
    const authCookieName = `sb-${projectRef}-auth-token`
    
    const authCookieValue = cookies[authCookieName] || 
                           cookies[`sb-access-token`] ||
                           Object.keys(cookies).find(key => key.includes('auth-token') && cookies[key])

    if (!authCookieValue) return null

    try {
      // Parse the cookie (it's JSON)
      const sessionData = JSON.parse(authCookieValue)
      const accessToken = sessionData?.access_token || sessionData
      
      if (!accessToken) return null

      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      const { data: { user }, error } = await supabase.auth.getUser(accessToken)
      
      if (error || !user) return null
      return user
    } catch (parseError) {
      // Cookie might not be JSON, try as direct token
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      const { data: { user } } = await supabase.auth.getUser(authCookieValue)
      return user || null
    }
  } catch (error) {
    console.error('Error getting user from API request:', error)
    return null
  }
}



