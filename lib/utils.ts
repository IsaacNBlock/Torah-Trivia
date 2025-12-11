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
 * Calculate points for answering a question based on difficulty
 */
export function calculatePoints(correct: boolean, currentStreak: number, difficulty?: string): {
  pointsEarned: number
  streakBonus: number
  newStreak: number
} {
  // Base points based on difficulty
  const difficultyMultiplier: Record<string, number> = {
    'easy': 1.0,      // 10 points
    'medium': 1.5,    // 15 points
    'hard': 2.0,      // 20 points
  }
  
  const multiplier = difficultyMultiplier[difficulty || 'medium'] || 1.0
  const basePoints = correct ? Math.round(10 * multiplier) : Math.round(-3 * multiplier)
  const newStreak = correct ? currentStreak + 1 : 0
  
  // Streak bonus: +5 points every 5 correct answers (scaled by difficulty)
  const streakBonusMultiplier = difficulty === 'hard' ? 1.5 : difficulty === 'medium' ? 1.2 : 1.0
  const streakBonus = correct && newStreak > 0 && newStreak % 5 === 0 
    ? Math.round(5 * streakBonusMultiplier) 
    : 0
  
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

