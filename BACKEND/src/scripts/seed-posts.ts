import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Sample Unsplash image URLs for seeding
const sampleImages = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&q=80',
  'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
  'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800&q=80',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&q=80',
  'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80',
];

const samplePosts = [
  {
    title: 'Beautiful Mountain Landscape',
    description: 'A stunning view of mountains at sunset',
    tags: ['nature', 'landscape', 'mountains'],
  },
  {
    title: 'Modern City Architecture',
    description: 'Urban architecture and cityscapes',
    tags: ['architecture', 'city', 'urban'],
  },
  {
    title: 'Ocean Sunset',
    description: 'Peaceful ocean view during golden hour',
    tags: ['ocean', 'sunset', 'nature'],
  },
  {
    title: 'Forest Path',
    description: 'A serene path through the forest',
    tags: ['forest', 'nature', 'path'],
  },
  {
    title: 'Mountain Lake',
    description: 'Crystal clear mountain lake reflection',
    tags: ['lake', 'mountains', 'reflection'],
  },
  {
    title: 'Desert Dunes',
    description: 'Vast desert landscape with sand dunes',
    tags: ['desert', 'sand', 'landscape'],
  },
  {
    title: 'Tropical Beach',
    description: 'Beautiful tropical beach paradise',
    tags: ['beach', 'tropical', 'ocean'],
  },
  {
    title: 'Snowy Peaks',
    description: 'Majestic snow-covered mountain peaks',
    tags: ['snow', 'mountains', 'winter'],
  },
  {
    title: 'Autumn Forest',
    description: 'Colorful autumn forest scene',
    tags: ['autumn', 'forest', 'colors'],
  },
  {
    title: 'City Lights',
    description: 'Urban cityscape at night',
    tags: ['city', 'night', 'lights'],
  },
];

async function seedPosts() {
  try {
    console.log('🌱 Starting to seed posts...\n');

    // Get first user (or create one if none exists)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.error('❌ No users found. Please create a user first by registering.');
      process.exit(1);
    }

    const userId = users[0].id;
    console.log(`✅ Using user ID: ${userId}\n`);

    // Get first category (or create one if none exists)
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id')
      .limit(1);

    if (categoriesError || !categories || categories.length === 0) {
      console.error('❌ No categories found. Please run the full seed script first.');
      process.exit(1);
    }

    const categoryId = categories[0].id;
    console.log(`✅ Using category ID: ${categoryId}\n`);

    // Create posts
    console.log('📝 Creating posts...\n');
    let createdCount = 0;

    for (let i = 0; i < samplePosts.length; i++) {
      const postData = samplePosts[i];
      const imageUrl = sampleImages[i % sampleImages.length];

      // Create post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          category_id: categoryId,
          title: postData.title,
          description: postData.description,
          tags: postData.tags,
          visibility: 'public',
          view_count: Math.floor(Math.random() * 1000),
          like_count: Math.floor(Math.random() * 100),
          comment_count: Math.floor(Math.random() * 50),
        })
        .select()
        .single();

      if (postError) {
        console.error(`❌ Error creating post ${i + 1}:`, postError.message);
        continue;
      }

      // Create post image
      const { error: imageError } = await supabase
        .from('post_images')
        .insert({
          post_id: post.id,
          image_url: imageUrl,
          image_path: imageUrl,
          display_order: 0,
        });

      if (imageError) {
        console.error(`❌ Error creating image for post ${i + 1}:`, imageError.message);
        // Delete the post if image creation failed
        await supabase.from('posts').delete().eq('id', post.id);
        continue;
      }

      createdCount++;
      console.log(`✅ Created post ${i + 1}: ${postData.title}`);
    }

    console.log(`\n✨ Successfully created ${createdCount} posts!`);

    // Verify
    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Total posts in database: ${count || 0}`);

  } catch (error: any) {
    console.error('❌ Error seeding posts:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
seedPosts()
  .then(() => {
    console.log('\n✨ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

