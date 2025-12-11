# Torah Trivia — README.md

## 📘 Overview

**Torah Trivia** is a modern, AI-powered trivia platform designed to help users engage with and deepen their Torah knowledge in an interactive and gamified way.  
Users answer dynamically generated Torah trivia questions, earn points, climb through structured tiers, and unlock increasingly challenging prompts.  
This application integrates **OpenAI**, **Supabase**, **Stripe**, **Google Authentication**, and **Next.js**, and deploys seamlessly on **Vercel**.

---

## 🎯 Project Goals

1. Deliver an enjoyable and educational Torah trivia experience.
2. Provide structured gamification through points, streaks, and tier progression.
3. Generate endless, high-quality Torah questions using AI.
4. Support monetization through a Pro tier using Stripe.
5. Maintain simplicity while enabling future expansion.

---

## 🚀 Core Features

### 🧠 AI-Generated Torah Trivia
- Questions generated dynamically using OpenAI.
- Multiple categories (Chumash, Navi, Ketuvim, etc.)
- Difficulty scaling based on user tier
- Strict JSON structure for reliable parsing

---

### 🏆 Gamification System

#### Points:
- Correct: +10  
- Incorrect: −3  
- Streak bonus: +5 every 5 correct answers  

#### Tiers:

| Tier | Points |
|------|--------|
| Beginner | 0–99 |
| Student | 100–299 |
| Scholar | 300–699 |
| Chacham | 700–1499 |
| Gadol | 1500+ |

---

## 🔐 Authentication (Supabase + Google)

- Simple Google OAuth login
- Automatic profile creation
- Session persistence

---

## 💳 Subscription System (Stripe)

### Free Plan:
- 20 daily questions  
- Basic explanations  

### Pro Plan:
- Unlimited questions  
- Rich explanations  
- Bonus categories  

---

## 📦 Database Schema (Supabase)

### profiles table:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | auth user id |
| display_name | text | google name |
| points | int | accumulated points |
| tier | text | user tier |
| streak | int | current streak |
| questions_answered | int | lifetime answered |
| plan | text | free or pro |
| subscription_status | text | stripe state |
| daily_questions_used | int | quota |
| daily_reset_date | date | resets usage |

---

## 🗂 Recommended File Structure

```
/app
  /play
  /profile
  /billing
  /api
    /questions
      next.ts
      answer.ts
    /stripe
      checkout.ts
      webhook.ts
/components
/lib
README.md
```

---

## 🔧 Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_PRO=
NEXT_PUBLIC_APP_URL=
```

---

## 📡 API Endpoints

### GET /api/questions/next  
Generates AI question.

### POST /api/questions/answer  
Validates answer and updates score.

### POST /api/stripe/create-checkout-session  
Creates checkout URL.

### POST /api/stripe/webhook  
Handles stripe events.

---

## 🧪 Local Development

```
npm install
npm run dev
```

Stripe webhook:
```
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## 🚀 Deployment

1. Push to GitHub  
2. Connect to Vercel  
3. Add environment variables  
4. Deploy  

---

## 📜 License
MIT
