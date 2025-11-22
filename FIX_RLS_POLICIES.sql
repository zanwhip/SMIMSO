-- ========================================
-- FIX RLS POLICIES FOR NOTIFICATIONS
-- ========================================
-- Van de: Frontend khong hien thi notifications
-- Nguyen nhan: RLS policies dang chan SELECT
-- ========================================

-- Step 1: Check current policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'notifications';

-- ========================================

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Enable read access for users" ON notifications;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON notifications;
DROP POLICY IF EXISTS "Enable update for users" ON notifications;

-- ========================================

-- Step 3: Create new policies (SIMPLER)

-- Allow users to SELECT their own notifications
CREATE POLICY "notifications_select_policy"
  ON notifications
  FOR SELECT
  USING (true);  -- Allow all for now to test

-- Allow INSERT (for backend service)
CREATE POLICY "notifications_insert_policy"
  ON notifications
  FOR INSERT
  WITH CHECK (true);  -- Allow all inserts

-- Allow users to UPDATE their own notifications
CREATE POLICY "notifications_update_policy"
  ON notifications
  FOR UPDATE
  USING (true)  -- Allow all for now to test
  WITH CHECK (true);

-- ========================================

-- Step 4: Verify new policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'notifications';

-- Expected: 3 policies with USING (true)

-- ========================================

-- Step 5: Test SELECT
SELECT * FROM notifications 
WHERE user_id = '3a095979-3059-40ad-b105-720d9d1e0e83'
ORDER BY created_at DESC;

-- Should return notifications now

-- ========================================
-- NOTES
-- ========================================

-- We're using USING (true) to allow all access for testing
-- This bypasses RLS temporarily to verify the issue

-- After confirming notifications work, we can tighten security:
-- 
-- CREATE POLICY "notifications_select_policy"
--   ON notifications
--   FOR SELECT
--   USING (user_id = auth.uid());
--
-- But for now, we need to test if RLS is the problem

-- ========================================

