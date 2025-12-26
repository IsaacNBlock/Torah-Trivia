import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase'
import { getUserFromApiRequest } from '@/lib/server-auth'
import { QuestionCategory, Tier } from '@/lib/types'
import { getTierPoints, getTierDifficulty } from '@/lib/utils'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const CATEGORIES: QuestionCategory[] = ['Chumash', 'Tanach', 'Talmud', 'Halacha', 'Jewish History']
const TIERS: Tier[] = ['Beginner', 'Student', 'Scholar', 'Chacham']

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    // Get user from session
    const user = await getUserFromApiRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()
    const gameId = params.gameId

    // Get the game
    const { data: game, error: gameError } = await supabase
      .from('head_to_head_games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    // Verify user is a player in this game
    // Normalize UUIDs for comparison (handle case differences and whitespace)
    const normalizeId = (id: any): string | null => {
      if (!id) return null
      return String(id).trim().toLowerCase()
    }
    
    const userId = normalizeId(user.id)
    const player1Id = normalizeId(game.player1_id)
    const player2Id = normalizeId(game.player2_id)
    
    if (userId !== player1Id && userId !== player2Id) {
      console.error('Authorization failed:', {
        userId,
        player1Id,
        player2Id,
        gameId: game.id,
      })
      return NextResponse.json(
        { error: 'Unauthorized - you are not a player in this game' },
        { status: 403 }
      )
    }

    // Check if game is ready to start (both players joined and ready)
    if (game.status !== 'waiting' || !game.player2_id) {
      return NextResponse.json(
        { error: 'Game is not ready to start. Both players must join first.' },
        { status: 400 }
      )
    }

    // Check if game already has questions
    const { data: existingQuestions } = await supabase
      .from('head_to_head_game_questions')
      .select('id')
      .eq('game_id', gameId)

    if (existingQuestions && existingQuestions.length > 0) {
      return NextResponse.json(
        { error: 'Game has already been started' },
        { status: 400 }
      )
    }

    // Get both players' profiles to determine average tier
    const { data: player1Profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', game.player1_id)
      .single()

    const { data: player2Profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', game.player2_id)
      .single()

    // Determine tier distribution for questions (Jeopardy-style: mix of all tiers)
    // Generate questions: 2 Beginner, 3 Student, 3 Scholar, 2 Chacham
    const tierDistribution: Tier[] = [
      'Beginner', 'Beginner',
      'Student', 'Student', 'Student',
      'Scholar', 'Scholar', 'Scholar',
      'Chacham', 'Chacham',
    ]

    // Shuffle categories and tiers to create variety
    const shuffledCategories = [...CATEGORIES].sort(() => Math.random() - 0.5)
    const shuffledTiers = [...tierDistribution].sort(() => Math.random() - 0.5)

    // Generate questions
    const questions = []
    for (let i = 0; i < game.total_questions; i++) {
      const category = shuffledCategories[i % CATEGORIES.length]
      const tier = shuffledTiers[i]
      const difficulty = getTierDifficulty(tier)
      const points = getTierPoints(tier)

      // Map category for OpenAI prompt
      const categoryMapping: Record<string, string> = {
        'Chumash': 'Chumash (Five Books of Moses)',
        'Tanach': 'Tanach (Bible: Chumash, Neviim, Ketuvim)',
        'Talmud': 'Talmud (Gemara and Mishnah)',
        'Halacha': 'Halacha (Jewish Law)',
        'Jewish History': 'Jewish History (from Biblical times to modern era)',
      }

      const prompt = `Generate a Torah trivia question. Return ONLY valid JSON in this exact format:
{
  "question": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": "Option A",
  "explanation": "Brief explanation of why this is correct (2-3 sentences)",
  "category": "${category}",
  "difficulty": "${difficulty}"
}

Category: ${categoryMapping[category] || category}
Difficulty: ${difficulty}

Generate a ${difficulty} difficulty ${category} trivia question appropriate for a ${tier} level student.`

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        })

        const content = completion.choices[0]?.message?.content
        if (!content) continue

        const questionData = JSON.parse(content)
        
        // Validate question structure
        if (!questionData.question || !questionData.options || !questionData.correct_answer) {
          continue
        }

        // Save question to database
        const { data: savedQuestion, error: saveError } = await supabase
          .from('questions')
          .insert({
            question: questionData.question,
            options: questionData.options,
            correct_answer: questionData.correct_answer,
            explanation: questionData.explanation,
            category: category,
            difficulty: difficulty,
            tier: tier,
            generated_by: user.id,
          })
          .select('id')
          .single()

        if (saveError || !savedQuestion) {
          console.error('Error saving question:', saveError)
          continue
        }

        // Link question to game
        const { error: linkError } = await supabase
          .from('head_to_head_game_questions')
          .insert({
            game_id: gameId,
            question_id: savedQuestion.id,
            question_index: i,
            category: category,
            points: points,
          })

        if (linkError) {
          console.error('Error linking question to game:', linkError)
          continue
        }

        questions.push(savedQuestion)
      } catch (error) {
        console.error(`Error generating question ${i}:`, error)
        continue
      }
    }

    if (questions.length < game.total_questions) {
      return NextResponse.json(
        { error: `Failed to generate all questions. Generated ${questions.length} out of ${game.total_questions}.` },
        { status: 500 }
      )
    }

    // Update game status to active
    const { error: updateError } = await supabase
      .from('head_to_head_games')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
        current_question_index: 0,
      })
      .eq('id', gameId)

    if (updateError) {
      console.error('Error updating game status:', updateError)
      return NextResponse.json(
        { error: 'Failed to start game' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      questions_generated: questions.length,
    })
  } catch (error) {
    console.error('Error starting game:', error)
    return NextResponse.json(
      { error: 'Failed to start game' },
      { status: 500 }
    )
  }
}


