# Fix Notification - 3 Buoc Don Gian

## Buoc 1: Check Database (2 phut)

### 1.1 Mo Supabase Dashboard
- https://app.supabase.com
- Project: **zthdhnhbgccebdvgcsxh**
- SQL Editor → New Query

### 1.2 Chay Script Check
Copy & paste file: `CHECK_NOTIFICATIONS_NOW.sql`

**Xem ket qua:**

**Neu Step 1 = 0:**
→ Table chua ton tai → Chay migration (Buoc 2)

**Neu Step 2 co rows:**
→ Notifications dang duoc tao → Van de o frontend (Buoc 3)

**Neu Step 2 khong co rows:**
→ Backend khong tao notifications → Check backend logs

**Neu Step 3 co rows cho email cua ban:**
→ Notifications ton tai cho ban → Van de o frontend (Buoc 3)

---

## Buoc 2: Run Migration (1 phut)

**Chi chay neu Step 1 = 0 (table chua ton tai)**

### Supabase Dashboard → SQL Editor → New Query

```sql
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

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT WITH CHECK (true);
```

**Click Run**

**Verify:**
```sql
SELECT COUNT(*) FROM notifications;
```
Should return `0` (not error)

---

## Buoc 3: Restart Backend (1 phut)

```powershell
cd D:\Download\SMIMSO\BACKEND
# Stop (Ctrl+C)
npm run dev
```

**Wait for:** `Server running on port 5000`

---

## Buoc 4: Test (2 phut)

### 4.1 Check Frontend Console

1. Open http://localhost:3000
2. Login
3. F12 → Console
4. Look for: `SSE connected`

**Neu khong thay:**
- Restart frontend: `cd FRONTEND; npm run dev`
- Clear cache: Ctrl+Shift+R

### 4.2 Test Notification

**Setup:**
- Browser 1: Login as User A (hung@gmail.com)
- Browser 2 (Incognito): Login as User B

**Test:**
1. Browser 1: User A tao post
2. Browser 2: User B comment vao post cua User A
3. Browser 1: Check notification bell

**Expected:**
- Badge "1" tren bell icon
- Click bell → Thay notification
- Notification content: "User B commented on your post..."

---

## Debug

### Neu van khong co notification:

**Check 1: Backend logs**
```
Look for:
✅ Comment notification sent
```

**Neu khong thay:**
→ Backend khong tao notification
→ Check file: `BACKEND/src/services/interaction.service.ts`

**Check 2: Frontend console**
```
Look for:
SSE connected
```

**Neu khong thay:**
→ SSE khong connect
→ Check Network tab → `/notifications/stream` should be `200 (pending)`

**Check 3: Database**
```sql
-- Run in Supabase
SELECT * FROM notifications 
WHERE user_id = (SELECT id FROM users WHERE email = 'hung@gmail.com')
ORDER BY created_at DESC;
```

**Neu co rows:**
→ Notifications ton tai trong database
→ Van de o frontend (SSE hoac RLS)

**Neu khong co rows:**
→ Backend khong tao notifications
→ Check backend logs khi comment

---

## Quick Test

**Tao notification manually:**

```sql
-- Supabase Dashboard → SQL Editor
-- Get your user ID
SELECT id, email FROM users WHERE email = 'hung@gmail.com';

-- Create test notification (replace USER_ID)
INSERT INTO notifications (user_id, type, content, is_read)
VALUES ('YOUR_USER_ID_HERE', 'comment', 'Test notification', false);

-- Check in app
-- Should see notification in dropdown
```

**Neu thay notification test:**
→ Frontend hoat dong
→ Van de la backend khong tao notifications khi comment

**Neu khong thay:**
→ Van de o frontend hoac RLS policies

---

## Success Criteria

- [x] Step 1 in CHECK_NOTIFICATIONS_NOW.sql returns 1
- [x] Backend running without errors
- [x] Console shows "SSE connected"
- [x] User B comments on User A's post
- [x] User A sees notification in dropdown
- [x] Badge shows "1"

**When all checked → Working! 🎉**

