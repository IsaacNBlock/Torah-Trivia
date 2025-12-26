'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { authenticatedFetch } from '@/lib/api-client'
import { useAuth } from '@/components/AuthProvider'
import { HeadToHeadGame, CreateGameResponse, JoinGameResponse, Profile } from '@/lib/types'

export default function HeadToHeadPage() {
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [gameCode, setGameCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const router = useRouter()
  const { user } = useAuth()

  // Fetch user profile to check subscription status
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authenticatedFetch('/api/profile')
        if (response.ok) {
          const data = await response.json()
          setProfile(data.profile)
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err)
      } finally {
        setProfileLoading(false)
      }
    }

    if (user) {
      fetchProfile()
    }
  }, [user])

  const isPaidMember = profile?.plan === 'pro' && profile?.subscription_status === 'active'

  const handleCreateGame = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await authenticatedFetch('/api/head-to-head/create', {
        method: 'POST',
      })

      const data: CreateGameResponse = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to create game')
      }

      // Redirect to game page
      router.push(`/head-to-head/${data.game.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create game')
      setLoading(false)
    }
  }

  const handleJoinGame = async () => {
    if (!gameCode.trim()) {
      setError('Please enter a game code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await authenticatedFetch('/api/head-to-head/join', {
        method: 'POST',
        body: JSON.stringify({ game_code: gameCode.trim().toUpperCase() }),
      })

      const data: JoinGameResponse = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to join game')
      }

      // Verify the join was successful by checking player2_id
      if (!data.game.player2_id) {
        throw new Error('Failed to join game - player2_id not set')
      }

      // Add a small delay to ensure database update is committed before redirecting
      // This helps avoid race conditions where the GET request happens before the update is visible
      await new Promise(resolve => setTimeout(resolve, 500))

      // Redirect to game page
      router.push(`/head-to-head/${data.game.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to join game')
      setLoading(false)
    }
  }

  if (profileLoading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </main>
      </ProtectedRoute>
    )
  }

  if (!isPaidMember) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
              Head-to-Head Games
            </h1>
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg shadow-lg p-8 border-2 border-purple-200 dark:border-purple-700">
              <div className="text-center">
                <div className="text-6xl mb-4">💎</div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Pro Feature
                </h2>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
                  Head-to-head games are only available for Pro members. Challenge your friends in Jeopardy-style Torah trivia!
                </p>
                <a
                  href="/billing"
                  className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold text-lg hover:bg-purple-700 transition-colors"
                >
                  Upgrade to Pro
                </a>
              </div>
            </div>
          </div>
        </main>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
            Head-to-Head Games
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Challenge your friends in Jeopardy-style Torah trivia! Play 10 questions and see who scores the most points.
          </p>

          {/* Mode Toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setMode('create')
                  setError(null)
                }}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                  mode === 'create'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Create Game
              </button>
              <button
                onClick={() => {
                  setMode('join')
                  setError(null)
                }}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                  mode === 'join'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Join Game
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Create Game Mode */}
          {mode === 'create' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Create a New Game
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create a game room and share the code with your friend to start playing!
              </p>
              <button
                onClick={handleCreateGame}
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create Game Room'}
              </button>
            </div>
          )}

          {/* Join Game Mode */}
          {mode === 'join' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Join a Game
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Enter the 6-character game code your friend shared with you.
              </p>
              <div className="space-y-4">
                <input
                  type="text"
                  value={gameCode}
                  onChange={(e) => {
                    setGameCode(e.target.value.toUpperCase().slice(0, 6))
                    setError(null)
                  }}
                  placeholder="Enter game code (e.g., ABC123)"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl font-bold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={6}
                  disabled={loading}
                />
                <button
                  onClick={handleJoinGame}
                  disabled={loading || !gameCode.trim()}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Joining...' : 'Join Game'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  )
}


