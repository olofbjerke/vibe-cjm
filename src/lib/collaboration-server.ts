// WebSocket server for collaborative editing
// This will run on Cloudflare Workers with Durable Objects

import type { Operation } from './crdt-storage';

export interface CollaborativeOperation {
  id: string;
  journeyId: string;
  operation: Operation;
  timestamp: number;
  userId: string;
  userName?: string;
}

export interface UserPresence {
  userId: string;
  userName: string;
  cursor?: { x: number; y: number };
  lastSeen: number;
  color: string;
}

export interface CollaborationMessage {
  type: 'operation' | 'presence' | 'sync_request' | 'sync_response' | 'user_joined' | 'user_left';
  data: unknown;
  timestamp: number;
  userId: string;
}

// Durable Object for managing collaboration state
export class CollaborationRoom {
  private state: DurableObjectState;
  private env: { COLLABORATION_ROOM: DurableObjectNamespace };
  private sessions: Map<WebSocket, { userId: string; userName: string }> = new Map();
  private operations: CollaborativeOperation[] = [];
  private userPresence: Map<string, UserPresence> = new Map();

  constructor(state: DurableObjectState, env: { COLLABORATION_ROOM: DurableObjectNamespace }) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const journeyId = url.pathname.split('/').pop();

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 400 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    await this.handleWebSocket(server, journeyId);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleWebSocket(websocket: WebSocket, journeyId: string | undefined) {
    websocket.accept();

    const userId = this.generateUserId();
    const userName = `User ${Math.floor(Math.random() * 1000)}`;
    const userColor = this.generateUserColor();

    // Store journeyId in session for future use
    console.log('WebSocket connected for journey:', journeyId);

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
      websocket.send(JSON.stringify(message));
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

// Worker handler
const worker = {
  async fetch(request: Request, env: { COLLABORATION_ROOM: DurableObjectNamespace }): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname.startsWith('/collaborate/')) {
      const journeyId = url.pathname.split('/').pop();
      if (!journeyId) {
        return new Response('Journey ID required', { status: 400 });
      }
      const durableObjectId = env.COLLABORATION_ROOM.idFromName(journeyId);
      const durableObject = env.COLLABORATION_ROOM.get(durableObjectId);
      return durableObject.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};

export default worker;