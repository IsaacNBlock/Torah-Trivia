'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthForm } from '@/components/AuthForm'
import { useAuth } from '@/components/AuthProvider'

export default function AuthPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </main>
    )
  }

  if (user) {
    return null // Will redirect
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
      <AuthForm onSuccess={() => router.push('/')} />
    </main>
  )
}



