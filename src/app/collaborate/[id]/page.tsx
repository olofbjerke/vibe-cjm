'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CRDTJourneyStorage, type Touchpoint, type JourneyMap as JourneyMapType } from '@/lib/crdt-storage';
import { useCollaboration } from '@/hooks/useCollaboration';
import JourneyMap from '@/components/JourneyMap';
import TouchpointDetails from '@/components/TouchpointDetails';
import CollaborationPanel from '@/components/CollaborationPanel';

export default function CollaboratePage() {
  const params = useParams();
  const router = useRouter();
  const [journey, setJourney] = useState<JourneyMapType | null>(null);
  const [selectedTouchpoint, setSelectedTouchpoint] = useState<Touchpoint | undefined>();
  const [userName, setUserName] = useState<string>('');
  const [, setHasJoinedCollaboration] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(true);

  const journeyId = params.id as string;

  // Collaboration hook
  const {
    isCollaborativeMode,
    collaborationState,
    isConnected,
    users,
    startCollaboration,
    // stopCollaboration,
    executeCollaborativeOperation,
    updateCursor,
    getShareableUrl,
    copyShareableUrl,
  } = useCollaboration(journeyId, {
    onJourneyUpdate: setJourney,
  });

  // Load or create journey
  useEffect(() => {
    if (journeyId) {
      let loadedJourney = CRDTJourneyStorage.getJourney(journeyId);
      
      if (!loadedJourney) {
        // Create a new collaborative journey with the specific ID
        const tempJourney = CRDTJourneyStorage.createJourney(
          'Collaborative Journey',
          'Real-time collaborative customer journey mapping'
        );
        
        // Manually update the ID and save it with the correct ID
        const newJourney = {
          ...tempJourney,
          id: journeyId
        };
        
        // Save it to localStorage with the correct ID
        const allJourneys = CRDTJourneyStorage.getAllJourneys();
        const updatedJourneys = allJourneys.map(j => j.id === tempJourney.id ? newJourney : j);
        localStorage.setItem('customerJourneyMaps', JSON.stringify(updatedJourneys));
        
        loadedJourney = newJourney;
      }
      
      console.log('Loaded journey:', loadedJourney);
      setJourney(loadedJourney);
    }
  }, [journeyId]);

  // Join collaboration when name is provided
  const handleJoinCollaboration = useCallback(async () => {
    if (!userName.trim()) return;
    
    console.log('Joining collaboration with name:', userName);
    
    try {
      await startCollaboration(userName);
      console.log('Collaboration started successfully');
      setHasJoinedCollaboration(true);
      setShowNamePrompt(false);
    } catch (error) {
      console.error('Failed to join collaboration:', error);
    }
  }, [userName, startCollaboration]);

  // Handle operations in collaborative mode
  const handleUpdateTouchpoint = useCallback(async (updatedTouchpoint: Touchpoint) => {
    if (!journey) return;
    
    console.log('Updating touchpoint:', updatedTouchpoint, 'Collaborative mode:', isCollaborativeMode);
    
    if (isCollaborativeMode) {
      const result = await executeCollaborativeOperation({
        type: 'UPDATE_TOUCHPOINT',
        touchpointId: updatedTouchpoint.id,
        changes: updatedTouchpoint,
        timestamp: Date.now(),
        operationId: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
      console.log('Collaborative operation result:', result);
    } else {
      const updatedJourney = CRDTJourneyStorage.updateTouchpoint(
        journey.id,
        updatedTouchpoint.id,
        updatedTouchpoint
      );
      if (updatedJourney) setJourney(updatedJourney);
    }
  }, [journey, isCollaborativeMode, executeCollaborativeOperation]);

  const handleDeleteTouchpoint = useCallback(async (id: string) => {
    if (!journey) return;
    
    if (isCollaborativeMode) {
      await executeCollaborativeOperation({
        type: 'DELETE_TOUCHPOINT',
        touchpointId: id,
        timestamp: Date.now(),
        operationId: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
    } else {
      const updatedJourney = CRDTJourneyStorage.deleteTouchpoint(journey.id, id);
      if (updatedJourney) {
        setJourney(updatedJourney);
        if (selectedTouchpoint?.id === id) {
          setSelectedTouchpoint(undefined);
        }
      }
    }
  }, [journey, isCollaborativeMode, executeCollaborativeOperation, selectedTouchpoint]);

  const handleAddTouchpoint = useCallback(async (newTouchpoint: Omit<Touchpoint, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!journey) return;
    
    console.log('Adding touchpoint:', newTouchpoint, 'Collaborative mode:', isCollaborativeMode);
    
    if (isCollaborativeMode) {
      const now = new Date().toISOString();
      const touchpoint: Touchpoint = {
        ...newTouchpoint,
        id: Date.now().toString(),
        createdAt: now,
        updatedAt: now,
      };

      const result = await executeCollaborativeOperation({
        type: 'CREATE_TOUCHPOINT',
        touchpoint,
        timestamp: Date.now(),
        operationId: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
      console.log('Collaborative add result:', result);
    } else {
      const updatedJourney = CRDTJourneyStorage.createTouchpoint(journey.id, newTouchpoint);
      if (updatedJourney) setJourney(updatedJourney);
    }
  }, [journey, isCollaborativeMode, executeCollaborativeOperation]);

  const handleTouchpointClick = useCallback((touchpoint: Touchpoint) => {
    setSelectedTouchpoint(touchpoint);
    const element = document.getElementById(`touchpoint-${touchpoint.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Mouse tracking for cursor sharing
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isCollaborativeMode) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      updateCursor(x, y);
    }
  }, [isCollaborativeMode, updateCursor]);

  if (showNamePrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 flex items-center justify-center">
        <div className="bg-white border-4 border-dashed border-purple-400 rounded-lg p-8 max-w-md mx-4 transform rotate-1" style={{ boxShadow: '8px 8px 0 #a855f7' }}>
          <h1 className="text-2xl font-black text-gray-800 mb-4 text-center">
            🤝 Join Collaboration
          </h1>
          <p className="text-gray-700 font-bold text-sm mb-6 text-center">
            Enter your name to start collaborating on this journey map!
          </p>
          
          <div className="space-y-4">
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinCollaboration()}
              className="w-full text-lg font-black border-3 border-dashed border-blue-400 bg-white focus:outline-none focus:border-green-400 rounded-lg px-4 py-3"
              style={{ boxShadow: '4px 4px 0 #60a5fa' }}
              placeholder="Your name..."
              autoFocus
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/')}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-3 border-3 border-gray-600 font-black text-sm rounded-lg transform hover:rotate-1 transition-all"
                style={{ boxShadow: '4px 4px 0 #4b5563' }}
              >
                ← Back
              </button>
              <button
                onClick={handleJoinCollaboration}
                disabled={!userName.trim()}
                className={`flex-1 px-4 py-3 border-3 font-black text-sm rounded-lg transform hover:-rotate-1 transition-all ${
                  userName.trim()
                    ? 'bg-purple-400 hover:bg-purple-500 border-purple-600 text-white'
                    : 'bg-gray-300 border-gray-400 text-gray-600 cursor-not-allowed'
                }`}
                style={{ boxShadow: userName.trim() ? '4px 4px 0 #9333ea' : '2px 2px 0 #9ca3af' }}
              >
                Join! 🚀
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-black text-gray-800">🔍 Loading collaborative journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      onMouseMove={handleMouseMove}
    >
      {/* Header */}
      <header className="bg-white border-b-4 border-dashed border-purple-300" style={{ boxShadow: '0 8px 0 #d8b4fe' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-6 gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <h1 className="text-xl sm:text-3xl font-black text-gray-800 transform -rotate-1" style={{ textShadow: '3px 3px 0 #a855f7' }}>
                  🤝 {journey.title}
                </h1>
                {isConnected && (
                  <div className="bg-green-100 border-2 border-dashed border-green-300 rounded-full px-3 py-1">
                    <span className="text-green-800 text-xs font-bold">● Live</span>
                  </div>
                )}
              </div>
              <div className="bg-purple-200 border-2 border-dashed border-purple-400 rounded-lg p-3 transform rotate-1" style={{ boxShadow: '4px 4px 0 #a855f7' }}>
                <p className="text-gray-800 text-sm font-bold">
                  🌟 Real-time collaborative editing • {users.length} {users.length === 1 ? 'person' : 'people'} online
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/')}
                className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 border-3 border-gray-600 font-black text-sm rounded-lg transform hover:rotate-1 transition-all"
                style={{ boxShadow: '4px 4px 0 #4b5563' }}
              >
                ← Exit
              </button>
              <button
                onClick={() => router.push(`/present/${journey.id}`)}
                className="bg-pink-400 hover:bg-pink-500 text-white px-4 py-2 border-3 border-pink-600 font-black text-sm rounded-lg transform hover:-rotate-1 transition-all"
                style={{ boxShadow: '4px 4px 0 #ec4899' }}
              >
                🎭 Present
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          {/* Journey Visualization */}
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
        </main>

        {/* Collaboration Panel */}
        <CollaborationPanel
          users={users}
          isConnected={isConnected}
          connectionError={collaborationState.connectionError}
          shareableUrl={getShareableUrl()}
          onCopyUrl={copyShareableUrl}
        />
      </div>
    </div>
  );
}