# 🔧 Fix Notifications Errors

## Errors Found

### 1. ❌ SSE Connection Error (404)
```
http://localhost:5000/api/api/notifications/stream
Status: 404 Not Found
```

**Cause:** Duplicate `/api` in URL

**Fix:** ✅ FIXED in `FRONTEND/src/hooks/useNotifications.ts`
- Changed from: `${baseURL}/api/notifications/stream`
- Changed to: `${baseURL}/notifications/stream`
- Because `NEXT_PUBLIC_API_URL` already includes `/api`

---

### 2. ❌ Get Notifications Error (500)
```
http://localhost:5000/api/notifications
Status: 500 Internal Server Error
```

**Cause:** Notifications table doesn't exist in database

**Fix:** Run migration SQL

---

## 🚀 Solution: Run Database Migration

### Step 1: Open Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Click **SQL Editor** in sidebar
4. Click **New Query**

### Step 2: Run Migration SQL

Copy and paste this SQL:

```sql
-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention')),
  content TEXT NOT NULL,
  related_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Add comments
COMMENT ON TABLE notifications IS 'Real-time notifications for users';
COMMENT ON COLUMN notifications.type IS 'Type of notification: like, comment, follow, mention';
COMMENT ON COLUMN notifications.content IS 'Notification message content';
COMMENT ON COLUMN notifications.related_user_id IS 'User who triggered the notification';
COMMENT ON COLUMN notifications.post_id IS 'Related post (if applicable)';
COMMENT ON COLUMN notifications.is_read IS 'Whether the notification has been read';

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);
```

### Step 3: Click Run (or Ctrl+Enter)

You should see: `Success. No rows returned`

### Step 4: Verify Table Created

Run this query:

```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'notifications';
```

You should see the `notifications` table.

### Step 5: Restart Backend

```bash
cd BACKEND
# Stop server (Ctrl+C)
npm run dev
```

### Step 6: Test Again

1. Refresh frontend page
2. Check browser console
3. Should see: `✅ SSE connected`
4. No more errors!

---

## 3. ✅ PostCard Like/Unlike (Already Working)

**Features:**
- ✅ Click heart to like
- ✅ Click again to unlike
- ✅ Icon changes to purple filled heart when liked
- ✅ Icon changes to outline heart when not liked
- ✅ Like count updates in real-time
- ✅ Optimistic UI updates

**Code Location:** `FRONTEND/src/components/PostCard.tsx`

**How it works:**
```typescript
// Line 21-51
const handleLike = async (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();

  if (isLiking) return;

  setIsLiking(true);
  const wasLiked = post.isLiked;

  // Optimistic update
  setPost((prev) => ({
    ...prev,
    isLiked: !wasLiked,
    like_count: wasLiked ? prev.like_count - 1 : prev.like_count + 1,
  }));

  try {
    if (wasLiked) {
      await api.delete(`/posts/${post.id}/like`); // Unlike
    } else {
      await api.post(`/posts/${post.id}/like`); // Like
    }
  } catch (error) {
    // Revert on error
    setPost((prev) => ({
      ...prev,
      isLiked: wasLiked,
      like_count: wasLiked ? prev.like_count + 1 : prev.like_count - 1,
    }));
    toast.error('An error occurred');
  } finally {
    setIsLiking(false);
  }
};
```

**Icon rendering:**
```typescript
// Line 126-138
<button
  onClick={handleLike}
  className={`flex items-center space-x-1 transition ${
    post.isLiked ? 'text-purple-600' : 'text-gray-600 hover:text-purple-500'
  }`}
>
  {post.isLiked ? (
    <FaHeart className="text-purple-600" /> // Filled purple heart
  ) : (
    <FiHeart /> // Outline heart
  )}
  <span>{formatNumber(post.like_count)}</span>
</button>
```

---

## ✅ Summary

**Fixed:**
- ✅ SSE URL duplicate `/api` issue
- ✅ PostCard like/unlike already working

**Need to do:**
- ⏳ Run database migration for notifications table
- ⏳ Restart backend

**After migration:**
- ✅ SSE will connect successfully
- ✅ Notifications will work
- ✅ Real-time updates will work
- ✅ Like/unlike in PostCard already works

---

## 🎉 After Migration

You will have:
- 🔔 Real-time notifications
- ❤️ Like/unlike in post list with purple icon
- 💬 Comment notifications
- 👤 Follow notifications (when implemented)
- 🎨 Beautiful UI
- ⚡ Fast and responsive

Run the migration now! 🚀

