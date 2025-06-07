// Cloudflare Workers Durable Object for collaboration
import { type Operation } from './crdt-storage';

interface CollaborativeOperation {
  id: string;
  journeyId: string;
  operation: Operation;
  timestamp: number;
  userId: string;
  userName?: string;
}

interface UserPresence {
  userId: string;
  userName: string;
  cursor?: { x: number; y: number };
  lastSeen: number;
  color: string;
}

interface CollaborationMessage {
  type: 'operation' | 'presence' | 'sync_request' | 'sync_response' | 'user_joined' | 'user_left';
  data: unknown;
  timestamp: number;
  userId: string;
}

export class CollaborationRoom {
  private state: DurableObjectState;
  private sessions: Map<WebSocket, { userId: string; userName: string }> = new Map();
  private operations: CollaborativeOperation[] = [];
  private userPresence: Map<string, UserPresence> = new Map();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 400 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Extract user info from URL
    const userName = url.searchParams.get('userName') || `User ${Math.floor(Math.random() * 1000)}`;
    const userId = url.searchParams.get('userId') || this.generateUserId();

    await this.handleWebSocket(server, userId, userName);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleWebSocket(websocket: WebSocket, userId: string, userName: string) {
    websocket.accept();

    const userColor = this.generateUserColor();
    this.sessions.set(websocket, { userId, userName });

    // Add user presence
    this.userPresence.set(userId, {
      userId,
      userName,
      lastSeen: Date.now(),
      color: userColor,
    });

    // Send initial sync
    this.sendMessage(websocket, {
      type: 'sync_response',
      data: {
        operations: this.operations,
        users: Array.from(this.userPresence.values()),
      },
      timestamp: Date.now(),
      userId,
    });

    // Broadcast user joined
    this.broadcastToOthers(websocket, {
      type: 'user_joined',
      data: { userId, userName, color: userColor },
      timestamp: Date.now(),
      userId,
    });

    websocket.addEventListener('message', (event) => {
      try {
        const message: CollaborationMessage = JSON.parse(event.data as string);
        this.handleMessage(websocket, message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    websocket.addEventListener('close', () => {
      this.sessions.delete(websocket);
      this.userPresence.delete(userId);
      
      // Broadcast user left
      this.broadcastToOthers(websocket, {
        type: 'user_left',
        data: { userId },
        timestamp: Date.now(),
        userId,
      });
    });
  }

  private handleMessage(websocket: WebSocket, message: CollaborationMessage) {
    const session = this.sessions.get(websocket);
    if (!session) return;

    switch (message.type) {
      case 'operation':
        this.handleOperation(websocket, message);
        break;
      case 'presence':
        this.handlePresence(websocket, message);
        break;
      case 'sync_request':
        this.handleSyncRequest(websocket);
        break;
    }
  }

  private handleOperation(websocket: WebSocket, message: CollaborationMessage) {
    const session = this.sessions.get(websocket);
    if (!session) return;

    const data = message.data as { operationId?: string; journeyId: string; operation: Operation };
    const operation: CollaborativeOperation = {
      id: data.operationId || this.generateOperationId(),
      journeyId: data.journeyId,
      operation: data.operation,
      timestamp: Date.now(),
      userId: session.userId,
      userName: session.userName,
    };

    // Store operation
    this.operations.push(operation);

    // Keep only last 1000 operations
    if (this.operations.length > 1000) {
      this.operations = this.operations.slice(-1000);
    }

    // Broadcast to all other clients
    this.broadcastToOthers(websocket, {
      type: 'operation',
      data: operation,
      timestamp: Date.now(),
      userId: session.userId,
    });
  }

  private handlePresence(websocket: WebSocket, message: CollaborationMessage) {
    const session = this.sessions.get(websocket);
    if (!session) return;

    const data = message.data as { cursor: { x: number; y: number } };
    const presence = this.userPresence.get(session.userId);
    if (presence) {
      presence.cursor = data.cursor;
      presence.lastSeen = Date.now();
    }

    // Broadcast presence to all other clients
    this.broadcastToOthers(websocket, {
      type: 'presence',
      data: {
        userId: session.userId,
        cursor: data.cursor,
      },
      timestamp: Date.now(),
      userId: session.userId,
    });
  }

  private handleSyncRequest(websocket: WebSocket) {
    const session = this.sessions.get(websocket);
    if (!session) return;

    this.sendMessage(websocket, {
      type: 'sync_response',
      data: {
        operations: this.operations,
        users: Array.from(this.userPresence.values()),
      },
      timestamp: Date.now(),
      userId: session.userId,
    });
  }

  private sendMessage(websocket: WebSocket, message: CollaborationMessage) {
    try {
      const messageStr = JSON.stringify(message);
      const messageSize = new Blob([messageStr]).size;
      
      // Cloudflare Workers WebSocket limit is typically 1MB
      if (messageSize > 1024 * 1024) { // 1MB limit
        console.warn(`Message too large for WebSocket: ${messageSize} bytes. Stripping image data.`);
        
        // Strip image data from large messages
        if (message.type === 'operation' && message.data) {
          const data = message.data as { operation?: { touchpoint?: unknown; changes?: unknown } };
          
          // Remove image data from operations
          if (data.operation) {
            if (data.operation.touchpoint && typeof data.operation.touchpoint === 'object' && data.operation.touchpoint !== null) {
              const touchpoint = data.operation.touchpoint as Record<string, unknown>;
              if (touchpoint.imageData) {
                const imageName = touchpoint.imageName as string || 'unknown';
                delete touchpoint.imageData;
                delete touchpoint.imageName;
                delete touchpoint.imageType;
                data.operation.touchpoint = touchpoint;
                console.log(`Stripped image data from touchpoint: ${imageName}`);
              }
            }
            
            if (data.operation.changes && typeof data.operation.changes === 'object' && data.operation.changes !== null) {
              const changes = data.operation.changes as Record<string, unknown>;
              if (changes.imageData) {
                const imageName = changes.imageName as string || 'unknown';
                delete changes.imageData;
                delete changes.imageName;
                delete changes.imageType;
                data.operation.changes = changes;
                console.log(`Stripped image data from changes: ${imageName}`);
              }
            }
          }
        }
        
        // Re-stringify after stripping image data
        const strippedMessageStr = JSON.stringify(message);
        const newSize = new Blob([strippedMessageStr]).size;
        console.log(`Message size reduced from ${messageSize} to ${newSize} bytes`);
        websocket.send(strippedMessageStr);
      } else {
        websocket.send(messageStr);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  private broadcastToOthers(sender: WebSocket, message: CollaborationMessage) {
    for (const [websocket] of this.sessions) {
      if (websocket !== sender) {
        this.sendMessage(websocket, message);
      }
    }
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUserColor(): string {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
      '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
      '#10ac84', '#ee5253', '#0abde3', '#3867d6', '#8854d0',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}