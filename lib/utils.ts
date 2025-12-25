import { Tier } from './types'

/**
 * Calculate user tier based on points
 */
export function calculateTier(points: number): Tier {
  if (points < 100) return 'Beginner'
  if (points < 300) return 'Student'
  if (points < 700) return 'Scholar'
  return 'Chacham'
}

/**
 * Get points value for each tier
 */
export function getTierPoints(tier: Tier): number {
  const tierPoints: Record<Tier, number> = {
    'Beginner': 10,
    'Student': 20,
    'Scholar': 30,
    'Chacham': 40,
  }
  return tierPoints[tier] || 10
}

/**
 * Get difficulty for each tier
 */
export function getTierDifficulty(tier: Tier): string {
  const tierDifficulty: Record<Tier, string> = {
    'Beginner': 'easy',
    'Student': 'medium',
    'Scholar': 'hard',
    'Chacham': 'hard',
  }
  return tierDifficulty[tier] || 'medium'
}

/**
 * Calculate points for answering a question based on tier
 */
export function calculatePoints(correct: boolean, currentStreak: number, tier?: Tier): {
  pointsEarned: number
  streakBonus: number
  newStreak: number
} {
  // Get base points for the tier (or default to Beginner if not provided)
  const tierToUse = tier || 'Beginner'
  const basePointsValue = getTierPoints(tierToUse)
  const basePoints = correct ? basePointsValue : Math.round(-basePointsValue * 0.3)
  const newStreak = correct ? currentStreak + 1 : 0
  
  // Streak bonus: +5 points every 5 correct answers (scaled by tier)
  const streakBonusMultiplier = tierToUse === 'Chacham' ? 2.0 : tierToUse === 'Scholar' ? 1.5 : tierToUse === 'Student' ? 1.2 : 1.0
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





