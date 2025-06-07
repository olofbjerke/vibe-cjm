import { CRDTJourneyStorage, type Operation, type JourneyMap } from './crdt-storage';

export interface CollaborativeUser {
  userId: string;
  userName: string;
  color: string;
  cursor?: { x: number; y: number };
  lastSeen: number;
}

export interface CollaborationState {
  isConnected: boolean;
  users: CollaborativeUser[];
  currentUser?: CollaborativeUser;
  connectionError?: string;
}

export class CollaborativeCRDT {
  private websocket: WebSocket | null = null;
  private journeyId: string;
  private userId: string;
  private userName: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pendingOperations: Operation[] = [];
  private onStateChange?: (state: CollaborationState) => void;
  private onJourneyUpdate?: (journey: JourneyMap) => void;
  private collaborationState: CollaborationState = {
    isConnected: false,
    users: [],
  };

  constructor(
    journeyId: string,
    userName: string = 'Anonymous',
    onStateChange?: (state: CollaborationState) => void,
    onJourneyUpdate?: (journey: JourneyMap) => void
  ) {
    this.journeyId = journeyId;
    this.userId = this.generateUserId();
    this.userName = userName;
    this.onStateChange = onStateChange;
    this.onJourneyUpdate = onJourneyUpdate;
  }

