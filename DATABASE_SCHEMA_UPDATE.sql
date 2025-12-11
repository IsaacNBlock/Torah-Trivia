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
