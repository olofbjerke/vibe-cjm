'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { IndexedDBJourneyStorage, type JourneyMapWithImages } from '@/lib/indexeddb-storage';
import PresentationJourneyMap from '@/components/PresentationJourneyMap';

export default function PresentPage() {
  const params = useParams();
  const router = useRouter();
  const [journey, setJourney] = useState<JourneyMapWithImages | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  useEffect(() => {
    const journeyId = params.id as string;
    if (journeyId) {
      const loadJourney = async () => {
        try {
          await IndexedDBJourneyStorage.init();
          const loadedJourney = await IndexedDBJourneyStorage.getJourney(journeyId);
          if (loadedJourney) {
            setJourney(loadedJourney);
          } else {
            router.push('/');
          }
        } catch (error) {
          console.error('Error loading journey for presentation:', error);
          router.push('/');
        }
      };
      loadJourney();
    }
  }, [params.id, router]);

  if (!journey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-black text-gray-800">🔍 Loading journey...</p>
        </div>
      </div>
    );
  }

  // Get touchpoints array and sort by xPosition to maintain spatial order from the editing canvas
  const touchpointsArray = IndexedDBJourneyStorage.getTouchpointsArray(journey);
  const sortedTouchpoints = [...touchpointsArray].sort((a, b) => a.xPosition - b.xPosition);

  const handleTouchpointClick = (index: number) => {
    setActiveIndex(index);
    const element = document.getElementById(`present-touchpoint-${index}`);
    if (element) {
      // Get the sticky header element to calculate its exact height
      const stickyHeader = document.querySelector('.sticky-header');
      const headerHeight = stickyHeader ? stickyHeader.getBoundingClientRect().height + 20 : 200; // 20px buffer
      
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - headerHeight,
        behavior: 'smooth'
      });
    }
  };

  const getEmotionLabel = (emotion: string, intensity: number) => {
    const baseEmoji = {
      'positive': '😊',
      'negative': '😞',
      'neutral': '😐'
    }[emotion] || '😐';
    
    return `${baseEmoji} ${emotion.charAt(0).toUpperCase() + emotion.slice(1)} (${intensity}/10)`;
  };

  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case 'positive': return 'bg-green-100 border-green-300 text-green-800';
      case 'negative': return 'bg-red-100 border-red-300 text-red-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-green-50 to-blue-50">
      {/* Sticky Header with Journey Map */}
      <div className="sticky-header sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b-4 border-dashed border-blue-300" style={{ boxShadow: '0 8px 0 #93c5fd' }}>
        <div className="px-4 py-6">
          <div className="mb-4 text-center">
            <div className="bg-blue-200 border-2 border-dashed border-blue-400 rounded-lg p-3 mx-auto max-w-4xl transform -rotate-1" style={{ boxShadow: '4px 4px 0 #3b82f6' }}>
              <h1 className="text-2xl font-black text-gray-800">🎭 {journey.title}</h1>
              {journey.description && (
                <p className="text-gray-700 font-bold text-sm mt-1">{journey.description}</p>
              )}
            </div>
          </div>
          
          <PresentationJourneyMap 
            touchpoints={sortedTouchpoints}
            activeIndex={activeIndex}
            onTouchpointClick={handleTouchpointClick}
          />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-12">
          {sortedTouchpoints.map((touchpoint, index) => (
            <div
              key={touchpoint.id}
              id={`present-touchpoint-${index}`}
              className={`transform transition-all duration-500 ${
                activeIndex === index ? 'scale-105' : 'scale-100'
              }`}
            >
              <div 
                className={`p-8 border-3 border-dashed rounded-lg ${
                  activeIndex === index 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-400 bg-white hover:border-orange-400 hover:bg-orange-50'
                }`}
                style={{ 
                  boxShadow: activeIndex === index 
                    ? '8px 8px 0 #60a5fa' 
                    : '4px 4px 0 #9ca3af',
                  transform: `rotate(${(index % 3 - 1) * 1}deg)`
                }}
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="bg-blue-200 border-2 border-dashed border-blue-400 rounded-full w-12 h-12 flex items-center justify-center font-black text-lg text-gray-800">
                        {index + 1}
                      </span>
                      <h2 className="text-2xl font-black text-gray-800">{touchpoint.title}</h2>
                    </div>
                    <div className={`inline-flex items-center px-4 py-2 rounded-lg border-2 border-dashed font-bold text-sm ${getEmotionColor(touchpoint.emotion)}`}>
                      {getEmotionLabel(touchpoint.emotion, touchpoint.intensity)}
                    </div>
                  </div>
                </div>
                
                {/* Image display */}
                {touchpoint.imageData && (
                  <div className="mb-6">
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-dashed border-purple-300 rounded-lg p-6 transform rotate-1" style={{ boxShadow: '4px 4px 0 #a855f7' }}>
                      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4 transform -rotate-1">
                        <img
                          src={touchpoint.imageData}
                          alt={touchpoint.imageName || 'Touchpoint image'}
                          className="max-w-full max-h-80 object-contain rounded border mx-auto"
                          style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}
                        />
                        {touchpoint.imageName && (
                          <div className="mt-3 text-center">
                            <div className="bg-yellow-200 border-2 border-dashed border-yellow-400 rounded px-3 py-1 inline-block">
                              <p className="text-xs text-gray-700 font-bold">📸 {touchpoint.imageName}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <p className="text-gray-800 text-lg leading-relaxed font-medium">
                    {touchpoint.description || 'No description provided for this touchpoint.'}
                  </p>
                </div>
                
                <div className="mt-6 text-center">
                  <div className="bg-yellow-200 border-2 border-dashed border-yellow-400 rounded-lg p-3 inline-block">
                    <p className="text-gray-800 font-bold text-sm">
                      Step {index + 1} of {sortedTouchpoints.length} • Journey Progress: {Math.round(((index + 1) / sortedTouchpoints.length) * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Journey Complete */}
          <div className="text-center py-12">
            <div className="bg-green-200 border-2 border-dashed border-green-400 rounded-lg p-8 transform rotate-2" style={{ boxShadow: '6px 6px 0 #22c55e' }}>
              <p className="text-gray-800 text-3xl font-black mb-2">🎉 Journey Complete!</p>
              <p className="text-gray-700 font-bold">You&apos;ve reached the end of this customer adventure!</p>
              <button 
                onClick={() => router.push('/')}
                className="mt-4 bg-blue-400 hover:bg-blue-500 text-white px-6 py-3 border-3 border-blue-600 font-black rounded-lg transform hover:-rotate-1 transition-all"
                style={{ boxShadow: '4px 4px 0 #2563eb' }}
              >
                🏠 Back to Mapper
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}