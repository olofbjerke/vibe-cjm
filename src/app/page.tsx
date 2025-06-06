'use client';

import { useState, useEffect, useRef } from 'react';
import JourneyMap from '@/components/JourneyMap';
import TouchpointDetails from '@/components/TouchpointDetails';
import { JourneyStorage, type Touchpoint, type JourneyMap as JourneyMapType } from '@/lib/storage';

export default function Home() {
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([]);
  const [selectedTouchpoint, setSelectedTouchpoint] = useState<Touchpoint | undefined>();
  const [journeyTitle, setJourneyTitle] = useState<string>('My Customer Journey');
  const [journeyDescription, setJourneyDescription] = useState<string>('');
  const [currentJourneyId, setCurrentJourneyId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedJourneys, setSavedJourneys] = useState<JourneyMapType[]>([]);
  const [showJourneyList, setShowJourneyList] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved journeys on component mount
  useEffect(() => {
    const journeys = JourneyStorage.getAllJourneys();
    setSavedJourneys(journeys);
    
    // Auto-load the most recent journey if available
    if (journeys.length > 0) {
      const mostRecent = journeys.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
      loadJourney(mostRecent);
    }
  }, []);

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

  const loadJourney = (journey: JourneyMapType) => {
    setCurrentJourneyId(journey.id);
    setJourneyTitle(journey.title);
    setJourneyDescription(journey.description || '');
    setTouchpoints(journey.touchpoints);
    setSelectedTouchpoint(undefined);
  };

  const handleSaveJourney = async () => {
    setIsSaving(true);
    try {
      let savedJourney: JourneyMapType;
      
      if (currentJourneyId) {
        // Update existing journey
        savedJourney = JourneyStorage.updateJourney(currentJourneyId, {
          title: journeyTitle,
          description: journeyDescription,
          touchpoints,
        })!;
      } else {
        // Create new journey
        savedJourney = JourneyStorage.saveJourney({
          title: journeyTitle,
          description: journeyDescription,
          touchpoints,
        });
        setCurrentJourneyId(savedJourney.id);
      }
      
      // Update saved journeys list
      setSavedJourneys(JourneyStorage.getAllJourneys());
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      alert('Journey saved successfully!');
    } catch (error) {
      console.error('Error saving journey:', error);
      alert('Failed to save journey. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewJourney = () => {
    setCurrentJourneyId(null);
    setJourneyTitle('New Customer Journey');
    setJourneyDescription('');
    setTouchpoints([]);
    setSelectedTouchpoint(undefined);
  };

  const handleExportJourney = () => {
    if (currentJourneyId) {
      const journey = JourneyStorage.getJourney(currentJourneyId);
      if (journey) {
        JourneyStorage.exportJourney(journey);
      }
    } else {
      // Export current unsaved journey
      const tempJourney: JourneyMapType = {
        id: 'temp',
        title: journeyTitle,
        description: journeyDescription,
        touchpoints,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0',
      };
      JourneyStorage.exportJourney(tempJourney);
    }
  };

  const handleImportJourney = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedJourney = await JourneyStorage.importJourney(file);
      loadJourney(importedJourney);
      setSavedJourneys(JourneyStorage.getAllJourneys());
      alert('Journey imported successfully!');
    } catch (error) {
      console.error('Error importing journey:', error);
      alert('Failed to import journey. Please check the file format.');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-green-50 to-blue-50" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header className="bg-white border-b-4 border-dashed border-orange-300" style={{ boxShadow: '0 8px 0 #fed7aa' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-8 gap-6">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-4xl font-black text-gray-800 transform -rotate-1" style={{ textShadow: '3px 3px 0 #fbbf24' }}>
                🗺️ Journey Mapper
              </h1>
              <div className="bg-yellow-200 border-2 border-dashed border-yellow-400 rounded-lg p-3 mt-3 transform rotate-1" style={{ boxShadow: '4px 4px 0 #fbbf24' }}>
                <p className="text-gray-800 text-sm sm:text-base font-bold">
                  Hey there! 👋 Let&apos;s map out your customer&apos;s wild adventure!
                </p>
              </div>
              <div className="mt-4">
                <input
                  type="text"
                  value={journeyTitle}
                  onChange={(e) => setJourneyTitle(e.target.value)}
                  className="text-lg font-black border-3 border-dashed border-blue-400 bg-white focus:outline-none focus:border-green-400 rounded-lg px-4 py-3 transform -rotate-1 hover:rotate-0 transition-all"
                  style={{ boxShadow: '4px 4px 0 #60a5fa' }}
                  placeholder="What's this journey called?"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={handleNewJourney}
                className="bg-green-400 hover:bg-green-500 text-white px-5 py-3 border-3 border-green-600 font-black text-sm rounded-lg transform hover:-rotate-2 transition-all"
                style={{ boxShadow: '4px 4px 0 #16a34a' }}
              >
                ✨ Fresh Start
              </button>
              <button 
                onClick={() => setShowJourneyList(!showJourneyList)}
                className="bg-blue-400 hover:bg-blue-500 text-white px-5 py-3 border-3 border-blue-600 font-black text-sm rounded-lg transform hover:rotate-2 transition-all"
                style={{ boxShadow: '4px 4px 0 #2563eb' }}
              >
                📚 Library ({savedJourneys.length})
              </button>
              <button 
                onClick={handleExportJourney}
                className="bg-purple-400 hover:bg-purple-500 text-white px-5 py-3 border-3 border-purple-600 font-black text-sm rounded-lg transform hover:-rotate-1 transition-all"
                style={{ boxShadow: '4px 4px 0 #9333ea' }}
              >
                📦 Package It
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-orange-400 hover:bg-orange-500 text-white px-5 py-3 border-3 border-orange-600 font-black text-sm rounded-lg transform hover:rotate-1 transition-all"
                style={{ boxShadow: '4px 4px 0 #ea580c' }}
              >
                📮 Bring In
              </button>
              <button 
                onClick={handleSaveJourney}
                disabled={isSaving}
                className={`px-6 py-3 border-3 font-black text-sm rounded-lg transform hover:scale-105 transition-all ${
                  isSaving 
                    ? 'bg-gray-300 border-gray-400 text-gray-600 cursor-not-allowed' 
                    : 'bg-yellow-400 hover:bg-yellow-500 border-yellow-600 text-gray-800 hover:-rotate-1'
                }`}
                style={{ boxShadow: isSaving ? '2px 2px 0 #9ca3af' : '4px 4px 0 #ca8a04' }}
              >
                {isSaving ? '💾 Saving...' : '💾 Keep It Safe'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hidden file input for importing */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportJourney}
        className="hidden"
      />

      {/* Journey List Dropdown */}
      {showJourneyList && (
        <div className="bg-white border-b-4 border-dashed border-green-300" style={{ boxShadow: '0 8px 0 #86efac' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-green-200 border-2 border-dashed border-green-400 rounded-lg p-4 mb-6 transform -rotate-1" style={{ boxShadow: '4px 4px 0 #22c55e' }}>
              <h3 className="text-xl font-black text-gray-800 flex items-center">
                📚 Your Journey Library
              </h3>
              <p className="text-gray-700 font-bold text-sm mt-1">All your amazing customer adventures live here!</p>
            </div>
            {savedJourneys.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-yellow-200 border-2 border-dashed border-yellow-400 rounded-lg p-8 transform rotate-2" style={{ boxShadow: '6px 6px 0 #fbbf24' }}>
                  <p className="text-gray-800 text-xl font-black">🌟 Nothing here yet!</p>
                  <p className="text-gray-700 font-bold text-sm mt-2">Start creating your first journey above! It&apos;ll be awesome! 🚀</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedJourneys.map((journey, index) => (
                  <div
                    key={journey.id}
                    className={`p-5 border-3 border-dashed rounded-lg cursor-pointer transition-all transform hover:-rotate-1 hover:scale-105 ${
                      currentJourneyId === journey.id
                        ? 'border-blue-400 bg-blue-100'
                        : 'border-gray-400 bg-white hover:border-orange-400 hover:bg-orange-50'
                    }`}
                    style={{ 
                      boxShadow: currentJourneyId === journey.id 
                        ? '6px 6px 0 #60a5fa' 
                        : '4px 4px 0 #9ca3af',
                      transform: `rotate(${(index % 3 - 1) * 2}deg)`
                    }}
                    onClick={() => {
                      loadJourney(journey);
                      setShowJourneyList(false);
                    }}
                  >
                    <h4 className="font-black text-base text-gray-800 truncate mb-3">{journey.title}</h4>
                    <div className="bg-white border-2 border-dashed border-gray-300 rounded px-3 py-2 mb-3">
                      <p className="text-xs text-gray-700 font-bold">
                        🎯 {journey.touchpoints.length} stops • 📅 {new Date(journey.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {journey.description && (
                      <p className="text-xs text-gray-600 font-bold truncate bg-gray-100 border border-dashed border-gray-300 rounded px-2 py-1">
                        💭 {journey.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Journey Visualization */}
        <div className="mb-8">
          <JourneyMap 
            touchpoints={touchpoints}
            onTouchpointClick={handleTouchpointClick}
            onAddTouchpoint={handleAddTouchpoint}
            onUpdateTouchpoint={handleUpdateTouchpoint}
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
      <footer className="bg-white border-t-4 border-dashed border-pink-300 mt-16" style={{ boxShadow: '0 -8px 0 #f9a8d4' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-pink-200 border-2 border-dashed border-pink-400 rounded-lg p-4 transform rotate-1" style={{ boxShadow: '4px 4px 0 #ec4899' }}>
            <p className="text-center text-gray-800 font-black">
              🎉 A vibe coding experiment by Olof Bjerke 🎉
            </p>
            <p className="text-center text-gray-700 text-xs font-bold mt-1">
              Made with ☕ and lots of fun!
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