  async connect(): Promise<void> {
    try {
      const wsUrl = this.getWebSocketUrl();
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        this.reconnectAttempts = 0;
        this.updateConnectionState(true);
        this.requestSync();
        this.flushPendingOperations();
      };

      this.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.websocket.onclose = () => {
        this.updateConnectionState(false);
        this.scheduleReconnect();
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.updateConnectionState(false, 'Connection error');
      };

    } catch (error) {
      console.error('Failed to connect to collaboration server:', error);
      this.updateConnectionState(false, 'Failed to connect');
    }
  }

  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.updateConnectionState(false);
  }

  async executeOperation(operation: Operation): Promise<JourneyMap | null> {
    // Execute locally first
    const journey = CRDTJourneyStorage.executeOperation(this.journeyId, operation);
    
    if (journey && this.onJourneyUpdate) {
      this.onJourneyUpdate(journey);
    }

    // Send to server if connected
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.sendMessage({
        type: 'operation',
        data: {
          journeyId: this.journeyId,
          operation,
          operationId: operation.operationId,
          // Removed currentState to avoid sending full journey with images
        },
        timestamp: Date.now(),
        userId: this.userId,
      });
    } else {
      // Queue operation for when connection is restored
      this.pendingOperations.push(operation);
    }

    return journey;
  }

  updateCursor(x: number, y: number): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.sendMessage({
        type: 'presence',
        data: {
          cursor: { x, y },
        },
        timestamp: Date.now(),
        userId: this.userId,
      });
    }
  }

  private handleMessage(message: { type: string; data: unknown; timestamp: number; userId: string }): void {
    switch (message.type) {
      case 'operation':
        this.handleRemoteOperation(message.data as { operation: Operation; userId: string });
        break;
      case 'presence':
        this.handlePresenceUpdate(message.data as { userId: string; cursor: { x: number; y: number } });
        break;
      case 'sync_response':
        this.handleSyncResponse(message.data as { operations?: { operation: Operation; userId: string }[]; users?: CollaborativeUser[]; currentState?: JourneyMap });
        break;
      case 'user_joined':
        this.handleUserJoined(message.data as { userId: string; userName: string; color: string });
        break;
      case 'user_left':
        this.handleUserLeft(message.data as { userId: string });
        break;
    }
  }

  private handleRemoteOperation(operationData: { operation: Operation; userId: string }): void {
    // Don't apply our own operations
    if (operationData.userId === this.userId) {
      return;
    }

    try {
      // Apply the remote operation to CRDT storage for collaboration consistency
      const journey = CRDTJourneyStorage.executeOperation(this.journeyId, operationData.operation);
      
      if (journey && this.onJourneyUpdate) {
        this.onJourneyUpdate(journey);
      }
    } catch (error) {
      console.error('Error applying remote operation:', error, operationData);
    }
  }

  private handlePresenceUpdate(data: { userId: string; cursor: { x: number; y: number } }): void {
    const userIndex = this.collaborationState.users.findIndex(u => u.userId === data.userId);
    if (userIndex >= 0) {
      this.collaborationState.users[userIndex].cursor = data.cursor;
      this.collaborationState.users[userIndex].lastSeen = Date.now();
      this.notifyStateChange();
    }
  }

  private handleSyncResponse(data: { operations?: { operation: Operation; userId: string }[]; users?: CollaborativeUser[]; currentState?: JourneyMap }): void {
    // If we have a current state from server, apply it first
    if (data.currentState) {
      try {
        // Store the current state directly
        CRDTJourneyStorage.setJourney(this.journeyId, data.currentState);
        
        if (this.onJourneyUpdate) {
          this.onJourneyUpdate(data.currentState);
        }
      } catch (error) {
        console.error('Error applying current state:', error);
      }
    }
    
    // Apply all operations from server
    if (data.operations && Array.isArray(data.operations)) {
      for (const opData of data.operations) {
        // Apply all operations, including our own (in case we missed some)
        try {
          CRDTJourneyStorage.executeOperation(this.journeyId, opData.operation);
        } catch (error) {
          console.error('Error applying sync operation:', error, opData);
        }
      }

      // Update journey after applying operations
      const journey = CRDTJourneyStorage.getJourney(this.journeyId);
      
      if (journey && this.onJourneyUpdate) {
        this.onJourneyUpdate(journey);
      }
    }

    // Update user list
    if (data.users && Array.isArray(data.users)) {
      this.collaborationState.users = (data.users as CollaborativeUser[]).filter(u => u.userId !== this.userId);
      this.notifyStateChange();
    }
  }

  private handleUserJoined(data: { userId: string; userName: string; color: string }): void {
    const existingUser = this.collaborationState.users.find(u => u.userId === data.userId);
    if (!existingUser && data.userId !== this.userId) {
      this.collaborationState.users.push({
        userId: data.userId,
        userName: data.userName,
        color: data.color,
        lastSeen: Date.now(),
      });
      this.notifyStateChange();
    }
  }

  private handleUserLeft(data: { userId: string }): void {
    this.collaborationState.users = this.collaborationState.users.filter(
      u => u.userId !== data.userId
    );
    this.notifyStateChange();
  }

  private requestSync(): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.sendMessage({
        type: 'sync_request',
        data: {},
        timestamp: Date.now(),
        userId: this.userId,
      });
    }
  }

  private flushPendingOperations(): void {
    for (const operation of this.pendingOperations) {
      // Get current state for each operation
      const currentJourney = CRDTJourneyStorage.getJourney(this.journeyId);
      
      this.sendMessage({
        type: 'operation',
        data: {
          journeyId: this.journeyId,
          operation,
          operationId: operation.operationId,
          currentState: currentJourney,
        },
        timestamp: Date.now(),
        userId: this.userId,
      });
    }
    this.pendingOperations = [];
  }

  private sendMessage(message: { type: string; data: unknown; timestamp: number; userId: string }): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    }
  }

  private updateConnectionState(isConnected: boolean, error?: string): void {
    this.collaborationState = {
      ...this.collaborationState,
      isConnected,
      connectionError: error,
      currentUser: isConnected ? {
        userId: this.userId,
        userName: this.userName,
        color: '#3b82f6', // Default blue
        lastSeen: Date.now(),
      } : undefined,
    };
    this.notifyStateChange();
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.collaborationState });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      this.reconnectAttempts++;
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      this.updateConnectionState(false, 'Connection lost');
    }
  }

  private getWebSocketUrl(): string {
    // Detect environment and construct appropriate WebSocket URL
    let baseUrl: string;
    
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      
      if (currentUrl.hostname === 'localhost' || currentUrl.hostname === '127.0.0.1') {
        // Development environment - use local WebSocket server
        baseUrl = `ws://localhost:8787/collaborate/${this.journeyId}`;
      } else {
        // Production environment - use WebSocket upgrade on same domain
        const protocol = currentUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        baseUrl = `${protocol}//${currentUrl.host}/api/collaborate/${this.journeyId}`;
      }
    } else {
      // Fallback for SSR or other environments
      baseUrl = `ws://localhost:8787/collaborate/${this.journeyId}`;
    }
    
    // Add username as query parameter
    const url = `${baseUrl}?userName=${encodeURIComponent(this.userName)}&userId=${encodeURIComponent(this.userId)}`;
    return url;
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public getters
  get state(): CollaborationState {
    return { ...this.collaborationState };
  }

  get isConnected(): boolean {
    return this.collaborationState.isConnected;
  }

  get users(): CollaborativeUser[] {
    return [...this.collaborationState.users];
  }
}