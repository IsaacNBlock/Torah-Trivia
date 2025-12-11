export type Tier = 'Beginner' | 'Student' | 'Scholar' | 'Chacham' | 'Gadol'
export type Plan = 'free' | 'pro'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'none'

export interface Profile {
  id: string
  display_name: string | null
  points: number
  tier: Tier
  streak: number
  questions_answered: number
  plan: Plan
  subscription_status: SubscriptionStatus
  daily_questions_used: number
  daily_reset_date: string | null
  created_at?: string
  updated_at?: string
}

export type QuestionCategory = 'Chumash' | 'Tanach' | 'Talmud' | 'Halacha' | 'Jewish History'

export interface Question {
  id?: string
  question: string
  options: string[]
  correct_answer: string
  explanation: string
  category: string
  difficulty: string
}

export interface QuestionResponse {
  question: Question
  questionId?: string
  error?: string
}

export interface AnswerRequest {
  question: Question
  selectedAnswer: string
  questionId?: string
}

export interface AnswerResponse {
  correct: boolean
  pointsEarned: number
  newTotalPoints: number
  newTier: Tier
  streak: number
  streakBonus: number
  explanation: string
}

