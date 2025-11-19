import { supabase } from '../config/supabase';

export class OptionsService {
  // Get all form options
  async getFormOptions() {
    const jobs = await this.getJobOptions();
    const categories = await this.getCategories();

    return {
      jobs,
      categories,
      purposes: this.getPurposeOptions(),
      sources: this.getSourceOptions(),
      expectations: this.getExpectationOptions(),
    };
  }

  // Get job options
  async getJobOptions() {
    return [
      { value: 'student', label: 'Sinh viên' },
      { value: 'developer', label: 'Lập trình viên' },
      { value: 'designer', label: 'Thiết kế' },
      { value: 'marketing', label: 'Marketing' },
      { value: 'business', label: 'Kinh doanh' },
      { value: 'teacher', label: 'Giáo viên' },
      { value: 'doctor', label: 'Bác sĩ' },
      { value: 'engineer', label: 'Kỹ sư' },
      { value: 'artist', label: 'Nghệ sĩ' },
      { value: 'photographer', label: 'Nhiếp ảnh gia' },
      { value: 'writer', label: 'Nhà văn' },
      { value: 'entrepreneur', label: 'Doanh nhân' },
      { value: 'freelancer', label: 'Freelancer' },
      { value: 'other', label: 'Khác' },
    ];
  }

  // Get categories from database
  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, description, icon')
      .order('name');

    if (error) {
      throw new Error('Failed to fetch categories');
    }

    return data.map((cat) => ({
      value: cat.id,
      label: cat.name,
      description: cat.description,
      icon: cat.icon,
    }));
  }

  // Get purpose options (for survey)
  getPurposeOptions() {
    return [
      { value: 'inspiration', label: 'Tìm cảm hứng' },
      { value: 'share_ideas', label: 'Chia sẻ ý tưởng' },
      { value: 'learn', label: 'Học hỏi' },
      { value: 'networking', label: 'Kết nối' },
      { value: 'portfolio', label: 'Xây dựng portfolio' },
      { value: 'business', label: 'Kinh doanh' },
      { value: 'hobby', label: 'Sở thích' },
      { value: 'other', label: 'Khác' },
    ];
  }

  // Get source options (for survey)
  getSourceOptions() {
    return [
      { value: 'google', label: 'Google Search' },
      { value: 'facebook', label: 'Facebook' },
      { value: 'instagram', label: 'Instagram' },
      { value: 'youtube', label: 'YouTube' },
      { value: 'friend', label: 'Bạn bè giới thiệu' },
      { value: 'advertisement', label: 'Quảng cáo' },
      { value: 'blog', label: 'Blog/Website' },
      { value: 'other', label: 'Khác' },
    ];
  }

  // Get expectation options (for survey)
  getExpectationOptions() {
    return [
      { value: 'very_high', label: 'Rất cao' },
      { value: 'high', label: 'Cao' },
      { value: 'medium', label: 'Trung bình' },
      { value: 'low', label: 'Thấp' },
      { value: 'very_low', label: 'Rất thấp' },
    ];
  }
}

