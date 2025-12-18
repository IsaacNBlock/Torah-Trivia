# Troubleshooting: Homepage Not Loading

## Common Causes & Solutions

### 1. **Server Not Restarted After .env.local Changes**

**Problem:** Environment variables are only loaded when the server starts.

**Solution:**
1. Stop the dev server (Ctrl+C in terminal)
2. Start it again: `npm run dev`
3. Refresh your browser

### 2. **Invalid Supabase URL in .env.local**

**Problem:** If the Supabase URL is still a placeholder or invalid, the page will crash.

**Check:**
- Open `.env.local`
- Verify `NEXT_PUBLIC_SUPABASE_URL` starts with `https://`
- Should look like: `https://abcdefghijklmnop.supabase.co`
- NOT like: `your_supabase_project_url` or `http://localhost...`

**Solution:**
1. Get your actual Supabase URL from Supabase Dashboard → Settings → API
2. Update `.env.local` with the correct URL
3. Restart the server

### 3. **Missing Environment Variables**

**Problem:** Required environment variables are missing.

**Check your `.env.local` has:**
```
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

### 4. **Browser Console Errors**

**Check Browser Console:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Common errors:
   - "Invalid Supabase URL" → Fix `.env.local` and restart server
   - "Missing environment variables" → Add missing vars to `.env.local`
   - "Failed to fetch" → Check if server is running

### 5. **Wrong Port Number**

**Check:**
- Your server might be running on a different port
- Check terminal output for: `Local: http://localhost:XXXX`
- Try both: http://localhost:3000 and http://localhost:3002

### 6. **Server Crashed**

**Check Terminal:**
- Look for error messages in the terminal where `npm run dev` is running
- If you see errors, note them and fix accordingly

## Quick Diagnostic Steps

### Step 1: Verify Server is Running
```bash
# In terminal
curl http://localhost:3002
# or
curl http://localhost:3000
```

Should return HTML, not "Connection refused"

### Step 2: Check Environment Variables Are Loaded
Look in terminal output when server starts - should see:
```
✓ Ready in Xms
```

If you see errors about missing env vars, fix `.env.local`

### Step 3: Check Browser Console
1. Open http://localhost:3002 (or 3000)
2. Open DevTools (F12)
3. Check Console tab for errors
4. Check Network tab - are requests failing?

### Step 4: Verify .env.local Format
Make sure your `.env.local` has NO quotes around values:
```bash
# ✅ Correct
NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co

# ❌ Wrong
NEXT_PUBLIC_SUPABASE_URL="https://abc.supabase.co"
NEXT_PUBLIC_SUPABASE_URL='https://abc.supabase.co'
```

### Step 5: Hard Refresh Browser
- Mac: Cmd + Shift + R
- Windows/Linux: Ctrl + Shift + R
- Or clear browser cache

## Still Not Working?

1. **Check server logs** - What errors do you see in terminal?
2. **Check browser console** - What errors do you see there?
3. **Verify file exists** - Is `app/page.tsx` present?
4. **Try a different browser** - Rule out browser issues

## Get More Info

Run this to check what's happening:
```bash
# Check if server is running
lsof -i :3000
lsof -i :3002

# Check for errors in terminal
# Look at the terminal where npm run dev is running
```

Share the error messages you see, and I can help debug further!



