-- =============================================
-- SMIMSO Seed Data (English)
-- =============================================

-- =============================================
-- 1. CLEAR EXISTING DATA
-- =============================================
TRUNCATE TABLE user_activities CASCADE;
TRUNCATE TABLE saved_posts CASCADE;
TRUNCATE TABLE comments CASCADE;
TRUNCATE TABLE likes CASCADE;
TRUNCATE TABLE post_images CASCADE;
TRUNCATE TABLE posts CASCADE;
TRUNCATE TABLE surveys CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE categories CASCADE;

-- =============================================
-- 2. SEED CATEGORIES (10 categories)
-- =============================================
INSERT INTO categories (name, slug, description) VALUES
('Design', 'design', 'Graphic design, UI/UX, branding'),
('Photography', 'photography', 'Art photography, landscape, portrait'),
('Technology', 'technology', 'Programming, AI, computer science'),
('Art', 'art', 'Painting, sculpture, digital art'),
('Architecture', 'architecture', 'Architectural design, interior'),
('Fashion', 'fashion', 'Fashion trends, style'),
('Food', 'food', 'Recipes, cooking'),
('Travel', 'travel', 'Travel destinations, experiences'),
('Music', 'music', 'Instruments, composition, performance'),
('Sports', 'sports', 'Sports, fitness, health');

-- =============================================
-- 3. SEED USERS (5 users for testing)
-- =============================================
-- Note: Password hash is a placeholder. Register users via API to get real password hashes.

INSERT INTO users (email, phone, password_hash, first_name, last_name, date_of_birth, job, bio, auth_provider, is_verified, is_active) VALUES
('john.doe@example.com', '0901234567', '$2a$10$rZ5qH8qH8qH8qH8qH8qH8uO5qH8qH8qH8qH8qH8qH8qH8qH8qH8qH', 'John', 'Doe', '1995-05-15', 'Software Developer', 'Passionate about technology and coding', 'credential', true, true),
('jane.smith@example.com', '0902345678', '$2a$10$rZ5qH8qH8qH8qH8qH8qH8uO5qH8qH8qH8qH8qH8qH8qH8qH8qH8qH', 'Jane', 'Smith', '1998-08-20', 'Designer', 'Love design and creativity', 'credential', true, true),
('mike.wilson@example.com', '0903456789', '$2a$10$rZ5qH8qH8qH8qH8qH8qH8uO5qH8qH8qH8qH8qH8qH8qH8qH8qH8qH', 'Mike', 'Wilson', '1997-03-10', 'Photographer', 'Photography is my passion', 'credential', true, true),
('sarah.brown@example.com', '0904567890', '$2a$10$rZ5qH8qH8qH8qH8qH8qH8uO5qH8qH8qH8qH8qH8qH8qH8qH8qH8qH', 'Sarah', 'Brown', '1996-12-25', 'Architect', 'Designing living spaces', 'credential', true, true),
('david.lee@example.com', '0905678901', '$2a$10$rZ5qH8qH8qH8qH8qH8qH8uO5qH8qH8qH8qH8qH8qH8qH8qH8qH8qH', 'David', 'Lee', '1999-07-07', 'Student', 'Learning and exploring', 'credential', true, true);

-- =============================================
-- 4. SEED POSTS (10 posts)
-- =============================================
DO $$
DECLARE
  user_a_id UUID;
  user_b_id UUID;
  user_c_id UUID;
  user_d_id UUID;
  user_e_id UUID;
  cat_tech_id UUID;
  cat_design_id UUID;
  cat_photo_id UUID;
  cat_arch_id UUID;
  cat_music_id UUID;
