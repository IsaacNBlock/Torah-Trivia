# API Setup Guide - Step by Step

This guide will walk you through setting up all three APIs needed for Torah Trivia.

## 📋 Quick Checklist

- [ ] Supabase Project & Database
- [ ] OpenAI API Key
- [ ] Stripe Account & Webhook
- [ ] Environment Variables File

---

## 1️⃣ Supabase Setup

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Fill in:
   - **Organization**: Create one if needed
   - **Name**: `torah-trivia` (or any name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier is fine for development
4. Click **"Create new project"** (takes 1-2 minutes)

### Step 2: Get API Keys
1. Once project is ready, go to **Settings** → **API** (left sidebar)
2. You'll see:
   - **Project URL** (copy this)
   - **anon public** key (copy this)
   - **service_role** key (copy this - keep it secret!)

### Step 3: Create Database Table
1. Go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Copy and paste this SQL:

```sql
-- Create profiles table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS profiles (
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

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile (for initial creation)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Trigger: Create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

4. Click **"Run"** (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned"

### Step 4: Set Up Google OAuth (Optional for now, but needed for auth)
1. Go to **Authentication** → **Providers** (left sidebar)
2. Find **Google** and click on it
3. Toggle **"Enable Google provider"**
4. You'll need Google OAuth credentials (we can do this later if needed)
5. For now, you can skip this and use email auth instead

**✅ Supabase Setup Complete!**
- Save these values for Step 4 below:
  - Project URL
  - anon public key
  - service_role key

---

## 2️⃣ OpenAI Setup

### Step 1: Create Account
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Verify your email if needed

### Step 2: Add Payment Method
1. Go to **Settings** → **Billing** (or click your profile → **Billing**)
2. Click **"Add payment method"**
3. Add a credit card (required for API access, but they have free credits)
4. **Important**: OpenAI charges per API call. GPT-4 costs money, but you can use `gpt-3.5-turbo` for free tier testing

### Step 3: Create API Key
1. Go to **API keys** (left sidebar, or [platform.openai.com/api-keys](https://platform.openai.com/api-keys))
2. Click **"Create new secret key"**
3. Name it: `torah-trivia-dev`
4. **Copy the key immediately** - you won't be able to see it again!
5. Save it somewhere safe

**✅ OpenAI Setup Complete!**
- Save this value for Step 4 below:
  - API Key

---

## 3️⃣ Stripe Setup

### Step 1: Create Account
1. Go to [stripe.com](https://stripe.com)
2. Click **"Sign up"** or **"Start now"**
3. Fill in your information
4. Verify your email

### Step 2: Get API Keys
1. Once logged in, you'll see **Test mode** at the top (for development)
2. Go to **Developers** → **API keys** (left sidebar)
3. You'll see:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...` - click "Reveal test key")
4. Copy both keys

### Step 3: Create Product & Price
1. Go to **Products** (left sidebar)
2. Click **"+ Add product"**
3. Fill in:
   - **Name**: `Torah Trivia Pro`
   - **Description**: `Unlimited questions, rich explanations, bonus categories`
   - **Pricing model**: **Recurring**
   - **Price**: `$9.99` (or whatever you want)
   - **Billing period**: **Monthly**
4. Click **"Save product"**
5. After saving, click on the product
6. Find the **Price ID** - it looks like `price_xxxxxxxxxxxxx` (copy this!)

### Step 4: Set Up Webhook (For Production)
For local development:
1. Install Stripe CLI: [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
   - Mac: `brew install stripe/stripe-cli/stripe`
   - Or download from the link
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Copy the webhook signing secret it gives you (starts with `whsec_...`)

**✅ Stripe Setup Complete!**
- Save these values for Step 4 below:
  - Publishable key
  - Secret key
  - Price ID (for Pro subscription)
  - Webhook secret (from CLI)

---

## 4️⃣ Create Environment Variables File

1. In your project folder, create a file called `.env.local`
2. Copy the contents from `env.example`
3. Fill in all the values:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_key_here

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_webhook_secret_here
STRIPE_PRICE_ID_PRO=your_price_id_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**⚠️ Important**: 
- `.env.local` is in `.gitignore` so it won't be committed
- Never share these keys publicly!
- Use test keys for development, real keys only in production

---

## 5️⃣ Test Your Setup

After filling in `.env.local`, restart your dev server:
```bash
# Stop the current server (Ctrl+C), then:
npm run dev
```

Test each service:
1. **Supabase**: Visit `http://localhost:3000` - should load without errors
2. **OpenAI**: Try accessing `/api/questions/next` - should generate a question
3. **Stripe**: Will test when you implement billing page

---

## 🆘 Troubleshooting

### Supabase Errors
- **"Missing Supabase environment variables"**: Check that all 3 Supabase keys are in `.env.local`
- **Table errors**: Make sure you ran the SQL script correctly

### OpenAI Errors
- **"Insufficient quota"**: Add payment method in OpenAI dashboard
- **"Invalid API key"**: Make sure key starts with `sk-` and has no spaces

### Stripe Errors
- **"Invalid API key"**: Make sure you're using test mode keys (`pk_test_` and `sk_test_`)
- **Webhook errors**: Make sure Stripe CLI is running if testing locally

---

## ✅ Next Steps

Once all APIs are set up:
1. Test question generation
2. Set up authentication (Google OAuth or Email)
3. Build the play page UI
4. Implement user profiles
5. Add subscription functionality

