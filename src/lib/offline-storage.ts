import { JourneyMap } from './storage';

interface OfflineQueue {
  id: string;
  action: 'create' | 'update' | 'delete';
  data: JourneyMap | { id: string };
  timestamp: number;
}

class OfflineStorage {
  private dbName = 'CustomerJourneyMapperDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    return new Promise((resolve) => {
      if (!('indexedDB' in window)) {
        console.warn('IndexedDB not supported, falling back to localStorage');
        this.initialized = true;
        resolve();
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB failed to open');
        this.initialized = true;
        resolve(); // Fallback to localStorage
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create journeys store
        if (!db.objectStoreNames.contains('journeys')) {
          const journeyStore = db.createObjectStore('journeys', { keyPath: 'id' });
          journeyStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Create offline queue store
        if (!db.objectStoreNames.contains('offlineQueue')) {
          db.createObjectStore('offlineQueue', { keyPath: 'id' });
        }
      };
    });
  }

  async saveJourney(journey: JourneyMap): Promise<JourneyMap> {
    await this.init();

    if (this.db && navigator.onLine) {
      try {
        return await this.saveToIndexedDB(journey);
      } catch (error) {
        console.error('IndexedDB save failed, falling back to localStorage:', error);
        return this.saveToLocalStorage(journey);
      }
    } else if (!navigator.onLine) {
      // When offline, queue the action and save locally
      await this.queueOfflineAction({
        id: Date.now().toString(),
        action: journey.id ? 'update' : 'create',
        data: journey,
        timestamp: Date.now(),
      });
      return this.saveToLocalStorage(journey);
    } else {
      return this.saveToLocalStorage(journey);
    }
  }

  async getAllJourneys(): Promise<JourneyMap[]> {
    await this.init();

    if (this.db) {
      try {
        return await this.getAllFromIndexedDB();
      } catch (error) {
        console.error('IndexedDB read failed, falling back to localStorage:', error);
        return this.getAllFromLocalStorage();
      }
    } else {
      return this.getAllFromLocalStorage();
    }
  }

  async deleteJourney(id: string): Promise<boolean> {
    await this.init();

    if (this.db && navigator.onLine) {
      try {
        const success = await this.deleteFromIndexedDB(id);
        this.deleteFromLocalStorage(id); // Keep in sync
        return success;
      } catch (error) {
        console.error('IndexedDB delete failed, falling back to localStorage:', error);
        return this.deleteFromLocalStorage(id);
      }
    } else if (!navigator.onLine) {
      // When offline, queue the action and delete locally
      await this.queueOfflineAction({
        id: Date.now().toString(),
        action: 'delete',
        data: { id },
        timestamp: Date.now(),
      });
      return this.deleteFromLocalStorage(id);
    } else {
      return this.deleteFromLocalStorage(id);
    }
  }

  async syncOfflineChanges(): Promise<void> {
    if (!this.db || !navigator.onLine) return;

    try {
      const transaction = this.db.transaction(['offlineQueue'], 'readonly');
      const store = transaction.objectStore('offlineQueue');
      const request = store.getAll();

      request.onsuccess = async () => {
        const queuedActions = request.result as OfflineQueue[];
        
        for (const action of queuedActions.sort((a, b) => a.timestamp - b.timestamp)) {
          try {
            switch (action.action) {
              case 'create':
              case 'update':
                await this.saveToIndexedDB(action.data as JourneyMap);
                break;
              case 'delete':
                await this.deleteFromIndexedDB((action.data as { id: string }).id);
                break;
            }
            
            // Remove from queue after successful sync
            await this.removeFromOfflineQueue(action.id);
          } catch (error) {
            console.error('Failed to sync offline action:', error);
          }
        }
      };
    } catch (error) {
      console.error('Failed to sync offline changes:', error);
    }
  }

  private async saveToIndexedDB(journey: JourneyMap): Promise<JourneyMap> {
    if (!this.db) throw new Error('IndexedDB not available');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['journeys'], 'readwrite');
      const store = transaction.objectStore('journeys');
      const request = store.put(journey);

      request.onsuccess = () => resolve(journey);
      request.onerror = () => reject(request.error);
    });
  }

  private async getAllFromIndexedDB(): Promise<JourneyMap[]> {
    if (!this.db) throw new Error('IndexedDB not available');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['journeys'], 'readonly');
      const store = transaction.objectStore('journeys');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromIndexedDB(id: string): Promise<boolean> {
    if (!this.db) throw new Error('IndexedDB not available');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['journeys'], 'readwrite');
      const store = transaction.objectStore('journeys');
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  private async queueOfflineAction(action: OfflineQueue): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineQueue'], 'readwrite');
      const store = transaction.objectStore('offlineQueue');
      const request = store.put(action);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async removeFromOfflineQueue(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineQueue'], 'readwrite');
      const store = transaction.objectStore('offlineQueue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private saveToLocalStorage(journey: JourneyMap): JourneyMap {
    const storageKey = 'customerJourneyMaps';
    try {
      const stored = localStorage.getItem(storageKey);
      const journeys = stored ? JSON.parse(stored) : [];
      
      const existingIndex = journeys.findIndex((j: JourneyMap) => j.id === journey.id);
      if (existingIndex >= 0) {
        journeys[existingIndex] = journey;
      } else {
        journeys.push(journey);
      }
      
      localStorage.setItem(storageKey, JSON.stringify(journeys));
      return journey;
    } catch (error) {
      console.error('localStorage save failed:', error);
      throw new Error('Failed to save journey');
    }
  }

  private getAllFromLocalStorage(): JourneyMap[] {
    const storageKey = 'customerJourneyMaps';
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('localStorage read failed:', error);
      return [];
    }
  }

  private deleteFromLocalStorage(id: string): boolean {
    const storageKey = 'customerJourneyMaps';
    try {
      const stored = localStorage.getItem(storageKey);
      const journeys = stored ? JSON.parse(stored) : [];
      const filtered = journeys.filter((j: JourneyMap) => j.id !== id);
      
      if (filtered.length === journeys.length) return false;
      
      localStorage.setItem(storageKey, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('localStorage delete failed:', error);
      return false;
    }
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  addEventListener(type: 'online' | 'offline', callback: () => void): void {
    window.addEventListener(type, callback);
  }

  removeEventListener(type: 'online' | 'offline', callback: () => void): void {
    window.removeEventListener(type, callback);
  }
}

export const offlineStorage = new OfflineStorage();