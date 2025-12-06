'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Category } from '@/types';
import { FiCheck } from 'react-icons/fi';

export default function SurveyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    favorite_categories: [] as string[],
    usage_purposes: [] as string[],
    awareness_source: '',
    expectation_level: 5,
  });

  const usagePurposes = [
    { value: 'share_ideas', label: 'Chia sẻ ý tưởng' },
    { value: 'find_inspiration', label: 'Tìm kiếm cảm hứng' },
    { value: 'connect_community', label: 'Kết nối cộng đồng' },
    { value: 'store_images', label: 'Lưu trữ ảnh' },
    { value: 'other', label: 'Khác' },
  ];

  const awarenessSources = [
    { value: 'friends', label: 'Bạn bè' },
    { value: 'social_media', label: 'Mạng xã hội' },
    { value: 'advertisement', label: 'Quảng cáo' },
    { value: 'search', label: 'Tình cờ tìm thấy' },
    { value: 'other', label: 'Khác' },
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/survey/options');
      setCategories(response.data.data.categories);
    } catch (error) {
      }
  };

  const toggleCategory = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      favorite_categories: prev.favorite_categories.includes(categoryId)
        ? prev.favorite_categories.filter((id) => id !== categoryId)
        : [...prev.favorite_categories, categoryId],
    }));
  };

  const togglePurpose = (purpose: string) => {
    setFormData((prev) => ({
      ...prev,
      usage_purposes: prev.usage_purposes.includes(purpose)
        ? prev.usage_purposes.filter((p) => p !== purpose)
        : [...prev.usage_purposes, purpose],
    }));
  };

  const handleSubmit = async () => {
    if (formData.favorite_categories.length === 0) {
      toast.error('Vui lòng chọn ít nhất một thể loại yêu thích');
      return;
    }

    if (formData.usage_purposes.length === 0) {
      toast.error('Vui lòng chọn ít nhất một mục đích sử dụng');
      return;
    }

    if (!formData.awareness_source) {
      toast.error('Vui lòng chọn nguồn biết đến hệ thống');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/survey', formData);
      toast.success('Cảm ơn bạn đã hoàn thành khảo sát!');
      router.push('/');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gửi khảo sát thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Bạn quan tâm đến những thể loại nào?
            </h3>
            <p className="text-sm text-gray-600">Chọn ít nhất một thể loại</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className={`p-4 rounded-lg border-2 transition ${
                    formData.favorite_categories.includes(category.id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{category.name}</span>
                    {formData.favorite_categories.includes(category.id) && (
                      <FiCheck className="text-primary-600" />
                    )}
                  </div>
                  {category.description && (
                    <p className="text-xs text-gray-500 mt-1">{category.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Mục đích sử dụng của bạn là gì?
            </h3>
            <p className="text-sm text-gray-600">Có thể chọn nhiều mục đích</p>
            <div className="space-y-3">
              {usagePurposes.map((purpose) => (
                <button
                  key={purpose.value}
                  type="button"
                  onClick={() => togglePurpose(purpose.value)}
                  className={`w-full p-4 rounded-lg border-2 transition text-left ${
                    formData.usage_purposes.includes(purpose.value)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{purpose.label}</span>
                    {formData.usage_purposes.includes(purpose.value) && (
                      <FiCheck className="text-primary-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Bạn biết đến SMIMSO qua đâu?
            </h3>
            <div className="space-y-3">
              {awarenessSources.map((source) => (
                <button
                  key={source.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, awareness_source: source.value })}
                  className={`w-full p-4 rounded-lg border-2 transition text-left ${
                    formData.awareness_source === source.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{source.label}</span>
                    {formData.awareness_source === source.value && (
                      <FiCheck className="text-primary-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Mức độ kỳ vọng của bạn (1-5)
              </h4>
              <input
                type="range"
                min="1"
                max="5"
                value={formData.expectation_level}
                onChange={(e) =>
                  setFormData({ ...formData, expectation_level: parseInt(e.target.value) })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Thấp</span>
                <span className="font-bold text-primary-600">{formData.expectation_level}</span>
                <span>Cao</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">
                Bước {step} / 3
              </span>
              <span className="text-sm font-medium text-primary-600">
                {Math.round((step / 3) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary-600 to-secondary-600 h-2 rounded-full transition-all"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>

          {renderStep()}

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Quay lại
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg hover:from-primary-700 hover:to-secondary-700 transition"
              >
                Tiếp tục
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 transition"
              >
                {isLoading ? 'Đang gửi...' : 'Hoàn thành'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

