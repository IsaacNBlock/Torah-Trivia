# Fix: Stripe Payment Complete But Profile Not Updated

## 🔍 The Problem

Your payment went through in Stripe, but your Supabase profile still shows "free" plan. This means the webhook didn't fire or wasn't received.

## ✅ Quick Fix Options

### Option 1: Manually Update in Supabase (Fastest - 30 seconds)

1. **Get your User ID:**
   - Go to Stripe Dashboard → Customers
   - Find your customer (the one with the subscription)
   - Look at the customer details
   - Check the metadata or notes - your user ID should be there
   - OR go to Supabase Dashboard → Authentication → Users
   - Find your user and copy the UUID

2. **Update Profile:**
   - Go to Supabase Dashboard → Table Editor → `profiles`
   - Find the row with your user ID
   - Edit:
     - `plan` → Change to `pro`
     - `subscription_status` → Change to `active`
   - Save

**Done!** You now have Pro access.

---

### Option 2: Use Stripe Dashboard to Re-send Webhook (Better - For Future Events)

1. **Go to Stripe Dashboard → Developers → Events**
2. **Find the `checkout.session.completed` event** from when you paid
3. **Click on the event**
4. **Click "Send test webhook"** or "Resend webhook"
5. **Make sure Stripe CLI is running** (see Option 3)

This will trigger the webhook again and update your profile.

---

### Option 3: Set Up Stripe CLI for Future Webhooks (Recommended)

If Stripe CLI wasn't running when you paid, that's why the webhook didn't fire. Set it up now:

1. **Install Stripe CLI** (if not installed):
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. **Login:**
   ```bash
   stripe login
   ```

3. **Start forwarding webhooks** (keep this running in a separate terminal):
   ```bash
   stripe listen --forward-to localhost:3002/api/stripe/webhook
   ```
   (Replace `3002` with your actual port)

4. **Copy the webhook secret** it gives you (starts with `whsec_...`)

5. **Update `.env.local`:**
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

6. **Restart your dev server**

Now future payments will automatically update your profile!

---

## 🔧 Why This Happened

Webhooks need a way to reach your local server. For local development:
- **Stripe CLI** forwards webhooks to `localhost`
- Without Stripe CLI running, webhooks can't reach your server
- The payment succeeded in Stripe, but your app never got notified

For production, webhooks go directly to your deployed URL.

---

## ✅ Verify It's Fixed

After manually updating or re-sending the webhook:

1. Go to your app's `/billing` page
2. Should show "✓ Active Subscription" on Pro plan
3. Go to Play page
4. Should be able to play unlimited questions (no daily limit)

---

## 🚀 For Future: Always Keep Stripe CLI Running

When testing payments locally, always keep Stripe CLI running:
```bash
stripe listen --forward-to localhost:3002/api/stripe/webhook
```

Leave this terminal open while testing!
