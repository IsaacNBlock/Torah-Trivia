import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase'
import { QuestionResponse } from '@/lib/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET(request: NextRequest) {
  try {
    // TODO: Get user from session/auth
    // TODO: Check daily question limit for free users
    // TODO: Get user tier for difficulty scaling

    const prompt = `Generate a Torah trivia question. Return ONLY valid JSON in this exact format:
{
  "question": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": "Option A",
  "explanation": "Brief explanation of why this is correct",
  "category": "Chumash",
  "difficulty": "medium"
}

Categories: Chumash, Navi, Ketuvim, Mishnah, Gemara, Halacha
Difficulty: easy, medium, hard

Generate a question now:`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
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

    const response: QuestionResponse = { question }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error generating question:', error)
    return NextResponse.json(
      { error: 'Failed to generate question' },
      { status: 500 }
    )
  }
}

