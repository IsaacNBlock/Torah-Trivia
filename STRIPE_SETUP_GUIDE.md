# Stripe Setup Guide - Pro Subscription

This guide will help you set up Stripe to enable Pro subscriptions for unlimited questions.

## 🎯 Quick Setup Steps

### Step 1: Create Stripe Account (if you haven't)

1. Go to [stripe.com](https://stripe.com)
2. Sign up for an account (free)
3. Complete the onboarding process

### Step 2: Get Stripe API Keys

1. Make sure you're in **Test mode** (toggle in top right)
2. Go to **Developers** → **API keys** (left sidebar)
3. Copy:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...` - click "Reveal test key")

### Step 3: Create Product & Price

1. Go to **Products** (left sidebar)
2. Click **"+ Add product"**
3. Fill in:
   - **Name**: `Torah Trivia Pro`
   - **Description**: `Unlimited questions, rich explanations, bonus categories`
   - **Pricing model**: Select **Recurring**
   - **Price**: `9.99` USD (or whatever you want)
   - **Billing period**: **Monthly**
4. Click **"Save product"**
5. After saving, you'll see the product page
6. **Copy the Price ID** - it looks like `price_xxxxxxxxxxxxx` (starts with `price_`)

### Step 4: Set Up Webhook for Local Development

For testing locally, use Stripe CLI to forward webhooks:

1. **Install Stripe CLI:**
   ```bash
   # Mac (using Homebrew)
   brew install stripe/stripe-cli/stripe
   
   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe CLI:**
   ```bash
   stripe login
   ```
   (This will open your browser to authenticate)

3. **Forward webhooks to your local server:**
   ```bash
   stripe listen --forward-to localhost:3002/api/stripe/webhook
   ```
   (Replace `3002` with your actual port number)

4. **Copy the webhook signing secret:**
   - After running the command, you'll see output like:
   ```
   > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
   ```
   - Copy that `whsec_...` value

### Step 5: Update Environment Variables

Open your `.env.local` file and add/update:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
STRIPE_PRICE_ID_PRO=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```

**Important:**
- Use `sk_test_...` for secret key (test mode)
- Use `pk_test_...` for publishable key (test mode)
- Use the Price ID you copied in Step 3
- Use the webhook secret from Step 4

### Step 6: Restart Your Dev Server

After updating `.env.local`:
1. Stop your dev server (Ctrl+C)
2. Start it again: `npm run dev`

**Also make sure Stripe CLI is running:**
- Keep the `stripe listen` command running in a separate terminal
- This forwards webhooks to your local server

---

## 🧪 Testing the Pro Upgrade

### Test Payment Flow:

1. **Go to Billing Page:**
   - Visit `/billing` in your app
   - You should see Free and Pro plan cards

2. **Click "Upgrade to Pro":**
   - Should redirect to Stripe Checkout
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any ZIP code

3. **Complete Checkout:**
   - Click "Subscribe"
   - You'll be redirected back to `/billing?success=true`
   - Your profile should now show "Pro" plan

4. **Verify Unlimited Questions:**
   - Go to Play page
   - Answer more than 20 questions
   - Should not hit daily limit

---

## 🔄 Manual Testing (Quick Test Without Payment)

If you want to quickly test without setting up Stripe, you can manually update your plan in the database:

### Option 1: Via Supabase Dashboard

1. Go to Supabase Dashboard
2. Navigate to **Table Editor** → `profiles`
3. Find your user profile
4. Edit the row:
   - Set `plan` to `pro`
   - Set `subscription_status` to `active`
5. Save

### Option 2: Via SQL

Run this in Supabase SQL Editor:

```sql
UPDATE profiles
SET plan = 'pro', subscription_status = 'active'
WHERE id = 'your-user-id-here';
```

Replace `your-user-id-here` with your actual user ID from the auth.users table.

---

## 🐛 Troubleshooting

### Issue: "Stripe price ID not configured"
**Solution:**
- Check that `STRIPE_PRICE_ID_PRO` is set in `.env.local`
- Make sure the value starts with `price_`
- Restart your dev server after adding it

### Issue: "Stripe is not properly configured"
**Solution:**
- Check that `STRIPE_SECRET_KEY` is set in `.env.local`
- Make sure it starts with `sk_test_` (for test mode)
- Restart your dev server

### Issue: Webhook not working
**Solution:**
- Make sure Stripe CLI is running: `stripe listen --forward-to localhost:3002/api/stripe/webhook`
- Check that `STRIPE_WEBHOOK_SECRET` is set to the `whsec_...` value from CLI
- Verify the webhook endpoint URL in CLI matches your server port
- Check server logs for webhook errors

### Issue: Payment succeeds but plan doesn't update
**Solution:**
- Check that Stripe CLI is running
- Verify webhook secret is correct
- Check server terminal for webhook processing errors
- Verify the webhook endpoint is accessible

### Issue: Can't create checkout session
**Solution:**
- Verify all Stripe environment variables are set
- Check that you're using test mode keys (`sk_test_` and `pk_test_`)
- Check server logs for specific error messages

---

## ✅ Verification Checklist

- [ ] Stripe account created
- [ ] Test mode API keys obtained
- [ ] Product and Price created in Stripe
- [ ] Price ID copied and added to `.env.local`
- [ ] Stripe CLI installed and logged in
- [ ] Webhook forwarding set up (`stripe listen`)
- [ ] Webhook secret copied and added to `.env.local`
- [ ] All environment variables set in `.env.local`
- [ ] Dev server restarted
- [ ] Tested checkout flow with test card
- [ ] Verified plan updates after payment

---

## 📋 Test Credit Cards

Stripe provides test cards for different scenarios:

| Card Number | Scenario |
|------------|----------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |

All test cards:
- Expiry: Any future date (e.g., `12/25`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

---

## 🚀 For Production

When deploying to production:

1. **Switch to Live Mode:**
   - In Stripe Dashboard, toggle from "Test mode" to "Live mode"
   - Get your live API keys (starts with `sk_live_` and `pk_live_`)

2. **Update Environment Variables:**
   - Set live keys in your production environment (Vercel, etc.)
   - Create a live webhook endpoint in Stripe Dashboard

3. **Set Up Production Webhook:**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/stripe/webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Copy the webhook signing secret

4. **Update App URL:**
   - Set `NEXT_PUBLIC_APP_URL` to your production domain

---

## 🎉 Success!

Once everything is set up:
- Users can upgrade to Pro from the Billing page
- Pro users get unlimited questions
- Subscriptions are managed through Stripe
- Webhooks automatically update user plans

Happy testing! 🎮
