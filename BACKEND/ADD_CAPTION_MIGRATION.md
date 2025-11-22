# Migration: Add Caption Field to Posts

## What This Does
Adds a `caption` column to the `posts` table to store AI-generated captions from images.

## How to Run

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project: https://app.supabase.com
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste this SQL:

```sql
-- Add caption field to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS caption TEXT;

-- Add comment
COMMENT ON COLUMN posts.caption IS 'AI-generated caption from the first image of the post';
```

5. Click **Run** button
6. You should see: "Success. No rows returned"

### Option 2: Using psql (Advanced)
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" -c "ALTER TABLE posts ADD COLUMN IF NOT EXISTS caption TEXT;"
```

## Verify Migration
Run this query to check if the column was added:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'posts' AND column_name = 'caption';
```

You should see:
```
column_name | data_type
------------+-----------
caption     | text
```

## Done!
After running the migration, restart your backend server:
```bash
cd BACKEND
npm run dev
```

