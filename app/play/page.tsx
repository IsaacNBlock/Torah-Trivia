'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { authenticatedFetch } from '@/lib/api-client'
import { Question, QuestionResponse, AnswerResponse, QuestionCategory, Profile, CHUMASH_PARSHAOT, TANACH_BOOKS, TALMUD_TRACTATES, HALACHA_TOPICS, Tier, Source } from '@/lib/types'
import { useAuth } from '@/components/AuthProvider'
import { getTierPoints, getTierDifficulty } from '@/lib/utils'

type GameState = 'loading' | 'question' | 'answered' | 'error'
type DifficultyTier = Tier

const CATEGORIES: QuestionCategory[] = ['Chumash', 'Tanach', 'Talmud', 'Halacha', 'Jewish History']
const DIFFICULTY_TIERS: DifficultyTier[] = ['Beginner', 'Student', 'Scholar', 'Chacham']

// Helper function to get tier info
const getTierInfo = (tier: DifficultyTier) => ({
  difficulty: getTierDifficulty(tier),
  points: `${getTierPoints(tier)} pts`
})

export default function PlayPage() {
  const [gameState, setGameState] = useState<GameState>('loading')
  const [question, setQuestion] = useState<Question | null>(null)
  const [questionId, setQuestionId] = useState<string | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answerResult, setAnswerResult] = useState<AnswerResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory>('Chumash')
  const [selectedTier, setSelectedTier] = useState<DifficultyTier | null>(null) // null = use user's current tier
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [showPremiumExplanation, setShowPremiumExplanation] = useState(false)
  const { user } = useAuth()

  // Fetch user profile to check subscription status
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

  // Fetch a new question
  const fetchQuestion = async (category?: QuestionCategory, tier?: DifficultyTier | null, subcategory?: string | null) => {
    const categoryToUse = category || selectedCategory
    const tierToUse = tier !== undefined ? tier : selectedTier
    const subcategoryToUse = subcategory !== undefined ? subcategory : selectedSubcategory
    setGameState('loading')
    setError(null)
    setSelectedAnswer(null)
    setAnswerResult(null)
    setReviewSubmitted(false)
    setShowPremiumExplanation(false)

    try {
      let url = `/api/questions/next?category=${encodeURIComponent(categoryToUse)}`
      if (tierToUse) {
        url += `&tier=${encodeURIComponent(tierToUse)}`
      }
      if (subcategoryToUse) {
        url += `&subcategory=${encodeURIComponent(subcategoryToUse)}`
      }
      
      const response = await authenticatedFetch(url)
      const data: QuestionResponse = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch question')
      }

      setQuestion(data.question)
      setQuestionId(data.questionId || null)
      setGameState('question')
    } catch (err: any) {
      setError(err.message || 'Failed to load question')
      setGameState('error')
    }
  }

  // Submit answer
  const submitAnswer = async () => {
    if (!question || !selectedAnswer) return

    setGameState('loading')

    try {
      const response = await authenticatedFetch('/api/questions/answer', {
        method: 'POST',
        body: JSON.stringify({
          question,
          selectedAnswer,
          questionId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit answer')
      }

      const result: AnswerResponse = await response.json()
      setAnswerResult(result)
      setShowPremiumExplanation(false) // Reset premium explanation visibility
      setGameState('answered')
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer')
      setGameState('error')
    }
  }

  // Submit for Rabbinic Review
  const submitForReview = async () => {
    if (!questionId) return

    setReviewLoading(true)
    try {
      const response = await authenticatedFetch('/api/questions/review', {
        method: 'POST',
        body: JSON.stringify({ questionId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit for review')
      }

      setReviewSubmitted(true)
    } catch (err: any) {
      alert(err.message || 'Failed to submit for review')
    } finally {
      setReviewLoading(false)
    }
  }

  // Handle category change
  const handleCategoryChange = (category: QuestionCategory) => {
    setSelectedCategory(category)
    setSelectedSubcategory(null) // Reset subcategory when category changes
    fetchQuestion(category, selectedTier, null)
  }

  // Handle tier/difficulty change
  const handleTierChange = (tier: DifficultyTier | null) => {
    setSelectedTier(tier)
    fetchQuestion(selectedCategory, tier, selectedSubcategory)
  }

  // Handle subcategory change
  const handleSubcategoryChange = (subcategory: string | null) => {
    setSelectedSubcategory(subcategory)
    fetchQuestion(selectedCategory, selectedTier, subcategory)
  }

  // Get subcategory options based on selected category
  const getSubcategoryOptions = (): string[] => {
    switch (selectedCategory) {
      case 'Chumash':
        return CHUMASH_PARSHAOT
      case 'Tanach':
        return TANACH_BOOKS
      case 'Talmud':
        return TALMUD_TRACTATES
      case 'Halacha':
        return HALACHA_TOPICS
      case 'Jewish History':
        return [] // No subcategory for Jewish History
      default:
        return []
    }
  }

  // Check if user is a paid member
  const isPaidMember = profile?.plan === 'pro' && profile?.subscription_status === 'active'

  // Load profile and first question on mount
  useEffect(() => {
    if (user) {
      fetchProfile()
      fetchQuestion(selectedCategory)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <ProtectedRoute>
      <main className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
            Play Torah Trivia
          </h1>

          {/* Category Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select Category:
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  disabled={gameState === 'loading'}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                  } ${gameState === 'loading' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Subcategory Selection (Paid Members Only) */}
          {!profileLoading && isPaidMember && getSubcategoryOptions().length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select {selectedCategory === 'Chumash' ? 'Parsha' : selectedCategory === 'Tanach' ? 'Book' : selectedCategory === 'Talmud' ? 'Tractate' : 'Topic'} (Pro Feature):
              </label>
              <select
                value={selectedSubcategory || ''}
                onChange={(e) => handleSubcategoryChange(e.target.value || null)}
                disabled={gameState === 'loading'}
                className="w-full md:w-auto px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All {selectedCategory}</option>
                {getSubcategoryOptions().map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                💎 Pro members can focus on specific topics
              </p>
            </div>
          )}

          {/* Upgrade prompt for free users */}
          {!profileLoading && !isPaidMember && getSubcategoryOptions().length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg shadow-lg p-4 mb-4 border-2 border-purple-200 dark:border-purple-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    💎 Unlock Subcategory Selection
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Upgrade to Pro to choose specific {selectedCategory === 'Chumash' ? 'Parshiot' : selectedCategory === 'Tanach' ? 'Books' : selectedCategory === 'Talmud' ? 'Tractates' : 'Topics'}
                  </p>
                </div>
                <a
                  href="/billing"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700 transition-colors whitespace-nowrap"
                >
                  Upgrade to Pro
                </a>
              </div>
            </div>
          )}

          {/* Difficulty/Tier Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select Question Difficulty:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleTierChange(null)}
                disabled={gameState === 'loading'}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                  selectedTier === null
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                } ${gameState === 'loading' ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Uses your current tier automatically"
              >
                Auto (Your Tier)
              </button>
              {DIFFICULTY_TIERS.map((tier) => {
                const tierInfo = getTierInfo(tier)
                return (
                  <button
                    key={tier}
                    onClick={() => handleTierChange(tier)}
                    disabled={gameState === 'loading'}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                      selectedTier === tier
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                    } ${gameState === 'loading' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={`${tierInfo.difficulty} difficulty - ${tierInfo.points} for correct answer`}
                  >
                    {tier} ({tierInfo.points})
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Each tier has different point values! Beginner: 10 pts | Student: 20 pts | Scholar: 30 pts | Chacham: 40 pts
            </p>
          </div>

          {gameState === 'loading' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-600 dark:text-gray-400">
                  {question ? 'Checking your answer...' : 'Loading question...'}
                </p>
              </div>
            </div>
          )}

          {gameState === 'error' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <div className="text-center space-y-4">
                <div className="text-red-600 dark:text-red-400 text-6xl">⚠️</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Oops! Something went wrong
                </h2>
                <p className="text-gray-600 dark:text-gray-400">{error}</p>
                <div className="pt-4">
                  <button
                    onClick={() => fetchQuestion(selectedCategory, selectedTier, selectedSubcategory)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {gameState === 'question' && question && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 md:p-8">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-semibold">
                    {question.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm font-semibold capitalize">
                      {question.difficulty}
                    </span>
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-semibold">
                      {(() => {
                        // Determine tier: use selectedTier if available, otherwise infer from difficulty
                        const tierForDisplay = selectedTier || (question.difficulty === 'easy' ? 'Beginner' : question.difficulty === 'medium' ? 'Student' : 'Scholar')
                        return `+${getTierPoints(tierForDisplay as Tier)} pts`
                      })()}
                    </span>
                  </div>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                  {question.question}
                </h2>
              </div>

              <div className="space-y-3 mb-6">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAnswer(option)}
                    disabled={gameState !== 'question'}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedAnswer === option
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-600'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    } ${
                      gameState !== 'question' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                          selectedAnswer === option
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {selectedAnswer === option && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <span className="text-lg text-gray-900 dark:text-white">{option}</span>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={submitAnswer}
                disabled={!selectedAnswer}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit Answer
              </button>
            </div>
          )}

          {gameState === 'answered' && answerResult && question && (
            <div className="space-y-6">
              <div
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 md:p-8 ${
                  answerResult.correct
                    ? 'border-2 border-green-500'
                    : 'border-2 border-red-500'
                }`}
              >
                <div className="text-center mb-6">
                  <div className="text-7xl mb-4">
                    {answerResult.correct ? '✅' : '❌'}
                  </div>
                  <h2
                    className={`text-3xl font-bold mb-2 ${
                      answerResult.correct
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {answerResult.correct ? 'Correct!' : 'Incorrect'}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    The correct answer was: <strong>{question.correct_answer}</strong>
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Explanation:
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">{answerResult.explanation}</p>
                  
                  {/* Premium Explanation Section */}
                  {isPaidMember && answerResult.premium_explanation ? (
                    <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                      {!showPremiumExplanation ? (
                        <button
                          onClick={() => setShowPremiumExplanation(true)}
                          className="w-full py-2 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-colors flex items-center justify-center space-x-2"
                        >
                          <span>💎</span>
                          <span>Learn More (Pro)</span>
                        </button>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-purple-600 dark:text-purple-400 flex items-center space-x-2">
                              <span>💎</span>
                              <span>In-Depth Explanation</span>
                            </h4>
                            <button
                              onClick={() => setShowPremiumExplanation(false)}
                              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
                            >
                              Collapse
                            </button>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {answerResult.premium_explanation}
                          </p>
                          
                          {/* Sources Display */}
                          {answerResult.sources && answerResult.sources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                              <h5 className="font-semibold text-gray-900 dark:text-white mb-3">
                                Sources & References:
                              </h5>
                              <div className="space-y-3">
                                {answerResult.sources.map((source: Source, index: number) => (
                                  <div
                                    key={index}
                                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-blue-500"
                                  >
                                    {source.text && (
                                      <blockquote className="text-gray-700 dark:text-gray-300 italic mb-2">
                                        &ldquo;{source.text}&rdquo;
                                      </blockquote>
                                    )}
                                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                      — {source.source}
                                    </p>
                                    {source.commentary && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                        {source.commentary}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : !isPaidMember && (
                    <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4 border-2 border-purple-200 dark:border-purple-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                              💎 Unlock In-Depth Explanations
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              Upgrade to Pro to access detailed explanations with sources and quotes from authentic Torah texts
                            </p>
                          </div>
                          <a
                            href="/billing"
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700 transition-colors whitespace-nowrap ml-4"
                          >
                            Upgrade to Pro
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {answerResult.pointsEarned > 0 ? '+' : ''}
                      {answerResult.pointsEarned}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Points</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {answerResult.newTotalPoints}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {answerResult.streak}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Streak</div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {answerResult.newTier}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Tier</div>
                  </div>
                </div>

                {answerResult.streakBonus > 0 && (
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-400 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-2xl">🔥</span>
                      <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                        Streak Bonus! +{answerResult.streakBonus} points
                      </span>
                    </div>
                  </div>
                )}

                {/* Rabbinic Review Button */}
                {questionId && (
                  <div className="mb-6">
                    {reviewSubmitted ? (
                      <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-400 rounded-lg p-4 text-center">
                        <p className="text-green-800 dark:text-green-200 font-semibold">
                          ✅ Question submitted for Rabbinic Review
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={submitForReview}
                        disabled={reviewLoading}
                        className="w-full py-3 bg-purple-600 text-white rounded-lg font-semibold text-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                      >
                        {reviewLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <span>📜</span>
                            <span>Send for Rabbinic Review</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                <button
                  onClick={() => fetchQuestion(selectedCategory, selectedTier, selectedSubcategory)}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
                >
                  Next Question
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  )
}




