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
-- 4. SEED POSTS (15 posts with diverse content)
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
  cat_art_id UUID;
  cat_travel_id UUID;
  cat_food_id UUID;
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
  SELECT id INTO cat_art_id FROM categories WHERE slug = 'art';
  SELECT id INTO cat_travel_id FROM categories WHERE slug = 'travel';
  SELECT id INTO cat_food_id FROM categories WHERE slug = 'food';

  -- Insert posts with realistic descriptions
  INSERT INTO posts (user_id, category_id, title, description, tags, visibility, like_count, comment_count, view_count) VALUES
  (user_a_id, cat_tech_id, 'The Future of AI in 2024', 'Exploring the latest trends in artificial intelligence, from generative AI to autonomous systems. The technology landscape is evolving rapidly with new breakthroughs every day.', ARRAY['AI', 'technology', 'future', 'innovation'], 'public', 125, 34, 890),
  (user_b_id, cat_design_id, 'Minimalist Design Principles', 'Less is more - discover how minimalist design can create powerful visual impact. Learn the key principles of clean, effective design that resonates with users.', ARRAY['design', 'minimalism', 'UI', 'UX'], 'public', 98, 28, 670),
  (user_c_id, cat_photo_id, 'Golden Hour Photography', 'Capturing the magic of golden hour - tips and techniques for stunning sunset and sunrise photography. The perfect lighting can transform ordinary scenes into extraordinary images.', ARRAY['photography', 'golden hour', 'landscape', 'tips'], 'public', 156, 42, 1120),
  (user_a_id, cat_tech_id, 'Building Scalable Web Apps', 'Best practices for creating web applications that can handle millions of users. From architecture design to deployment strategies, learn how to build for scale.', ARRAY['web development', 'scalability', 'architecture'], 'public', 87, 19, 540),
  (user_d_id, cat_arch_id, 'Modern Sustainable Architecture', 'Eco-friendly building design that combines aesthetics with environmental responsibility. Discover how modern architecture is embracing sustainability without compromising on style.', ARRAY['architecture', 'sustainable', 'eco-friendly', 'modern'], 'public', 112, 31, 780),
  (user_b_id, cat_design_id, 'Color Theory for Designers', 'Understanding color psychology and how to use it effectively in your designs. Master the art of color combinations that evoke the right emotions and create visual harmony.', ARRAY['design', 'color theory', 'psychology'], 'public', 143, 38, 950),
  (user_c_id, cat_photo_id, 'Street Photography Essentials', 'Capturing authentic moments in urban environments. Learn the techniques and mindset needed for compelling street photography that tells powerful stories.', ARRAY['photography', 'street', 'urban', 'documentary'], 'public', 134, 36, 890),
  (user_e_id, cat_art_id, 'Digital Art Techniques', 'From concept to completion - a comprehensive guide to digital illustration. Explore the tools, techniques, and creative processes used by professional digital artists.', ARRAY['art', 'digital', 'illustration', 'creative'], 'public', 91, 24, 620),
  (user_a_id, cat_travel_id, 'Hidden Gems of Southeast Asia', 'Discover breathtaking destinations off the beaten path. From secluded beaches to mountain villages, explore the places that most tourists never see.', ARRAY['travel', 'Asia', 'adventure', 'exploration'], 'public', 178, 45, 1340),
  (user_d_id, cat_arch_id, 'Industrial Interior Design', 'Raw materials and exposed structures create stunning living spaces. Learn how to incorporate industrial elements into modern interior design for a unique aesthetic.', ARRAY['interior', 'industrial', 'design', 'modern'], 'public', 105, 27, 710),
  (user_b_id, cat_food_id, 'Artisan Bread Making', 'The art and science of baking perfect sourdough at home. Master the techniques that professional bakers use to create crusty, flavorful artisan bread.', ARRAY['food', 'baking', 'bread', 'sourdough'], 'public', 89, 22, 580),
  (user_c_id, cat_photo_id, 'Macro Photography Magic', 'Exploring the tiny world through your lens. Discover the fascinating details and textures that exist in miniature, from insects to water droplets.', ARRAY['photography', 'macro', 'nature', 'closeup'], 'public', 121, 33, 820),
  (user_e_id, cat_art_id, 'Abstract Expressionism Today', 'Contemporary takes on abstract art movements. How modern artists are reinterpreting and pushing the boundaries of abstract expressionism in the digital age.', ARRAY['art', 'abstract', 'contemporary', 'expressionism'], 'public', 76, 18, 490),
  (user_a_id, cat_tech_id, 'Cybersecurity Best Practices', 'Protecting your digital life in an increasingly connected world. Essential security measures everyone should implement to stay safe online.', ARRAY['security', 'cybersecurity', 'privacy', 'technology'], 'public', 94, 25, 640),
  (user_d_id, cat_travel_id, 'Mountain Adventures', 'Trekking through breathtaking alpine landscapes. Experience the majesty of mountain peaks, pristine lakes, and the serenity of high-altitude wilderness.', ARRAY['travel', 'mountains', 'hiking', 'adventure'], 'public', 167, 41, 1180);

