'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { authenticatedFetch } from '@/lib/api-client'
import { useAuth } from '@/components/AuthProvider'
import { HeadToHeadGame, GameStateResponse, Question, SubmitGameAnswerRequest, SubmitGameAnswerResponse } from '@/lib/types'

type GameView = 'waiting' | 'playing' | 'results' | 'complete'

export default function HeadToHeadGamePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const gameId = params.gameId as string

  const [game, setGame] = useState<HeadToHeadGame | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [questionId, setQuestionId] = useState<string | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [player1Answer, setPlayer1Answer] = useState<any>(null)
  const [player2Answer, setPlayer2Answer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gameView, setGameView] = useState<GameView>('waiting')
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  // Fetch game state
  const fetchGameState = useCallback(async () => {
    try {
      const response = await authenticatedFetch(`/api/head-to-head/${gameId}`)
      const data: GameStateResponse = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch game state')
      }

      setGame(data.game)
      setCurrentQuestion(data.current_question || null)
      setQuestionId(data.question_id || null)
      setPlayer1Answer(data.player1_answer || null)
      setPlayer2Answer(data.player2_answer || null)

      // Determine game view
      if (data.game.status === 'completed') {
        setGameView('complete')
      } else if (data.game.status === 'active') {
        setGameView('playing')
      } else {
        setGameView('waiting')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch game state')
    } finally {
      setLoading(false)
    }
  }, [gameId])

  // Start game
  const handleStartGame = async () => {
    setLoading(true)
    try {
      const response = await authenticatedFetch(`/api/head-to-head/${gameId}/start`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start game')
      }

      // Refresh game state
      await fetchGameState()
    } catch (err: any) {
      setError(err.message || 'Failed to start game')
      setLoading(false)
    }
  }

  // Mark ready
  const handleReady = async () => {
    try {
      const response = await authenticatedFetch(`/api/head-to-head/${gameId}/ready`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to mark ready')
      }

      await fetchGameState()
    } catch (err: any) {
      setError(err.message || 'Failed to mark ready')
    }
  }

  // Submit answer
  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !questionId) return

    setSubmitting(true)
    try {
      const body: SubmitGameAnswerRequest = {
        question_id: questionId,
        selected_answer: selectedAnswer,
      }

      const response = await authenticatedFetch(`/api/head-to-head/${gameId}/answer`, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const data: SubmitGameAnswerResponse = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to submit answer')
      }

      setGame(data.game)
      await fetchGameState()
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer')
    } finally {
      setSubmitting(false)
    }
  }

  // Move to next question
  const handleNextQuestion = async () => {
    setLoading(true)
    setSelectedAnswer(null)
    setPlayer1Answer(null)
    setPlayer2Answer(null)

    try {
      const response = await authenticatedFetch(`/api/head-to-head/${gameId}/next`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to move to next question')
      }

      setGame(data.game)
      setCurrentQuestion(data.current_question || null)
      setQuestionId(data.question_id || null)
      setPlayer1Answer(data.player1_answer || null)
      setPlayer2Answer(data.player2_answer || null)

      if (data.game_complete) {
        setGameView('complete')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to move to next question')
    } finally {
      setLoading(false)
    }
  }

  // Poll for game updates when waiting or playing
  useEffect(() => {
    if (!gameId || !user) return

    fetchGameState()

    // Set up polling for game state updates
    const interval = setInterval(() => {
      if (gameView === 'waiting' || gameView === 'playing') {
        fetchGameState()
      }
    }, 2000) // Poll every 2 seconds

    setPollingInterval(interval)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [gameId, user, gameView, fetchGameState])

  if (loading && !game) {
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

  if (error && !game) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-lg p-8">
              <p className="text-red-800 dark:text-red-200 text-lg">{error}</p>
              <button
                onClick={() => router.push('/head-to-head')}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Go Back
              </button>
            </div>
          </div>
        </main>
      </ProtectedRoute>
    )
  }

  if (!game) return null

  const isPlayer1 = game.player1_id === user?.id
  const currentPlayerName = isPlayer1 ? game.player1_name : game.player2_name
  const opponentName = isPlayer1 ? game.player2_name : game.player1_name
  const currentPlayerScore = isPlayer1 ? game.player1_score : game.player2_score
  const opponentScore = isPlayer1 ? game.player2_score : game.player1_score
  const currentPlayerAnswer = isPlayer1 ? player1Answer : player2Answer
  const opponentAnswer = isPlayer1 ? player2Answer : player1Answer

  // Waiting Room View
  if (gameView === 'waiting') {
    return (
      <ProtectedRoute>
        <main className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
              Game Room
            </h1>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="text-6xl font-bold text-blue-600 dark:text-blue-400 mb-4 tracking-widest">
                  {game.game_code}
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Share this code with your friend to join the game
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {game.player1_name || 'Player 1'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {game.player1_id === user?.id ? '(You)' : ''}
                    </p>
                  </div>
                  {game.player1_ready && (
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-semibold">
                      Ready ✓
                    </span>
                  )}
                </div>

                {game.player2_id ? (
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {game.player2_name || 'Player 2'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {game.player2_id === user?.id ? '(You)' : ''}
                      </p>
                    </div>
                    {game.player2_ready && (
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-semibold">
                        Ready ✓
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-200 dark:border-yellow-700">
                    <p className="text-yellow-800 dark:text-yellow-200 text-center">
                      Waiting for opponent to join...
                    </p>
                  </div>
                )}
              </div>

              {game.player2_id && (
                <div className="space-y-4">
                  {!isPlayer1 && !game.player2_ready && (
                    <button
                      onClick={handleReady}
                      className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors"
                    >
                      I&apos;m Ready
                    </button>
                  )}
                  {isPlayer1 && !game.player1_ready && (
                    <button
                      onClick={handleReady}
                      className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors"
                    >
                      I&apos;m Ready
                    </button>
                  )}
                  {game.player1_ready && game.player2_ready && isPlayer1 && (
                    <button
                      onClick={handleStartGame}
                      disabled={loading}
                      className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? 'Starting Game...' : 'Start Game'}
                    </button>
                  )}
                  {game.player1_ready && game.player2_ready && !isPlayer1 && (
                    <p className="text-center text-gray-600 dark:text-gray-400">
                      Waiting for game creator to start the game...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </ProtectedRoute>
    )
  }

  // Game Complete View
  if (gameView === 'complete') {
    const winner = game.player1_score > game.player2_score ? 'player1' :
                   game.player2_score > game.player1_score ? 'player2' : 'tie'
    const isWinner = (winner === 'player1' && isPlayer1) || (winner === 'player2' && !isPlayer1)

    return (
      <ProtectedRoute>
        <main className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
              Game Complete!
            </h1>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <div className="text-center mb-8">
                {winner === 'tie' ? (
                  <>
                    <div className="text-6xl mb-4">🤝</div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      It&apos;s a Tie!
                    </h2>
                  </>
                ) : isWinner ? (
                  <>
                    <div className="text-6xl mb-4">🏆</div>
                    <h2 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                      You Win!
                    </h2>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">😊</div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {opponentName} Wins!
                    </h2>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className={`p-6 rounded-lg ${isPlayer1 && isWinner ? 'bg-green-100 dark:bg-green-900/20 border-2 border-green-500' : 'bg-gray-50 dark:bg-gray-700'}`}>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {game.player1_name || 'Player 1'}
                  </p>
                  <p className="text-4xl font-bold text-gray-900 dark:text-white">
                    {game.player1_score}
                  </p>
                </div>
                <div className={`p-6 rounded-lg ${!isPlayer1 && isWinner ? 'bg-green-100 dark:bg-green-900/20 border-2 border-green-500' : 'bg-gray-50 dark:bg-gray-700'}`}>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {game.player2_name || 'Player 2'}
                  </p>
                  <p className="text-4xl font-bold text-gray-900 dark:text-white">
                    {game.player2_score}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/head-to-head')}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
                >
                  Play Again
                </button>
                <button
                  onClick={() => router.push('/play')}
                  className="flex-1 py-3 bg-gray-600 text-white rounded-lg font-semibold text-lg hover:bg-gray-700 transition-colors"
                >
                  Back to Solo Play
                </button>
              </div>
            </div>
          </div>
        </main>
      </ProtectedRoute>
    )
  }

  // Playing View
  return (
    <ProtectedRoute>
      <main className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          {/* Score Display */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={`p-4 rounded-lg ${isPlayer1 ? 'bg-blue-100 dark:bg-blue-900/20 border-2 border-blue-500' : 'bg-gray-50 dark:bg-gray-700'}`}>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {currentPlayerName || 'You'}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {currentPlayerScore}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${!isPlayer1 ? 'bg-blue-100 dark:bg-blue-900/20 border-2 border-blue-500' : 'bg-gray-50 dark:bg-gray-700'}`}>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {opponentName || 'Opponent'}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {opponentScore}
              </p>
            </div>
          </div>

          {/* Question Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <p className="text-gray-600 dark:text-gray-400">
                Question {game.current_question_index + 1} of {game.total_questions}
              </p>
              <div className="flex-1 mx-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${((game.current_question_index + 1) / game.total_questions) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Question */}
          {currentQuestion && !currentPlayerAnswer && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 md:p-8 mb-6">
              <div className="mb-6">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-semibold mb-4 inline-block">
                  {currentQuestion.category}
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                  {currentQuestion.question}
                </h2>
              </div>

              <div className="space-y-3 mb-6">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAnswer(option)}
                    disabled={submitting}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedAnswer === option
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-600'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    } ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer || submitting}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Answer'}
              </button>
            </div>
          )}

          {/* Waiting for answer or showing results */}
          {currentPlayerAnswer && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 md:p-8 mb-6">
              <div className="text-center mb-6">
                <div className="text-7xl mb-4">
                  {currentPlayerAnswer.correct ? '✅' : '❌'}
                </div>
                <h2
                  className={`text-3xl font-bold mb-2 ${
                    currentPlayerAnswer.correct
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {currentPlayerAnswer.correct ? 'Correct!' : 'Incorrect'}
                </h2>
                {currentQuestion && (
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    The correct answer was: <strong>{currentQuestion.correct_answer}</strong>
                  </p>
                )}
                <p className="text-gray-600 dark:text-gray-400 mt-4">
                  Points earned: <strong className="text-blue-600 dark:text-blue-400">+{currentPlayerAnswer.points_earned}</strong>
                </p>
              </div>

              {!opponentAnswer ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-700 rounded-lg p-4 text-center">
                  <p className="text-yellow-800 dark:text-yellow-200">
                    Waiting for {opponentName || 'opponent'} to answer...
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Loading Next Question...' : 'Next Question'}
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  )
}

