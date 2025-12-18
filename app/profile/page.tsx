'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { useEffect, useState } from 'react'
import { authenticatedFetch } from '@/lib/api-client'
import { Profile, Tier, Question } from '@/lib/types'
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
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ProfileData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchProfileData()
    }
  }, [user])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      setError(null)
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

  return (
    <ProtectedRoute>
      <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto space-y-8">
          <h1 className="text-4xl font-bold mb-8">Your Profile</h1>
          
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

              {/* Wrong Answers Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-semibold mb-6">Questions You Got Wrong</h2>
                {data.wrongAnswers.length > 0 ? (
                  <div className="space-y-4">
                    {data.wrongAnswers.map((wrongAnswer) => (
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
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p className="text-lg mb-2">🎉 Great job!</p>
                    <p>You haven't gotten any questions wrong yet, or you haven't answered any questions.</p>
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
