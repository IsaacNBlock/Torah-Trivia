# Fix: Invalid Supabase URL Error

## ❌ The Error
```
Error: Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL
```

## 🔧 Quick Fix

Your `.env.local` file has placeholder values instead of real Supabase credentials.

### Step 1: Open Your `.env.local` File

The file should be in your project root: `/Users/isaacblock/Desktop/YU/Fall 2025/AI /Final Project/.env.local`

### Step 2: Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and log in
2. Select your project (or create one if you haven't)
3. Go to **Settings** → **API** (left sidebar)
4. Copy these values:
   - **Project URL** - looks like `https://xxxxx.supabase.co`
   - **anon public** key - long string starting with `eyJ...`
   - **service_role** key - long string starting with `eyJ...` (click "Reveal" to see it)

### Step 3: Update `.env.local`

Replace the placeholder values with your actual credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Stripe Configuration (can use placeholders for now)
STRIPE_SECRET_KEY=placeholder
STRIPE_WEBHOOK_SECRET=placeholder
STRIPE_PRICE_ID_PRO=placeholder
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=placeholder

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

**Important Notes:**
- The URL **must** start with `https://`
- No trailing slashes on the URL
- No quotes around the values
- No spaces around the `=` sign

### Step 4: Restart Your Dev Server

After updating `.env.local`:

1. Stop the current dev server (Ctrl+C in the terminal)
2. Start it again: `npm run dev`
3. Refresh your browser

## ✅ Verify It's Working

After restarting, the error should be gone. If you still see issues:

1. **Double-check the URL format:**
   - ✅ Good: `https://abcdefghijklmnop.supabase.co`
   - ❌ Bad: `your_supabase_project_url`
   - ❌ Bad: `https://abcdefghijklmnop.supabase.co/` (trailing slash)
   - ❌ Bad: `abcdefghijklmnop.supabase.co` (missing https://)

2. **Check for typos:**
   - Make sure variable names are exact (case-sensitive)
   - No extra spaces
   - No quotes

3. **Restart the server:**
   - Environment variables are only loaded when the server starts
   - Always restart after changing `.env.local`

## 🔍 Still Having Issues?

If the error persists:

1. **Check your terminal output** - Look for any env variable warnings
2. **Verify file location** - Make sure `.env.local` is in the project root
3. **Check file permissions** - Make sure the file is readable
4. **Try hard refresh** - Clear browser cache (Cmd+Shift+R on Mac)

## 📝 Example `.env.local` Format

```bash
# This is what your file should look like (with YOUR actual values)
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk5MTIzNCwiZXhwIjoxOTU0NTY3MjM0fQ.example
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM4OTkxMjM0LCJleHAiOjE5NTQ1NjcyMzR9.example
OPENAI_API_KEY=sk-proj-example123456789
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

Once you've updated the file with real values and restarted the server, the error should be fixed! 🎉
