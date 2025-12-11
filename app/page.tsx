'use client'

import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { useEffect, useState } from 'react'
import { authenticatedFetch } from '@/lib/api-client'
import { Profile, Tier } from '@/lib/types'
import { GoogleSignInButton } from '@/components/GoogleSignInButton'

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && user) {
      fetchProfile()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [user, authLoading])

  const fetchProfile = async () => {
    try {
      const response = await authenticatedFetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const tierColors: Record<Tier, string> = {
    'Beginner': 'bg-gray-500',
    'Student': 'bg-blue-500',
    'Scholar': 'bg-purple-500',
    'Chacham': 'bg-yellow-500',
    'Gadol': 'bg-gradient-to-r from-yellow-400 to-orange-500',
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-8 max-w-2xl">
        <h1 className="text-5xl font-bold">📘 Torah Trivia</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Test your Torah knowledge with AI-generated questions
        </p>

        {/* Display User Tier if logged in */}
        {!authLoading && user && (
          <div className="pt-4">
            {loading ? (
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-16 w-48 mx-auto"></div>
            ) : profile ? (
              <div className="inline-block">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your Current Tier</div>
                <div
                  className={`${tierColors[profile.tier]} text-white px-6 py-3 rounded-lg font-bold text-xl shadow-lg`}
                >
                  {profile.tier}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {profile.points} points
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Show Google Sign In if not logged in */}
        {!authLoading && !user && (
          <div className="pt-4 space-y-4">
            <div className="flex flex-col items-center space-y-3">
              <GoogleSignInButton variant="homepage" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Or <Link href="/auth" className="text-blue-600 dark:text-blue-400 hover:underline">sign in with email</Link>
              </p>
            </div>
          </div>
        )}
        
        <div className="space-y-4 pt-8">
          {user ? (
            <>
              <Link
                href="/play"
                className="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Start Playing
              </Link>
              
              <div className="flex gap-4 justify-center">
                <Link
                  href="/profile"
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  Profile
                </Link>
                <Link
                  href="/billing"
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  Billing
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-600 dark:text-gray-400">
              Sign in to start playing
            </div>
          )}
        </div>

        <div className="pt-12 space-y-4 text-left">
          <h2 className="text-2xl font-semibold">How It Works</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Answer AI-generated Torah trivia questions</li>
            <li>Earn points and climb through tiers (Beginner → Gadol)</li>
            <li>Build your streak for bonus points</li>
            <li>Unlock Pro features for unlimited questions</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
