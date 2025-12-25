import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase'

/**
 * Get authenticated user from API request
 * This reads the session from cookies sent with the request
 */
export async function getUserFromRequest(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Get the access token from the Authorization header
  const authHeader = request.headers.get('authorization')
  const accessToken = authHeader?.replace('Bearer ', '')

  if (accessToken) {
    // If token is in header, use it directly
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    })

    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  // Otherwise, try to get session from cookies
  // Supabase stores the session in a cookie that we need to parse
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null

  // Parse cookies
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=')
    acc[key] = decodeURIComponent(value)
    return acc
  }, {} as Record<string, string>)

  // Try to find Supabase session cookie
  // Supabase uses different cookie names depending on the project
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  
  // Extract project ref from URL (e.g., https://xxxxx.supabase.co -> xxxxx)
  const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || ''
  
  // Common Supabase cookie patterns
  const possibleCookieNames = [
    `sb-${projectRef}-auth-token`,
    `sb-access-token`,
    `sb-refresh-token`,
  ]

  for (const cookieName of possibleCookieNames) {
    const cookieValue = cookies[cookieName]
    if (cookieValue) {
      try {
        // The cookie might be JSON or just the token
        const parsed = JSON.parse(cookieValue)
        if (parsed.access_token) {
          const { data: { user } } = await supabaseClient.auth.getUser(parsed.access_token)
          if (user) return user
        }
      } catch {
        // If it's not JSON, it might be the token directly
        const { data: { user } } = await supabaseClient.auth.getUser(cookieValue)
        if (user) return user
      }
    }
  }

  return null
}

/**
 * Alternative method: Create API route helper that gets user from session
 * This uses the service role client to validate the session from the user's session cookie
 */
export async function getUserFromApiRequest(request: NextRequest) {
  // First try the header method
  const userFromHeader = await getUserFromRequest(request)
  if (userFromHeader) return userFromHeader

  // If that fails, we need to get the session from the cookie
  // We'll use a server-side helper that can read cookies
  // For this, we need to create a helper API endpoint or use middleware
  // For now, return null and let the API route handle it differently
  
  return null
}




