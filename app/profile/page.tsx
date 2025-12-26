'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { useEffect, useState } from 'react'
import { authenticatedFetch } from '@/lib/api-client'
import { Profile, Tier, Question, QuestionCategory, HeadToHeadGameHistory, OpponentRecord } from '@/lib/types'
import Link from 'next/link'

interface WrongAnswer {
  id: string
  selected_answer: string
  created_at: string
  questions: Question & { id: string }
}

interface PointsHistoryEntry {
  id: string
  points: number
  points_change: number
  created_at: string
}

interface ProfileData {
  profile: Profile
  wrongAnswers: WrongAnswer[]
  pointsHistory: PointsHistoryEntry[]
  headToHeadGames?: HeadToHeadGameHistory[]
  opponentRecords?: OpponentRecord[]
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ProfileData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | 'All'>('All')

  useEffect(() => {
    if (user) {
      // Fetch immediately on mount
      fetchProfileData()
      
      // Refresh profile data periodically (every 10 seconds) to catch subscription updates
      const interval = setInterval(() => {
        fetchProfileData()
      }, 10000) // Reduced from 30s to 10s for faster updates

      // Refresh when page becomes visible (user switches back to tab)
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          fetchProfileData()
        }
      }
      document.addEventListener('visibilitychange', handleVisibilityChange)

      // Refresh when window gains focus
      const handleFocus = () => {
        fetchProfileData()
      }
      window.addEventListener('focus', handleFocus)

      return () => {
        clearInterval(interval)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('focus', handleFocus)
      }
    }
  }, [user])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      setError(null)
      // authenticatedFetch already handles cache-busting
      const response = await authenticatedFetch('/api/profile')
      if (response.ok) {
        const profileData = await response.json()
        setData(profileData)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load profile')
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const tierColors: Record<Tier, string> = {
    'Beginner': 'bg-gray-500',
    'Student': 'bg-blue-500',
    'Scholar': 'bg-purple-500',
    'Chacham': 'bg-yellow-500',
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    })
  }

  // Calculate points chart data
  const getPointsChartData = () => {
    if (!data?.pointsHistory || data.pointsHistory.length === 0) return null

    const history = data.pointsHistory
    const minPoints = Math.min(...history.map(h => h.points))
    const maxPoints = Math.max(...history.map(h => h.points))
    const range = maxPoints - minPoints || 1

    return {
      history,
      minPoints,
      maxPoints,
      range,
    }
  }

  const chartData = getPointsChartData()

  // Filter wrong answers by category
  const filteredWrongAnswers = data?.wrongAnswers.filter((wrongAnswer) => {
    if (selectedCategory === 'All') return true
    return wrongAnswer.questions.category === selectedCategory
  }) || []

  // Get unique categories from wrong answers
  const availableCategories = data?.wrongAnswers
    ? Array.from(new Set(data.wrongAnswers.map(wa => wa.questions.category)))
        .filter((cat): cat is QuestionCategory => 
          ['Chumash', 'Tanach', 'Talmud', 'Halacha', 'Jewish History'].includes(cat)
        )
    : []

  return (
    <ProtectedRoute>
      <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold">Your Profile</h1>
            <button
              onClick={fetchProfileData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center gap-2"
              title="Refresh profile data"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>
          
          {loading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          ) : data ? (
            <>
              {/* Stats Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-semibold mb-6">Your Stats</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Tier</div>
                    <div
                      className={`${tierColors[data.profile.tier]} text-white px-4 py-2 rounded-lg font-bold text-lg inline-block`}
                    >
                      {data.profile.tier}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Points</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {data.profile.points.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Streak</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {data.profile.streak}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Questions Answered</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {data.profile.questions_answered}
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing & Membership Status */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold">Billing & Membership</h2>
                  <Link
                    href="/billing"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm"
                  >
                    Manage Subscription
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Plan</div>
                    <div className="flex items-center gap-3">
                      <div className={`text-xl font-bold capitalize ${
                        data.profile.plan === 'pro' 
                          ? 'text-purple-600 dark:text-purple-400' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {data.profile.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
                      </div>
                      {data.profile.plan === 'pro' && (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-semibold rounded-full">
                          Pro
                        </span>
                      )}
                    </div>
                    {data.profile.plan === 'free' && (
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {data.profile.daily_questions_used} / 20 questions used today
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Subscription Status</div>
                    <div className="flex items-center gap-3">
                      {data.profile.subscription_status === 'active' ? (
                        <>
                          <div className="text-xl font-bold text-green-600 dark:text-green-400 capitalize">
                            Active
                          </div>
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-semibold rounded-full">
                            ✓ Active
                          </span>
                        </>
                      ) : data.profile.subscription_status === 'trialing' ? (
                        <>
                          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 capitalize">
                            Trialing
                          </div>
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold rounded-full">
                            Trial
                          </span>
                        </>
                      ) : data.profile.subscription_status === 'past_due' ? (
                        <>
                          <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400 capitalize">
                            Past Due
                          </div>
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-semibold rounded-full">
                            Payment Required
                          </span>
                        </>
                      ) : data.profile.subscription_status === 'canceled' ? (
                        <>
                          <div className="text-xl font-bold text-gray-600 dark:text-gray-400 capitalize">
                            Canceled
                          </div>
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-full">
                            Canceled
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="text-xl font-bold text-gray-600 dark:text-gray-400">
                            No Subscription
                          </div>
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-full">
                            Free
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {data.profile.plan === 'free' && (
                  <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">⭐</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">
                          Upgrade to Pro
                        </h3>
                        <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                          Get unlimited questions, rich explanations, and bonus categories for just $9.99/month.
                        </p>
                        <Link
                          href="/billing"
                          className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm"
                        >
                          Upgrade Now
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Points History Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-semibold mb-6">Points Over Time</h2>
                {chartData ? (
                  <div className="space-y-4">
                    <div className="relative h-64 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="pointsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
                            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.05)" />
                          </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        {[0, 1, 2, 3, 4].map((i) => (
                          <line
                            key={i}
                            x1="0"
                            y1={40 + i * 40}
                            x2="800"
                            y2={40 + i * 40}
                            stroke="currentColor"
                            strokeWidth="0.5"
                            className="text-gray-300 dark:text-gray-700"
                          />
                        ))}
                        {/* Area under curve */}
                        <path
                          d={`M 0,${200 - 40} ${chartData.history.map((entry, i) => {
                            const x = (i / (chartData.history.length - 1)) * 800
                            const y = 200 - 40 - ((entry.points - chartData.minPoints) / chartData.range) * 120
                            return `L ${x},${y}`
                          }).join(' ')} L 800,${200 - 40} Z`}
                          fill="url(#pointsGradient)"
                        />
                        {/* Line */}
                        <polyline
                          points={chartData.history.map((entry, i) => {
                            const x = (i / (chartData.history.length - 1)) * 800
                            const y = 200 - 40 - ((entry.points - chartData.minPoints) / chartData.range) * 120
                            return `${x},${y}`
                          }).join(' ')}
                          fill="none"
                          stroke="rgb(59, 130, 246)"
                          strokeWidth="3"
                        />
                        {/* Points */}
                        {chartData.history.map((entry, i) => {
                          const x = (i / (chartData.history.length - 1)) * 800
                          const y = 200 - 40 - ((entry.points - chartData.minPoints) / chartData.range) * 120
                          return (
                            <circle
                              key={entry.id}
                              cx={x}
                              cy={y}
                              r="4"
                              fill="rgb(59, 130, 246)"
                              className="hover:r-6 transition-all"
                            />
                          )
                        })}
                      </svg>
                      {/* Y-axis labels */}
                      <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-600 dark:text-gray-400 px-2">
                        <span>{chartData.maxPoints}</span>
                        <span>{Math.round((chartData.maxPoints + chartData.minPoints) / 2)}</span>
                        <span>{chartData.minPoints}</span>
                      </div>
                    </div>
                    {/* Recent points history list */}
                    <div className="mt-6 space-y-2 max-h-48 overflow-y-auto">
                      <h3 className="text-lg font-semibold mb-3">Recent Points Changes</h3>
                      {data.pointsHistory.slice(-10).reverse().map((entry) => (
                        <div
                          key={entry.id}
                          className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(entry.created_at)}
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium">
                              {entry.points_change > 0 ? '+' : ''}{entry.points_change} points
                            </span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              Total: {entry.points}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No points history yet. Start playing to track your progress!
                  </div>
                )}
              </div>

              {/* Head-to-Head Games Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-semibold mb-6">Head-to-Head Games</h2>
                
                {data.opponentRecords && data.opponentRecords.length > 0 ? (
                  <>
                  
                  {/* Overall Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-sm text-green-600 dark:text-green-400 mb-1">Total Wins</div>
                      <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                        {data.opponentRecords.reduce((sum, r) => sum + r.wins, 0)}
                      </div>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="text-sm text-red-600 dark:text-red-400 mb-1">Total Losses</div>
                      <div className="text-3xl font-bold text-red-700 dark:text-red-300">
                        {data.opponentRecords.reduce((sum, r) => sum + r.losses, 0)}
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Total Games</div>
                      <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                        {data.opponentRecords.reduce((sum, r) => sum + r.totalGames, 0)}
                      </div>
                    </div>
                  </div>

                  {/* Records Against Each Friend */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold mb-4">Records Against Friends</h3>
                    {data.opponentRecords.map((record) => (
                      <div
                        key={record.opponentId}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-700/50"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {record.opponentName || 'Unknown Player'}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {record.totalGames} game{record.totalGames !== 1 ? 's' : ''} played
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                              {record.wins}-{record.losses}
                              {record.ties > 0 && `-${record.ties}`}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {record.winRate}% win rate
                            </div>
                          </div>
                        </div>

                        {/* Win/Loss Breakdown */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                              {record.wins}
                            </div>
                            <div className="text-xs text-green-600 dark:text-green-400">Wins</div>
                          </div>
                          <div className="text-center p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                              {record.losses}
                            </div>
                            <div className="text-xs text-red-600 dark:text-red-400">Losses</div>
                          </div>
                          <div className="text-center p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                              {record.ties}
                            </div>
                            <div className="text-xs text-yellow-600 dark:text-yellow-400">Ties</div>
                          </div>
                        </div>

                        {/* Recent Games */}
                        <div className="mt-4">
                          <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Recent Games
                          </h5>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {record.games.slice(0, 5).map((game) => {
                              const isWin = game.myScore > game.opponentScore
                              const isTie = game.myScore === game.opponentScore
                              return (
                                <div
                                  key={game.id}
                                  className={`p-3 rounded-lg border ${
                                    isWin
                                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                      : isTie
                                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <span className="text-lg">
                                        {isWin ? '✅' : isTie ? '🤝' : '❌'}
                                      </span>
                                      <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {game.game_code}
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                          {formatDateShort(game.completed_at || game.created_at)}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {game.myScore} - {game.opponentScore}
                                      </div>
                                      <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {isWin ? 'Win' : isTie ? 'Tie' : 'Loss'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* All Games List */}
                  {data.headToHeadGames && data.headToHeadGames.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-xl font-semibold mb-4">All Head-to-Head Games</h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {data.headToHeadGames.map((game) => {
                          const isPlayer1 = game.isPlayer1
                          const myScore = isPlayer1 ? game.player1_score : game.player2_score
                          const opponentScore = isPlayer1 ? game.player2_score : game.player1_score
                          const opponentName = isPlayer1
                            ? (game.player2_profile?.display_name || 'Player 2')
                            : (game.player1_profile?.display_name || 'Player 1')
                          const isWin = myScore > opponentScore
                          const isTie = myScore === opponentScore

                          return (
                            <div
                              key={game.id}
                              className={`p-4 rounded-lg border ${
                                isWin
                                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                  : isTie
                                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">
                                    {isWin ? '✅' : isTie ? '🤝' : '❌'}
                                  </span>
                                  <div>
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                      vs {opponentName}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      {game.game_code} • {formatDateShort(game.completed_at || game.created_at)}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                                    {myScore} - {opponentScore}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    {isWin ? 'Win' : isTie ? 'Tie' : 'Loss'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <div className="text-6xl mb-4">🎮</div>
                    <p className="text-lg mb-2">No head-to-head games yet</p>
                    <p className="text-sm mb-4">
                      Challenge your friends in Jeopardy-style Torah trivia!
                    </p>
                    {data.profile.plan === 'pro' && data.profile.subscription_status === 'active' ? (
                      <Link
                        href="/head-to-head"
                        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Create Your First Game
                      </Link>
                    ) : (
                      <Link
                        href="/billing"
                        className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                      >
                        Upgrade to Pro to Play
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Wrong Answers Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold">Questions You Got Wrong</h2>
                  {data.wrongAnswers.length > 0 && availableCategories.length > 0 && (
                    <div className="flex items-center gap-3">
                      <label htmlFor="category-filter" className="text-sm text-gray-600 dark:text-gray-400">
                        Filter by category:
                      </label>
                      <select
                        id="category-filter"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value as QuestionCategory | 'All')}
                        className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="All">All Categories</option>
                        {availableCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {filteredWrongAnswers.length > 0 ? (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 wrong-answers-scroll">
                    {filteredWrongAnswers.map((wrongAnswer) => (
                      <div
                        key={wrongAnswer.id}
                        className="border border-red-200 dark:border-red-800 rounded-lg p-6 bg-red-50 dark:bg-red-900/20"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 text-xs font-semibold rounded">
                                {wrongAnswer.questions.category}
                              </span>
                              <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded">
                                {wrongAnswer.questions.difficulty}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDate(wrongAnswer.created_at)}
                              </span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                              {wrongAnswer.questions.question}
                            </h3>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded border border-red-300 dark:border-red-700">
                            <div className="text-xs font-semibold text-red-800 dark:text-red-200 mb-1">
                              Your Answer (Incorrect)
                            </div>
                            <div className="text-red-900 dark:text-red-100">{wrongAnswer.selected_answer}</div>
                          </div>
                          <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded border border-green-300 dark:border-green-700">
                            <div className="text-xs font-semibold text-green-800 dark:text-green-200 mb-1">
                              Correct Answer
                            </div>
                            <div className="text-green-900 dark:text-green-100">{wrongAnswer.questions.correct_answer}</div>
                          </div>
                          {wrongAnswer.questions.explanation && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 mt-2">
                              <div className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">
                                Explanation
                              </div>
                              <div className="text-sm text-blue-900 dark:text-blue-100">
                                {wrongAnswer.questions.explanation}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : data.wrongAnswers.length > 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p className="text-lg mb-2">No questions found</p>
                    <p>No wrong answers found for the selected category.</p>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p className="text-lg mb-2">🎉 Great job!</p>
                    <p>You haven&apos;t gotten any questions wrong yet, or you haven&apos;t answered any questions.</p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </main>
    </ProtectedRoute>
  )
}

