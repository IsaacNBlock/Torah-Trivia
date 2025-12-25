# Pre-Deployment Checklist

Use this checklist before deploying to Vercel to ensure everything is ready.

## Code Preparation

- [ ] All code is committed to Git
- [ ] All changes are pushed to your repository
- [ ] `npm run build` succeeds locally without errors
- [ ] `npm run lint` passes (or warnings are acceptable)
- [ ] TypeScript compiles without errors

## Environment Variables

Gather all these values before deploying:

### Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (keep secret!)

### OpenAI
- [ ] `OPENAI_API_KEY` - Your OpenAI API key

### Stripe
- [ ] `STRIPE_SECRET_KEY` - Stripe secret key (starts with `sk_`)
- [ ] `STRIPE_WEBHOOK_SECRET` - Will get this after setting up webhook
- [ ] `STRIPE_PRICE_ID_PRO` - Your Stripe Pro subscription price ID (starts with `price_`)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (starts with `pk_`)

### App Configuration
- [ ] `NEXT_PUBLIC_APP_URL` - Will be your Vercel URL (e.g., `https://your-app.vercel.app`)

## Database Setup

- [ ] All database tables created in Supabase
- [ ] Run `DATABASE_SCHEMA_UPDATE.sql` in Supabase SQL Editor
- [ ] Row Level Security (RLS) policies are enabled
- [ ] Test database connection works

## Third-Party Services Configuration

### Supabase Auth
- [ ] Google OAuth is configured in Supabase
- [ ] Redirect URLs will be updated after deployment (note this)

### Stripe
- [ ] Stripe account is set up
- [ ] Product and Price created for Pro subscription
- [ ] Webhook endpoint will be created after deployment (note this)

## Testing Locally

- [ ] Sign in with Google works
- [ ] Questions can be generated
- [ ] Answers can be submitted
- [ ] Profile page loads correctly
- [ ] (If Pro) Head-to-head games work
- [ ] (If Pro) Stripe checkout works

## Files to Verify

- [ ] `vercel.json` exists (created for deployment)
- [ ] `.gitignore` includes `.env*` files
- [ ] `package.json` has all dependencies
- [ ] `package-lock.json` is committed

## Post-Deployment Tasks

After first deployment:

- [ ] Update `NEXT_PUBLIC_APP_URL` in Vercel with actual URL
- [ ] Configure Stripe webhook with Vercel URL
- [ ] Update Supabase redirect URLs
- [ ] Test all features on production
- [ ] Check Vercel function logs for errors

---

**Ready to deploy?** Follow the steps in `VERCEL_DEPLOYMENT.md`

