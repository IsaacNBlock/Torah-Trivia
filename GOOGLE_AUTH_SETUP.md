# Google Authentication Setup Guide

## ✅ Implementation Complete!

Google authentication has been successfully integrated into your app. Here's what was implemented:

### Features Added:
1. **Google Sign-In Button on Homepage** - Users can sign in directly from the homepage
2. **Google Sign-In Button on Auth Page** - Available on the login/signup form
3. **OAuth Callback Handler** - Handles the redirect from Google
4. **Automatic Profile Creation** - User profiles are created automatically on first Google sign-in

---

## 🔧 Supabase Configuration (Already Done)

Since you mentioned you've already set up Google in Supabase, make sure:

1. **Redirect URLs are configured:**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your redirect URL: `http://localhost:3002/auth/callback` (for local dev)
   - For production, add: `https://your-domain.com/auth/callback`

2. **Google OAuth is enabled:**
   - Go to Authentication → Providers → Google
   - Make sure "Enable Google provider" is toggled ON
   - Your Google OAuth credentials should be configured

---

## 📝 Files Created/Modified

### New Files:
- `components/GoogleSignInButton.tsx` - Reusable Google sign-in button component
- `app/auth/callback/route.ts` - Handles OAuth callback from Google

### Modified Files:
- `components/AuthProvider.tsx` - Added `signInWithGoogle()` method
- `app/page.tsx` - Added Google sign-in button on homepage
- `components/AuthForm.tsx` - Added Google sign-in button to auth form

---

## 🎮 How It Works

### Sign-In Flow:
1. User clicks "Continue with Google" button
2. Redirected to Google OAuth consent screen
3. User authorizes the app
4. Google redirects back to `/auth/callback`
5. Callback route exchanges code for session
6. User is redirected to homepage, now signed in
7. Profile is automatically created (via your existing trigger)

### Homepage:
- **Not logged in:** Shows "Continue with Google" button
- **Logged in:** Shows tier, points, and "Start Playing" button

### Auth Page:
- Shows Google sign-in button at the top
- Below that, email/password options
- Clean "Or continue with" divider

---

## 🧪 Testing

### Test Google Sign-In:

1. **From Homepage:**
   - Visit homepage (while not logged in)
   - Click "Continue with Google"
   - Complete Google sign-in
   - Should redirect back and be logged in

2. **From Auth Page:**
   - Go to `/auth`
   - Click "Continue with Google"
   - Complete Google sign-in
   - Should redirect back and be logged in

3. **Verify Profile Creation:**
   - After first Google sign-in
   - Check Supabase Dashboard → Table Editor → `profiles`
   - Your profile should be automatically created
   - Display name should be from Google account

---

## 🐛 Troubleshooting

### Issue: "redirect_uri_mismatch" error
**Solution:**
- Check Supabase Dashboard → Authentication → URL Configuration
- Make sure `http://localhost:3002/auth/callback` is in the redirect URLs
- Make sure there's no trailing slash
- For production, add your production URL

### Issue: Redirects but not logged in
**Solution:**
- Check browser console for errors
- Verify callback route is working (`/auth/callback`)
- Check Supabase logs for auth errors
- Verify Google OAuth credentials are correct in Supabase

### Issue: Profile not created automatically
**Solution:**
- Check that your trigger function exists (from initial setup)
- Verify the function is set up correctly in Supabase
- Check Supabase logs for errors

### Issue: Button doesn't respond
**Solution:**
- Check browser console for JavaScript errors
- Verify `signInWithGoogle` is properly exported from AuthProvider
- Check network tab to see if request is being made

---

## 📋 Redirect URL Configuration

### For Local Development:
```
http://localhost:3002/auth/callback
```
(Or whatever port your dev server is using - check your terminal)

### For Production:
```
https://your-domain.com/auth/callback
```

### How to Add in Supabase:
1. Go to Supabase Dashboard
2. Click **Authentication** → **URL Configuration**
3. Under **Redirect URLs**, click **"Add URL"**
4. Add your redirect URL
5. Click **Save**

---

## ✅ What Users See

### Homepage (Not Logged In):
```
📘 Torah Trivia
Test your Torah knowledge with AI-generated questions

[Continue with Google]  ← New button!

Or sign in with email

[Start Playing] (disabled or hidden)
```

### Homepage (Logged In):
```
📘 Torah Trivia
Test your Torah knowledge with AI-generated questions

Your Current Tier
[Beginner]
50 points

[Start Playing]

[Profile] [Billing]
```

### Auth Page:
```
Sign In

[Continue with Google]  ← New button!

──────── Or continue with ────────

Email: [___________]
Password: [___________]

[Sign In]

Don't have an account? Sign up
```

---

## 🎉 Success Criteria

Google authentication is working if:
- ✅ "Continue with Google" button appears on homepage when not logged in
- ✅ Clicking button redirects to Google OAuth
- ✅ After authorizing, user is redirected back and logged in
- ✅ User profile is automatically created
- ✅ User can access protected pages (Play, Profile)
- ✅ Google sign-in also works from `/auth` page

---

## 🚀 Next Steps

1. **Test the flow** - Try signing in with Google
2. **Check redirect URLs** - Make sure they're configured correctly
3. **Test on different browsers** - Ensure compatibility
4. **For production** - Add production redirect URL to Supabase

Everything is set up and ready to use! 🎊
