import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface Option {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

interface FormOptions {
  jobs: Option[];
  categories: Option[];
  purposes: Option[];
  sources: Option[];
  expectations: Option[];
}

export const useFormOptions = () => {
  return useQuery<FormOptions>({
    queryKey: ['formOptions'],
    queryFn: async () => {
      const response = await api.get('/options');
      return response.data.data;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
};

export const useJobOptions = () => {
  return useQuery<Option[]>({
    queryKey: ['jobOptions'],
    queryFn: async () => {
      const response = await api.get('/options/jobs');
      return response.data.data;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
};

export const useCategoryOptions = () => {
  return useQuery<Option[]>({
    queryKey: ['categoryOptions'],
    queryFn: async () => {
      const response = await api.get('/options/categories');
      return response.data.data;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
};

