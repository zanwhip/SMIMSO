-- ========================================
-- COMPLETE MIGRATION SCRIPT FOR SMIMSO
-- ========================================
-- Run this in Supabase Dashboard → SQL Editor
-- ========================================

-- 1. Add caption field to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS caption TEXT;
COMMENT ON COLUMN posts.caption IS 'AI-generated caption from the first image of the post';

-- 2. Create notifications table for real-time notifications
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

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- 4. Add comments
COMMENT ON TABLE notifications IS 'Real-time notifications for users';
COMMENT ON COLUMN notifications.type IS 'Type of notification: like, comment, follow, mention';
COMMENT ON COLUMN notifications.content IS 'Notification message content';
COMMENT ON COLUMN notifications.related_user_id IS 'User who triggered the notification';
COMMENT ON COLUMN notifications.post_id IS 'Related post (if applicable)';
COMMENT ON COLUMN notifications.is_read IS 'Whether the notification has been read';

-- 5. Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- 7. Create RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
-- Run these to verify the migration was successful:

-- Check if caption column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'posts' AND column_name = 'caption';

-- Check if notifications table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'notifications';

-- Check notifications table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'notifications';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'notifications';

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
-- If all queries above return results, migration is successful!
-- You should see:
-- 1. caption column in posts table
-- 2. notifications table with 9 columns
-- 3. 4 indexes on notifications table
-- 4. 3 RLS policies on notifications table
-- ========================================

