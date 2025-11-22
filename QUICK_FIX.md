# 🚀 QUICK FIX - Notifications & AI

## ⚡ Fix Notifications (3 Bước - 5 Phút)

### Bước 1: Chạy Migration (2 phút)

1. Mở https://app.supabase.com
2. Chọn project: **zthdhnhbgccebdvgcsxh**
3. SQL Editor → New Query
4. Copy & paste code này:

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop old policies if exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Create policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);
```

5. Click **Run**
6. Should see: `Success. No rows returned`

---

### Bước 2: Restart Backend (1 phút)

```powershell
cd D:\Download\SMIMSO\BACKEND
# Stop server (Ctrl+C)
npm run dev
```

**Wait for:**
```
✅ Server running on port 5000
```

---

### Bước 3: Test (2 phút)

1. Open http://localhost:3000
2. Login
3. Open Console (F12)
4. Look for: `✅ SSE connected`

**If you see it → Notifications working! ✅**

**Test:**
- User A creates post
- User B likes it
- User A sees notification

---

## ⚡ Fix AI Generate (2 Bước - 3 Phút)

### Bước 1: Check Backend Endpoint

```powershell
cd D:\Download\SMIMSO\BACKEND
code src/controllers/post.controller.ts
```

**Search for:** `generateMetadata`

**Should have this method:**
```typescript
async generateMetadata(req: AuthRequest, res: Response) {
  // ... code
}
```

**If NOT found → Need to add it**

---

### Bước 2: Test AI Generate

1. Go to http://localhost:3000/create
2. Upload image with meaningful name: `sunset-beach.jpg`
3. Wait 2 seconds
4. Check form fields

**Expected:**
- Title: "Sunset Beach" (or similar)
- Description: "Sunset Beach. Share your thoughts..."
- Tags: "sunset, beach, creative"

**If still "Untitled Image":**
- Check backend logs
- Check if filename is being passed correctly

---

## 🔍 Quick Debug

### Check if notifications table exists:

```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) FROM notifications;
```

**If error "relation does not exist":**
→ Run migration from Bước 1

---

### Check if SSE is connecting:

1. Open http://localhost:3000
2. Login
3. F12 → Console
4. Look for: `✅ SSE connected`

**If NOT found:**
- Check backend is running
- Check Network tab for `/notifications/stream`
- Should see status: `200 (pending)`

---

### Check AI endpoint:

```powershell
# Test generate metadata endpoint
curl http://localhost:5000/api/posts/generate-metadata -X POST
```

**Expected:** Some response (not 404)

**If 404:**
→ Endpoint not registered

---

## 🚨 Still Not Working?

### Notifications:

1. **Check migration ran:**
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'notifications';
   ```
   Should return 1 row

2. **Check backend logs:**
   Look for errors when liking a post

3. **Check frontend console:**
   Look for SSE connection errors

---

### AI Generate:

1. **Check backend logs:**
   Look for "🤖 Starting AI metadata generation..."

2. **Check response:**
   Open Network tab → Look for `/generate-metadata` request

3. **Check filename:**
   Make sure uploaded file has meaningful name

---

## ✅ Success Criteria

### Notifications Working:
- ✅ Console shows "✅ SSE connected"
- ✅ User B likes User A's post
- ✅ User A sees toast notification
- ✅ Badge appears on bell
- ✅ Notification in dropdown

### AI Generate Working:
- ✅ Upload image with name "sunset-beach.jpg"
- ✅ Form auto-fills with:
  - Title: "Sunset Beach"
  - Description: "Sunset Beach. Share your thoughts..."
  - Tags: "sunset, beach, creative"

---

## 📞 Need More Help?

**See detailed guides:**
- `DEBUG_NOTIFICATIONS.md` - Complete notification debug
- `FIX_SUMMARY.md` - Summary of all fixes
- `COMPLETE_SUMMARY.md` - All features

---

**Good luck! 🚀**

