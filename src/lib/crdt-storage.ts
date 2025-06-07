export interface Touchpoint {
  id: string;
  title: string;
  description: string;
  emotion: 'positive' | 'neutral' | 'negative';
  intensity: number; // 1-10 scale for emotion intensity
  xPosition: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string; // For soft deletion
  imageData?: string; // Base64 encoded image data
  imageName?: string; // Original filename
  imageType?: string; // MIME type
}

export interface JourneyMap {
  id: string;
  title: string;
  description?: string;
  touchpoints: Record<string, Touchpoint>; // Changed to object for CRDT operations
  createdAt: string;
  updatedAt: string;
  version: string;
  operationCount: number; // Lamport timestamp for ordering
}

// Operation types for CRDT
export type Operation = 
  | { type: 'CREATE_TOUCHPOINT'; touchpoint: Touchpoint; timestamp: number; operationId: string }
  | { type: 'UPDATE_TOUCHPOINT'; touchpointId: string; changes: Partial<Touchpoint>; timestamp: number; operationId: string }
  | { type: 'DELETE_TOUCHPOINT'; touchpointId: string; timestamp: number; operationId: string }
  | { type: 'UPDATE_JOURNEY_METADATA'; changes: { title?: string; description?: string }; timestamp: number; operationId: string }
  | { type: 'DELETE_JOURNEY'; timestamp: number; operationId: string };

export interface OperationHistory {
  operations: Operation[];
  undoStack: Operation[];
  redoStack: Operation[];
}

export class CRDTJourneyStorage {
  private static readonly STORAGE_KEY = 'customerJourneyMaps';
  private static readonly HISTORY_KEY = 'journeyOperationHistory';
  private static readonly CURRENT_VERSION = '2.0.0';
  private static operationCounter = 0;

