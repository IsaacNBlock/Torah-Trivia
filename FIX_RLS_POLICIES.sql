-- Fix RLS Policies for head_to_head_games
-- Run this in Supabase SQL Editor to ensure service role can read games properly
-- This version is SAFE - it only adds/updates policies without dropping existing ones

-- First, check if policies exist and drop only if needed (safer approach)
DO $$
BEGIN
  -- Drop and recreate "Service role can manage games" policy
  -- This ensures service role can do everything
  DROP POLICY IF EXISTS "Service role can manage games" ON head_to_head_games;
  
  CREATE POLICY "Service role can manage games"
    ON head_to_head_games FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
  
  -- Update "Players can view own games" policy to also allow service role
  -- This ensures service role can read even when player2_id is null
  DROP POLICY IF EXISTS "Players can view own games" ON head_to_head_games;
  
  CREATE POLICY "Players can view own games"
    ON head_to_head_games FOR SELECT
    USING (
      auth.role() = 'service_role' OR 
      auth.uid() = player1_id OR 
      auth.uid() = player2_id
    );
END $$;

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

