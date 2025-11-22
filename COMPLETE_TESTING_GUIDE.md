# 🧪 Complete Testing Guide - SMIMSO

## 📋 Pre-Testing Checklist

### ✅ Step 1: Run Database Migration

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project
   - Click **SQL Editor** in sidebar

2. **Run Complete Migration**
   - Click **New Query**
   - Copy entire content from `BACKEND/src/migrations/complete_migration.sql`
   - Click **Run** (or Ctrl+Enter)
   - Should see: `Success. No rows returned`

3. **Verify Migration**
   - Run verification queries at bottom of migration file
   - Should see:
     - ✅ `caption` column in `posts` table
     - ✅ `notifications` table with 9 columns
     - ✅ 4 indexes on `notifications`
     - ✅ 3 RLS policies

### ✅ Step 2: Restart Backend

```bash
cd BACKEND
# Stop server (Ctrl+C if running)
npm run dev
```

**Expected output:**
```
✅ Server running on port 5000
✅ Connected to Supabase
```

### ✅ Step 3: Restart Frontend

```bash
cd FRONTEND
# Stop server (Ctrl+C if running)
npm run dev
```

**Expected output:**
```
✓ Ready in 2s
○ Local: http://localhost:3000
```

---

## 🧪 Test Suite

### Test 1: AI Metadata Generation ✅

**Goal:** Verify AI generates meaningful metadata

**Steps:**
1. Go to http://localhost:3000/create
2. Upload an image
3. Wait 2-3 seconds

**Expected Results:**
- ✅ Purple AI banner appears
- ✅ Title field auto-filled (not empty)
- ✅ Description field auto-filled (meaningful text)
- ✅ Category auto-selected
- ✅ Tags auto-filled (NOT UUID fragments like "26e0c40c")
- ✅ Tags should be meaningful like ["image", "photo", "post"]

**Success Criteria:**
```json
{
  "caption": "Untitled Image" or "Meaningful Name",
  "tags": ["image", "photo", "post"],
  "description": "An image titled... Share your thoughts!",
  "category_id": "valid-uuid"
}
```

---

### Test 2: Like/Unlike in Post List ✅

**Goal:** Verify like/unlike works in post list with icon color change

**Steps:**
1. Go to http://localhost:3000 (home page)
2. Find a post you haven't liked
3. Click the heart icon

**Expected Results:**
- ✅ Icon changes from outline to filled purple heart
- ✅ Like count increases by 1
- ✅ No page reload
- ✅ Click again to unlike
- ✅ Icon changes back to outline
- ✅ Like count decreases by 1

**Visual Check:**
- **Not liked:** Gray outline heart (FiHeart)
- **Liked:** Purple filled heart (FaHeart) with `text-purple-600`

---

### Test 3: Real-Time Notifications (SSE) ✅

**Goal:** Verify real-time notifications work

**Setup:**
- Need 2 browser windows (or 1 normal + 1 incognito)
- User A (receiver)
- User B (sender)

**Steps:**

#### Part A: Setup User A
1. Open http://localhost:3000 in Browser 1
2. Login as User A
3. Open Browser Console (F12)
4. Look for: `✅ SSE connected`
5. Check notification bell (should have no badge)

#### Part B: User B Triggers Notification
1. Open http://localhost:3000 in Browser 2 (incognito)
2. Login as User B
3. Find a post by User A
4. Like the post
5. Comment on the post

#### Part C: Verify User A Receives Notifications
**In Browser 1 (User A):**
- ✅ Toast notification appears (bottom-right)
- ✅ Red badge appears on notification bell
- ✅ Badge shows "1" or "2"
- ✅ Click bell → Dropdown opens
- ✅ See 2 notifications:
  - "User B liked your post..."
  - "User B commented on your post..."
- ✅ Click notification → Marked as read
- ✅ Badge count decreases

**Console Logs (User A):**
```
✅ SSE connected
📬 New notification: like
📬 New notification: comment
```

---

### Test 4: Notification Dropdown UI ✅

**Goal:** Verify notification dropdown works correctly

**Steps:**
1. Login and have some notifications
2. Click notification bell

**Expected Results:**
- ✅ Dropdown opens below bell
- ✅ Header shows "Thông báo" with unread count badge
- ✅ "Đánh dấu tất cả" button visible
- ✅ Notifications list scrollable (max-h-[600px])
- ✅ Each notification shows:
  - Icon (❤️ for like, 💬 for comment)
  - User name
  - Content
  - Time ago (e.g., "2 phút trước")
  - Blue dot if unread
- ✅ Click notification → Goes to post/profile
- ✅ Click notification → Marked as read
- ✅ Click "Đánh dấu tất cả" → All marked as read
- ✅ Click outside → Dropdown closes

---

### Test 5: Session Persistence ✅

**Goal:** Verify user stays logged in after page reload

**Steps:**
1. Login to http://localhost:3000
2. Navigate around the site
3. Refresh page (F5)
4. Close browser completely
5. Open browser again
6. Go to http://localhost:3000

**Expected Results:**
- ✅ Still logged in after refresh
- ✅ Still logged in after browser restart
- ✅ User info persists
- ✅ Token valid

**Check localStorage:**
```javascript
// Open Console, run:
console.log(localStorage.getItem('auth-storage'))
// Should see: { state: { user, token, isAuthenticated: true } }
```

---

### Test 6: Image Size Limits ✅

**Goal:** Verify images don't break layout

**Steps:**
1. Upload very large image (e.g., 4000x3000px)
2. Create post
3. View in post list
4. View in post detail

**Expected Results:**
- ✅ Post list: Image max height 500px
- ✅ Post detail: Image max height 700px
- ✅ Image maintains aspect ratio
- ✅ No layout overflow
- ✅ Responsive on mobile

---

## 🐛 Troubleshooting

### Issue: SSE Connection Failed (404)

**Error:** `http://localhost:5000/api/api/notifications/stream`

**Solution:**
- ✅ Already fixed in `useNotifications.ts`
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)

---

### Issue: Notifications 500 Error

**Error:** `GET /api/notifications → 500`

**Cause:** Notifications table doesn't exist

**Solution:**
1. Run migration: `BACKEND/src/migrations/complete_migration.sql`
2. Restart backend

---

### Issue: Like/Unlike Not Working

**Symptoms:**
- Click heart, nothing happens
- Console shows errors

**Solutions:**
1. Check if logged in
2. Check backend logs
3. Verify `isLiked` field in API response
4. ✅ Already fixed: `req.user.id` instead of `req.user.userId`

---

### Issue: AI Metadata Returns UUID

**Symptoms:**
```json
{
  "tags": ["26e0c40c", "053b", "426c"]
}
```

**Solution:**
- ✅ Already fixed in `ai.service.ts`
- Restart backend
- Test again

---

## ✅ Success Criteria

All tests should pass:
- ✅ AI generates meaningful metadata
- ✅ Like/unlike works in post list
- ✅ Icon changes color (purple when liked)
- ✅ Real-time notifications work
- ✅ SSE connects successfully
- ✅ Notification dropdown works
- ✅ Session persists across reloads
- ✅ Images don't break layout

---

## 📊 Final Checklist

- [ ] Migration run successfully
- [ ] Backend restarted
- [ ] Frontend restarted
- [ ] Test 1: AI Metadata ✅
- [ ] Test 2: Like/Unlike ✅
- [ ] Test 3: Real-Time Notifications ✅
- [ ] Test 4: Notification Dropdown ✅
- [ ] Test 5: Session Persistence ✅
- [ ] Test 6: Image Size Limits ✅

**When all checked:** 🎉 **100% COMPLETE!**

