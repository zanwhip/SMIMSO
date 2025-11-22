# 🚀 FIX NOW - 3 Bước Đơn Giản

## ⚡ Bước 1: Run Test Script (1 phút)

```powershell
cd D:\Download\SMIMSO
.\TEST_NOW.ps1
```

**Script sẽ check:**
- ✅ Backend running?
- ✅ Notifications endpoint exists?
- ✅ Generate metadata endpoint exists?
- ✅ Frontend running?

**Xem kết quả và làm theo hướng dẫn**

---

## ⚡ Bước 2: Fix Notifications (2 phút)

### Nếu test script báo "500 error" cho notifications:

1. **Mở Supabase Dashboard:**
   - https://app.supabase.com
   - Project: **zthdhnhbgccebdvgcsxh**

2. **SQL Editor → New Query**

3. **Copy & Run:**
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

4. **Click Run**

5. **Verify:**
```sql
SELECT COUNT(*) FROM notifications;
```
Should return `0` (not error)

✅ **Done!**

---

## ⚡ Bước 3: Restart & Test (2 phút)

### 3.1 Restart Backend

```powershell
cd D:\Download\SMIMSO\BACKEND
# Stop (Ctrl+C) then:
npm run dev
```

**Wait for:** `✅ Server running on port 5000`

---

### 3.2 Test in Browser

1. **Open:** http://localhost:3000
2. **Login**
3. **Open Console (F12)**
4. **Look for:** `✅ SSE connected`

**If you see it → Notifications working! ✅**

---

### 3.3 Test Notifications

**Setup:**
- Browser 1: Login as User A, create post
- Browser 2 (Incognito): Login as User B

**Test:**
1. User B likes User A's post
2. Check Browser 1 (User A):
   - ✅ Toast notification appears
   - ✅ Badge "1" on bell
   - ✅ Click bell → See notification

**If working → Success! 🎉**

---

### 3.4 Test AI Generate

1. **Go to:** http://localhost:3000/create
2. **Upload image** with meaningful name: `sunset-beach.jpg`
3. **Wait 2 seconds**
4. **Check form:**
   - Title should auto-fill: "Sunset Beach"
   - Description: "Sunset Beach. Share your thoughts..."
   - Tags: "sunset, beach, creative"

**If working → Success! 🎉**

---

## 🐛 Troubleshooting

### Notifications still not working?

**Check Console:**
```
❌ SSE connection failed
```

**Solution:**
1. Make sure migration ran successfully
2. Restart backend
3. Clear browser cache (Ctrl+Shift+R)
4. Check Network tab → `/notifications/stream` should be `200 (pending)`

---

### AI still returns "Untitled Image"?

**Possible reasons:**
1. Filename has no meaningful words
2. Filename is just UUID

**Solution:**
- Upload image with meaningful name: `beautiful-sunset.jpg`
- NOT: `1234567890.jpg`

**Check backend logs:**
```
🤖 Starting AI metadata generation...
📝 Generated caption from filename: "Beautiful Sunset"
```

---

## ✅ Success Checklist

- [ ] Run `TEST_NOW.ps1` → All green
- [ ] Run migration in Supabase
- [ ] Restart backend
- [ ] Console shows "✅ SSE connected"
- [ ] User B likes User A's post → User A sees notification
- [ ] Upload image with name → Form auto-fills

**When all checked → 100% Working! 🎉**

---

## 📞 Still Having Issues?

**Run test script again:**
```powershell
.\TEST_NOW.ps1
```

**Check detailed guides:**
- `QUICK_FIX.md` - Quick fix guide
- `DEBUG_NOTIFICATIONS.md` - Detailed debug
- `COMPLETE_SUMMARY.md` - All features

---

**Good luck! 🚀✨**

