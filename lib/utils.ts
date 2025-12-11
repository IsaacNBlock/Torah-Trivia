import { Tier } from './types'

/**
 * Calculate user tier based on points
 */
export function calculateTier(points: number): Tier {
  if (points < 100) return 'Beginner'
  if (points < 300) return 'Student'
  if (points < 700) return 'Scholar'
  if (points < 1500) return 'Chacham'
  return 'Gadol'
}

/**
 * Calculate points for answering a question
 */
export function calculatePoints(correct: boolean, currentStreak: number): {
  pointsEarned: number
  streakBonus: number
  newStreak: number
} {
  const basePoints = correct ? 10 : -3
  const newStreak = correct ? currentStreak + 1 : 0
  
  // Streak bonus: +5 points every 5 correct answers
  const streakBonus = correct && newStreak > 0 && newStreak % 5 === 0 ? 5 : 0
  
  return {
    pointsEarned: basePoints + streakBonus,
    streakBonus,
    newStreak,
  }
}

/**
 * Check if daily question limit has been reset
 */
export function shouldResetDailyLimit(resetDate: string | null): boolean {
  if (!resetDate) return true
  
  const today = new Date().toISOString().split('T')[0]
  return resetDate !== today
}

