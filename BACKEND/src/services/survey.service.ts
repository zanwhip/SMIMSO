import { supabase } from '../config/supabase';
import { Survey, SurveyDTO } from '../types';

export class SurveyService {
  // Submit survey
  async submitSurvey(userId: string, data: SurveyDTO): Promise<Survey> {
    const { favorite_categories, usage_purposes, awareness_source, expectation_level } = data;

    // Check if survey already exists
    const { data: existingSurvey } = await supabase
      .from('surveys')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingSurvey) {
      // Update existing survey
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
      // Create new survey
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

  // Get user survey
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

  // Check if user has completed survey
  async hasCompletedSurvey(userId: string): Promise<boolean> {
    const survey = await this.getUserSurvey(userId);
    return survey !== null;
  }

  // Get survey options
  async getSurveyOptions() {
    // Get categories
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, slug, description')
      .order('name');

    return {
      categories: categories || [],
      usagePurposes: [
        { value: 'share_ideas', label: 'Chia sẻ ý tưởng' },
        { value: 'find_inspiration', label: 'Tìm kiếm cảm hứng' },
        { value: 'connect_community', label: 'Kết nối cộng đồng' },
        { value: 'store_images', label: 'Lưu trữ ảnh' },
        { value: 'other', label: 'Khác' },
      ],
      awarenessSources: [
        { value: 'friends', label: 'Bạn bè' },
        { value: 'social_media', label: 'Mạng xã hội' },
        { value: 'advertisement', label: 'Quảng cáo' },
        { value: 'search', label: 'Tình cờ tìm thấy' },
        { value: 'other', label: 'Khác' },
      ],
    };
  }
}

