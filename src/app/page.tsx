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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-6 gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Customer Journey Mapper</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Create interactive journey maps to understand your customers</p>
              <div className="mt-3">
                <input
                  type="text"
                  value={journeyTitle}
                  onChange={(e) => setJourneyTitle(e.target.value)}
                  className="text-lg font-medium border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                  placeholder="Journey Title"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={handleNewJourney}
                className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
              >
                New
              </button>
              <button 
                onClick={() => setShowJourneyList(!showJourneyList)}
                className="bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm whitespace-nowrap"
              >
                Load ({savedJourneys.length})
              </button>
              <button 
                onClick={handleExportJourney}
                className="bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700 transition-colors text-sm whitespace-nowrap"
              >
                Export
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-orange-600 text-white px-3 py-2 rounded-md hover:bg-orange-700 transition-colors text-sm whitespace-nowrap"
              >
                Import
              </button>
              <button 
                onClick={handleSaveJourney}
                disabled={isSaving}
                className={`px-4 py-2 rounded-md transition-colors text-sm whitespace-nowrap ${
                  isSaving 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSaving ? 'Saving...' : 'Save'}
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
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Saved Journeys</h3>
            {savedJourneys.length === 0 ? (
              <p className="text-gray-500 text-sm">No saved journeys found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedJourneys.map((journey) => (
                  <div
                    key={journey.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      currentJourneyId === journey.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      loadJourney(journey);
                      setShowJourneyList(false);
                    }}
                  >
                    <h4 className="font-medium text-sm text-gray-900 truncate">{journey.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {journey.touchpoints.length} touchpoints • {new Date(journey.updatedAt).toLocaleDateString()}
                    </p>
                    {journey.description && (
                      <p className="text-xs text-gray-600 mt-1 truncate">{journey.description}</p>
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
