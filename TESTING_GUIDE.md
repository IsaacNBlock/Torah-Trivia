# Testing Guide - Play Page

## 🚀 Quick Start

Your dev server is running at: **http://localhost:3002**

## ⚠️ Before Testing

Make sure your `.env.local` file has real values (not placeholders):

```bash
# Required for authentication
NEXT_PUBLIC_SUPABASE_URL=your_actual_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key

# Required for question generation
OPENAI_API_KEY=your_actual_openai_key

# Required
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

**If you haven't filled these in yet:**
1. Open `.env.local` in your editor
2. Replace all placeholder values with your actual keys from:
   - Supabase Dashboard → Settings → API
   - OpenAI Platform → API Keys
3. **Restart the dev server** after updating `.env.local`

---

## 🧪 Testing Steps

### 1. **Open the App**
   - Navigate to: http://localhost:3002
   - You should see the homepage

### 2. **Sign Up / Sign In**
   - Click "Sign In" in the navbar
   - If you don't have an account, click "Don't have an account? Sign up"
   - Create an account with:
     - Email (use a real email for magic link, or test email)
     - Password (minimum 6 characters)
   - **Note**: For testing, you may need to disable email confirmation in Supabase:
     - Go to Supabase Dashboard → Authentication → Settings
     - Disable "Enable email confirmations" (for development only)

### 3. **Navigate to Play Page**
   - After signing in, click "Play" in the navbar
   - Or click "Start Playing" on the homepage
   - You should see a loading spinner, then a question

### 4. **Test Question Flow**
   - ✅ Question should load automatically
   - ✅ See category and difficulty badges
   - ✅ See question text
   - ✅ See 4 answer options
   - ✅ Click an option (it should highlight)
   - ✅ Click "Submit Answer"

### 5. **Test Results Display**
   - ✅ Should show correct/incorrect
   - ✅ Should display:
     - Points earned
     - Total points
     - Current streak
     - Tier
   - ✅ Should show explanation
   - ✅ Should show streak bonus if applicable

### 6. **Test Next Question**
   - ✅ Click "Next Question"
   - ✅ New question should load
   - ✅ Repeat the flow

### 7. **Test Error Handling**
   - Try disconnecting from internet → should show error
   - Check console for any errors

---

## 🐛 Common Issues & Solutions

### Issue: "Unauthorized - please sign in"
**Solution**: 
- Make sure you're signed in
- Check browser console for auth errors
- Verify Supabase environment variables are correct

### Issue: "Failed to generate question" / OpenAI errors
**Solution**:
- Check that `OPENAI_API_KEY` is set correctly
- Verify you have credits in your OpenAI account
- Check OpenAI dashboard for any errors
- Try using `gpt-3.5-turbo` instead of `gpt-4` (already configured)

### Issue: "Daily question limit reached"
**Solution**:
- This is expected for free users (20 questions/day)
- Check your profile to see daily usage
- Wait until next day, or upgrade to Pro (when Stripe is set up)

### Issue: Page shows "Loading..." forever
**Solution**:
- Check browser console for errors
- Check terminal/console for server errors
- Verify all environment variables are set
- Make sure Supabase database table `profiles` was created

### Issue: Questions not loading
**Solution**:
- Check network tab in browser dev tools
- Verify API route is being called: `/api/questions/next`
- Check server logs for errors
- Make sure OpenAI API key is valid

### Issue: Answers not submitting
**Solution**:
- Check browser console for errors
- Verify you selected an answer before clicking submit
- Check network tab to see if request is sent
- Verify authentication is working

---

## 🔍 What to Check

### Browser Console (F12)
- Look for any red errors
- Check network requests:
  - `/api/questions/next` - should return 200 OK
  - `/api/questions/answer` - should return 200 OK
- Check authentication:
  - Should see session cookie set
  - No "Unauthorized" errors

### Server Terminal
- Look for any error messages
- Check if API routes are being hit
- Verify environment variables are loaded

### Database (Supabase Dashboard)
- Check `profiles` table:
  - Your user profile should be created automatically
  - Points should update after answering
  - Tier should change as points increase

---

## ✅ Expected Behavior

1. **First Load**:
   - Question loads in ~1-3 seconds
   - Shows loading spinner during fetch
   - Question appears with 4 options

2. **Answer Selection**:
   - Option highlights when clicked
   - Submit button enables
   - Can change selection before submitting

3. **Answer Submission**:
   - Shows loading spinner
   - Processes answer in ~1-2 seconds
   - Shows results page

4. **Results**:
   - Correct answers: ✅ green, shows points earned
   - Incorrect answers: ❌ red, shows correct answer
   - Always shows explanation
   - Shows stats (points, streak, tier)

5. **Next Question**:
   - Click "Next Question"
   - New question loads
   - Process repeats

---

## 📊 Success Criteria

Your Play page is working correctly if:
- ✅ You can sign in/sign up
- ✅ Questions load automatically
- ✅ You can select answers
- ✅ Answers submit successfully
- ✅ Results show correctly
- ✅ Points update in database
- ✅ You can play multiple questions
- ✅ No console errors (except warnings are OK)

---

## 🎯 Next Steps After Testing

Once Play page is working:
1. Test with multiple accounts
2. Test daily limits
3. Verify points are saved correctly
4. Check tier progression
5. Build Profile page to view stats

---

## 💡 Tips

- Keep browser dev tools open (F12) to see any errors
- Check Network tab to see API requests
- Use Supabase Dashboard to verify data is saving
- Test on different browsers
- Test on mobile (responsive design should work)

Happy testing! 🎮