  // Generate unique operation ID
  private static generateOperationId(): string {
    return `${Date.now()}-${++this.operationCounter}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get current Lamport timestamp
  private static getTimestamp(): number {
    return Date.now();
  }

  // Apply an operation to a journey map
  private static applyOperation(journey: JourneyMap, operation: Operation): JourneyMap {
    const newJourney = { ...journey };
    
    switch (operation.type) {
      case 'CREATE_TOUCHPOINT':
        newJourney.touchpoints = {
          ...newJourney.touchpoints,
          [operation.touchpoint.id]: operation.touchpoint
        };
        break;
        
      case 'UPDATE_TOUCHPOINT':
        if (newJourney.touchpoints[operation.touchpointId] && !newJourney.touchpoints[operation.touchpointId].deletedAt) {
          newJourney.touchpoints = {
            ...newJourney.touchpoints,
            [operation.touchpointId]: {
              ...newJourney.touchpoints[operation.touchpointId],
              ...operation.changes,
              updatedAt: new Date(operation.timestamp).toISOString()
            }
          };
        }
        break;
        
      case 'DELETE_TOUCHPOINT':
        if (newJourney.touchpoints[operation.touchpointId]) {
          newJourney.touchpoints = {
            ...newJourney.touchpoints,
            [operation.touchpointId]: {
              ...newJourney.touchpoints[operation.touchpointId],
              deletedAt: new Date(operation.timestamp).toISOString()
            }
          };
        }
        break;
        
      case 'UPDATE_JOURNEY_METADATA':
        Object.assign(newJourney, operation.changes);
        break;
    }
    
    newJourney.updatedAt = new Date(operation.timestamp).toISOString();
    newJourney.operationCount = Math.max(newJourney.operationCount + 1, operation.timestamp);
    
    return newJourney;
  }

  // Reverse an operation for undo functionality
  private static reverseOperation(journey: JourneyMap, operation: Operation): Operation | null {
    switch (operation.type) {
      case 'CREATE_TOUCHPOINT':
        return {
          type: 'DELETE_TOUCHPOINT',
          touchpointId: operation.touchpoint.id,
          timestamp: this.getTimestamp(),
          operationId: this.generateOperationId()
        };
        
      case 'UPDATE_TOUCHPOINT':
        const currentTouchpoint = journey.touchpoints[operation.touchpointId];
        if (!currentTouchpoint) return null;
        
        // Create reverse changes
        const reverseChanges: Partial<Touchpoint> = {};
        Object.keys(operation.changes).forEach(key => {
          if (key in currentTouchpoint) {
            (reverseChanges as Record<string, unknown>)[key] = (currentTouchpoint as unknown as Record<string, unknown>)[key];
          }
        });
        
        return {
          type: 'UPDATE_TOUCHPOINT',
          touchpointId: operation.touchpointId,
          changes: reverseChanges,
          timestamp: this.getTimestamp(),
          operationId: this.generateOperationId()
        };
        
      case 'DELETE_TOUCHPOINT':
        const deletedTouchpoint = journey.touchpoints[operation.touchpointId];
        if (!deletedTouchpoint) return null;
        
        return {
          type: 'CREATE_TOUCHPOINT',
          touchpoint: { ...deletedTouchpoint, deletedAt: undefined },
          timestamp: this.getTimestamp(),
          operationId: this.generateOperationId()
        };
        
      case 'UPDATE_JOURNEY_METADATA':
        const reverseMetadata: { title?: string; description?: string } = {};
        if (operation.changes.title !== undefined) {
          reverseMetadata.title = journey.title;
        }
        if (operation.changes.description !== undefined) {
          reverseMetadata.description = journey.description;
        }
        
        return {
          type: 'UPDATE_JOURNEY_METADATA',
          changes: reverseMetadata,
          timestamp: this.getTimestamp(),
          operationId: this.generateOperationId()
        };
        
      default:
        return null;
    }
  }

  // Get all journeys
  static getAllJourneys(): JourneyMap[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading journeys:', error);
      return [];
    }
  }

  // Get operation history for a journey
  static getOperationHistory(journeyId: string): OperationHistory {
    try {
      const stored = localStorage.getItem(`${this.HISTORY_KEY}-${journeyId}`);
      if (!stored) {
        return { operations: [], undoStack: [], redoStack: [] };
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading operation history:', error);
      return { operations: [], undoStack: [], redoStack: [] };
    }
  }

  // Save operation history for a journey
  private static saveOperationHistory(journeyId: string, history: OperationHistory): void {
    try {
      localStorage.setItem(`${this.HISTORY_KEY}-${journeyId}`, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving operation history:', error);
    }
  }

  // Execute an operation and save
  static executeOperation(journeyId: string, operation: Operation): JourneyMap | null {
    const journeys = this.getAllJourneys();
    const journeyIndex = journeys.findIndex(j => j.id === journeyId);
    
    if (journeyIndex === -1) return null;
    
    const journey = journeys[journeyIndex];
    const history = this.getOperationHistory(journeyId);
    
    // Apply the operation
    const updatedJourney = this.applyOperation(journey, operation);
    
    // Update history
    history.operations.push(operation);
    history.undoStack.push(operation);
    history.redoStack = []; // Clear redo stack when new operation is executed
    
    // Limit undo stack size (keep last 50 operations)
    if (history.undoStack.length > 50) {
      history.undoStack = history.undoStack.slice(-50);
    }
    
    // Save journey and history
    journeys[journeyIndex] = updatedJourney;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(journeys));
      this.saveOperationHistory(journeyId, history);
      return updatedJourney;
    } catch (error) {
      console.error('Error saving journey:', error);
      return null;
    }
  }

  // Undo last operation
  static undoOperation(journeyId: string): JourneyMap | null {
    const journeys = this.getAllJourneys();
    const journeyIndex = journeys.findIndex(j => j.id === journeyId);
    
    if (journeyIndex === -1) return null;
    
    const journey = journeys[journeyIndex];
    const history = this.getOperationHistory(journeyId);
    
    if (history.undoStack.length === 0) return journey; // Nothing to undo
    
    const lastOperation = history.undoStack.pop()!;
    const reverseOperation = this.reverseOperation(journey, lastOperation);
    
    if (!reverseOperation) return journey;
    
    // Apply reverse operation
    const updatedJourney = this.applyOperation(journey, reverseOperation);
    
    // Update history
    history.redoStack.push(lastOperation);
    
    // Save journey and history
    journeys[journeyIndex] = updatedJourney;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(journeys));
      this.saveOperationHistory(journeyId, history);
      return updatedJourney;
    } catch (error) {
      console.error('Error saving journey:', error);
      return null;
    }
  }

  // Redo last undone operation
  static redoOperation(journeyId: string): JourneyMap | null {
    const journeys = this.getAllJourneys();
    const journeyIndex = journeys.findIndex(j => j.id === journeyId);
    
    if (journeyIndex === -1) return null;
    
    const journey = journeys[journeyIndex];
    const history = this.getOperationHistory(journeyId);
    
    if (history.redoStack.length === 0) return journey; // Nothing to redo
    
    const operationToRedo = history.redoStack.pop()!;
    
    // Apply the operation
    const updatedJourney = this.applyOperation(journey, operationToRedo);
    
    // Update history
    history.undoStack.push(operationToRedo);
    
    // Save journey and history
    journeys[journeyIndex] = updatedJourney;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(journeys));
      this.saveOperationHistory(journeyId, history);
      return updatedJourney;
    } catch (error) {
      console.error('Error saving journey:', error);
      return null;
    }
  }

  // Create a new journey
  static createJourney(title: string, description?: string): JourneyMap {
    const now = new Date().toISOString();
    const newJourney: JourneyMap = {
      id: title.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now(),
      title,
      description: description || '',
      touchpoints: {},
      createdAt: now,
      updatedAt: now,
      version: this.CURRENT_VERSION,
      operationCount: 0,
    };

    const journeys = this.getAllJourneys();
    journeys.push(newJourney);
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(journeys));
      return newJourney;
    } catch (error) {
      console.error('Error creating journey:', error);
      throw new Error('Failed to create journey');
    }
  }

  // Get a specific journey by ID
  static getJourney(id: string): JourneyMap | null {
    const journeys = this.getAllJourneys();
    return journeys.find(j => j.id === id) || null;
  }

  // Set a journey directly (for collaborative sync)
  static setJourney(id: string, journey: JourneyMap): void {
    const journeys = this.getAllJourneys();
    const journeyIndex = journeys.findIndex(j => j.id === id);
    
    if (journeyIndex === -1) {
      // Journey doesn't exist, add it
      journeys.push(journey);
    } else {
      // Journey exists, replace it
      journeys[journeyIndex] = journey;
    }
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(journeys));
    } catch (error) {
      console.error('Error setting journey:', error);
    }
  }

  // Get touchpoints as array (excluding deleted ones)
  static getTouchpointsArray(journey: JourneyMap): Touchpoint[] {
    return Object.values(journey.touchpoints).filter(tp => !tp.deletedAt);
  }

  // Check if undo is available
  static canUndo(journeyId: string): boolean {
    const history = this.getOperationHistory(journeyId);
    return history.undoStack.length > 0;
  }

  // Check if redo is available
  static canRedo(journeyId: string): boolean {
    const history = this.getOperationHistory(journeyId);
    return history.redoStack.length > 0;
  }

  // Helper methods for common operations
  static createTouchpoint(journeyId: string, touchpointData: Omit<Touchpoint, 'id' | 'createdAt' | 'updatedAt'>): JourneyMap | null {
    const now = new Date().toISOString();
    const touchpoint: Touchpoint = {
      ...touchpointData,
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now,
    };

    const operation: Operation = {
      type: 'CREATE_TOUCHPOINT',
      touchpoint,
      timestamp: this.getTimestamp(),
      operationId: this.generateOperationId()
    };

    return this.executeOperation(journeyId, operation);
  }

  static updateTouchpoint(journeyId: string, touchpointId: string, changes: Partial<Touchpoint>): JourneyMap | null {
    const operation: Operation = {
      type: 'UPDATE_TOUCHPOINT',
      touchpointId,
      changes,
      timestamp: this.getTimestamp(),
      operationId: this.generateOperationId()
    };

    return this.executeOperation(journeyId, operation);
  }

  static deleteTouchpoint(journeyId: string, touchpointId: string): JourneyMap | null {
    const operation: Operation = {
      type: 'DELETE_TOUCHPOINT',
      touchpointId,
      timestamp: this.getTimestamp(),
      operationId: this.generateOperationId()
    };

    return this.executeOperation(journeyId, operation);
  }

  static updateJourneyMetadata(journeyId: string, changes: { title?: string; description?: string }): JourneyMap | null {
    const operation: Operation = {
      type: 'UPDATE_JOURNEY_METADATA',
      changes,
      timestamp: this.getTimestamp(),
      operationId: this.generateOperationId()
    };

    return this.executeOperation(journeyId, operation);
  }

  // Export/Import functionality (convert between formats)
  static exportJourney(journey: JourneyMap): void {
    // Convert to old format for compatibility
    const exportData = {
      ...journey,
      touchpoints: this.getTouchpointsArray(journey)
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${journey.title.replace(/[^a-z0-9]/gi, '-')}-journey.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Migration from old format
  static migrateFromOldFormat(oldJourney: Record<string, unknown>): JourneyMap {
    const now = new Date().toISOString();
    const touchpoints: Record<string, Touchpoint> = {};
    
    if (Array.isArray(oldJourney.touchpoints)) {
      oldJourney.touchpoints.forEach((tp: Record<string, unknown>) => {
        const id = tp.id as string;
        touchpoints[id] = {
          ...tp,
          createdAt: (tp.createdAt as string) || now,
          updatedAt: (tp.updatedAt as string) || now,
        } as Touchpoint;
      });
    }

    return {
      ...oldJourney,
      touchpoints,
      version: this.CURRENT_VERSION,
      operationCount: 0,
    } as JourneyMap;
  }

  // Delete a journey
  static deleteJourney(journeyId: string): boolean {
    const journeys = this.getAllJourneys();
    const journeyIndex = journeys.findIndex(j => j.id === journeyId);
    
    if (journeyIndex === -1) return false;
    
    // Remove the journey from the array
    journeys.splice(journeyIndex, 1);
    
    try {
      // Save updated journeys list
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(journeys));
      
      // Clean up operation history for the deleted journey
      localStorage.removeItem(`${this.HISTORY_KEY}-${journeyId}`);
      
      return true;
    } catch (error) {
      console.error('Error deleting journey:', error);
      return false;
    }
  }
}