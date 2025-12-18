import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase'
import { QuestionResponse } from '@/lib/types'
import { getUserFromApiRequest } from '@/lib/server-auth'
import { shouldResetDailyLimit } from '@/lib/utils'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const DAILY_QUESTION_LIMIT_FREE = 20

export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const user = await getUserFromApiRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      )
    }

    // Get category, subcategory, and difficulty/tier from query params
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'Chumash'
    const subcategory = searchParams.get('subcategory') || null
    const requestedDifficulty = searchParams.get('difficulty') // 'easy', 'medium', 'hard'
    const requestedTier = searchParams.get('tier') // 'Beginner', 'Student', 'Scholar', 'Chacham'
    
    // Validate category
    const validCategories = ['Chumash', 'Tanach', 'Talmud', 'Halacha', 'Jewish History']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check if subcategory is provided - only allowed for paid members
    if (subcategory && (profile.plan !== 'pro' || profile.subscription_status !== 'active')) {
      return NextResponse.json(
        { error: 'Subcategory selection is only available for Pro members' },
        { status: 403 }
      )
    }

    // Check daily question limit for free users
    if (profile.plan === 'free') {
      // Reset daily limit if needed
      if (shouldResetDailyLimit(profile.daily_reset_date)) {
        await supabase
          .from('profiles')
          .update({
            daily_questions_used: 0,
            daily_reset_date: new Date().toISOString().split('T')[0],
          })
          .eq('id', user.id)
        
        profile.daily_questions_used = 0
      }

      if (profile.daily_questions_used >= DAILY_QUESTION_LIMIT_FREE) {
        return NextResponse.json(
          { error: 'Daily question limit reached. Upgrade to Pro for unlimited questions!' },
          { status: 403 }
        )
      }
    }

    // Increment daily questions used
    await supabase
      .from('profiles')
      .update({
        daily_questions_used: profile.daily_questions_used + 1,
      })
      .eq('id', user.id)

    // Determine difficulty - use requested difficulty/tier or default based on user tier
    let difficulty = 'medium'
    let tier = profile.tier || 'Beginner'
    
    if (requestedDifficulty) {
      // User explicitly requested a difficulty
      const validDifficulties = ['easy', 'medium', 'hard']
      if (validDifficulties.includes(requestedDifficulty)) {
        difficulty = requestedDifficulty
      }
    } else if (requestedTier) {
      // User requested a specific tier - map to difficulty
      const tierToDifficulty: Record<string, string> = {
        'Beginner': 'easy',
        'Student': 'medium',
        'Scholar': 'hard',
        'Chacham': 'hard',
      }
      const validTiers = ['Beginner', 'Student', 'Scholar', 'Chacham']
      if (validTiers.includes(requestedTier)) {
        difficulty = tierToDifficulty[requestedTier] || 'medium'
        tier = requestedTier // Use requested tier for prompt context
      }
    } else {
      // Default: use user's current tier
      tier = profile.tier || 'Beginner'
      const difficultyMap: Record<string, string> = {
        'Beginner': 'easy',
        'Student': 'medium',
        'Scholar': 'hard',
        'Chacham': 'hard',
      }
      difficulty = difficultyMap[tier] || 'medium'
    }

    // Map category names for OpenAI prompt
    const categoryMapping: Record<string, string> = {
      'Chumash': 'Chumash (Five Books of Moses)',
      'Tanach': 'Tanach (Bible: Chumash, Neviim, Ketuvim)',
      'Talmud': 'Talmud (Gemara and Mishnah)',
      'Halacha': 'Halacha (Jewish Law)',
      'Jewish History': 'Jewish History (from Biblical times to modern era)',
    }

    // Build subcategory context for prompt
    let subcategoryContext = ''
    if (subcategory) {
      const subcategoryLabel = category === 'Chumash' ? 'Parsha' : 
                               category === 'Tanach' ? 'Book' : 
                               category === 'Talmud' ? 'Tractate' : 
                               'Topic'
      subcategoryContext = `\nSpecific ${subcategoryLabel}: ${subcategory}\nIMPORTANT: The question must be specifically about ${subcategory}.`
    }

    const prompt = `Generate a Torah trivia question. Return ONLY valid JSON in this exact format:
{
  "question": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": "Option A",
  "explanation": "Brief explanation of why this is correct (2-3 sentences, accessible to all users)",
  "premium_explanation": "In-depth explanation with detailed context, background, and analysis (3-5 sentences)",
  "sources": [
    {
      "text": "Exact quote from the source",
      "source": "Source reference (e.g., 'Bereishit 1:1', 'Shabbat 31b', 'Shulchan Aruch Orach Chaim 1:1', 'Rashi on Bereishit 1:1')",
      "commentary": "Optional additional context or explanation of the quote"
    }
  ],
  "category": "${category}",
  "difficulty": "${difficulty}"${subcategory ? ',\n  "subcategory": "' + subcategory + '"' : ''}
}

IMPORTANT REQUIREMENTS:
- "explanation": Keep it brief (2-3 sentences) for general understanding
- "premium_explanation": Provide a thorough, in-depth explanation (3-5 sentences) with historical context, deeper meaning, and connections to broader Torah concepts
- "sources": Include 2-4 relevant sources with:
  * "text": Direct quotes in Hebrew (with English translation if needed) or English from the source
  * "source": Proper citation format (Book Chapter:Verse for Tanach, Tractate Folio for Talmud, Section:Subsection for Halacha)
  * "commentary": Explain how this source supports the answer and provides additional insight

Category: ${categoryMapping[category] || category}${subcategoryContext}
Difficulty: ${difficulty}

Generate a ${difficulty} difficulty ${category} trivia question appropriate for a ${tier} level student${subcategory ? ` specifically focused on ${subcategory}` : ''}. Ensure the sources are authentic and properly cited.`

    // Use gpt-3.5-turbo for cost savings (can switch to gpt-4 if needed)
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: 'Failed to generate question' },
        { status: 500 }
      )
    }

    const question = JSON.parse(content)
    
    // Validate question structure
    if (!question.question || !question.options || !question.correct_answer) {
      return NextResponse.json(
        { error: 'Invalid question format' },
        { status: 500 }
      )
    }

    // Ensure category and difficulty match requested values
    question.category = category
    question.difficulty = difficulty // Ensure difficulty is set correctly
    if (subcategory) {
      question.subcategory = subcategory
    }

    // Ensure premium_explanation and sources exist (set defaults if missing)
    if (!question.premium_explanation) {
      question.premium_explanation = question.explanation // Fallback to basic explanation
    }
    if (!question.sources || !Array.isArray(question.sources)) {
      question.sources = [] // Default to empty array if not provided
    }

    // Save question to database
    const { data: savedQuestion, error: saveError } = await supabase
      .from('questions')
      .insert({
        question: question.question,
        options: question.options,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        premium_explanation: question.premium_explanation || null,
        sources: question.sources && question.sources.length > 0 ? question.sources : null,
        category: question.category,
        difficulty: question.difficulty,
        subcategory: subcategory || null,
        tier: tier, // Store the tier used to generate this question
        generated_by: user.id,
      })
      .select('id')
      .single()

    if (saveError) {
      console.error('Error saving question to database:', saveError)
      // Continue even if save fails
    }

    const response: QuestionResponse = { 
      question,
      questionId: savedQuestion?.id 
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error generating question:', error)
    return NextResponse.json(
      { error: 'Failed to generate question' },
      { status: 500 }
    )
  }
}




