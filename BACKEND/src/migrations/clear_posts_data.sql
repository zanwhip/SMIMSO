-- =============================================
-- Clear all posts data and related tables
-- =============================================
-- This script will delete all data from posts and related tables
-- Due to CASCADE constraints, related data will be automatically deleted

-- Disable foreign key checks temporarily (PostgreSQL doesn't need this, but for safety)
-- Note: PostgreSQL will handle CASCADE automatically

-- Delete in order to avoid foreign key issues (though CASCADE should handle it)
-- But we'll delete in reverse dependency order for safety

-- 1. Delete user activities related to posts
DELETE FROM user_activities WHERE post_id IS NOT NULL;

-- 2. Delete saved posts
DELETE FROM saved_posts;

-- 3. Delete comments (including nested comments)
DELETE FROM comments;

-- 4. Delete likes
DELETE FROM likes;

-- 5. Delete post images
DELETE FROM post_images;

-- 6. Finally, delete all posts
DELETE FROM posts;

-- Reset sequences if any (UUIDs don't use sequences, but good practice)
-- Note: This is not needed for UUID primary keys

-- Verify deletion (optional - uncomment to check)
-- SELECT COUNT(*) as remaining_posts FROM posts;
-- SELECT COUNT(*) as remaining_images FROM post_images;
-- SELECT COUNT(*) as remaining_likes FROM likes;
-- SELECT COUNT(*) as remaining_comments FROM comments;
-- SELECT COUNT(*) as remaining_saved_posts FROM saved_posts;
-- SELECT COUNT(*) as remaining_activities FROM user_activities WHERE post_id IS NOT NULL;

