# Quick Deploy to Vercel

## 🚀 Fast Track (5 minutes)

### 1. Push to Git
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your repository
4. Click **"Deploy"** (we'll add env vars after)

### 3. Add Environment Variables
In Vercel Dashboard → Your Project → Settings → Environment Variables:

**Copy these from your local `.env.local`:**

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
STRIPE_SECRET_KEY
STRIPE_PRICE_ID_PRO
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

**Set this to your Vercel URL** (after first deploy):
```
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
```

**Add this after setting up webhook:**
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. Redeploy
- Go to Deployments → Click "..." → Redeploy

### 5. Configure Webhook
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://your-app-name.vercel.app/api/stripe/webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy webhook secret → Add to Vercel env vars → Redeploy

### 6. Update Supabase
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Authentication → URL Configuration
3. Add Site URL: `https://your-app-name.vercel.app`
4. Add Redirect URL: `https://your-app-name.vercel.app/auth/callback`

### 7. Test!
Visit `https://your-app-name.vercel.app` and test:
- ✅ Sign in
- ✅ Play questions
- ✅ View profile
- ✅ (Pro) Create head-to-head game

---

## 📋 Full Guide
See `VERCEL_DEPLOYMENT.md` for detailed instructions and troubleshooting.

## ✅ Checklist
See `DEPLOYMENT_CHECKLIST.md` for a complete pre-deployment checklist.
