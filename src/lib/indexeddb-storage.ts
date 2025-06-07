export interface TouchpointWithImage extends Omit<import('./crdt-storage').Touchpoint, ''> {
  id: string;
  title: string;
  description: string;
  emotion: 'positive' | 'neutral' | 'negative';
  intensity: number;
  xPosition: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  imageData?: string; // Base64 encoded image data
  imageName?: string; // Original filename
  imageType?: string; // MIME type
}

export interface JourneyMapWithImages extends Omit<import('./crdt-storage').JourneyMap, 'touchpoints'> {
  id: string;
  title: string;
  description?: string;
  touchpoints: Record<string, TouchpointWithImage>;
  createdAt: string;
  updatedAt: string;
  version: string;
  operationCount: number;
}

export type OperationWithImages = 
  | { type: 'CREATE_TOUCHPOINT'; touchpoint: TouchpointWithImage; timestamp: number; operationId: string }
  | { type: 'UPDATE_TOUCHPOINT'; touchpointId: string; changes: Partial<TouchpointWithImage>; timestamp: number; operationId: string }
  | { type: 'DELETE_TOUCHPOINT'; touchpointId: string; timestamp: number; operationId: string }
  | { type: 'UPDATE_JOURNEY_METADATA'; changes: { title?: string; description?: string }; timestamp: number; operationId: string };

export interface OperationHistoryWithImages {
  operations: OperationWithImages[];
  undoStack: OperationWithImages[];
  redoStack: OperationWithImages[];
}

export class IndexedDBJourneyStorage {
  private static readonly DB_NAME = 'CustomerJourneyMaps';
  private static readonly DB_VERSION = 1;
  private static readonly JOURNEYS_STORE = 'journeys';
  private static readonly OPERATIONS_STORE = 'operations';
  private static readonly CURRENT_VERSION = '3.0.0';
  private static operationCounter = 0;
  private static dbInstance: IDBDatabase | null = null;

