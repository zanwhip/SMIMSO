-- ========================================
-- CHECK NOTIFICATION SYSTEM STATUS
-- ========================================
-- Run this in Supabase Dashboard → SQL Editor
-- ========================================

-- 1. Check if notifications table exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'notifications';

-- Expected: 1 row with table_name = 'notifications'
-- If no rows: Table doesn't exist → Need to run migration

-- ========================================

-- 2. Check notifications table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- Expected columns:
-- id, user_id, type, content, related_user_id, post_id, is_read, created_at

-- ========================================

-- 3. Check if there are any notifications
SELECT COUNT(*) as total_notifications FROM notifications;

-- ========================================

-- 4. Check recent notifications (if any)
SELECT 
    n.id,
    n.type,
    n.content,
    n.is_read,
    n.created_at,
    u1.first_name || ' ' || u1.last_name as recipient,
    u2.first_name || ' ' || u2.last_name as sender
FROM notifications n
LEFT JOIN users u1 ON n.user_id = u1.id
LEFT JOIN users u2 ON n.related_user_id = u2.id
ORDER BY n.created_at DESC
LIMIT 10;

-- ========================================

-- 5. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'notifications';

-- Expected: 3 policies
-- - Users can view their own notifications
-- - Users can update their own notifications
-- - System can insert notifications

-- ========================================

-- 6. Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'notifications';

-- Expected: 4 indexes
-- - idx_notifications_user_id
-- - idx_notifications_is_read
-- - idx_notifications_created_at
-- - idx_notifications_type

-- ========================================
-- INTERPRETATION
-- ========================================

-- ✅ If all queries return results:
--    Notifications table is properly set up

-- ❌ If query 1 returns no rows:
--    Table doesn't exist
--    → Run: BACKEND/src/migrations/complete_migration.sql

-- ⚠️ If query 2 returns less than 8 columns:
--    Table structure is incomplete
--    → Run: BACKEND/src/migrations/complete_migration.sql

-- ⚠️ If query 5 returns less than 3 policies:
--    RLS policies missing
--    → Run: BACKEND/src/migrations/complete_migration.sql

-- ⚠️ If query 6 returns less than 4 indexes:
--    Indexes missing (performance issue)
--    → Run: BACKEND/src/migrations/complete_migration.sql

-- ========================================
-- NEXT STEPS
-- ========================================

-- If table doesn't exist or is incomplete:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Open: BACKEND/src/migrations/complete_migration.sql
-- 3. Copy entire content
-- 4. Paste and Run
-- 5. Run this check script again to verify

-- ========================================

