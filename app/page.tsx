import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-8 max-w-2xl">
        <h1 className="text-5xl font-bold">📘 Torah Trivia</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Test your Torah knowledge with AI-generated questions
        </p>
        
        <div className="space-y-4 pt-8">
          <Link
            href="/play"
            className="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Start Playing
          </Link>
          
          <div className="flex gap-4 justify-center">
            <Link
              href="/profile"
              className="px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Profile
            </Link>
            <Link
              href="/billing"
              className="px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Billing
            </Link>
          </div>
        </div>

        <div className="pt-12 space-y-4 text-left">
          <h2 className="text-2xl font-semibold">How It Works</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Answer AI-generated Torah trivia questions</li>
            <li>Earn points and climb through tiers (Beginner → Gadol)</li>
            <li>Build your streak for bonus points</li>
            <li>Unlock Pro features for unlimited questions</li>
          </ul>
        </div>
      </div>
    </main>
  )
}

