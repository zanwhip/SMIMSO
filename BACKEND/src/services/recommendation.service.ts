import { supabase } from '../config/supabase';

interface SimilarUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  job: string | null;
  similarity_score: number;
  shared_interests: string[];
}

export class RecommendationService {
  /**
   * Find similar users based on survey data and content similarity
   */
  async findSimilarUsers(userId: string, limit: number = 10): Promise<SimilarUser[]> {
    try {
      // Get current user's survey data
      const { data: currentUserSurvey, error: surveyError } = await supabase
        .from('surveys')
        .select('favorite_categories, usage_purposes')
        .eq('user_id', userId)
        .single();

      if (surveyError) {
        console.error('Survey not found for user:', userId);
        return [];
      }

      // Get all other users with their surveys
      const { data: otherUsers, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          avatar_url,
          job,
          surveys (
            favorite_categories,
            usage_purposes
          )
        `)
        .neq('id', userId)
        .not('surveys', 'is', null);

      if (usersError || !otherUsers) {
        console.error('Error fetching users:', usersError);
        return [];
      }

      // Calculate similarity scores
      const usersWithScores = otherUsers
        .map((user: any) => {
          if (!user.surveys || user.surveys.length === 0) {
            return null;
          }

          const userSurvey = user.surveys[0];
          
          // Calculate survey similarity
          const surveySimilarity = this.calculateSurveySimilarity(
            currentUserSurvey,
            userSurvey
          );

          // Get shared interests
          const sharedInterests = this.getSharedInterests(
            currentUserSurvey.favorite_categories,
            userSurvey.favorite_categories
          );

          return {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar_url: user.avatar_url,
            job: user.job,
            similarity_score: surveySimilarity,
            shared_interests: sharedInterests,
          };
        })
        .filter((user): user is SimilarUser => user !== null)
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, limit);

      return usersWithScores;
    } catch (error) {
      console.error('Error finding similar users:', error);
      return [];
    }
  }

  /**
   * Calculate similarity between two surveys (0-1)
   */
  private calculateSurveySimilarity(survey1: any, survey2: any): number {
    let score = 0;
    let maxScore = 0;

    // Compare favorite categories (weight: 0.6)
    if (survey1.favorite_categories && survey2.favorite_categories) {
      const categories1 = Array.isArray(survey1.favorite_categories)
        ? survey1.favorite_categories
        : [];
      const categories2 = Array.isArray(survey2.favorite_categories)
        ? survey2.favorite_categories
        : [];

      const sharedCategories = categories1.filter((cat: string) =>
        categories2.includes(cat)
      ).length;

      const totalCategories = new Set([...categories1, ...categories2]).size;

      if (totalCategories > 0) {
        score += (sharedCategories / totalCategories) * 0.6;
      }
      maxScore += 0.6;
    }

    // Compare usage purposes (weight: 0.4)
    if (survey1.usage_purposes && survey2.usage_purposes) {
      const purposes1 = Array.isArray(survey1.usage_purposes)
        ? survey1.usage_purposes
        : [];
      const purposes2 = Array.isArray(survey2.usage_purposes)
        ? survey2.usage_purposes
        : [];

      const sharedPurposes = purposes1.filter((purpose: string) =>
        purposes2.includes(purpose)
      ).length;

      const totalPurposes = new Set([...purposes1, ...purposes2]).size;

      if (totalPurposes > 0) {
        score += (sharedPurposes / totalPurposes) * 0.4;
      }
      maxScore += 0.4;
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Get shared interests between two users
   */
  private getSharedInterests(categories1: any, categories2: any): string[] {
    const cats1 = Array.isArray(categories1) ? categories1 : [];
    const cats2 = Array.isArray(categories2) ? categories2 : [];

    return cats1.filter((cat: string) => cats2.includes(cat));
  }
}

