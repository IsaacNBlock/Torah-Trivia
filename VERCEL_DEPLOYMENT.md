# Vercel Deployment Guide

This guide will walk you through deploying your Torah Trivia app to Vercel.

## Prerequisites

- ✅ Your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket)
- ✅ All environment variables are documented in `env.example`
- ✅ Your app builds successfully locally (`npm run build`)

## Step 1: Prepare Your Repository

1. **Ensure your code is committed and pushed to Git:**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Verify your `.gitignore` includes:**
   - `.env.local`
   - `.env`
   - `node_modules/`
   - `.next/`
   - `.vercel/`

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to [vercel.com](https://vercel.com)** and sign up/login
   - You can sign in with GitHub, GitLab, or Bitbucket

2. **Click "Add New Project"**

3. **Import your Git repository:**
   - Select your repository from the list
   - Vercel will auto-detect it's a Next.js project

4. **Configure Project Settings:**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (leave as default)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)

5. **Add Environment Variables:**
   Click "Environment Variables" and add all the following:

   ```
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key

   # Stripe Configuration
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   STRIPE_PRICE_ID_PRO=your_stripe_pro_price_id
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

   # App Configuration
   NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
   ```

   **Important:** 
   - Replace `NEXT_PUBLIC_APP_URL` with your actual Vercel URL after first deployment
   - Make sure to add variables for all environments (Production, Preview, Development)

6. **Click "Deploy"**

7. **Wait for deployment to complete** (usually 2-3 minutes)

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Follow the prompts:**
   - Set up and deploy? **Yes**
   - Which scope? (Select your account)
   - Link to existing project? **No** (for first deployment)
   - Project name? (Enter a name or press Enter for default)
   - Directory? `./` (press Enter)
   - Override settings? **No**

5. **Add environment variables:**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add OPENAI_API_KEY
   vercel env add STRIPE_SECRET_KEY
   vercel env add STRIPE_WEBHOOK_SECRET
   vercel env add STRIPE_PRICE_ID_PRO
   vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   vercel env add NEXT_PUBLIC_APP_URL
   ```

6. **Deploy to production:**
   ```bash
   vercel --prod
   ```

## Step 3: Update Stripe Webhook URL

After deployment, you need to update your Stripe webhook:

1. **Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)**

2. **Find your webhook endpoint** (or create a new one)

3. **Update the endpoint URL to:**
   ```
   https://your-app-name.vercel.app/api/stripe/webhook
   ```

4. **Copy the webhook signing secret** and update it in Vercel:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Update `STRIPE_WEBHOOK_SECRET` with the new secret

5. **Redeploy** (or wait for automatic redeploy if you have auto-deploy enabled)

## Step 4: Update Supabase Auth Redirect URLs

1. **Go to [Supabase Dashboard](https://app.supabase.com)**

2. **Navigate to:** Authentication → URL Configuration

3. **Add your Vercel URLs:**
   - **Site URL:** `https://your-app-name.vercel.app`
   - **Redirect URLs:** Add:
     - `https://your-app-name.vercel.app/auth/callback`
     - `https://your-app-name.vercel.app/**` (for all routes)

4. **Save changes**

## Step 5: Update NEXT_PUBLIC_APP_URL

After your first deployment:

1. **Go to Vercel Dashboard → Your Project → Settings → Environment Variables**

2. **Update `NEXT_PUBLIC_APP_URL`** to your actual Vercel URL:
   ```
   NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
   ```

3. **Redeploy** (or trigger a new deployment)

## Step 6: Verify Deployment

1. **Visit your deployed app:** `https://your-app-name.vercel.app`

2. **Test key features:**
   - ✅ Sign in with Google
   - ✅ Play a question
   - ✅ View profile
   - ✅ (If Pro) Create head-to-head game
   - ✅ (If Pro) Upgrade to Pro subscription

3. **Check Vercel logs** if anything doesn't work:
   - Go to Vercel Dashboard → Your Project → Deployments → Click on a deployment → View Function Logs

## Troubleshooting

### Build Fails

**Error: Module not found**
- Make sure all dependencies are in `package.json`
- Run `npm install` locally and commit `package-lock.json`

**Error: TypeScript errors**
- Fix all TypeScript errors locally first
- Run `npm run build` locally to verify

**Error: Environment variable missing**
- Double-check all environment variables are set in Vercel
- Make sure variables are added for the correct environment (Production/Preview/Development)

### Runtime Errors

**Error: Supabase connection failed**
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check Supabase project is active and not paused

**Error: OpenAI API error**
- Verify `OPENAI_API_KEY` is correct and has credits
- Check API key permissions

**Error: Stripe webhook not working**
- Verify webhook URL in Stripe dashboard matches your Vercel URL
- Check `STRIPE_WEBHOOK_SECRET` matches the webhook signing secret
- Test webhook in Stripe dashboard → Webhooks → Send test webhook

**Error: Auth redirect not working**
- Verify redirect URLs in Supabase match your Vercel URL
- Check `NEXT_PUBLIC_APP_URL` is set correctly

### Performance Issues

- **Enable Vercel Analytics** (optional but recommended):
  - Go to Project Settings → Analytics
  - Enable Web Analytics

- **Check function execution time:**
  - Vercel free tier has 10s timeout for serverless functions
  - If OpenAI calls are slow, consider adding timeout handling

## Continuous Deployment

Vercel automatically deploys when you push to your main branch:

1. **Push to main branch:**
   ```bash
   git push origin main
   ```

2. **Vercel automatically:**
   - Detects the push
   - Builds your app
   - Deploys to production

3. **Preview deployments** are created for:
   - Pull requests
   - Other branches

## Custom Domain (Optional)

1. **Go to Vercel Dashboard → Your Project → Settings → Domains**

2. **Add your custom domain**

3. **Follow DNS configuration instructions**

4. **Update environment variables:**
   - Update `NEXT_PUBLIC_APP_URL` to your custom domain
   - Update Supabase redirect URLs
   - Update Stripe webhook URL

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables in Vercel](https://vercel.com/docs/concepts/projects/environment-variables)

---

## Quick Checklist

- [ ] Code pushed to Git repository
- [ ] All environment variables added to Vercel
- [ ] Stripe webhook URL updated
- [ ] Supabase redirect URLs updated
- [ ] `NEXT_PUBLIC_APP_URL` set to Vercel URL
- [ ] Deployment successful
- [ ] All features tested
- [ ] Custom domain configured (optional)

---

**Need help?** Check Vercel's [support documentation](https://vercel.com/support) or your deployment logs.

