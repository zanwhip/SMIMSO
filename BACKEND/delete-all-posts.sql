-- ========================================
-- DELETE ALL POSTS AND RELATED DATA
-- ========================================
-- ⚠️ WARNING: This will delete ALL posts and related data!
-- ⚠️ This action CANNOT be undone!
-- ========================================

-- Step 1: Delete all notifications related to posts
DELETE FROM notifications WHERE post_id IS NOT NULL;

-- Step 2: Delete all comments
DELETE FROM comments;

-- Step 3: Delete all likes
DELETE FROM likes;

-- Step 4: Delete all post images
DELETE FROM post_images;

-- Step 5: Delete all posts
DELETE FROM posts;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
-- Run these to verify deletion:

-- Check posts count (should be 0)
SELECT COUNT(*) as posts_count FROM posts;

-- Check post_images count (should be 0)
SELECT COUNT(*) as images_count FROM post_images;

-- Check likes count (should be 0)
SELECT COUNT(*) as likes_count FROM likes;

-- Check comments count (should be 0)
SELECT COUNT(*) as comments_count FROM comments;

-- Check post notifications count (should be 0)
SELECT COUNT(*) as post_notifications_count FROM notifications WHERE post_id IS NOT NULL;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
-- If all counts are 0, deletion was successful!
-- ========================================

