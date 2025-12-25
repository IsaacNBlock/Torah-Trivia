# Setup Guide - Torah Trivia

This guide will walk you through setting up the Torah Trivia website from scratch.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Accounts for:
  - Supabase (database + auth)
  - OpenAI (AI question generation)
  - Stripe (payments)
  - Google Cloud Console (OAuth)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to Settings → API to get your keys
3. Run this SQL in the SQL Editor to create the profiles table:

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  points INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'Beginner',
  streak INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  plan TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'none',
  daily_questions_used INTEGER DEFAULT 0,
  daily_reset_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Create policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

4. Set up Google OAuth:
   - Go to Authentication → Providers → Google
   - Enable Google provider
   - Add your Google OAuth credentials (from Google Cloud Console)

## Step 3: Set Up OpenAI

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an API key
3. Add credits to your account (required for API usage)

## Step 4: Set Up Stripe

1. Go to [stripe.com](https://stripe.com) and create an account
2. Go to Products and create a "Pro Plan" subscription product
3. Copy the Price ID
4. Go to Developers → Webhooks
5. Add endpoint: `https://your-domain.com/api/stripe/webhook`
6. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
7. Copy the webhook signing secret

## Step 5: Configure Environment Variables

1. Copy `env.example` to `.env.local`:
   ```bash
   cp env.example .env.local
   ```

2. Fill in all the values in `.env.local`:
   - Supabase URL and keys (from Step 2)
   - OpenAI API key (from Step 3)
   - Stripe keys and Price ID (from Step 4)
   - App URL (use `http://localhost:3000` for local development)

## Step 6: Run the Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your app!

## Next Steps

1. **Implement Authentication**: 
   - Add Supabase Auth UI to your pages
   - Protect routes that require authentication
   - Update API routes to use actual user sessions

2. **Build the Play Page**:
   - Fetch questions from `/api/questions/next`
   - Display question and options
   - Submit answers to `/api/questions/answer`
   - Show results and points

3. **Build the Profile Page**:
   - Display user stats (points, tier, streak)
   - Show progress to next tier
   - Display leaderboard (optional)

4. **Build the Billing Page**:
   - Show current plan
   - Add upgrade button that calls `/api/stripe/checkout`
   - Handle success/cancel redirects

5. **Add Daily Question Limits**:
   - Implement daily reset logic
   - Check limits before generating questions
   - Show limit status to users

## Troubleshooting

- **"Missing Supabase environment variables"**: Make sure `.env.local` exists and has all required values
- **API errors**: Check that your API keys are valid and have proper permissions
- **Database errors**: Verify the profiles table was created correctly in Supabase
- **Stripe webhook errors**: Make sure webhook URL matches your deployment URL

## Need Help?

Check the main README.md for more details about the project structure and features.





