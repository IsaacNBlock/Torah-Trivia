import { supabase } from './supabase'

/**
 * Make an authenticated API request
 * This automatically includes the user's session token in the Authorization header
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  // Get the current session
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  // Include the access token in the Authorization header
  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${session.access_token}`)
  
  // Set Content-Type for JSON if body is provided and no Content-Type is set
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(url, {
    ...options,
    headers,
  })
}




