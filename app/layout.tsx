import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}