END $$;

-- =============================================
-- 5. SEED POST IMAGES (45 images - using real Unsplash URLs)
-- =============================================
DO $$
DECLARE
  post_ids UUID[];
  post_id UUID;
  i INTEGER := 0;
  img_index INTEGER;
  -- Real Unsplash image URLs provided by user
  image_urls TEXT[] := ARRAY[
    'https://plus.unsplash.com/premium_photo-1763369799290-773aa2bdebd0?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'https://images.unsplash.com/photo-1763328719057-ff6b03c816d0?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'https://images.unsplash.com/photo-1762793193663-cc343d78111c?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  ];
  captions TEXT[] := ARRAY[
    'A stunning landscape view with vibrant colors and natural beauty',
    'Modern architecture showcasing clean lines and innovative design',
    'Artistic composition capturing light and shadow perfectly'
  ];
BEGIN
  -- Get all post IDs
  SELECT ARRAY_AGG(id ORDER BY created_at) INTO post_ids FROM posts;

  -- Add 3 images to each post (cycling through the 3 Unsplash images)
  FOREACH post_id IN ARRAY post_ids
  LOOP
    FOR img_index IN 0..2 LOOP
      INSERT INTO post_images (post_id, image_url, image_path, caption, display_order) VALUES
      (post_id, image_urls[img_index + 1], '/uploads/unsplash-' || (img_index + 1) || '.jpg', captions[img_index + 1], img_index);
    END LOOP;

    i := i + 1;
  END LOOP;
END $$;

-- =============================================
-- 6. SEED LIKES (50 likes for more engagement)
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

  -- Create random likes (more engagement)
  FOR i IN 1..50 LOOP
    INSERT INTO likes (user_id, post_id)
    VALUES (
      user_ids[1 + (random() * (array_length(user_ids, 1) - 1))::INTEGER],
      post_ids[1 + (random() * (array_length(post_ids, 1) - 1))::INTEGER]
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- =============================================
-- 7. SEED COMMENTS (30 comments with more variety)
-- =============================================
DO $$
DECLARE
  user_ids UUID[];
  post_ids UUID[];
  comments TEXT[] := ARRAY[
    'This is absolutely stunning! Great work!',
    'Thanks for sharing this valuable insight',
    'Very informative and well-presented',
    'I really appreciate this perspective',
    'Outstanding quality content!',
    'Definitely saving this for future reference',
    'Incredible work, keep it up!',
    'This is exactly what I was looking for',
    'Thank you for this detailed explanation!',
    'Love the creativity here!',
    'Such an inspiring post',
    'This deserves more attention',
    'Beautifully captured and explained',
    'Really helpful tips, thank you!',
    'Amazing attention to detail'
  ];
  i INTEGER;
BEGIN
  SELECT ARRAY_AGG(id) INTO user_ids FROM users;
  SELECT ARRAY_AGG(id) INTO post_ids FROM posts;

  FOR i IN 1..30 LOOP
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
