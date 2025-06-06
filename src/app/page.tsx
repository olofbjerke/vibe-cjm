'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import JourneyMap from '@/components/JourneyMap';
import TouchpointDetails from '@/components/TouchpointDetails';
import { CRDTJourneyStorage, type Touchpoint, type JourneyMap as JourneyMapType } from '@/lib/crdt-storage';
import { useAutoSave } from '@/hooks/useAutoSave';

export default function Home() {
  const router = useRouter();
  const [journey, setJourney] = useState<JourneyMapType | null>(null);
  const [selectedTouchpoint, setSelectedTouchpoint] = useState<Touchpoint | undefined>();
  const [savedJourneys, setSavedJourneys] = useState<JourneyMapType[]>([]);
  const [showJourneyList, setShowJourneyList] = useState<boolean>(false);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save functionality
  useAutoSave(
    journey,
    () => {
      if (journey) {
        setLastSaved(new Date());
      }
    },
    {
      delay: 1000,
      onSave: () => setLastSaved(new Date())
    }
  );

  // Update undo/redo availability
  const updateUndoRedoState = (journeyId: string) => {
    setCanUndo(CRDTJourneyStorage.canUndo(journeyId));
    setCanRedo(CRDTJourneyStorage.canRedo(journeyId));
  };

  const handleUndo = useCallback(() => {
    if (!journey || !canUndo) return;
    
    const updatedJourney = CRDTJourneyStorage.undoOperation(journey.id);
    if (updatedJourney) {
      setJourney(updatedJourney);
      updateUndoRedoState(journey.id);
    }
  }, [journey, canUndo]);

  const handleRedo = useCallback(() => {
    if (!journey || !canRedo) return;
    
    const updatedJourney = CRDTJourneyStorage.redoOperation(journey.id);
    if (updatedJourney) {
      setJourney(updatedJourney);
      updateUndoRedoState(journey.id);
    }
  }, [journey, canRedo]);

  const loadJourney = useCallback((loadedJourney: JourneyMapType) => {
    setJourney(loadedJourney);
    setSelectedTouchpoint(undefined);
    updateUndoRedoState(loadedJourney.id);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      } else if (((event.ctrlKey || event.metaKey) && event.key === 'y') || 
                 ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z')) {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Load saved journeys on component mount
  useEffect(() => {
    const journeys = CRDTJourneyStorage.getAllJourneys();
    setSavedJourneys(journeys);
    
    // Auto-load the most recent journey if available
    if (journeys.length > 0) {
      const mostRecent = journeys.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
      loadJourney(mostRecent);
    } else {
      // Create a default journey if none exist
      const newJourney = CRDTJourneyStorage.createJourney('My Customer Journey', 'Welcome to your first customer journey map!');
      setJourney(newJourney);
      setSavedJourneys([newJourney]);
    }
  }, [loadJourney]);

  const handleTouchpointClick = (touchpoint: Touchpoint) => {
    setSelectedTouchpoint(touchpoint);
    const element = document.getElementById(`touchpoint-${touchpoint.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleUpdateTouchpoint = (updatedTouchpoint: Touchpoint) => {
    if (!journey) return;
    
    const updatedJourney = CRDTJourneyStorage.updateTouchpoint(
      journey.id,
      updatedTouchpoint.id,
      updatedTouchpoint
    );
    
    if (updatedJourney) {
      setJourney(updatedJourney);
      updateUndoRedoState(journey.id);
    }
  };

  const handleDeleteTouchpoint = (id: string) => {
    if (!journey) return;
    
    const updatedJourney = CRDTJourneyStorage.deleteTouchpoint(journey.id, id);
    
    if (updatedJourney) {
      setJourney(updatedJourney);
      updateUndoRedoState(journey.id);
      
      if (selectedTouchpoint?.id === id) {
        setSelectedTouchpoint(undefined);
      }
    }
  };

  const handleAddTouchpoint = (newTouchpoint: Omit<Touchpoint, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!journey) return;
    
    const updatedJourney = CRDTJourneyStorage.createTouchpoint(journey.id, newTouchpoint);
    
    if (updatedJourney) {
      setJourney(updatedJourney);
      updateUndoRedoState(journey.id);
    }
  };

  const handleUpdateJourneyMetadata = (title: string, description?: string) => {
    if (!journey) return;
    
    const updatedJourney = CRDTJourneyStorage.updateJourneyMetadata(journey.id, {
      title,
      description
    });
    
    if (updatedJourney) {
      setJourney(updatedJourney);
      updateUndoRedoState(journey.id);
    }
  };

  const handleNewJourney = () => {
    const newJourney = CRDTJourneyStorage.createJourney('New Customer Journey', 'Describe your customer journey here...');
    setJourney(newJourney);
    setSelectedTouchpoint(undefined);
    setSavedJourneys(CRDTJourneyStorage.getAllJourneys());
    updateUndoRedoState(newJourney.id);
  };

  const handleExportJourney = () => {
    if (journey) {
      CRDTJourneyStorage.exportJourney(journey);
    }
  };

  const handlePresentJourney = () => {
    if (journey) {
      router.push(`/present/${journey.id}`);
    }
  };

  const handleStartCollaboration = () => {
    if (journey) {
      router.push(`/collaborate/${journey.id}`);
    }
  };

  const handleImportJourney = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Read and parse the file
      const content = await file.text();
      const journeyData = JSON.parse(content);
      
      // Create new journey with imported data
      const newJourney = CRDTJourneyStorage.createJourney(
        journeyData.title + ' (Imported)',
        journeyData.description || ''
      );
      
      // Import touchpoints
      if (Array.isArray(journeyData.touchpoints)) {
        for (const tp of journeyData.touchpoints) {
          CRDTJourneyStorage.createTouchpoint(newJourney.id, {
            title: tp.title || 'Imported Touchpoint',
            description: tp.description || '',
            emotion: tp.emotion || 'neutral',
            intensity: tp.intensity || 5,
            xPosition: tp.xPosition || 50,
          });
        }
      }
      
      const finalJourney = CRDTJourneyStorage.getJourney(newJourney.id);
      if (finalJourney) {
        loadJourney(finalJourney);
        setSavedJourneys(CRDTJourneyStorage.getAllJourneys());
        alert('Journey imported successfully!');
      }
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
                🛣️ Bumpy Road
              </h1>
              <div className="bg-yellow-200 border-2 border-dashed border-yellow-400 rounded-lg p-3 mt-3 transform rotate-1" style={{ boxShadow: '4px 4px 0 #fbbf24' }}>
                <p className="text-gray-800 text-sm sm:text-base font-bold">
                  Hey there! 👋 Let&apos;s map out your customer&apos;s wild adventure!
                </p>
              </div>
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={journey?.title || ''}
                  onChange={(e) => handleUpdateJourneyMetadata(e.target.value, journey?.description)}
                  className="text-lg font-black border-3 border-dashed border-blue-400 bg-white focus:outline-none focus:border-green-400 rounded-lg px-4 py-3 transform -rotate-1 hover:rotate-0 transition-all w-full"
                  style={{ boxShadow: '4px 4px 0 #60a5fa' }}
                  placeholder="What's this journey called?"
                />
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={handleUndo}
                      disabled={!canUndo}
                      className={`px-3 py-2 border-2 border-dashed font-bold text-sm rounded-lg transform hover:scale-105 transition-all ${
                        !canUndo
                          ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200'
                      }`}
                      title="Undo (Ctrl+Z)"
                    >
                      ↶ Undo
                    </button>
                    <button 
                      onClick={handleRedo}
                      disabled={!canRedo}
                      className={`px-3 py-2 border-2 border-dashed font-bold text-sm rounded-lg transform hover:scale-105 transition-all ${
                        !canRedo
                          ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200'
                      }`}
                      title="Redo (Ctrl+Y)"
                    >
                      ↷ Redo
                    </button>
                  </div>
                  {lastSaved && (
                    <div className="bg-green-100 border-2 border-dashed border-green-300 rounded px-3 py-1">
                      <span className="text-green-800 text-xs font-bold">
                        ✓ Auto-saved {lastSaved.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
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
                onClick={handleStartCollaboration}
                disabled={!journey}
                className={`px-5 py-3 border-3 font-black text-sm rounded-lg transform hover:rotate-2 transition-all ${
                  !journey
                    ? 'bg-gray-300 border-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-purple-400 hover:bg-purple-500 border-purple-600 text-white'
                }`}
                style={{ boxShadow: !journey ? '2px 2px 0 #9ca3af' : '4px 4px 0 #9333ea' }}
              >
                🤝 Collaborate
              </button>
              <button 
                onClick={() => setShowJourneyList(!showJourneyList)}
                className="bg-blue-400 hover:bg-blue-500 text-white px-5 py-3 border-3 border-blue-600 font-black text-sm rounded-lg transform hover:rotate-2 transition-all"
                style={{ boxShadow: '4px 4px 0 #2563eb' }}
              >
                📚 Library ({savedJourneys.length})
              </button>
              <button 
                onClick={handlePresentJourney}
                disabled={!journey}
                className={`px-5 py-3 border-3 font-black text-sm rounded-lg transform hover:rotate-1 transition-all ${
                  !journey
                    ? 'bg-gray-300 border-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-pink-400 hover:bg-pink-500 border-pink-600 text-white'
                }`}
                style={{ boxShadow: !journey ? '2px 2px 0 #9ca3af' : '4px 4px 0 #ec4899' }}
              >
                🎭 Present
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
                {savedJourneys.map((savedJourney, index) => {
                  const touchpointCount = CRDTJourneyStorage.getTouchpointsArray(savedJourney).length;
                  return (
                    <div
                      key={savedJourney.id}
                      className={`p-5 border-3 border-dashed rounded-lg cursor-pointer transition-all transform hover:-rotate-1 hover:scale-105 ${
                        journey?.id === savedJourney.id
                          ? 'border-blue-400 bg-blue-100'
                          : 'border-gray-400 bg-white hover:border-orange-400 hover:bg-orange-50'
                      }`}
                      style={{ 
                        boxShadow: journey?.id === savedJourney.id 
                          ? '6px 6px 0 #60a5fa' 
                          : '4px 4px 0 #9ca3af',
                        transform: `rotate(${(index % 3 - 1) * 2}deg)`
                      }}
                      onClick={() => {
                        loadJourney(savedJourney);
                        setShowJourneyList(false);
                      }}
                    >
                      <h4 className="font-black text-base text-gray-800 truncate mb-3">{savedJourney.title}</h4>
                      <div className="bg-white border-2 border-dashed border-gray-300 rounded px-3 py-2 mb-3">
                        <p className="text-xs text-gray-700 font-bold">
                          🎯 {touchpointCount} stops • 📅 {new Date(savedJourney.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {savedJourney.description && (
                        <p className="text-xs text-gray-600 font-bold truncate bg-gray-100 border border-dashed border-gray-300 rounded px-2 py-1">
                          💭 {savedJourney.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Journey Visualization */}
        {journey && (
          <>
            <div className="mb-8">
              <JourneyMap 
                touchpoints={CRDTJourneyStorage.getTouchpointsArray(journey)}
                onTouchpointClick={handleTouchpointClick}
                onAddTouchpoint={handleAddTouchpoint}
                onUpdateTouchpoint={handleUpdateTouchpoint}
              />
            </div>

            {/* Touchpoint Details */}
            <TouchpointDetails
              touchpoints={CRDTJourneyStorage.getTouchpointsArray(journey)}
              selectedTouchpoint={selectedTouchpoint}
              onUpdateTouchpoint={handleUpdateTouchpoint}
              onDeleteTouchpoint={handleDeleteTouchpoint}
            />
          </>
        )}
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