BEGIN
  -- Get user IDs
  SELECT id INTO user_a_id FROM users WHERE email = 'john.doe@example.com';
  SELECT id INTO user_b_id FROM users WHERE email = 'jane.smith@example.com';
  SELECT id INTO user_c_id FROM users WHERE email = 'mike.wilson@example.com';
  SELECT id INTO user_d_id FROM users WHERE email = 'sarah.brown@example.com';
  SELECT id INTO user_e_id FROM users WHERE email = 'david.lee@example.com';
  
  -- Get category IDs
  SELECT id INTO cat_tech_id FROM categories WHERE slug = 'technology';
  SELECT id INTO cat_design_id FROM categories WHERE slug = 'design';
  SELECT id INTO cat_photo_id FROM categories WHERE slug = 'photography';
  SELECT id INTO cat_arch_id FROM categories WHERE slug = 'architecture';
  SELECT id INTO cat_music_id FROM categories WHERE slug = 'music';
  
  -- Insert posts
  INSERT INTO posts (user_id, category_id, title, description, visibility, like_count, comment_count, view_count) VALUES
  (user_a_id, cat_tech_id, 'AI Trends 2024', 'Notable AI trends in 2024', 'public', 45, 12, 230),
  (user_a_id, cat_tech_id, 'React vs Vue: Detailed Comparison', 'Analysis of React and Vue pros and cons', 'public', 38, 8, 180),
  (user_b_id, cat_design_id, 'Pastel Color Palette 2024', 'Beautiful pastel color palettes for design', 'public', 67, 15, 340),
  (user_b_id, cat_design_id, 'UI/UX Trends', 'User interface design trends', 'public', 52, 10, 290),
  (user_c_id, cat_photo_id, 'Landscape Photography Tips', 'Best spots for landscape photography', 'public', 89, 20, 450),
  (user_c_id, cat_photo_id, 'Portrait Photography Techniques', 'Professional portrait photography guide', 'public', 73, 18, 380),
  (user_d_id, cat_arch_id, 'Modern Townhouse Design', '4-story townhouse design ideas', 'public', 56, 14, 310),
  (user_d_id, cat_arch_id, 'Minimalist Interior', 'Japanese minimalist interior style', 'public', 61, 11, 270),
  (user_e_id, cat_music_id, 'Learn Guitar Basics', 'Guitar guide for beginners', 'public', 42, 9, 220),
  (user_e_id, cat_music_id, 'Top 10 Songs This Month', 'Best songs of the month', 'public', 35, 7, 190);
  
END $$;

-- =============================================
-- 5. SEED POST IMAGES (20 images)
-- =============================================
DO $$
DECLARE
  post_record RECORD;
  image_counter INTEGER := 1;
BEGIN
  FOR post_record IN SELECT id FROM posts ORDER BY created_at LIMIT 10
  LOOP
    -- Add 2 images per post
    INSERT INTO post_images (post_id, image_url, image_path, display_order) VALUES
    (post_record.id, 'https://images.unsplash.com/photo-' || image_counter || '?w=800', '/uploads/sample-' || image_counter || '.jpg', 0),
    (post_record.id, 'https://images.unsplash.com/photo-' || (image_counter + 1) || '?w=800', '/uploads/sample-' || (image_counter + 1) || '.jpg', 1);
    
    image_counter := image_counter + 2;
  END LOOP;
END $$;

-- =============================================
-- 6. SEED LIKES (30 likes)
-- =============================================
DO $$
DECLARE
  user_ids UUID[];
  post_ids UUID[];
  i INTEGER;
BEGIN
  -- Get all user and post IDs
  SELECT ARRAY_AGG(id) INTO user_ids FROM users;
  SELECT ARRAY_AGG(id) INTO post_ids FROM posts;
  
  -- Create random likes
  FOR i IN 1..30 LOOP
    INSERT INTO likes (user_id, post_id)
    VALUES (
      user_ids[1 + (random() * (array_length(user_ids, 1) - 1))::INTEGER],
      post_ids[1 + (random() * (array_length(post_ids, 1) - 1))::INTEGER]
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- =============================================
-- 7. SEED COMMENTS (20 comments)
-- =============================================
DO $$
DECLARE
  user_ids UUID[];
  post_ids UUID[];
  comments TEXT[] := ARRAY[
    'Great post!',
    'Thanks for sharing',
    'Very useful information',
    'I really like this idea',
    'Quality content!',
    'Saved for reference',
    'Awesome!',
    'Very helpful',
    'Thank you!',
    'Love it!'
  ];
  i INTEGER;
BEGIN
  SELECT ARRAY_AGG(id) INTO user_ids FROM users;
  SELECT ARRAY_AGG(id) INTO post_ids FROM posts;

  FOR i IN 1..20 LOOP
    INSERT INTO comments (user_id, post_id, content)
    VALUES (
      user_ids[1 + (random() * (array_length(user_ids, 1) - 1))::INTEGER],
      post_ids[1 + (random() * (array_length(post_ids, 1) - 1))::INTEGER],
      comments[1 + (random() * (array_length(comments, 1) - 1))::INTEGER]
    );
  END LOOP;
END $$;

-- =============================================
-- DONE!
-- =============================================
