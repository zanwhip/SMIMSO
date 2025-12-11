'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import SecondaryNav from '@/components/SecondaryNav';
import Image from 'next/image';
import { 
  FiAward, 
  FiCalendar, 
  FiUsers, 
  FiArrowRight
} from 'react-icons/fi';

interface Challenge {
  id: string;
  title: string;
  description: string;
  image: string;
  startDate: string;
  endDate: string;
  participants: number;
  prize: string;
  category: string;
}

export default function ChallengesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const challengeRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockChallenges: Challenge[] = [
      {
        id: '1',
        title: 'Nature Photography Contest',
        description: 'Capture the beauty of nature in its purest form. Show us your best landscape, wildlife, and nature photography.',
        image: '/images/banner.svg',
        startDate: '2024-01-01',
        endDate: '2024-02-28',
        participants: 1234,
        prize: '$5,000',
        category: 'Nature',
      },
      {
        id: '2',
        title: 'Urban Architecture Challenge',
        description: 'Explore the world of urban architecture. From skyscrapers to street art, showcase the beauty of cityscapes.',
        image: '/images/banner.svg',
        startDate: '2024-02-01',
        endDate: '2024-03-31',
        participants: 856,
        prize: '$3,500',
        category: 'Architecture',
      },
      {
        id: '3',
        title: 'Portrait Excellence',
        description: 'Celebrate the art of portrait photography. Capture emotions, expressions, and the human spirit.',
        image: '/images/banner.svg',
        startDate: '2024-03-01',
        endDate: '2024-04-30',
        participants: 2103,
        prize: '$7,000',
        category: 'Portrait',
      },
      {
        id: '4',
        title: 'Abstract Art Vision',
        description: 'Push the boundaries of creativity with abstract photography. Colors, shapes, and imagination combined.',
        image: '/images/banner.svg',
        startDate: '2024-04-01',
        endDate: '2024-05-31',
        participants: 567,
        prize: '$2,500',
        category: 'Abstract',
      },
      {
        id: '5',
        title: 'Wildlife Adventure',
        description: 'Document the incredible world of wildlife. From the smallest insects to majestic animals in their natural habitat.',
        image: '/images/banner.svg',
        startDate: '2024-05-01',
        endDate: '2024-06-30',
        participants: 1890,
        prize: '$6,000',
        category: 'Wildlife',
      },
      {
        id: '6',
        title: 'Street Photography Stories',
        description: 'Tell stories through street photography. Capture candid moments, urban life, and human connections.',
        image: '/images/banner.svg',
        startDate: '2024-06-01',
        endDate: '2024-07-31',
        participants: 1456,
        prize: '$4,000',
        category: 'Street',
      },
    ];

    setTimeout(() => {
      setChallenges(mockChallenges);
      setIsLoading(false);
    }, 500);
  }, []);

  useEffect(() => {
    if (challenges.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          entry.target.classList.remove('animate-out');
        } else {
          entry.target.classList.add('animate-out');
          entry.target.classList.remove('animate-in');
        }
      });
    }, observerOptions);

    challengeRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      challengeRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [challenges]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      <Navbar />
      <SecondaryNav />

      <div className="max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16">
        {/* Header Section */}
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-xl">
            <FiAward className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
            Photo <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Challenges</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join exciting photography contests, showcase your talent, and win amazing prizes
          </p>
        </div>

        {/* Challenges Grid */}
        <div className="space-y-24 md:space-y-32">
          {challenges.map((challenge, index) => (
            <div
              key={challenge.id}
              ref={(el) => {
                if (el) {
                  challengeRefs.current[index] = el;
                }
              }}
              className={`challenge-card flex flex-col ${
                index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
              } items-center gap-8 md:gap-12 lg:gap-16`}
            >
              {/* Image Section */}
              <div className="flex-1 w-full md:w-auto">
                <div className="relative group overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl bg-white/80 backdrop-blur-xl border border-gray-200/50">
                  <div className="aspect-[4/3] relative">
                    <Image
                      src={challenge.image}
                      alt={challenge.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      unoptimized={challenge.image.endsWith('.svg')}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg">
                      <span className="text-sm font-semibold text-gray-900">{challenge.category}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-4 py-2 rounded-full backdrop-blur-sm">
                  <FiAward className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-600">Prize: {challenge.prize}</span>
                </div>

                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                  {challenge.title}
                </h2>

                <p className="text-lg text-gray-600 leading-relaxed">
                  {challenge.description}
                </p>

                <div className="flex flex-wrap gap-4 pt-4">
                  <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-md px-4 py-3 rounded-xl shadow-md border border-gray-200/50">
                    <FiCalendar className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-xs text-gray-500">Ends</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(challenge.endDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-md px-4 py-3 rounded-xl shadow-md border border-gray-200/50">
                    <FiUsers className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-xs text-gray-500">Participants</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {challenge.participants.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/challenges/${challenge.id}`)}
                  className="group inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 mt-6"
                >
                  <span>Join Challenge</span>
                  <FiArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
