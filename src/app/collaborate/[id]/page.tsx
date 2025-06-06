'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { type TouchpointWithImage } from '@/lib/indexeddb-storage';
import { useJourneyStorage } from '@/hooks/useJourneyStorage';
import JourneyMap from '@/components/JourneyMap';
import TouchpointDetails from '@/components/TouchpointDetails';
import CollaborationPanel from '@/components/CollaborationPanel';

export default function CollaboratePage() {
  const params = useParams();
  const router = useRouter();
  const [selectedTouchpoint, setSelectedTouchpoint] = useState<TouchpointWithImage | undefined>();
  const [userName, setUserName] = useState<string>('');
  const [showNamePrompt, setShowNamePrompt] = useState(true);

  const journeyId = params.id as string;

  // Load saved username on mount
  useEffect(() => {
    const savedUserName = localStorage.getItem('collaborationUserName');
    if (savedUserName) {
      setUserName(savedUserName);
      // Auto-join with saved username
      setShowNamePrompt(false);
    }
  }, []);

  const handleUseDifferentName = useCallback(() => {
    setUserName('');
    setShowNamePrompt(true);
  }, []);

  // Unified storage hook with collaboration support
  const {
    journey,
    touchpoints,
    loading,
    error,
    createTouchpoint,
    updateTouchpoint,
    deleteTouchpoint,
    isCollaborativeMode,
    isConnected,
    users,
    startCollaboration,
    updateCursor,
    getShareableUrl,
    copyShareableUrl,
    collaborationState,
  } = useJourneyStorage({
    journeyId,
    userName,
  });

  // Journey creation is now handled by the useJourneyStorage hook

  // Join collaboration when name is provided
  const handleJoinCollaboration = useCallback(async () => {
    if (!userName.trim()) return;
    
    try {
      // Save username to localStorage for future sessions
      localStorage.setItem('collaborationUserName', userName);
      
      await startCollaboration(userName);
      setShowNamePrompt(false);
    } catch (error) {
      console.error('Failed to join collaboration:', error);
    }
  }, [userName, startCollaboration]);

  // Auto-join with saved username when journey is loaded
  useEffect(() => {
    if (!showNamePrompt && userName && journey && !isCollaborativeMode) {
      handleJoinCollaboration();
    }
  }, [showNamePrompt, userName, journey, isCollaborativeMode, handleJoinCollaboration]);

  // Handle touchpoint operations using the unified storage hook
  const handleUpdateTouchpoint = useCallback(async (updatedTouchpoint: TouchpointWithImage, imageFile?: File) => {
    await updateTouchpoint(updatedTouchpoint, imageFile);
  }, [updateTouchpoint]);

  const handleDeleteTouchpoint = useCallback(async (id: string) => {
    await deleteTouchpoint(id);
    if (selectedTouchpoint?.id === id) {
      setSelectedTouchpoint(undefined);
    }
  }, [deleteTouchpoint, selectedTouchpoint]);

  const handleAddTouchpoint = useCallback(async (newTouchpoint: Omit<TouchpointWithImage, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createTouchpoint(newTouchpoint);
  }, [createTouchpoint]);

  const handleTouchpointClick = useCallback((touchpoint: TouchpointWithImage) => {
    setSelectedTouchpoint(touchpoint);
    const element = document.getElementById(`touchpoint-${touchpoint.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Mouse tracking for cursor sharing (disabled)
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isCollaborativeMode) {
      updateCursor(e.clientX, e.clientY);
    }
  }, [isCollaborativeMode, updateCursor]);

  const handleChangeName = useCallback(async (newName: string) => {
    try {
      // Save new username to localStorage
      localStorage.setItem('collaborationUserName', newName);
      setUserName(newName);
      
      // Restart collaboration with new name
      await startCollaboration(newName);
    } catch (error) {
      console.error('Failed to change name:', error);
    }
  }, [startCollaboration]);

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

  if (loading || !journey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-black text-gray-800">
            {loading ? '🔍 Loading collaborative journey...' : error || 'Journey not found'}
          </p>
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

        {/* Collaboration Panel */}
        <CollaborationPanel
          users={users}
          isConnected={isConnected}
          connectionError={collaborationState.connectionError}
          shareableUrl={getShareableUrl()}
          onCopyUrl={copyShareableUrl}
          currentUserName={userName}
          onChangeName={handleChangeName}
        />
      </div>
    </div>
  );
}