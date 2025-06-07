import { useState, useEffect, useCallback } from 'react';
import { 
  IndexedDBJourneyStorage, 
  type JourneyMapWithImages, 
  type TouchpointWithImage
} from '@/lib/indexeddb-storage';
import { useCollaboration } from './useCollaboration';
import { type Operation, type Touchpoint, CRDTJourneyStorage } from '@/lib/crdt-storage';
import { useAutoSave } from './useAutoSave';

interface UseJourneyStorageOptions {
  journeyId: string;
  userName?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

// Helper function to convert TouchpointWithImage to Touchpoint for collaboration
function touchpointToCollaboration(touchpoint: TouchpointWithImage): Touchpoint {
  return {
    id: touchpoint.id,
    title: touchpoint.title,
    description: touchpoint.description,
    emotion: touchpoint.emotion,
    intensity: touchpoint.intensity,
    xPosition: touchpoint.xPosition,
    createdAt: touchpoint.createdAt,
    updatedAt: touchpoint.updatedAt,
    deletedAt: touchpoint.deletedAt,
    imageData: touchpoint.imageData,
    imageName: touchpoint.imageName,
    imageType: touchpoint.imageType,
  };
}

// Helper function to convert JourneyMapWithImages to JourneyMap for collaboration
function journeyToCollaboration(journey: JourneyMapWithImages): import('@/lib/crdt-storage').JourneyMap {
  return {
    id: journey.id,
    title: journey.title,
    description: journey.description,
    touchpoints: Object.fromEntries(
      Object.entries(journey.touchpoints).map(([id, tp]) => [
        id,
        touchpointToCollaboration(tp)
      ])
    ),
    createdAt: journey.createdAt,
    updatedAt: journey.updatedAt,
    version: journey.version,
    operationCount: journey.operationCount,
  };
}

export function useJourneyStorage(options: UseJourneyStorageOptions) {
  const { journeyId, userName, autoSaveDelay = 1000 } = options;
  
  const [journey, setJourney] = useState<JourneyMapWithImages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Collaboration hook with image sync enabled
  const collaboration = useCollaboration(journeyId, {
    userName,
    onJourneyUpdate: (updatedJourney) => {
      // Convert CRDT journey to IndexedDB format (includes images synced from collaboration)
      const journeyWithImages: JourneyMapWithImages = {
        ...updatedJourney,
        touchpoints: Object.fromEntries(
          Object.entries(updatedJourney.touchpoints).map(([id, tp]) => [
            id,
            tp as TouchpointWithImage
          ])
        ),
      };
      
      // Update IndexedDB with the collaborative data (including images)
      IndexedDBJourneyStorage.saveJourney(journeyWithImages).catch(err => {
        console.error('Error saving collaborative update to IndexedDB:', err);
      });
      
      setJourney(journeyWithImages);
      setHasChanges(false);
    }
  });

  // Initialize IndexedDB and load journey
  useEffect(() => {
    let mounted = true;

    const initializeStorage = async () => {
      try {
        setLoading(true);
        setError(null);

        // Initialize IndexedDB
        await IndexedDBJourneyStorage.init();
        
        // Migrate from localStorage if needed
        await IndexedDBJourneyStorage.migrateFromLocalStorage();

        // Load the journey
        let loadedJourney = await IndexedDBJourneyStorage.getJourney(journeyId);
        
        // If journey doesn't exist, create it
        if (!loadedJourney) {
          loadedJourney = await IndexedDBJourneyStorage.createJourney(
            'Collaborative Journey',
            'Real-time collaborative customer journey mapping'
          );
          
          // Update the journey with the correct ID
          loadedJourney.id = journeyId;
          await IndexedDBJourneyStorage.saveJourney(loadedJourney);
        }
        
        if (mounted) {
          setJourney(loadedJourney);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing storage:', err);
        if (mounted) {
          setError('Failed to load journey');
          setLoading(false);
        }
      }
    };

    initializeStorage();
    
    return () => {
      mounted = false;
    };
  }, [journeyId]);

  // Auto-save functionality
  const saveJourney = useCallback(async () => {
    if (!journey) return;
    
    try {
      await IndexedDBJourneyStorage.saveJourney(journey);
      setHasChanges(false);
    } catch (err) {
      console.error('Error saving journey:', err);
      setError('Failed to save journey');
    }
  }, [journey]);

  const { forceSave } = useAutoSave(
    journey,
    saveJourney,
    {
      delay: autoSaveDelay,
      onSave: () => setHasChanges(false)
    }
  );

  // Create touchpoint with optional image
  const createTouchpoint = useCallback(async (
    touchpointData: Omit<TouchpointWithImage, 'id' | 'createdAt' | 'updatedAt'>,
    imageFile?: File
  ) => {
    if (!journey) return;

    try {
      const updatedJourney = await IndexedDBJourneyStorage.createTouchpoint(
        journeyId,
        touchpointData,
        imageFile
      );
      
      if (updatedJourney) {
        setJourney(updatedJourney);
        setHasChanges(true);
        
        // Sync with collaboration if active (including image data)
        if (collaboration.isCollaborativeMode) {
          const newTouchpoints = Object.values(updatedJourney.touchpoints);
          const newTouchpoint = newTouchpoints[newTouchpoints.length - 1];
          const operation: Operation = {
            type: 'CREATE_TOUCHPOINT',
            touchpoint: touchpointToCollaboration(newTouchpoint),
            timestamp: Date.now(),
            operationId: `create-${Date.now()}`
          };
          await collaboration.executeCollaborativeOperation(operation);
        }
      }
    } catch (err) {
      console.error('Error creating touchpoint:', err);
      setError('Failed to create touchpoint');
    }
  }, [journey, journeyId, collaboration]);

  // Update touchpoint with optional image
  const updateTouchpoint = useCallback(async (
    touchpoint: TouchpointWithImage,
    imageFile?: File
  ) => {
    if (!journey) return;

    try {
      const changes: Partial<TouchpointWithImage> = {
        title: touchpoint.title,
        description: touchpoint.description,
        emotion: touchpoint.emotion,
        intensity: touchpoint.intensity,
        xPosition: touchpoint.xPosition,
      };

      const updatedJourney = await IndexedDBJourneyStorage.updateTouchpoint(
        journeyId,
        touchpoint.id,
        changes,
        imageFile
      );
      
      if (updatedJourney) {
        setJourney(updatedJourney);
        setHasChanges(true);
        
        // Sync with collaboration if active (including image data)
        if (collaboration.isCollaborativeMode) {
          const updatedTouchpoint = updatedJourney.touchpoints[touchpoint.id];
          const operation: Operation = {
            type: 'UPDATE_TOUCHPOINT',
            touchpointId: touchpoint.id,
            changes: touchpointToCollaboration(updatedTouchpoint),
            timestamp: Date.now(),
            operationId: `update-${Date.now()}`
          };
          await collaboration.executeCollaborativeOperation(operation);
        }
      } else {
        setError('Failed to update touchpoint');
      }
    } catch (err) {
      console.error('Error updating touchpoint:', err);
      setError('Failed to update touchpoint');
    }
  }, [journey, journeyId, collaboration]);

  // Delete touchpoint
  const deleteTouchpoint = useCallback(async (touchpointId: string) => {
    if (!journey) return;

    try {
      const updatedJourney = await IndexedDBJourneyStorage.deleteTouchpoint(journeyId, touchpointId);
      
      if (updatedJourney) {
        setJourney(updatedJourney);
        setHasChanges(true);
        
        // Sync with collaboration if active
        if (collaboration.isCollaborativeMode) {
          const operation: Operation = {
            type: 'DELETE_TOUCHPOINT',
            touchpointId,
            timestamp: Date.now(),
            operationId: `delete-${Date.now()}`
          };
          await collaboration.executeCollaborativeOperation(operation);
        }
      }
    } catch (err) {
      console.error('Error deleting touchpoint:', err);
      setError('Failed to delete touchpoint');
    }
  }, [journey, journeyId, collaboration]);

  // Update journey metadata
  const updateJourneyMetadata = useCallback(async (changes: { title?: string; description?: string }) => {
    if (!journey) return;

    try {
      const updatedJourney = await IndexedDBJourneyStorage.updateJourneyMetadata(journeyId, changes);
      
      if (updatedJourney) {
        setJourney(updatedJourney);
        setHasChanges(true);
        
        // Sync with collaboration if active
        if (collaboration.isCollaborativeMode) {
          const operation: Operation = {
            type: 'UPDATE_JOURNEY_METADATA',
            changes,
            timestamp: Date.now(),
            operationId: `metadata-${Date.now()}`
          };
          await collaboration.executeCollaborativeOperation(operation);
        }
      }
    } catch (err) {
      console.error('Error updating journey metadata:', err);
      setError('Failed to update journey');
    }
  }, [journey, journeyId, collaboration]);

  // Get touchpoints as array
  const touchpoints = journey ? IndexedDBJourneyStorage.getTouchpointsArray(journey) : [];

  // Enhanced startCollaboration that syncs IndexedDB to CRDT before starting
  const startCollaborationWithSync = useCallback(async (userName: string = 'Anonymous') => {
    if (!journey) {
      return;
    }

    try {
      // Sync current IndexedDB data to CRDT storage
      const crdtJourney = journeyToCollaboration(journey);
      CRDTJourneyStorage.setJourney(journeyId, crdtJourney);
      
      // Now start collaboration
      await collaboration.startCollaboration(userName);
    } catch (error) {
      console.error('Error starting collaboration:', error);
      throw error;
    }
  }, [journey, journeyId, collaboration]);

  return {
    // State
    journey,
    touchpoints,
    loading,
    error,
    hasChanges,

    // Storage actions
    createTouchpoint,
    updateTouchpoint,
    deleteTouchpoint,
    updateJourneyMetadata,
    saveJourney: forceSave,

    // Collaboration (with enhanced startCollaboration)
    ...collaboration,
    startCollaboration: startCollaborationWithSync,

    // Clear error
    clearError: () => setError(null),
  };
}