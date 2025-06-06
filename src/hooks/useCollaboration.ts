import { useState, useEffect, useRef, useCallback } from 'react';
import { CollaborativeCRDT, type CollaborationState } from '@/lib/collaborative-crdt';
import { type JourneyMap, type Operation } from '@/lib/crdt-storage';

interface UseCollaborationOptions {
  userName?: string;
  onJourneyUpdate?: (journey: JourneyMap) => void;
}

export function useCollaboration(
  journeyId: string | null,
  options: UseCollaborationOptions = {}
) {
  const [collaborationState, setCollaborationState] = useState<CollaborationState>({
    isConnected: false,
    users: [],
  });
  const [isCollaborativeMode, setIsCollaborativeMode] = useState(false);
  const collaborativeCRDT = useRef<CollaborativeCRDT | null>(null);

  // Initialize collaboration
  const startCollaboration = useCallback(async (userName: string = 'Anonymous') => {
    if (!journeyId || isCollaborativeMode) return;

    try {
      collaborativeCRDT.current = new CollaborativeCRDT(
        journeyId,
        userName,
        setCollaborationState,
        options.onJourneyUpdate
      );

      await collaborativeCRDT.current.connect();
      setIsCollaborativeMode(true);
    } catch (error) {
      console.error('Failed to start collaboration:', error);
    }
  }, [journeyId, isCollaborativeMode, options.onJourneyUpdate]);

  // Stop collaboration
  const stopCollaboration = useCallback(() => {
    if (collaborativeCRDT.current) {
      collaborativeCRDT.current.disconnect();
      collaborativeCRDT.current = null;
    }
    setIsCollaborativeMode(false);
    setCollaborationState({
      isConnected: false,
      users: [],
    });
  }, []);

  // Execute operation collaboratively
  const executeCollaborativeOperation = useCallback(async (operation: Operation): Promise<JourneyMap | null> => {
    if (collaborativeCRDT.current && isCollaborativeMode) {
      return collaborativeCRDT.current.executeOperation(operation);
    }
    return null;
  }, [isCollaborativeMode]);

  // Update cursor position
  const updateCursor = useCallback((x: number, y: number) => {
    if (collaborativeCRDT.current && isCollaborativeMode) {
      collaborativeCRDT.current.updateCursor(x, y);
    }
  }, [isCollaborativeMode]);

  // Generate shareable URL
  const getShareableUrl = useCallback(() => {
    if (!journeyId) return null;
    const baseUrl = window.location.origin;
    return `${baseUrl}/collaborate/${journeyId}`;
  }, [journeyId]);

  // Copy shareable URL to clipboard
  const copyShareableUrl = useCallback(async () => {
    const url = getShareableUrl();
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        return true;
      } catch (error) {
        console.error('Failed to copy URL:', error);
        return false;
      }
    }
    return false;
  }, [getShareableUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCollaboration();
    };
  }, [stopCollaboration]);

  return {
    // State
    isCollaborativeMode,
    collaborationState,
    isConnected: collaborationState.isConnected,
    users: collaborationState.users,
    currentUser: collaborationState.currentUser,
    connectionError: collaborationState.connectionError,

    // Actions
    startCollaboration,
    stopCollaboration,
    executeCollaborativeOperation,
    updateCursor,
    getShareableUrl,
    copyShareableUrl,
  };
}