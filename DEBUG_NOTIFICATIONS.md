# 🐛 Debug Notifications - Step by Step

## 🎯 Vấn Đề

**"Vẫn không có notification"**

Có thể do:
1. ❌ Bảng `notifications` chưa được tạo
2. ❌ Backend chưa restart sau khi fix
3. ❌ Frontend chưa restart
4. ❌ SSE không connect được
5. ❌ RLS policies chưa đúng

---

## 🔍 Bước 1: Check Database (5 phút)

### 1.1 Check Notifications Table

```sql
-- Run in Supabase Dashboard → SQL Editor
-- File: BACKEND/check-notifications.sql
```

**Chạy file:** `BACKEND/check-notifications.sql`

**Expected Results:**
- ✅ Query 1: 1 row (table exists)
- ✅ Query 2: 8 columns
- ✅ Query 5: 3 RLS policies
- ✅ Query 6: 4 indexes

**If any query fails:**
→ Run migration: `BACKEND/src/migrations/complete_migration.sql`

---

### 1.2 Test Manual Notification

```sql
-- Run in Supabase Dashboard → SQL Editor
-- File: BACKEND/test-notification.sql
```

**Steps:**
1. Open `BACKEND/test-notification.sql`
2. Replace email with your email (Step 1)
3. Get your user ID
4. Run Step 3 to create test notification
5. Check in app

**Expected:**
- ✅ Notification appears in dropdown
- ✅ Badge shows "1"
- ✅ Toast notification (if SSE connected)

---

## 🔍 Bước 2: Check Backend (3 phút)

### 2.1 Restart Backend

```bash
cd BACKEND
# Stop server (Ctrl+C)
npm run dev
```

**Check logs for:**
```
✅ Server running on port 5000
✅ Connected to Supabase
```

### 2.2 Test Notification Endpoint

