import { createClient, SupabaseClient } from '@supabase/supabase-js'

function getSupabaseUrl(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error(
      'Missing Supabase environment variables. Please check your environment variables:\n' +
      '- NEXT_PUBLIC_SUPABASE_URL\n' +
      '- NEXT_PUBLIC_SUPABASE_ANON_KEY\n\n' +
      'For Vercel deployments, add these in: Project Settings → Environment Variables'
    )
  }
  
  // Validate URL format
  if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    throw new Error(
      `Invalid Supabase URL format. Your URL "${supabaseUrl}" is not valid.\n` +
      'The URL should start with https:// (e.g., https://xxxxx.supabase.co)\n' +
      'Please update NEXT_PUBLIC_SUPABASE_URL in your environment variables with your actual Supabase project URL.'
    )
  }
  
  return supabaseUrl
}

function getSupabaseAnonKey(): string {
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your environment variables:\n' +
      '- NEXT_PUBLIC_SUPABASE_URL\n' +
      '- NEXT_PUBLIC_SUPABASE_ANON_KEY\n\n' +
      'For Vercel deployments, add these in: Project Settings → Environment Variables'
    )
  }
  return supabaseAnonKey
}

// Client-side Supabase client
// Note: This will use env vars available at runtime (browser/client-side)
// During build, if env vars aren't set, Supabase client creation may fail
// Make sure to set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase: SupabaseClient = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient(
      // Fallback values to prevent build errors - these will be replaced at runtime
      'https://placeholder.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
    )

// Server-side client with service role key (for admin operations)
// This function validates env vars when called (at runtime in API routes)
export function createServerClient() {
  const supabaseUrl = getSupabaseUrl()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable.\n\n' +
      'For Vercel deployments, add this in: Project Settings → Environment Variables'
    )
  }
  
  return createClient(supabaseUrl, serviceRoleKey)
}




