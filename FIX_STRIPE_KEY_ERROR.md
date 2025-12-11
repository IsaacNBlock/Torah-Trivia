# Fix: Invalid Stripe API Key Error

## ❌ The Error
```
Error: Failed to create checkout session: Invalid API Key provided: mk_1Scyk...
```

## 🔍 What This Means

A key starting with `mk_` is **NOT** a valid Stripe API key. This is likely:
- A Merchant Key (not what you need)
- A different type of key
- A value from the wrong field

## ✅ Solution: Get the Correct Stripe Secret Key

### Step 1: Go to Stripe Dashboard
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Make sure you're in **Test mode** (toggle in top right should say "Test mode")

### Step 2: Navigate to API Keys
1. Click **"Developers"** in the left sidebar
2. Click **"API keys"**

### Step 3: Find the Secret Key
You'll see two sections:

**Publishable key** (starts with `pk_test_...` or `pk_live_...`)
- This is used for client-side Stripe.js
- You need this for `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Secret key** (starts with `sk_test_...` or `sk_live_...`)
- This is what you need for `STRIPE_SECRET_KEY`
- It's hidden by default
- Click **"Reveal test key"** button to see it
- **This is the one you need!**

### Step 4: Copy the Correct Key
1. Click "Reveal test key"
2. Copy the key that starts with `sk_test_...`
3. It will look like: `sk_test_51ABC123...` (long string)

### Step 5: Update Your `.env.local`
Open your `.env.local` file and make sure it looks like this:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51ABC123xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
STRIPE_PRICE_ID_PRO=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123xxxxxxxxxxxxx
```

**Important:**
- `STRIPE_SECRET_KEY` must start with `sk_test_...` (for test mode)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` must start with `pk_test_...` (for test mode)
- No quotes around the values
- No spaces around the `=` sign

### Step 6: Restart Your Dev Server
After updating `.env.local`:
1. Stop your dev server (Ctrl+C)
2. Start it again: `npm run dev`

---

## 🔍 Valid Stripe Key Formats

| Key Type | Format | Used For |
|----------|--------|----------|
| Test Secret Key | `sk_test_...` | Server-side API calls |
| Live Secret Key | `sk_live_...` | Production server-side |
| Test Publishable Key | `pk_test_...` | Client-side Stripe.js |
| Live Publishable Key | `pk_live_...` | Production client-side |
| Webhook Secret | `whsec_...` | Webhook verification |

---

## ❌ Invalid Key Types (Don't Use These)

- `mk_...` - Merchant Key (not for API calls)
- Any key that doesn't start with `sk_test_`, `sk_live_`, `pk_test_`, or `pk_live_`

---

## 🧪 Verify Your Keys Are Correct

After updating `.env.local`, test again:

1. Go to `/billing` page
2. Click "Upgrade to Pro"
3. If you see Stripe Checkout page → ✅ Keys are correct!
4. If you still see the error → Double-check the key format

---

## 📝 Quick Checklist

- [ ] In Stripe Dashboard → Developers → API keys
- [ ] Clicked "Reveal test key" (not just copying the visible masked key)
- [ ] Copied key starting with `sk_test_...`
- [ ] Updated `STRIPE_SECRET_KEY` in `.env.local`
- [ ] Also copied `pk_test_...` for `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] No quotes around the values in `.env.local`
- [ ] Restarted dev server after updating

---

## 💡 Common Mistakes

1. **Copying the masked key** - You need to click "Reveal" to see the full key
2. **Using publishable key as secret key** - They're different! Secret key starts with `sk_`, publishable with `pk_`
3. **Copying merchant key** - The `mk_` key is not an API key
4. **Forgetting to restart server** - Environment variables only load on startup

---

Once you update to the correct `sk_test_...` key, the error should be resolved! 🎉
