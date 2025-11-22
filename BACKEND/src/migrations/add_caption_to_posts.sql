-- Add caption field to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS caption TEXT;

-- Add comment
COMMENT ON COLUMN posts.caption IS 'AI-generated caption from the first image of the post';

