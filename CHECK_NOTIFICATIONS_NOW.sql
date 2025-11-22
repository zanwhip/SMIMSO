-- ========================================
-- CHECK NOTIFICATIONS - QUICK DEBUG
-- ========================================
-- Run in Supabase Dashboard → SQL Editor
-- ========================================

-- Step 1: Check if notifications table exists
SELECT 'Step 1: Check table exists' as step;
SELECT COUNT(*) as table_exists 
FROM information_schema.tables 
WHERE table_name = 'notifications';
-- Expected: 1 (if table exists)
-- If 0: Need to run migration

-- ========================================

-- Step 2: Check all notifications in database
SELECT 'Step 2: All notifications' as step;
SELECT 
    n.id,
    n.type,
    n.content,
    n.is_read,
    n.created_at,
    n.user_id,
    n.related_user_id,
    n.post_id
FROM notifications n
ORDER BY n.created_at DESC
LIMIT 20;
-- This shows ALL notifications in database

-- ========================================

-- Step 3: Check notifications by user email
SELECT 'Step 3: Notifications for specific user' as step;
SELECT 
    n.id,
    n.type,
    n.content,
    n.is_read,
    n.created_at,
    u.email as recipient_email,
    u2.email as sender_email
FROM notifications n
LEFT JOIN users u ON n.user_id = u.id
LEFT JOIN users u2 ON n.related_user_id = u2.id
WHERE u.email = 'hung@gmail.com'  -- ⚠️ CHANGE THIS TO YOUR EMAIL
ORDER BY n.created_at DESC;
-- This shows notifications for specific user

-- ========================================

-- Step 4: Check recent comments
SELECT 'Step 4: Recent comments' as step;
SELECT 
    c.id,
    c.content,
    c.created_at,
    u.email as commenter_email,
    p.title as post_title,
    p.user_id as post_owner_id,
    u2.email as post_owner_email
FROM comments c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN posts p ON c.post_id = p.id
LEFT JOIN users u2 ON p.user_id = u2.id
ORDER BY c.created_at DESC
LIMIT 10;
-- This shows recent comments and who should receive notifications

-- ========================================

-- Step 5: Check recent likes
SELECT 'Step 5: Recent likes' as step;
SELECT 
    l.id,
    l.created_at,
    u.email as liker_email,
    p.title as post_title,
    p.user_id as post_owner_id,
    u2.email as post_owner_email
FROM likes l
LEFT JOIN users u ON l.user_id = u.id
LEFT JOIN posts p ON l.post_id = p.id
LEFT JOIN users u2 ON p.user_id = u2.id
ORDER BY l.created_at DESC
LIMIT 10;
-- This shows recent likes and who should receive notifications

-- ========================================

-- Step 6: Check RLS policies
SELECT 'Step 6: RLS policies' as step;
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'notifications';
-- Expected: 3 policies (SELECT, UPDATE, INSERT)

-- ========================================
-- INTERPRETATION
-- ========================================

-- ✅ Step 1 returns 1:
--    Table exists

-- ❌ Step 1 returns 0:
--    Table doesn't exist
--    → Run: QUICK_FIX.md migration

-- ✅ Step 2 shows notifications:
--    Notifications are being created

-- ❌ Step 2 shows no rows:
--    No notifications created yet
--    → Check Step 4 and 5 for comments/likes
--    → If comments/likes exist but no notifications:
--       Backend not creating notifications

-- ✅ Step 3 shows notifications for your user:
--    Notifications exist for you
--    → Problem is in frontend

-- ❌ Step 3 shows no rows:
--    No notifications for your user
--    → Check if you are the post owner
--    → Check if someone liked/commented your posts

-- ✅ Step 6 shows 3 policies:
--    RLS configured correctly

-- ❌ Step 6 shows less than 3:
--    RLS policies missing
--    → Run: QUICK_FIX.md migration

-- ========================================

