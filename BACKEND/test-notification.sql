-- ========================================
-- TEST NOTIFICATION SYSTEM MANUALLY
-- ========================================
-- Run this in Supabase Dashboard → SQL Editor
-- This will create a test notification
-- ========================================

-- Step 1: Get your user ID
-- Replace 'your-email@gmail.com' with your actual email
SELECT 
    id,
    email,
    first_name,
    last_name
FROM users
WHERE email = 'hung@gmail.com';  -- ⚠️ CHANGE THIS TO YOUR EMAIL

-- Copy the 'id' value from the result

-- ========================================

-- Step 2: Get a post ID (any post)
SELECT 
    id,
    title,
    user_id
FROM posts
LIMIT 1;

-- Copy the 'id' value from the result

-- ========================================

-- Step 3: Create a test notification
-- ⚠️ Replace the UUIDs below with actual values from Step 1 and 2

INSERT INTO notifications (
    user_id,           -- ⚠️ Replace with YOUR user ID from Step 1
    type,
    content,
    related_user_id,   -- ⚠️ Replace with any user ID (can be same as user_id for testing)
    post_id,           -- ⚠️ Replace with post ID from Step 2
    is_read,
    created_at
) VALUES (
    '3a095979-3059-40ad-b105-720d9d1e0e83',  -- ⚠️ CHANGE THIS
    'like',
    'Test notification: Someone liked your post!',
    '3a095979-3059-40ad-b105-720d9d1e0e83',  -- ⚠️ CHANGE THIS
    NULL,  -- ⚠️ CHANGE THIS if you have a post ID
    false,
    NOW()
);

-- ========================================

-- Step 4: Verify the notification was created
SELECT 
    n.id,
    n.type,
    n.content,
    n.is_read,
    n.created_at,
    u.first_name || ' ' || u.last_name as recipient
FROM notifications n
LEFT JOIN users u ON n.user_id = u.id
ORDER BY n.created_at DESC
LIMIT 5;

-- You should see your test notification in the results

-- ========================================

-- Step 5: Check in the app
-- 1. Open http://localhost:3000
-- 2. Login with the email you used in Step 1
-- 3. Check the notification bell
-- 4. You should see the test notification

-- ========================================

-- Step 6: Clean up test notification (optional)
-- Uncomment and run this to delete the test notification

-- DELETE FROM notifications 
-- WHERE content = 'Test notification: Someone liked your post!';

-- ========================================
-- TROUBLESHOOTING
-- ========================================

-- If notification doesn't appear in app:
-- 1. Check browser console for errors
-- 2. Check if SSE is connected: Look for "✅ SSE connected" in console
-- 3. Restart backend: cd BACKEND && npm run dev
-- 4. Restart frontend: cd FRONTEND && npm run dev
-- 5. Clear browser cache: Ctrl+Shift+R

-- If SSE not connecting:
-- 1. Check backend logs for errors
-- 2. Verify notification routes are registered
-- 3. Check if token is valid
-- 4. Try logging out and logging in again

-- ========================================