  // Initialize the database
  static async init(): Promise<void> {
    if (this.dbInstance) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        this.dbInstance = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create journeys store
        if (!db.objectStoreNames.contains(this.JOURNEYS_STORE)) {
          const journeysStore = db.createObjectStore(this.JOURNEYS_STORE, { keyPath: 'id' });
          journeysStore.createIndex('title', 'title', { unique: false });
          journeysStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create operations store for operation history
        if (!db.objectStoreNames.contains(this.OPERATIONS_STORE)) {
          db.createObjectStore(this.OPERATIONS_STORE, { keyPath: 'journeyId' });
        }
      };
    });
  }

  // Ensure database is initialized
  private static async ensureDB(): Promise<IDBDatabase> {
    if (!this.dbInstance) {
      await this.init();
    }
    if (!this.dbInstance) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.dbInstance;
  }

  // Generate unique operation ID
  private static generateOperationId(): string {
    return `${Date.now()}-${++this.operationCounter}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get current timestamp
  private static getTimestamp(): number {
    return Date.now();
  }

  // Convert File to base64 string
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      // Validate file size (limit to 5MB for collaboration compatibility)
      // Note: Base64 encoding increases size by ~33%, so 5MB becomes ~6.7MB in transit
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        reject(new Error(`Image file too large: ${file.size} bytes. Maximum allowed: ${maxSize} bytes`));
        return;
      }


      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => {
        reject(reader.error);
      };
      reader.readAsDataURL(file);
    });
  }

  // Create touchpoint with image
  static async createTouchpointWithImage(
    touchpointData: Omit<TouchpointWithImage, 'id' | 'createdAt' | 'updatedAt'>,
    imageFile?: File
  ): Promise<TouchpointWithImage> {
    const now = new Date().toISOString();
    const touchpoint: TouchpointWithImage = {
      ...touchpointData,
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now,
    };

    if (imageFile) {
      touchpoint.imageData = await this.fileToBase64(imageFile);
      touchpoint.imageName = imageFile.name;
      touchpoint.imageType = imageFile.type;
    }

    return touchpoint;
  }

  // Apply an operation to a journey map
  private static applyOperation(journey: JourneyMapWithImages, operation: OperationWithImages): JourneyMapWithImages {
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

  // Get all journeys from IndexedDB
  static async getAllJourneys(): Promise<JourneyMapWithImages[]> {
    try {
      const db = await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.JOURNEYS_STORE], 'readonly');
        const store = transaction.objectStore(this.JOURNEYS_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => {
          console.error('Error getting all journeys:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error getting all journeys:', error);
      return [];
    }
  }

  // Get a specific journey by ID
  static async getJourney(id: string): Promise<JourneyMapWithImages | null> {
    try {
      const db = await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.JOURNEYS_STORE], 'readonly');
        const store = transaction.objectStore(this.JOURNEYS_STORE);
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          console.error('Error getting journey:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error getting journey:', error);
      return null;
    }
  }

  // Save a journey to IndexedDB
  static async saveJourney(journey: JourneyMapWithImages): Promise<void> {
    try {
      const db = await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.JOURNEYS_STORE], 'readwrite');
        const store = transaction.objectStore(this.JOURNEYS_STORE);
        const request = store.put(journey);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          console.error('Error saving journey:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error saving journey:', error);
      throw error;
    }
  }

  // Get operation history for a journey
  static async getOperationHistory(journeyId: string): Promise<OperationHistoryWithImages> {
    try {
      const db = await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.OPERATIONS_STORE], 'readonly');
        const store = transaction.objectStore(this.OPERATIONS_STORE);
        const request = store.get(journeyId);

        request.onsuccess = () => {
          resolve(request.result?.history || { operations: [], undoStack: [], redoStack: [] });
        };

        request.onerror = () => {
          console.error('Error getting operation history:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error getting operation history:', error);
      return { operations: [], undoStack: [], redoStack: [] };
    }
  }

  // Save operation history for a journey
  private static async saveOperationHistory(journeyId: string, history: OperationHistoryWithImages): Promise<void> {
    try {
      const db = await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.OPERATIONS_STORE], 'readwrite');
        const store = transaction.objectStore(this.OPERATIONS_STORE);
        const request = store.put({ journeyId, history });

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          console.error('Error saving operation history:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error saving operation history:', error);
    }
  }

  // Execute an operation and save
  static async executeOperation(journeyId: string, operation: OperationWithImages): Promise<JourneyMapWithImages | null> {
    try {
      const journey = await this.getJourney(journeyId);
      if (!journey) return null;

      const history = await this.getOperationHistory(journeyId);
      
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
      await this.saveJourney(updatedJourney);
      await this.saveOperationHistory(journeyId, history);
      
      return updatedJourney;
    } catch (error) {
      console.error('Error executing operation:', error);
      return null;
    }
  }

  // Create a new journey
  static async createJourney(title: string, description?: string): Promise<JourneyMapWithImages> {
    const now = new Date().toISOString();
    const newJourney: JourneyMapWithImages = {
      id: title.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now(),
      title,
      description: description || '',
      touchpoints: {},
      createdAt: now,
      updatedAt: now,
      version: this.CURRENT_VERSION,
      operationCount: 0,
    };

    await this.saveJourney(newJourney);
    return newJourney;
  }

  // Set a journey directly (for collaborative sync)
  static async setJourney(id: string, journey: JourneyMapWithImages): Promise<void> {
    await this.saveJourney(journey);
  }

  // Get touchpoints as array (excluding deleted ones)
  static getTouchpointsArray(journey: JourneyMapWithImages): TouchpointWithImage[] {
    return Object.values(journey.touchpoints).filter(tp => !tp.deletedAt);
  }

  // Helper methods for common operations
  static async createTouchpoint(journeyId: string, touchpointData: Omit<TouchpointWithImage, 'id' | 'createdAt' | 'updatedAt'>, imageFile?: File): Promise<JourneyMapWithImages | null> {
    const touchpoint = await this.createTouchpointWithImage(touchpointData, imageFile);

    const operation: OperationWithImages = {
      type: 'CREATE_TOUCHPOINT',
      touchpoint,
      timestamp: this.getTimestamp(),
      operationId: this.generateOperationId()
    };

    return this.executeOperation(journeyId, operation);
  }

  static async updateTouchpoint(journeyId: string, touchpointId: string, changes: Partial<TouchpointWithImage>, imageFile?: File): Promise<JourneyMapWithImages | null> {

    // Handle image update if provided
    if (imageFile) {
      try {
        changes.imageData = await this.fileToBase64(imageFile);
        changes.imageName = imageFile.name;
        changes.imageType = imageFile.type;
      } catch (error) {
        throw error;
      }
    }

    const operation: OperationWithImages = {
      type: 'UPDATE_TOUCHPOINT',
      touchpointId,
      changes,
      timestamp: this.getTimestamp(),
      operationId: this.generateOperationId()
    };

    return await this.executeOperation(journeyId, operation);
  }

  static async deleteTouchpoint(journeyId: string, touchpointId: string): Promise<JourneyMapWithImages | null> {
    const operation: OperationWithImages = {
      type: 'DELETE_TOUCHPOINT',
      touchpointId,
      timestamp: this.getTimestamp(),
      operationId: this.generateOperationId()
    };

    return this.executeOperation(journeyId, operation);
  }

  static async updateJourneyMetadata(journeyId: string, changes: { title?: string; description?: string }): Promise<JourneyMapWithImages | null> {
    const operation: OperationWithImages = {
      type: 'UPDATE_JOURNEY_METADATA',
      changes,
      timestamp: this.getTimestamp(),
      operationId: this.generateOperationId()
    };

    return this.executeOperation(journeyId, operation);
  }

  // Migration from localStorage/CRDT format
  static async migrateFromLocalStorage(): Promise<void> {
    try {
      // Check if we already have data in IndexedDB
      const existingJourneys = await this.getAllJourneys();
      if (existingJourneys.length > 0) {
        console.log('IndexedDB already has data, skipping migration');
        return;
      }

      // Try to get data from localStorage
      const { CRDTJourneyStorage } = await import('./crdt-storage');
      const oldJourneys = CRDTJourneyStorage.getAllJourneys();

      if (oldJourneys.length === 0) {
        return;
      }


      // Convert and save each journey
      for (const oldJourney of oldJourneys) {
        const newJourney: JourneyMapWithImages = {
          ...oldJourney,
          touchpoints: Object.fromEntries(
            Object.entries(oldJourney.touchpoints).map(([id, tp]) => [
              id,
              {
                ...tp,
                // Images will be empty for migrated touchpoints
                imageData: undefined,
                imageName: undefined,
                imageType: undefined,
              } as TouchpointWithImage
            ])
          ),
          version: this.CURRENT_VERSION,
        };

        await this.saveJourney(newJourney);
      }

    } catch (error) {
      console.error('Error during migration:', error);
    }
  }

  // Get storage usage info
  static async getStorageInfo(): Promise<{ used: number; available: number; journeyCount: number }> {
    try {
      const journeys = await this.getAllJourneys();
      
      // Estimate used storage (rough calculation)
      let totalSize = 0;
      for (const journey of journeys) {
        const journeyStr = JSON.stringify(journey);
        totalSize += new Blob([journeyStr]).size;
      }

      // IndexedDB storage quota (approximate)
      const quota = await navigator.storage?.estimate();
      const available = quota?.quota || 100 * 1024 * 1024; // Fallback to 100MB

      return {
        used: totalSize,
        available: available as number,
        journeyCount: journeys.length,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        used: 0,
        available: 100 * 1024 * 1024, // 100MB fallback
        journeyCount: 0,
      };
    }
  }

  // Delete a specific journey by ID
  static async deleteJourney(id: string): Promise<boolean> {
    try {
      const db = await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.JOURNEYS_STORE, this.OPERATIONS_STORE], 'readwrite');
        
        // Delete the journey from the journeys store
        const journeysStore = transaction.objectStore(this.JOURNEYS_STORE);
        const deleteJourneyRequest = journeysStore.delete(id);
        
        // Delete the operation history from the operations store
        const operationsStore = transaction.objectStore(this.OPERATIONS_STORE);
        const deleteOperationsRequest = operationsStore.delete(id);

        transaction.oncomplete = () => {
          resolve(true);
        };

        transaction.onerror = () => {
          console.error('Error deleting journey:', transaction.error);
          reject(transaction.error);
        };

        deleteJourneyRequest.onerror = () => {
          console.error('Error deleting journey from journeys store:', deleteJourneyRequest.error);
          reject(deleteJourneyRequest.error);
        };

        deleteOperationsRequest.onerror = () => {
          console.error('Error deleting journey from operations store:', deleteOperationsRequest.error);
          reject(deleteOperationsRequest.error);
        };
      });
    } catch (error) {
      console.error('Error deleting journey:', error);
      return false;
    }
  }

  // Clear all data
  static async clearAllData(): Promise<boolean> {
    try {
      const db = await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.JOURNEYS_STORE, this.OPERATIONS_STORE], 'readwrite');
        
        transaction.objectStore(this.JOURNEYS_STORE).clear();
        transaction.objectStore(this.OPERATIONS_STORE).clear();

        transaction.oncomplete = () => {
          resolve(true);
        };

        transaction.onerror = () => {
          console.error('Error clearing data:', transaction.error);
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }
}