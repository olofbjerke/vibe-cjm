export interface Touchpoint {
  id: string;
  title: string;
  description: string;
  emotion: 'positive' | 'neutral' | 'negative';
  intensity: number; // 1-10 scale for emotion intensity
  xPosition: number;
}

export interface JourneyMap {
  id: string;
  title: string;
  description?: string;
  touchpoints: Touchpoint[];
  createdAt: string;
  updatedAt: string;
  version: string;
}

export class JourneyStorage {
  private static readonly STORAGE_KEY = 'customerJourneyMaps';
  private static readonly CURRENT_VERSION = '1.0.0';

  // Get all saved journey maps
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

  // Save a journey map
  static saveJourney(journey: Omit<JourneyMap, 'id' | 'createdAt' | 'updatedAt' | 'version'>): JourneyMap {
    const now = new Date().toISOString();
    const newJourney: JourneyMap = {
      ...journey,
      id: journey.title.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now(),
      createdAt: now,
      updatedAt: now,
      version: this.CURRENT_VERSION,
    };

    const journeys = this.getAllJourneys();
    journeys.push(newJourney);
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(journeys));
      return newJourney;
    } catch (error) {
      console.error('Error saving journey:', error);
      throw new Error('Failed to save journey');
    }
  }

  // Update an existing journey
  static updateJourney(id: string, updates: Partial<Omit<JourneyMap, 'id' | 'createdAt' | 'version'>>): JourneyMap | null {
    const journeys = this.getAllJourneys();
    const index = journeys.findIndex(j => j.id === id);
    
    if (index === -1) return null;

    const updatedJourney: JourneyMap = {
      ...journeys[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    journeys[index] = updatedJourney;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(journeys));
      return updatedJourney;
    } catch (error) {
      console.error('Error updating journey:', error);
      throw new Error('Failed to update journey');
    }
  }

  // Delete a journey
  static deleteJourney(id: string): boolean {
    const journeys = this.getAllJourneys();
    const filtered = journeys.filter(j => j.id !== id);
    
    if (filtered.length === journeys.length) return false;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting journey:', error);
      throw new Error('Failed to delete journey');
    }
  }

  // Get a specific journey by ID
  static getJourney(id: string): JourneyMap | null {
    const journeys = this.getAllJourneys();
    return journeys.find(j => j.id === id) || null;
  }

  // Export journey as JSON file
  static exportJourney(journey: JourneyMap): void {
    const dataStr = JSON.stringify(journey, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${journey.title.replace(/[^a-z0-9]/gi, '-')}-journey.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Import journey from JSON file
  static importJourney(file: File): Promise<JourneyMap> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const journeyData = JSON.parse(content);
          
          // Validate required fields
          if (!journeyData.title || !Array.isArray(journeyData.touchpoints)) {
            throw new Error('Invalid journey file format');
          }

          // Create new journey with imported data
          const importedJourney = this.saveJourney({
            title: journeyData.title + ' (Imported)',
            description: journeyData.description || '',
            touchpoints: journeyData.touchpoints.map((tp: unknown) => {
              const touchpoint = tp as Partial<Touchpoint>;
              return {
                id: touchpoint.id || Date.now().toString() + Math.random(),
                title: touchpoint.title || 'Imported Touchpoint',
                description: touchpoint.description || '',
                emotion: (touchpoint.emotion as 'positive' | 'neutral' | 'negative') || 'neutral',
                intensity: touchpoint.intensity || 5,
                xPosition: touchpoint.xPosition || 50,
              };
            }),
          });

          resolve(importedJourney);
        } catch {
          reject(new Error('Failed to parse journey file'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Export all journeys as a backup file
  static exportAllJourneys(): void {
    const journeys = this.getAllJourneys();
    const dataStr = JSON.stringify({
      version: this.CURRENT_VERSION,
      exportedAt: new Date().toISOString(),
      journeys,
    }, null, 2);
    
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `customer-journeys-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Clear all data (with confirmation)
  static clearAllData(): boolean {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  // Get storage usage info
  static getStorageInfo(): { used: number; available: number; journeyCount: number } {
    const journeys = this.getAllJourneys();
    const dataSize = new Blob([localStorage.getItem(this.STORAGE_KEY) || '']).size;
    
    return {
      used: dataSize,
      available: 5 * 1024 * 1024, // Approximate localStorage limit (5MB)
      journeyCount: journeys.length,
    };
  }
}