-- =============================================
-- SMIMSO Simple Seed Data
-- =============================================

-- =============================================
-- 1. CLEAR EXISTING DATA (Optional - comment out if you want to keep existing data)
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
('Thiết kế', 'design', 'Thiết kế đồ họa, UI/UX, branding'),
('Nhiếp ảnh', 'photography', 'Ảnh nghệ thuật, phong cảnh, chân dung'),
('Công nghệ', 'technology', 'Lập trình, AI, khoa học máy tính'),
('Nghệ thuật', 'art', 'Hội họa, điêu khắc, nghệ thuật số'),
('Kiến trúc', 'architecture', 'Thiết kế kiến trúc, nội thất'),
('Thời trang', 'fashion', 'Xu hướng thời trang, phong cách'),
('Ẩm thực', 'food', 'Món ăn, công thức nấu ăn'),
('Du lịch', 'travel', 'Địa điểm du lịch, trải nghiệm'),
('Âm nhạc', 'music', 'Nhạc cụ, sáng tác, biểu diễn'),
('Thể thao', 'sports', 'Thể thao, fitness, sức khỏe');

-- =============================================
-- 3. SEED USERS (5 users for testing)
-- =============================================
-- Note: Password hash is a placeholder. You need to register users via API to get real password hashes.
-- Or use bcrypt to generate: bcrypt.hash('Password123!', 10)

INSERT INTO users (email, phone, password_hash, first_name, last_name, date_of_birth, job, bio, auth_provider, is_verified, is_active) VALUES
('nguyen.van.a@example.com', '0901234567', '$2a$10$rZ5qH8qH8qH8qH8qH8qH8uO5qH8qH8qH8qH8qH8qH8qH8qH8qH8qH', 'Nguyễn Văn', 'A', '1995-05-15', 'Lập trình viên', 'Đam mê công nghệ và lập trình', 'credential', true, true),
('tran.thi.b@example.com', '0902345678', '$2a$10$rZ5qH8qH8qH8qH8qH8qH8uO5qH8qH8qH8qH8qH8qH8qH8qH8qH8qH', 'Trần Thị', 'B', '1998-08-20', 'Designer', 'Yêu thích thiết kế và sáng tạo', 'credential', true, true),
('le.van.c@example.com', '0903456789', '$2a$10$rZ5qH8qH8qH8qH8qH8qH8uO5qH8qH8qH8qH8qH8qH8qH8qH8qH8qH', 'Lê Văn', 'C', '1997-03-10', 'Nhiếp ảnh gia', 'Chụp ảnh là đam mê của tôi', 'credential', true, true),
('pham.thi.d@example.com', '0904567890', '$2a$10$rZ5qH8qH8qH8qH8qH8qH8uO5qH8qH8qH8qH8qH8qH8qH8qH8qH8qH', 'Phạm Thị', 'D', '1996-12-25', 'Kiến trúc sư', 'Thiết kế không gian sống', 'credential', true, true),
('hoang.van.e@example.com', '0905678901', '$2a$10$rZ5qH8qH8qH8qH8qH8qH8uO5qH8qH8qH8qH8qH8qH8qH8qH8qH8qH', 'Hoàng Văn', 'E', '1999-07-07', 'Sinh viên', 'Học tập và khám phá', 'credential', true, true);

-- =============================================
-- 4. SEED POSTS (10 posts)
-- =============================================
-- Get user and category IDs
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
  SELECT id INTO user_a_id FROM users WHERE email = 'nguyen.van.a@example.com';
  SELECT id INTO user_b_id FROM users WHERE email = 'tran.thi.b@example.com';
  SELECT id INTO user_c_id FROM users WHERE email = 'le.van.c@example.com';
  SELECT id INTO user_d_id FROM users WHERE email = 'pham.thi.d@example.com';
  SELECT id INTO user_e_id FROM users WHERE email = 'hoang.van.e@example.com';
  
  -- Get category IDs
  SELECT id INTO cat_tech_id FROM categories WHERE slug = 'technology';
  SELECT id INTO cat_design_id FROM categories WHERE slug = 'design';
  SELECT id INTO cat_photo_id FROM categories WHERE slug = 'photography';
  SELECT id INTO cat_arch_id FROM categories WHERE slug = 'architecture';
  SELECT id INTO cat_music_id FROM categories WHERE slug = 'music';
  
  -- Insert posts
  INSERT INTO posts (user_id, category_id, title, description, visibility, likes_count, comments_count, views_count) VALUES
  (user_a_id, cat_tech_id, 'Xu hướng AI 2024', 'Những xu hướng AI đáng chú ý trong năm 2024', 'public', 45, 12, 230),
  (user_a_id, cat_tech_id, 'React vs Vue: So sánh chi tiết', 'Phân tích ưu nhược điểm của React và Vue', 'public', 38, 8, 180),
  (user_b_id, cat_design_id, 'Bảng màu Pastel 2024', 'Tổng hợp bảng màu pastel đẹp cho thiết kế', 'public', 67, 15, 340),
  (user_b_id, cat_design_id, 'UI/UX Trends', 'Xu hướng thiết kế giao diện người dùng', 'public', 52, 10, 290),
  (user_c_id, cat_photo_id, 'Chụp ảnh phong cảnh Đà Lạt', 'Những góc chụp đẹp nhất tại Đà Lạt', 'public', 89, 20, 450),
  (user_c_id, cat_photo_id, 'Kỹ thuật chụp chân dung', 'Hướng dẫn chụp ảnh chân dung chuyên nghiệp', 'public', 73, 18, 380),
  (user_d_id, cat_arch_id, 'Thiết kế nhà phố hiện đại', 'Ý tưởng thiết kế nhà phố 4 tầng', 'public', 56, 14, 310),
  (user_d_id, cat_arch_id, 'Nội thất tối giản', 'Phong cách nội thất tối giản Nhật Bản', 'public', 61, 11, 270),
  (user_e_id, cat_music_id, 'Học guitar cơ bản', 'Hướng dẫn học guitar cho người mới bắt đầu', 'public', 42, 9, 220),
  (user_e_id, cat_music_id, 'Top 10 bài hát hay nhất', 'Những bài hát hay nhất tháng này', 'public', 35, 7, 190);
  
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
    'Bài viết rất hay!',
    'Cảm ơn bạn đã chia sẻ',
    'Thông tin hữu ích',
    'Tôi rất thích ý tưởng này',
    'Chất lượng!',
    'Đã lưu lại để tham khảo',
    'Tuyệt vời!',
    'Rất bổ ích',
    'Cảm ơn nhiều!',
    'Hay quá!'
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

