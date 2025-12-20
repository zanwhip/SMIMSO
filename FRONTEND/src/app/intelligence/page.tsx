'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import SecondaryNav from '@/components/SecondaryNav';
import { FiZap, FiImage, FiVideo, FiTrendingUp, FiLayers, FiDroplet, FiMaximize2, FiEdit3 } from 'react-icons/fi';

export default function IntelligencePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated]);

  const aiTools = [
    {
      icon: FiImage,
      title: 'Text to Image',
      description: 'Generate stunning images from text descriptions using AI',
      color: 'from-purple-500 to-pink-500',
      href: '/imagine/text-to-image',
    },
    {
      icon: FiVideo,
      title: 'Text to Video',
      description: 'Create dynamic videos from text prompts with AI',
      color: 'from-blue-500 to-cyan-500',
      href: '/imagine/text-to-video',
    },
    {
      icon: FiTrendingUp,
      title: 'Image to Video',
      description: 'Bring static images to life with AI animation',
      color: 'from-green-500 to-emerald-500',
      href: '/imagine/image-to-video',
    },
    {
      icon: FiLayers,
      title: 'Style Transfer',
      description: 'Transfer the style of an image to another image',
      color: 'from-orange-500 to-red-500',
      href: '/imagine/style-transfer',
    },
    {
      icon: FiDroplet,
      title: 'Colorize Image',
      description: 'Colorize black and white images with AI',
      color: 'from-yellow-500 to-orange-500',
      href: '/imagine/colorize',
    },
    {
      icon: FiMaximize2,
      title: 'Upscale Image',
      description: 'Increase the resolution of images with AI',
      color: 'from-indigo-500 to-purple-500',
      href: '/imagine/upscale',
    },
    {
      icon: FiEdit3,
      title: 'Image to Image Editor',
      description: 'Edit and transform images using GPT-4o Image with mask support',
      color: 'from-teal-500 to-cyan-500',
      href: '/imagine/image-to-image',
    },
  ];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <SecondaryNav />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl mb-6">
            <FiZap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            AI Intelligence Studio
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transform your ideas into reality with our powerful AI tools
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {aiTools.map((tool, index) => (
            <button
              key={index}
              onClick={() => router.push(tool.href)}
              className="group relative overflow-hidden bg-white rounded-2xl border-2 border-gray-200 hover:border-transparent hover:shadow-2xl transition-all duration-500 p-8"
            >
              
              <div
                className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
              />

              <div className="relative z-10">
                <div
                  className={`w-16 h-16 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}
                >
                  <tool.icon className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {tool.title}
                </h3>

                <p className="text-gray-600 leading-relaxed">
                  {tool.description}
                </p>

                <div className="mt-6 flex items-center text-accent-600 font-medium group-hover:translate-x-2 transition-transform duration-300">
                  <span>Get Started</span>
                  <svg
                    className="w-5 h-5 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Why Choose Our AI Tools?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiZap className="w-6 h-6 text-accent-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Lightning Fast
              </h3>
              <p className="text-gray-600">
                Generate high-quality content in seconds with our optimized AI
                models
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                High Quality
              </h3>
              <p className="text-gray-600">
                Professional-grade results that match your creative vision
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Easy to Use
              </h3>
              <p className="text-gray-600">
                Simple interface, powerful results. No technical skills required
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

