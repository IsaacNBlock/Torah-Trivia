import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getUserFromApiRequest } from '@/lib/server-auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const user = await getUserFromApiRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      )
    }

    const priceId = process.env.STRIPE_PRICE_ID_PRO
    if (!priceId) {
      return NextResponse.json(
        { error: 'Stripe price ID not configured. Please set STRIPE_PRICE_ID_PRO in your environment variables.' },
        { status: 500 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/billing?success=true`,
      cancel_url: `${appUrl}/billing?canceled=true`,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        userEmail: user.email || '',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    
    // Check if Stripe is properly configured
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'Stripe is not properly configured. Please check your STRIPE_SECRET_KEY environment variable.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}




