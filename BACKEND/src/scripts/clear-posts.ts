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

async function clearPostsData() {
  try {
    console.log('='.repeat(60));
    console.log('🗑️  CLEAR ALL POSTS DATA');
    console.log('='.repeat(60));
    console.log('');
    console.log('⚠️  WARNING: This will permanently delete ALL posts and related data!');
    console.log('   - Posts');
    console.log('   - Post Images');
    console.log('   - Likes');
    console.log('   - Comments');
    console.log('   - Saved Posts');
    console.log('   - User Activities related to posts');
    console.log('');

    // Get counts before deletion
    console.log('📊 Getting current counts...\n');
    const { count: initialPostsCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });
    
    const { count: initialImagesCount } = await supabase
      .from('post_images')
      .select('*', { count: 'exact', head: true });
    
    const { count: initialLikesCount } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true });
    
    const { count: initialCommentsCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true });

    console.log(`   Posts: ${initialPostsCount || 0}`);
    console.log(`   Post images: ${initialImagesCount || 0}`);
    console.log(`   Likes: ${initialLikesCount || 0}`);
    console.log(`   Comments: ${initialCommentsCount || 0}\n`);

    if (initialPostsCount === 0) {
      console.log('✅ No posts to delete. Database is already empty.');
      return;
    }

    // Delete in order (though CASCADE should handle it automatically)
    console.log('🔄 Starting deletion...\n');

    // Helper function to get count before deletion
    const getCount = async (table: string, filter?: any) => {
      let query = supabase.from(table).select('*', { count: 'exact', head: true });
      if (filter) {
        query = filter(query);
      }
      const { count } = await query;
      return count || 0;
    };

    // 1. Delete user activities related to posts
    console.log('1. Deleting user activities related to posts...');
    const activitiesCount = await getCount('user_activities', (q: any) => q.not('post_id', 'is', null));
    if (activitiesCount > 0) {
      const { error: activitiesError } = await supabase
        .from('user_activities')
        .delete()
        .not('post_id', 'is', null);
      if (activitiesError) {
        console.error('   ❌ Error:', activitiesError.message);
      } else {
        console.log(`   ✅ Deleted ${activitiesCount} activities`);
      }
    } else {
      console.log('   ℹ️  No activities to delete');
    }

    // 2. Delete saved posts
    console.log('2. Deleting saved posts...');
    const savedCount = await getCount('saved_posts');
    if (savedCount > 0) {
      const { error: savedError } = await supabase
        .from('saved_posts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (savedError) {
        console.error('   ❌ Error:', savedError.message);
      } else {
        console.log(`   ✅ Deleted ${savedCount} saved posts`);
      }
    } else {
      console.log('   ℹ️  No saved posts to delete');
    }

    // 3. Delete comments (including nested comments)
    console.log('3. Deleting comments...');
    const commentsCount = await getCount('comments');
    if (commentsCount > 0) {
      const { error: commentsError } = await supabase
        .from('comments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (commentsError) {
        console.error('   ❌ Error:', commentsError.message);
      } else {
        console.log(`   ✅ Deleted ${commentsCount} comments`);
      }
    } else {
      console.log('   ℹ️  No comments to delete');
    }

    // 4. Delete likes
    console.log('4. Deleting likes...');
    const likesCount = await getCount('likes');
    if (likesCount > 0) {
      const { error: likesError } = await supabase
        .from('likes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (likesError) {
        console.error('   ❌ Error:', likesError.message);
      } else {
        console.log(`   ✅ Deleted ${likesCount} likes`);
      }
    } else {
      console.log('   ℹ️  No likes to delete');
    }

    // 5. Delete post images
    console.log('5. Deleting post images...');
    const imagesCount = await getCount('post_images');
    if (imagesCount > 0) {
      const { error: imagesError } = await supabase
        .from('post_images')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (imagesError) {
        console.error('   ❌ Error:', imagesError.message);
      } else {
        console.log(`   ✅ Deleted ${imagesCount} post images`);
      }
    } else {
      console.log('   ℹ️  No post images to delete');
    }

    // 6. Finally, delete posts (this will cascade delete remaining related data)
    console.log('6. Deleting posts...');
    if (initialPostsCount > 0) {
      const { error: postsError } = await supabase
        .from('posts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (postsError) {
        console.error('   ❌ Error:', postsError.message);
      } else {
        console.log(`   ✅ Deleted ${initialPostsCount} posts`);
      }
    } else {
      console.log('   ℹ️  No posts to delete');
    }

    // Verify deletion
    console.log('\n📊 Verifying deletion...\n');
    
    const { count: finalPostsCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });
    
    const { count: finalImagesCount } = await supabase
      .from('post_images')
      .select('*', { count: 'exact', head: true });
    
    const { count: finalLikesCount } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true });
    
    const { count: finalCommentsCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true });

    console.log(`   Posts remaining: ${finalPostsCount || 0}`);
    console.log(`   Post images remaining: ${finalImagesCount || 0}`);
    console.log(`   Likes remaining: ${finalLikesCount || 0}`);
    console.log(`   Comments remaining: ${finalCommentsCount || 0}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 DELETION SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Initial Posts: ${initialPostsCount || 0}`);
    console.log(`   Initial Images: ${initialImagesCount || 0}`);
    console.log(`   Initial Likes: ${initialLikesCount || 0}`);
    console.log(`   Initial Comments: ${initialCommentsCount || 0}`);
    console.log('');
    console.log(`   Remaining Posts: ${finalPostsCount || 0}`);
    console.log(`   Remaining Images: ${finalImagesCount || 0}`);
    console.log(`   Remaining Likes: ${finalLikesCount || 0}`);
    console.log(`   Remaining Comments: ${finalCommentsCount || 0}`);
    console.log('='.repeat(60));

    if (finalPostsCount === 0 && finalImagesCount === 0 && finalLikesCount === 0 && finalCommentsCount === 0) {
      console.log('\n✅ Successfully cleared all posts data!');
    } else {
      console.log('\n⚠️  Some data may still remain. Please check manually.');
    }

  } catch (error: any) {
    console.error('❌ Error clearing posts data:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
clearPostsData()
  .then(() => {
    console.log('\n✨ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

