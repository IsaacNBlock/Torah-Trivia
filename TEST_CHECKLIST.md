# 🧪 Play Page Test Checklist

## ✅ Quick Test Steps

### 1. **Open the App**
   - Go to: http://localhost:3002 (or http://localhost:3000 if that's where your server is running)
   - You should see the homepage without errors

### 2. **Test Authentication**
   - [ ] Click "Sign In" in the navbar
   - [ ] Create a new account (or sign in if you have one)
   - [ ] You should be redirected to the homepage after successful login
   - [ ] Navbar should show your email address

### 3. **Navigate to Play Page**
   - [ ] Click "Play" in the navbar (or "Start Playing" button)
   - [ ] Should redirect to `/play` page
   - [ ] Should see a loading spinner initially
   - [ ] Question should load within 1-3 seconds

### 4. **Test Question Display**
   - [ ] Question text is displayed clearly
   - [ ] Category badge is shown (e.g., "Chumash")
   - [ ] Difficulty badge is shown (e.g., "medium")
   - [ ] Four answer options are displayed
   - [ ] Options are clickable

### 5. **Test Answer Selection**
   - [ ] Click on an answer option
   - [ ] Selected option should highlight (blue border/background)
   - [ ] "Submit Answer" button should become enabled
   - [ ] Can change selection by clicking a different option

### 6. **Test Answer Submission**
   - [ ] Click "Submit Answer"
   - [ ] Loading spinner should appear
   - [ ] Should process in 1-2 seconds
   - [ ] Results page should appear

### 7. **Test Results Display**
   - [ ] Shows ✅ or ❌ based on correctness
   - [ ] Displays "Correct!" or "Incorrect" message
   - [ ] Shows the correct answer (if wrong)
   - [ ] Shows explanation
   - [ ] Displays stats:
     - [ ] Points earned (e.g., "+10" or "-3")
     - [ ] Total points
     - [ ] Current streak
     - [ ] Current tier (e.g., "Beginner")
   - [ ] Shows streak bonus if applicable (🔥 icon)
   - [ ] "Next Question" button is visible

### 8. **Test Next Question Flow**
   - [ ] Click "Next Question"
   - [ ] Loading spinner appears
   - [ ] New question loads
   - [ ] Can answer again
   - [ ] Points should accumulate

### 9. **Test Multiple Rounds**
   - [ ] Answer 2-3 questions
   - [ ] Verify points are accumulating correctly
   - [ ] Verify streak is updating (correct answers increase, wrong resets)
   - [ ] Verify tier changes as points increase (if applicable)

### 10. **Test Error Handling**
   - [ ] Disconnect internet briefly
   - [ ] Try to submit answer → should show error
   - [ ] Click "Try Again" → should retry

## 🐛 Common Issues to Watch For

### Issue: "Unauthorized - please sign in"
- **Check:** Are you signed in?
- **Fix:** Sign in first, then try again

### Issue: "Failed to generate question"
- **Check:** Is OpenAI API key correct?
- **Check:** Do you have OpenAI credits?
- **Check:** Browser console for specific error

### Issue: "Daily question limit reached"
- **Expected:** Free users have 20 questions/day limit
- **Check:** This is working correctly (not a bug)

### Issue: Questions don't load
- **Check:** Browser console (F12) for errors
- **Check:** Network tab to see API requests
- **Check:** Server terminal for errors

### Issue: Answers don't save/points don't update
- **Check:** Browser console for errors
- **Check:** Network tab to verify POST to `/api/questions/answer`
- **Check:** Supabase dashboard → profiles table to verify data

## ✅ Success Criteria

Your Play page is working correctly if:
- ✅ You can sign in
- ✅ Questions load automatically
- ✅ You can select and submit answers
- ✅ Results display correctly with all stats
- ✅ You can play multiple questions
- ✅ Points are saved in the database
- ✅ No console errors (except warnings are OK)

## 📊 What to Check in Browser Dev Tools (F12)

1. **Console Tab:**
   - Should be mostly clean (warnings OK, errors bad)
   - Look for any red error messages

2. **Network Tab:**
   - `/api/questions/next` → Should return 200 OK with question data
   - `/api/questions/answer` → Should return 200 OK with answer result
   - Check request/response bodies

3. **Application Tab → Cookies:**
   - Should see Supabase session cookies
   - Should see authentication tokens

## 🎯 Database Verification (Supabase Dashboard)

After playing a few questions:
1. Go to Supabase Dashboard
2. Navigate to Table Editor → `profiles`
3. Find your user profile
4. Verify:
   - `points` has increased
   - `questions_answered` has increased
   - `streak` is correct
   - `tier` has updated (if points crossed threshold)
   - `daily_questions_used` has increased

## 🚀 Next Steps After Testing

If everything works:
1. ✅ Play page is complete!
2. Next: Build the Profile page to display stats
3. Or: Add more features (animations, sounds, etc.)

If you find issues:
1. Note the specific error/problem
2. Check browser console
3. Check server logs
4. Share the error details for help

Happy testing! 🎮



