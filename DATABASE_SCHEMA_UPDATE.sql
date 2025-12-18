-- Database Schema Updates for New Features
-- Run this in Supabase SQL Editor

-- 1. Create questions table to store all generated questions
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  generated_by UUID REFERENCES auth.users(id),
  times_answered INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for questions
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can view questions
CREATE POLICY "Authenticated users can view questions"
  ON questions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Service role can insert questions (for API routes)
CREATE POLICY "Service role can insert questions"
  ON questions FOR INSERT
  WITH CHECK (true);

-- Policy: Service role can update questions (for stats)
CREATE POLICY "Service role can update questions"
  ON questions FOR UPDATE
  USING (true);

-- 2. Create rabinic_reviews table for questions sent for review
CREATE TABLE IF NOT EXISTS rabinic_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES auth.users(id),
  review_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'needs_revision'
  reviewer_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for rabinic_reviews
ALTER TABLE rabinic_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own review submissions
CREATE POLICY "Users can view own review submissions"
  ON rabinic_reviews FOR SELECT
  USING (auth.uid() = submitted_by);

-- Policy: Users can submit reviews
CREATE POLICY "Authenticated users can submit reviews"
  ON rabinic_reviews FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

-- Create index on question_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_rabinic_reviews_question_id ON rabinic_reviews(question_id);
CREATE INDEX IF NOT EXISTS idx_rabinic_reviews_status ON rabinic_reviews(review_status);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);

-- 3. Create user_answers table to track all user answer attempts
CREATE TABLE IF NOT EXISTS user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer TEXT NOT NULL,
  correct BOOLEAN NOT NULL,
  points_earned INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for user_answers
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own answers
CREATE POLICY "Users can view own answers"
  ON user_answers FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can insert answers (for API routes)
CREATE POLICY "Service role can insert answers"
  ON user_answers FOR INSERT
  WITH CHECK (true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_answers_user_id ON user_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_question_id ON user_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_correct ON user_answers(correct);
CREATE INDEX IF NOT EXISTS idx_user_answers_created_at ON user_answers(created_at DESC);

-- 4. Create points_history table to track points over time
CREATE TABLE IF NOT EXISTS points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  points_change INTEGER NOT NULL, -- positive for gains, negative for losses
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for points_history
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own points history
CREATE POLICY "Users can view own points history"
  ON points_history FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can insert points history (for API routes)
CREATE POLICY "Service role can insert points history"
  ON points_history FOR INSERT
  WITH CHECK (true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_points_history_user_id ON points_history(user_id);
CREATE INDEX IF NOT EXISTS idx_points_history_created_at ON points_history(created_at DESC);

-- 5. Add subcategory field to questions table (for paid members feature)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Create index on subcategory for faster lookups
CREATE INDEX IF NOT EXISTS idx_questions_subcategory ON questions(subcategory);

-- 6. Add tier field to questions table (for 4-tier point system)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS tier TEXT;

-- Create index on tier for faster lookups
CREATE INDEX IF NOT EXISTS idx_questions_tier ON questions(tier);

-- 7. Add premium explanation and sources fields to questions table (for paid members feature)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS premium_explanation TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS sources JSONB;

-- Note: sources should be stored as JSON array, e.g.:
-- [{"text": "Quote from source", "source": "Book name, Chapter:Verse or Page", "commentary": "Additional context"}]

-- 8. Create head_to_head_games table for multiplayer Jeopardy-style games (Pro feature)
CREATE TABLE IF NOT EXISTS head_to_head_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_code TEXT UNIQUE NOT NULL, -- 6-character code for joining
  player1_id UUID REFERENCES auth.users(id) NOT NULL,
  player2_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'waiting', -- 'waiting', 'active', 'completed', 'abandoned'
  current_question_index INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 10, -- Number of questions in the game
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  player1_ready BOOLEAN DEFAULT false,
  player2_ready BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security for head_to_head_games
ALTER TABLE head_to_head_games ENABLE ROW LEVEL SECURITY;

-- Policy: Players can view their own games
CREATE POLICY "Players can view own games"
  ON head_to_head_games FOR SELECT
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Policy: Service role can insert/update games (for API routes)
CREATE POLICY "Service role can manage games"
  ON head_to_head_games FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_head_to_head_games_game_code ON head_to_head_games(game_code);
CREATE INDEX IF NOT EXISTS idx_head_to_head_games_player1_id ON head_to_head_games(player1_id);
CREATE INDEX IF NOT EXISTS idx_head_to_head_games_player2_id ON head_to_head_games(player2_id);
CREATE INDEX IF NOT EXISTS idx_head_to_head_games_status ON head_to_head_games(status);

-- 9. Create head_to_head_game_questions table to store questions for each game
CREATE TABLE IF NOT EXISTS head_to_head_game_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES head_to_head_games(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questions(id) NOT NULL,
  question_index INTEGER NOT NULL, -- Order of question in game (0-based)
  category TEXT NOT NULL,
  points INTEGER NOT NULL, -- Jeopardy-style points (10, 20, 30, 40 based on tier)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, question_index)
);

-- Enable Row Level Security for head_to_head_game_questions
ALTER TABLE head_to_head_game_questions ENABLE ROW LEVEL SECURITY;

-- Policy: Players can view questions for their games
CREATE POLICY "Players can view game questions"
  ON head_to_head_game_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM head_to_head_games
      WHERE head_to_head_games.id = head_to_head_game_questions.game_id
      AND (head_to_head_games.player1_id = auth.uid() OR head_to_head_games.player2_id = auth.uid())
    )
  );

-- Policy: Service role can insert game questions (for API routes)
CREATE POLICY "Service role can insert game questions"
  ON head_to_head_game_questions FOR INSERT
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_head_to_head_game_questions_game_id ON head_to_head_game_questions(game_id);
CREATE INDEX IF NOT EXISTS idx_head_to_head_game_questions_question_id ON head_to_head_game_questions(question_id);

-- 10. Create head_to_head_game_answers table to track player answers
CREATE TABLE IF NOT EXISTS head_to_head_game_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES head_to_head_games(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questions(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  selected_answer TEXT NOT NULL,
  correct BOOLEAN NOT NULL,
  points_earned INTEGER NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, question_id, user_id) -- One answer per player per question
);

-- Enable Row Level Security for head_to_head_game_answers
ALTER TABLE head_to_head_game_answers ENABLE ROW LEVEL SECURITY;

-- Policy: Players can view answers for their games
CREATE POLICY "Players can view game answers"
  ON head_to_head_game_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM head_to_head_games
      WHERE head_to_head_games.id = head_to_head_game_answers.game_id
      AND (head_to_head_games.player1_id = auth.uid() OR head_to_head_games.player2_id = auth.uid())
    )
  );

-- Policy: Players can insert their own answers
CREATE POLICY "Players can insert own answers"
  ON head_to_head_game_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_head_to_head_game_answers_game_id ON head_to_head_game_answers(game_id);
CREATE INDEX IF NOT EXISTS idx_head_to_head_game_answers_user_id ON head_to_head_game_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_head_to_head_game_answers_question_id ON head_to_head_game_answers(question_id);



