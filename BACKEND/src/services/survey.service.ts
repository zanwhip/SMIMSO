import { supabase } from '../config/supabase';
import { Survey, SurveyDTO } from '../types';

export class SurveyService {
  async submitSurvey(userId: string, data: SurveyDTO): Promise<Survey> {
    const { favorite_categories, usage_purposes, awareness_source, expectation_level } = data;

    const { data: existingSurvey } = await supabase
      .from('surveys')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingSurvey) {
      const { data: updatedSurvey, error } = await supabase
        .from('surveys')
        .update({
          favorite_categories,
          usage_purposes,
          awareness_source,
          expectation_level,
          completed_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error || !updatedSurvey) {
        throw new Error('Failed to update survey');
      }

      return updatedSurvey;
    } else {
      const { data: newSurvey, error } = await supabase
        .from('surveys')
        .insert({
          user_id: userId,
          favorite_categories,
          usage_purposes,
          awareness_source,
          expectation_level,
        })
        .select()
        .single();

      if (error || !newSurvey) {
        throw new Error('Failed to submit survey');
      }

      return newSurvey;
    }
  }

  async getUserSurvey(userId: string): Promise<Survey | null> {
    const { data: survey, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      return null;
    }

    return survey;
  }

  async hasCompletedSurvey(userId: string): Promise<boolean> {
    const survey = await this.getUserSurvey(userId);
    return survey !== null;
  }

  async getSurveyOptions() {
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, slug, description')
      .order('name');

    return {
      categories: categories || [],
      usagePurposes: [
        { value: 'share_ideas', label: 'Share ideas' },
        { value: 'find_inspiration', label: 'Find inspiration' },
        { value: 'connect_community', label: 'Connect with community' },
        { value: 'store_images', label: 'Store images' },
        { value: 'other', label: 'Other' },
      ],
      awarenessSources: [
        { value: 'friends', label: 'Friends' },
        { value: 'social_media', label: 'Social media' },
        { value: 'advertisement', label: 'Advertisement' },
        { value: 'search', label: 'Search engine' },
        { value: 'other', label: 'Other' },
      ],
    };
  }
}

