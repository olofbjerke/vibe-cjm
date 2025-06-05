'use client';

import { useState } from 'react';
import JourneyMap from '@/components/JourneyMap';
import TouchpointDetails from '@/components/TouchpointDetails';

interface Touchpoint {
  id: string;
  title: string;
  description: string;
  emotion: 'positive' | 'neutral' | 'negative';
  xPosition: number;
}

export default function Home() {
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([]);
  const [selectedTouchpoint, setSelectedTouchpoint] = useState<Touchpoint | undefined>();

  const handleTouchpointClick = (touchpoint: Touchpoint) => {
    setSelectedTouchpoint(touchpoint);
    const element = document.getElementById(`touchpoint-${touchpoint.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleUpdateTouchpoint = (updatedTouchpoint: Touchpoint) => {
    setTouchpoints(prev => 
      prev.map(tp => tp.id === updatedTouchpoint.id ? updatedTouchpoint : tp)
    );
  };

  const handleDeleteTouchpoint = (id: string) => {
    setTouchpoints(prev => prev.filter(tp => tp.id !== id));
    if (selectedTouchpoint?.id === id) {
      setSelectedTouchpoint(undefined);
    }
  };

  const handleAddTouchpoint = (newTouchpoint: Touchpoint) => {
    setTouchpoints(prev => [...prev, newTouchpoint]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-6 gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Customer Journey Mapper</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Create interactive journey maps to understand your customers</p>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base whitespace-nowrap">
              Save Journey
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Journey Visualization */}
        <div className="mb-8">
          <JourneyMap 
            touchpoints={touchpoints}
            onTouchpointClick={handleTouchpointClick}
            onAddTouchpoint={handleAddTouchpoint}
          />
        </div>

        {/* Touchpoint Details */}
        <TouchpointDetails
          touchpoints={touchpoints}
          selectedTouchpoint={selectedTouchpoint}
          onUpdateTouchpoint={handleUpdateTouchpoint}
          onDeleteTouchpoint={handleDeleteTouchpoint}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            Built with Next.js, React, and Tailwind CSS
          </p>
        </div>
      </footer>
    </div>
  );
}
