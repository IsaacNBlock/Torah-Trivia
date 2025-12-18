'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { authenticatedFetch } from '@/lib/api-client'
import { Profile } from '@/lib/types'
import { useSearchParams, useRouter } from 'next/navigation'

function BillingContent() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  const fetchProfile = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const autoSyncWithStripe = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/stripe/manual-sync', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Refresh profile after successful sync
        await fetchProfile()
      }
      // Silently ignore if no subscription found - this is normal for free users
    } catch (error: any) {
      // Silently ignore errors during auto-sync - don't show to user
      console.error('Auto-sync with Stripe failed:', error)
    }
  }, [fetchProfile])

  useEffect(() => {
    if (user) {
      fetchProfile()
      // Automatically sync with Stripe when page loads
      autoSyncWithStripe()
    }
  }, [user, fetchProfile, autoSyncWithStripe])

  useEffect(() => {
    if (success) {
      // Refresh profile after successful payment and sync
      setTimeout(() => {
        autoSyncWithStripe().then(() => {
          fetchProfile()
          router.replace('/billing')
        })
      }, 1000)
    }
  }, [success, autoSyncWithStripe, fetchProfile, router])

  const handleUpgrade = async () => {
    setCheckoutLoading(true)
    try {
      const response = await authenticatedFetch('/api/stripe/checkout', {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const data = await response.json()
      
      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error: any) {
      alert('Error: ' + (error.message || 'Failed to start checkout process'))
      setCheckoutLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const response = await authenticatedFetch('/api/stripe/manual-sync', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSyncMessage('✅ Successfully synced with Stripe!')
        // Refresh profile
        await fetchProfile()
      } else {
        setSyncMessage(data.message || 'No active subscription found in Stripe')
      }
    } catch (error: any) {
      setSyncMessage('❌ Error: ' + (error.message || 'Failed to sync'))
    } finally {
      setSyncing(false)
      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-64"></div>
        </div>
      </main>
    )
  }

  const isPro = profile?.plan === 'pro' && profile?.subscription_status === 'active'

  return (
      <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
            Billing & Subscription
          </h1>

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-400 rounded-lg p-6 mb-6">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">✅</span>
                <div>
                  <h3 className="text-xl font-bold text-green-800 dark:text-green-200">
                    Payment Successful!
                  </h3>
                  <p className="text-green-700 dark:text-green-300">
                    Your Pro subscription is now active. Enjoy unlimited questions!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Canceled Message */}
          {canceled && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 rounded-lg p-6 mb-6">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">⚠️</span>
                <div>
                  <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-200">
                    Checkout Canceled
                  </h3>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    Your subscription was not updated. You can try again anytime.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Free Plan */}
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border-2 ${
              !isPro ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700'
            }`}>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Free Plan
                </h2>
                <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                  $0
                </div>
                <div className="text-gray-600 dark:text-gray-400">Forever</div>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">20 questions per day</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">All question categories</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">Points and tier system</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">Streak tracking</span>
                </li>
              </ul>

              {!isPro && (
                <div className="px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-center text-gray-600 dark:text-gray-400">
                  Current Plan
                </div>
              )}
            </div>

            {/* Pro Plan */}
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border-2 ${
              isPro ? 'border-purple-500' : 'border-gray-200 dark:border-gray-700'
            }`}>
              <div className="text-center mb-6">
                <div className="inline-block bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm font-semibold mb-2">
                  Pro
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Pro Plan
                </h2>
                <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                  $9.99
                </div>
                <div className="text-gray-600 dark:text-gray-400">Per month</div>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <span className="text-purple-500 mr-2">✓</span>
                  <span className="text-gray-700 dark:text-gray-300 font-semibold">Unlimited questions</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-500 mr-2">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">All question categories</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-500 mr-2">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">Rich explanations</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-500 mr-2">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">Bonus categories</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-500 mr-2">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">Priority support</span>
                </li>
              </ul>

              {isPro ? (
                <div className="px-4 py-3 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-lg text-center font-semibold">
                  ✓ Active Subscription
                </div>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={checkoutLoading}
                  className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {checkoutLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </span>
                  ) : (
                    'Upgrade to Pro'
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Current Status */}
          {profile && (
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Current Status
                </h3>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Sync with Stripe if payment was successful but status didn't update"
                >
                  {syncing ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Syncing...
                    </span>
                  ) : (
                    '🔄 Sync with Stripe'
                  )}
                </button>
              </div>

              {syncMessage && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  syncMessage.includes('✅') || syncMessage.includes('Success')
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                }`}>
                  {syncMessage}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Plan</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {profile.plan}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Subscription Status</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {profile.subscription_status === 'none' ? 'No Subscription' : profile.subscription_status}
                  </div>
                </div>
                {profile.plan === 'free' && (
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Daily Questions Used</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {profile.daily_questions_used} / 20
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
  )
}

export default function BillingPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-64"></div>
          </div>
        </main>
      }>
        <BillingContent />
      </Suspense>
    </ProtectedRoute>
  )
}



