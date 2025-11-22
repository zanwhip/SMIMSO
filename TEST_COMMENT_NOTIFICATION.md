# Test Comment Notification - Debug

## Van De

**Comments da duoc tao NHUNG khong co notifications trong database!**

**Du lieu:**
- hung2@gmail.com comment vao post cua hung@gmail.com
- 5 comments da duoc tao
- 0 notifications trong database

**Ket luan:** Backend khong tao notifications khi comment

---

## Nguyen Nhan Co The

1. **notificationService.createNotification() bi loi**
   - Check backend logs cho error message

2. **RLS policies chan INSERT**
   - Policy "System can insert notifications" co the khong hoat dong

3. **Backend chua restart sau khi sua code**
   - Code moi chua duoc load

---

## Cach Fix

### Buoc 1: Check RLS Policies

**Run trong Supabase:**

```sql
-- Check policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'notifications';
```

**Expected:**
- Policy name: "System can insert notifications"
- cmd: INSERT
- with_check: true

**Neu khong co hoac sai:**

```sql
-- Drop and recreate
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);
```

---

### Buoc 2: Test Insert Manually

**Run trong Supabase:**

```sql
-- Get user IDs
SELECT id, email FROM users WHERE email IN ('hung@gmail.com', 'hung2@gmail.com');

-- Try to insert notification manually
INSERT INTO notifications (
    user_id,
    type,
    content,
    related_user_id,
    is_read
) VALUES (
    '3a095979-3059-40ad-b105-720d9d1e0e83',  -- hung@gmail.com user_id
    'comment',
    'Test notification from SQL',
    (SELECT id FROM users WHERE email = 'hung2@gmail.com'),
    false
);

-- Check if inserted
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 1;
```

**Neu insert thanh cong:**
- Van de la backend code khong goi createNotification()
- Hoac createNotification() bi loi

**Neu insert FAILED:**
- Van de la RLS policies
- Check error message

---

### Buoc 3: Restart Backend & Check Logs

```powershell
cd D:\Download\SMIMSO\BACKEND
# Stop (Ctrl+C)
npm run dev
```

**Sau khi start, test comment:**

1. Browser 1: Login hung@gmail.com
2. Browser 2: Login hung2@gmail.com
3. Browser 2: Comment vao post cua hung@gmail.com
4. **Check backend logs:**

**Look for:**
```
✅ Comment notification sent
```

**Neu thay:**
- Notification duoc tao thanh cong
- Check database xem co notification moi khong

**Neu thay error:**
```
❌ Failed to send comment notification: [error message]
```
- Copy error message
- Fix based on error

**Neu khong thay gi ca:**
- Code khong chay den doan tao notification
- Check logic: `if (post.user_id !== userId)`

---

### Buoc 4: Add More Logging

**Neu van khong ro van de, them logs:**

Edit: `BACKEND/src/services/interaction.service.ts`

Line 172, them logs:

```typescript
// Send notification to post owner (if not commenting on own post)
console.log('🔍 Check notification condition:', {
  post_user_id: post.user_id,
  commenter_user_id: userId,
  should_notify: post.user_id !== userId
});

if (post.user_id !== userId) {
  console.log('📧 Attempting to create notification...');
  try {
    const { data: commenter } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', userId)
      .single();

    console.log('👤 Commenter info:', commenter);

    const notificationData = {
      user_id: post.user_id,
      type: 'comment',
      content: `${commenter?.first_name} ${commenter?.last_name} commented on your post "${post.title}"`,
      related_user_id: userId,
      post_id: postId,
    };
    
    console.log('📝 Notification data:', notificationData);

    await notificationService.createNotification(notificationData);
    console.log('✅ Comment notification sent');
  } catch (error) {
    console.error('❌ Failed to send comment notification:', error);
  }
} else {
  console.log('⏭️ Skipping notification (commenting on own post)');
}
```

**Restart backend va test lai, xem logs**

---

## Quick Test

**Tao notification bang tay trong Supabase:**

```sql
INSERT INTO notifications (
    user_id,
    type,
    content,
    related_user_id,
    is_read
) VALUES (
    '3a095979-3059-40ad-b105-720d9d1e0e83',
    'comment',
    'Manual test notification',
    (SELECT id FROM users WHERE email = 'hung2@gmail.com'),
    false
);
```

**Sau do:**
1. Login vao app voi hung@gmail.com
2. Check notification bell
3. Neu thay notification → Frontend hoat dong, van de la backend
4. Neu khong thay → Van de ca frontend va backend

---

## Checklist

- [ ] Check RLS policies (Buoc 1)
- [ ] Test manual insert (Buoc 2)
- [ ] Restart backend (Buoc 3)
- [ ] Test comment va check logs
- [ ] Neu can: Add more logging (Buoc 4)
- [ ] Test manual notification in app

---

**Hay lam theo cac buoc tren va cho toi biet ket qua!**