**Open PowerShell:**
```powershell
# Get your token from browser localStorage
# Open Console → Run: localStorage.getItem('auth-storage')
# Copy the token value

$token = "YOUR_TOKEN_HERE"

# Test get notifications
curl http://localhost:5000/api/notifications `
  -H "Authorization: Bearer $token"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [],
    "total": 0
  }
}
```

**If 401 Unauthorized:**
- Token expired → Login again
- Token invalid → Check token format

**If 500 Error:**
- Table doesn't exist → Run migration
- Check backend logs for error details

---

## 🔍 Bước 3: Check Frontend (3 phút)

### 3.1 Restart Frontend

```bash
cd FRONTEND
# Stop server (Ctrl+C)
npm run dev
```

### 3.2 Check Browser Console

1. Open http://localhost:3000
2. Login
3. Open Console (F12)

**Look for:**
```
✅ SSE connected
```

**If you see:**
```
❌ SSE connection failed
❌ 404 Not Found
```

→ Check SSE URL in `FRONTEND/src/hooks/useNotifications.ts`

**If you see:**
```
❌ 401 Unauthorized
```

→ Token expired, login again

**If you see:**
```
❌ 500 Internal Server Error
```

→ Table doesn't exist, run migration

---

### 3.3 Check Network Tab

1. Open DevTools → Network tab
2. Filter: `stream`
3. Look for: `notifications/stream?token=...`

**Status should be:**
- ✅ `200 OK` (pending) - SSE connected
- ❌ `404` - Route not found
- ❌ `401` - Not authenticated
- ❌ `500` - Server error

---

## 🔍 Bước 4: Test Like Notification (5 phút)

### 4.1 Setup

1. **Browser 1 (Normal):**
   - Open http://localhost:3000
   - Login as User A
   - Create a post

2. **Browser 2 (Incognito):**
   - Open http://localhost:3000
   - Login as User B

### 4.2 Test

1. **Browser 2 (User B):**
   - Find User A's post
   - Click heart to like

2. **Browser 1 (User A):**
   - Should see:
     - ✅ Toast notification
     - ✅ Badge "1" on bell
     - ✅ Notification in dropdown

### 4.3 Check Backend Logs

**Look for:**
```
✅ Like count updated: 1
✅ Like notification sent
```

**If you see:**
```
❌ Failed to send like notification: ...
```

→ Check error message
→ Might be notification service issue

---

## 🔍 Bước 5: Check Notification Service (Advanced)

### 5.1 Check Routes

**File:** `BACKEND/src/routes/index.ts`

**Should have:**
```typescript
import notificationRoutes from './notification.routes';
app.use('/api/notifications', notificationRoutes);
```

### 5.2 Check Notification Controller

**File:** `BACKEND/src/controllers/notification.controller.ts`

**Check export:**
```typescript
export const notificationService = new NotificationService();
```

### 5.3 Check Interaction Service

**File:** `BACKEND/src/services/interaction.service.ts`

**Should import:**
```typescript
import { notificationService } from '../controllers/notification.controller';
```

**Should call:**
```typescript
await notificationService.createNotification({
  user_id: post.user_id,
  type: 'like',
  content: `...`,
  related_user_id: userId,
  post_id: postId,
});
```

---

## ✅ Checklist

### Database
- [ ] Run `check-notifications.sql` → All queries pass
- [ ] Run `test-notification.sql` → Notification created
- [ ] Check in app → Test notification visible

### Backend
- [ ] Backend restarted
- [ ] Logs show no errors
- [ ] `/api/notifications` endpoint works
- [ ] `/api/notifications/stream` endpoint works

### Frontend
- [ ] Frontend restarted
- [ ] Console shows "✅ SSE connected"
- [ ] Network tab shows SSE connection (200 OK)
- [ ] No errors in console

### Integration Test
- [ ] User B likes User A's post
- [ ] User A sees toast notification
- [ ] User A sees badge on bell
- [ ] User A sees notification in dropdown
- [ ] Click notification → Goes to post

---

## 🚨 Common Issues & Solutions

### Issue 1: Table doesn't exist
**Error:** `relation "notifications" does not exist`

**Solution:**
```sql
-- Run in Supabase Dashboard
-- File: BACKEND/src/migrations/complete_migration.sql
```

---

### Issue 2: SSE not connecting
**Error:** `404 Not Found` on `/api/notifications/stream`

**Solution:**
1. Check `BACKEND/src/routes/index.ts` has notification routes
2. Restart backend
3. Clear browser cache

---

### Issue 3: No notification when liking
**Symptoms:** Like works, but no notification

**Check:**
1. Backend logs for "✅ Like notification sent"
2. If not present → Check `interaction.service.ts`
3. If present but not received → Check SSE connection

**Solution:**
```bash
# Restart both servers
cd BACKEND && npm run dev
cd FRONTEND && npm run dev
```

---

### Issue 4: Notification created but not visible
**Symptoms:** Database has notification, but not in app

**Check:**
1. RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'notifications'`
2. User ID matches: `SELECT * FROM notifications WHERE user_id = 'YOUR_ID'`

**Solution:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'notifications';

-- If missing, run migration
```

---

## 📞 Still Not Working?

1. **Check all files exist:**
   - `BACKEND/src/services/notification.service.ts`
   - `BACKEND/src/controllers/notification.controller.ts`
   - `BACKEND/src/routes/notification.routes.ts`
   - `BACKEND/src/middleware/sseAuth.middleware.ts`
   - `FRONTEND/src/components/NotificationDropdown.tsx`
   - `FRONTEND/src/hooks/useNotifications.ts`

2. **Run complete migration:**
   ```sql
   -- BACKEND/src/migrations/complete_migration.sql
   ```

3. **Restart everything:**
   ```bash
   # Backend
   cd BACKEND
   npm run dev

   # Frontend (new terminal)
   cd FRONTEND
   npm run dev
   ```

4. **Clear browser cache:**
   - Ctrl+Shift+R (hard refresh)
   - Or clear all cache in browser settings

---

**Good luck! 🚀**

