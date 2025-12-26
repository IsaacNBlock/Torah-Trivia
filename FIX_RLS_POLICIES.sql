-- Fix RLS Policies for head_to_head_games
-- Run this in Supabase SQL Editor to ensure service role can read games properly

-- Drop existing policies
DROP POLICY IF EXISTS "Players can view own games" ON head_to_head_games;
DROP POLICY IF EXISTS "Service role can manage games" ON head_to_head_games;

-- Policy: Service role can do everything (should bypass RLS, but explicit is better)
-- This MUST come first and use auth.role() = 'service_role' check
CREATE POLICY "Service role can manage games"
  ON head_to_head_games FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Players can view their own games (only if not service role)
-- This checks auth.role() first to ensure service role policy takes precedence
CREATE POLICY "Players can view own games"
  ON head_to_head_games FOR SELECT
  USING (
    auth.role() = 'service_role' OR 
    auth.uid() = player1_id OR 
    auth.uid() = player2_id
  );

-- Verify the policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'head_to_head_games'
ORDER BY policyname;

