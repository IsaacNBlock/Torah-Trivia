import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@/lib/supabase'

// Disable body parsing for Stripe webhook
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY not set - Stripe webhooks will not work')
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
}) : null

export async function POST(request: NextRequest) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    )
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  const supabase = createServerClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId || session.client_reference_id

        if (userId && session.mode === 'subscription') {
          // Only update if it's a subscription checkout
          const { error } = await supabase
            .from('profiles')
            .update({
              plan: 'pro',
              subscription_status: 'active',
            })
            .eq('id', userId)

          if (error) {
            console.error('Error updating profile after checkout:', error)
          } else {
            console.log(`Profile updated to Pro for user: ${userId}`)
          }
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (userId) {
          const status =
            subscription.status === 'active' ? 'active' : 'canceled'

          await supabase
            .from('profiles')
            .update({
              plan: status === 'active' ? 'pro' : 'free',
              subscription_status: status,
            })
            .eq('id', userId)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}




