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

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

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
          // Update profile to Pro
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              plan: 'pro',
              subscription_status: 'active',
            })
            .eq('id', userId)

          if (profileError) {
            console.error('Error updating profile after checkout:', profileError)
          } else {
            console.log(`Profile updated to Pro for user: ${userId}`)
          }

          // Update customer metadata with userId if not already set
          if (session.customer && typeof session.customer === 'string') {
            try {
              await stripe.customers.update(session.customer, {
                metadata: {
                  userId: userId,
                  ...(session.metadata || {}),
                },
              })
              console.log(`Customer metadata updated with userId: ${userId}`)
            } catch (customerError) {
              console.error('Error updating customer metadata:', customerError)
            }
          }

          // If subscription exists, update its metadata
          if (session.subscription && typeof session.subscription === 'string') {
            try {
              await stripe.subscriptions.update(session.subscription, {
                metadata: {
                  userId: userId,
                },
              })
              console.log(`Subscription metadata updated with userId: ${userId}`)
            } catch (subscriptionError) {
              console.error('Error updating subscription metadata:', subscriptionError)
            }
          }
        }
        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        // Try to get userId from customer metadata if not in subscription metadata
        let userIdToUse = userId
        if (!userIdToUse && subscription.customer) {
          try {
            const customer = typeof subscription.customer === 'string'
              ? await stripe.customers.retrieve(subscription.customer)
              : subscription.customer
            if (!customer.deleted && 'metadata' in customer) {
              userIdToUse = customer.metadata?.userId
            }
          } catch (error) {
            console.error('Error retrieving customer:', error)
          }
        }

        if (userIdToUse && subscription.status === 'active') {
          // Update subscription metadata if not already set
          if (!subscription.metadata?.userId) {
            try {
              await stripe.subscriptions.update(subscription.id, {
                metadata: {
                  userId: userIdToUse,
                },
              })
            } catch (error) {
              console.error('Error updating subscription metadata:', error)
            }
          }

          // Update profile
          const { error } = await supabase
            .from('profiles')
            .update({
              plan: 'pro',
              subscription_status: 'active',
            })
            .eq('id', userIdToUse)

          if (error) {
            console.error('Error updating profile after subscription creation:', error)
          } else {
            console.log(`Profile updated to Pro for user: ${userIdToUse}`)
          }
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        let userId = subscription.metadata?.userId

        // Try to get userId from customer metadata if not in subscription metadata
        if (!userId && subscription.customer) {
          try {
            const customer = typeof subscription.customer === 'string'
              ? await stripe.customers.retrieve(subscription.customer)
              : subscription.customer
            if (!customer.deleted && 'metadata' in customer) {
              userId = customer.metadata?.userId
            }
          } catch (error) {
            console.error('Error retrieving customer:', error)
          }
        }

        if (userId) {
          const status =
            subscription.status === 'active' ? 'active' : 'canceled'

          const { error } = await supabase
            .from('profiles')
            .update({
              plan: status === 'active' ? 'pro' : 'free',
              subscription_status: status,
            })
            .eq('id', userId)

          if (error) {
            console.error('Error updating profile after subscription update:', error)
          } else {
            console.log(`Profile updated for user: ${userId}, status: ${status}`)
          }
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





