import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@/lib/supabase'
import { getUserFromApiRequest } from '@/lib/server-auth'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

/**
 * Manual sync endpoint - Checks Stripe for user's subscription and updates profile
 * This is a fallback if webhooks didn't fire
 */
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

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      )
    }

    const supabase = createServerClient()

    // Search for customer by email or metadata
    const customers = await stripe.customers.list({
      email: user.email || undefined,
      limit: 10,
    })

    // Find customer with active subscription that matches this user
    let activeSubscription = null
    for (const customer of customers.data) {
      // Check if customer metadata has this userId
      if (customer.metadata?.userId === user.id) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'active',
          limit: 1,
        })

        if (subscriptions.data.length > 0) {
          activeSubscription = subscriptions.data[0]
          break
        }
      }

      // Also check subscriptions directly with metadata
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 10,
      })

      for (const sub of subscriptions.data) {
        if (sub.metadata?.userId === user.id) {
          activeSubscription = sub
          break
        }
      }

      if (activeSubscription) break
    }

    // Update profile based on subscription status
    if (activeSubscription && activeSubscription.status === 'active') {
      const { error } = await supabase
        .from('profiles')
        .update({
          plan: 'pro',
          subscription_status: 'active',
        })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating profile:', error)
        return NextResponse.json(
          { error: 'Failed to update profile', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Profile synced with Stripe subscription',
        plan: 'pro',
        status: 'active',
      })
    } else {
      // Check checkout sessions for this user
      const sessions = await stripe.checkout.sessions.list({
        limit: 10,
      })

      for (const session of sessions.data) {
        if (
          (session.metadata?.userId === user.id || session.client_reference_id === user.id) &&
          session.payment_status === 'paid' &&
          session.mode === 'subscription'
        ) {
          const { error } = await supabase
            .from('profiles')
            .update({
              plan: 'pro',
              subscription_status: 'active',
            })
            .eq('id', user.id)

          if (!error) {
            return NextResponse.json({
              success: true,
              message: 'Profile synced with completed checkout session',
              plan: 'pro',
              status: 'active',
            })
          }
        }
      }

      return NextResponse.json({
        success: false,
        message: 'No active subscription found in Stripe for this user',
        plan: 'free',
      })
    }
  } catch (error: any) {
    console.error('Error syncing with Stripe:', error)
    return NextResponse.json(
      { error: 'Failed to sync with Stripe', details: error.message },
      { status: 500 }
    )
  }
}



