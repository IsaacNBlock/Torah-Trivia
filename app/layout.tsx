import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { Navbar } from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'Torah Trivia - Test Your Torah Knowledge',
  description: 'An AI-powered trivia platform to deepen your Torah knowledge',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

