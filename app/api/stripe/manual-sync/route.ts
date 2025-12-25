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
export const dynamic = 'force-dynamic'

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

    // Search for customer by email
    const customers = await stripe.customers.list({
      email: user.email || undefined,
      limit: 100, // Increased limit to find all customers
    })

    // Find customer with active subscription that matches this user
    let activeSubscription = null
    let matchingCustomer = null

    for (const customer of customers.data) {
      // Check if customer metadata has this userId
      if (customer.metadata?.userId === user.id) {
        matchingCustomer = customer
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
          matchingCustomer = customer
          break
        }
      }

      if (activeSubscription) break
    }

    // If no subscription found but we found a customer by email with active subscription,
    // and metadata doesn't have userId, update metadata and use that subscription
    if (!activeSubscription && customers.data.length > 0 && user.email) {
      for (const customer of customers.data) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'active',
          limit: 1,
        })

        if (subscriptions.data.length > 0) {
          // Found an active subscription for a customer with matching email
          // Update customer and subscription metadata to include userId
          try {
            await stripe.customers.update(customer.id, {
              metadata: {
                userId: user.id,
                ...customer.metadata,
              },
            })
            await stripe.subscriptions.update(subscriptions.data[0].id, {
              metadata: {
                userId: user.id,
                ...subscriptions.data[0].metadata,
              },
            })
            activeSubscription = subscriptions.data[0]
            matchingCustomer = customer
            console.log(`Updated customer ${customer.id} and subscription metadata with userId: ${user.id}`)
            break
          } catch (metadataError) {
            console.error('Error updating metadata:', metadataError)
            // Continue to use the subscription anyway
            activeSubscription = subscriptions.data[0]
            matchingCustomer = customer
            break
          }
        }
      }
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
      // Check checkout sessions for this user (increase limit to find more recent sessions)
      const sessions = await stripe.checkout.sessions.list({
        limit: 100,
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





