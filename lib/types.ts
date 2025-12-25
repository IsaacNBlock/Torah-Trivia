export type Tier = 'Beginner' | 'Student' | 'Scholar' | 'Chacham'
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

// Subcategory options for each category
export const CHUMASH_PARSHAOT = [
  'Bereishit', 'Noach', 'Lech Lecha', 'Vayeira', 'Chayei Sarah', 'Toldot', 'Vayetze', 'Vayishlach',
  'Vayeshev', 'Miketz', 'Vayigash', 'Vayechi', 'Shemot', 'Va\'eira', 'Bo', 'Beshalach',
  'Yitro', 'Mishpatim', 'Terumah', 'Tetzaveh', 'Ki Tisa', 'Vayakhel', 'Pekudei', 'Vayikra',
  'Tzav', 'Shemini', 'Tazria', 'Metzora', 'Acharei Mot', 'Kedoshim', 'Emor', 'Behar',
  'Bechukotai', 'Bamidbar', 'Naso', 'Beha\'alotcha', 'Shelach', 'Korach', 'Chukat', 'Balak',
  'Pinchas', 'Matot', 'Masei', 'Devarim', 'Va\'etchanan', 'Eikev', 'Re\'eh', 'Shoftim',
  'Ki Teitzei', 'Ki Tavo', 'Nitzavim', 'Vayeilech', 'Ha\'azinu', 'V\'Zot HaBeracha'
]

export const TANACH_BOOKS = [
  'Bereishit (Genesis)', 'Shemot (Exodus)', 'Vayikra (Leviticus)', 'Bamidbar (Numbers)', 'Devarim (Deuteronomy)',
  'Yehoshua (Joshua)', 'Shoftim (Judges)', 'Shmuel I (Samuel I)', 'Shmuel II (Samuel II)', 'Melachim I (Kings I)',
  'Melachim II (Kings II)', 'Yeshayahu (Isaiah)', 'Yirmiyahu (Jeremiah)', 'Yechezkel (Ezekiel)', 'Trei Asar (Twelve Prophets)',
  'Tehillim (Psalms)', 'Mishlei (Proverbs)', 'Iyov (Job)', 'Shir HaShirim (Song of Songs)', 'Rut (Ruth)',
  'Eichah (Lamentations)', 'Kohelet (Ecclesiastes)', 'Esther', 'Daniel', 'Ezra-Nechemiah', 'Divrei HaYamim (Chronicles)'
]

export const TALMUD_TRACTATES = [
  'Berachot', 'Shabbat', 'Eruvin', 'Pesachim', 'Rosh Hashanah', 'Yoma', 'Sukkah', 'Beitzah',
  'Taanit', 'Megillah', 'Moed Katan', 'Chagigah', 'Yevamot', 'Ketubot', 'Nedarim', 'Nazir',
  'Sotah', 'Gittin', 'Kiddushin', 'Bava Kamma', 'Bava Metzia', 'Bava Batra', 'Sanhedrin',
  'Makkot', 'Shevuot', 'Avodah Zarah', 'Horayot', 'Zevachim', 'Menachot', 'Chullin', 'Bechorot',
  'Arachin', 'Temurah', 'Keritot', 'Meilah', 'Tamid', 'Niddah'
]

export const HALACHA_TOPICS = [
  'Shabbat', 'Kashrut', 'Tefillah (Prayer)', 'Brachot (Blessings)', 'Tzitzit and Tefillin',
  'Mezuzah', 'Family Purity (Taharat HaMishpacha)', 'Holidays and Festivals', 'Rosh Chodesh',
  'Laws of Mourning', 'Laws of Conversion', 'Business Ethics', 'Lashon Hara (Speech)',
  'Honoring Parents', 'Charity (Tzedakah)', 'Laws of Niddah', 'Mikvah', 'Kiddush and Havdalah',
  'Chanukah', 'Purim', 'Pesach (Passover)', 'Shavuot', 'Sukkot', 'Rosh Hashanah', 'Yom Kippur',
  'Laws of Eruv', 'Laws of Chol HaMoed', 'Laws of Yom Tov', 'Laws of Shemittah', 'Laws of Terumah and Maaser'
]

export interface Source {
  text: string
  source: string // e.g., "Bereishit 1:1", "Shabbat 31b", "Shulchan Aruch Orach Chaim 1:1"
  commentary?: string // Optional additional context
}

export interface Question {
  id?: string
  question: string
  options: string[]
  correct_answer: string
  explanation: string
  premium_explanation?: string
  sources?: Source[]
  category: string
  difficulty: string
  subcategory?: string
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
  premium_explanation?: string
  sources?: Source[]
}

// Head-to-Head Game Types
export type GameStatus = 'waiting' | 'active' | 'completed' | 'abandoned'

export interface HeadToHeadGame {
  id: string
  game_code: string
  player1_id: string
  player2_id: string | null
  status: GameStatus
  current_question_index: number
  total_questions: number
  player1_score: number
  player2_score: number
  player1_ready: boolean
  player2_ready: boolean
  created_by: string
  created_at: string
  started_at: string | null
  completed_at: string | null
  player1_name?: string
  player2_name?: string
}

export interface GameQuestion {
  id: string
  game_id: string
  question_id: string
  question_index: number
  category: string
  points: number
  question?: Question // Full question data
}

export interface GameAnswer {
  id: string
  game_id: string
  question_id: string
  user_id: string
  selected_answer: string
  correct: boolean
  points_earned: number
  answered_at: string
}

export interface CreateGameResponse {
  game: HeadToHeadGame
  game_code: string
  error?: string
}

export interface JoinGameResponse {
  game: HeadToHeadGame
  error?: string
}

export interface GameStateResponse {
  game: HeadToHeadGame
  current_question?: Question
  question_id?: string
  player1_answer?: GameAnswer
  player2_answer?: GameAnswer
  error?: string
}

export interface SubmitGameAnswerRequest {
  question_id: string
  selected_answer: string
}

export interface SubmitGameAnswerResponse {
  correct: boolean
  points_earned: number
  game: HeadToHeadGame
  error?: string
}

// Head-to-Head Game History Types
export interface HeadToHeadGameHistory {
  id: string
  game_code: string
  player1_id: string
  player2_id: string | null
  status: GameStatus
  player1_score: number
  player2_score: number
  completed_at: string | null
  created_at: string
  isPlayer1: boolean
  player1_profile?: { display_name: string | null }
  player2_profile?: { display_name: string | null }
}

export interface OpponentRecord {
  opponentId: string
  opponentName: string
  wins: number
  losses: number
  ties: number
  totalGames: number
  winRate: string
  games: Array<{
    id: string
    game_code: string
    myScore: number
    opponentScore: number
    completed_at: string | null
    created_at: string
    isPlayer1: boolean
  }>
}





