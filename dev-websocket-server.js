// Development WebSocket server for local testing
const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Store collaboration rooms
const rooms = new Map();

class CollaborationRoom {
  constructor(journeyId) {
    this.journeyId = journeyId;
    this.clients = new Map(); // websocket -> user info
    this.operations = [];
    this.userPresence = new Map();
  }

  addClient(ws, userId, userName) {
    const userColor = this.generateUserColor();
    
    this.clients.set(ws, { userId, userName, color: userColor });
    this.userPresence.set(userId, {
      userId,
      userName,
      color: userColor,
      lastSeen: Date.now(),
    });

    // Send initial sync
    this.sendToClient(ws, {
      type: 'sync_response',
      data: {
        operations: this.operations,
        users: Array.from(this.userPresence.values()),
      },
      timestamp: Date.now(),
      userId,
    });

    // Broadcast user joined
    this.broadcastToOthers(ws, {
      type: 'user_joined',
      data: { userId, userName, color: userColor },
      timestamp: Date.now(),
      userId,
    });

    console.log(`User ${userName} (${userId}) joined room ${this.journeyId}`);
  }

  removeClient(ws) {
    const client = this.clients.get(ws);
    if (!client) return;

    this.clients.delete(ws);
    this.userPresence.delete(client.userId);

    // Broadcast user left
    this.broadcastToOthers(ws, {
      type: 'user_left',
      data: { userId: client.userId },
      timestamp: Date.now(),
      userId: client.userId,
    });

    console.log(`User ${client.userName} (${client.userId}) left room ${this.journeyId}`);
  }

  handleMessage(ws, message) {
    const client = this.clients.get(ws);
    if (!client) return;

    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'operation':
          this.handleOperation(ws, data);
          break;
        case 'presence':
          this.handlePresence(ws, data);
          break;
        case 'sync_request':
          this.handleSyncRequest(ws);
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  handleOperation(ws, message) {
    const client = this.clients.get(ws);
    if (!client) return;

    const operation = {
      id: message.data.operationId || this.generateOperationId(),
      journeyId: this.journeyId,
      operation: message.data.operation,
      timestamp: Date.now(),
      userId: client.userId,
      userName: client.userName,
    };

    // Store operation
    this.operations.push(operation);

    // Keep only last 1000 operations
    if (this.operations.length > 1000) {
      this.operations = this.operations.slice(-1000);
    }

    console.log(`Operation from ${client.userName}: ${operation.operation.type}`);

    // Broadcast to all other clients
    this.broadcastToOthers(ws, {
      type: 'operation',
      data: operation,
      timestamp: Date.now(),
      userId: client.userId,
    });
  }

  handlePresence(ws, message) {
    const client = this.clients.get(ws);
    if (!client) return;

    const presence = this.userPresence.get(client.userId);
    if (presence) {
      presence.cursor = message.data.cursor;
      presence.lastSeen = Date.now();
    }

    // Broadcast presence to all other clients
    this.broadcastToOthers(ws, {
      type: 'presence',
      data: {
        userId: client.userId,
        cursor: message.data.cursor,
      },
      timestamp: Date.now(),
      userId: client.userId,
    });
  }

  handleSyncRequest(ws) {
    const client = this.clients.get(ws);
    if (!client) return;

    this.sendToClient(ws, {
      type: 'sync_response',
      data: {
        operations: this.operations,
        users: Array.from(this.userPresence.values()),
      },
      timestamp: Date.now(),
      userId: client.userId,
    });
  }

  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message to client:', error);
      }
    }
  }

  broadcastToOthers(senderWs, message) {
    for (const [ws, client] of this.clients) {
      if (ws !== senderWs) {
        this.sendToClient(ws, message);
      }
    }
  }

  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateUserColor() {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
      '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
      '#10ac84', '#ee5253', '#0abde3', '#3867d6', '#8854d0',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

// WebSocket server
const wss = new WebSocket.Server({ 
  server,
  verifyClient: (info) => {
    // Allow connections to /collaborate/{journeyId}
    return info.req.url.startsWith('/collaborate/');
  }
});

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/');
  const journeyId = pathParts[pathParts.length - 1];

  if (!journeyId) {
    ws.close(1008, 'Journey ID required');
    return;
  }

  // Get or create room
  if (!rooms.has(journeyId)) {
    rooms.set(journeyId, new CollaborationRoom(journeyId));
  }
  const room = rooms.get(journeyId);

  // Generate user info
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const userName = `User ${Math.floor(Math.random() * 1000)}`;

  // Add client to room
  room.addClient(ws, userId, userName);

  // Handle messages
  ws.on('message', (message) => {
    room.handleMessage(ws, message.toString());
  });

  // Handle disconnect
  ws.on('close', () => {
    room.removeClient(ws);
    
    // Clean up empty rooms
    if (room.clients.size === 0) {
      rooms.delete(journeyId);
      console.log(`Cleaned up empty room ${journeyId}`);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    room.removeClient(ws);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    rooms: rooms.size,
    totalConnections: Array.from(rooms.values()).reduce((sum, room) => sum + room.clients.size, 0)
  });
});

const PORT = process.env.WS_PORT || 8787;

server.listen(PORT, () => {
  console.log(`🚀 WebSocket collaboration server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down WebSocket server...');
  wss.close(() => {
    server.close(() => {
      console.log('✅ Server shut down gracefully');
      process.exit(0);
    });
  });
});

module.exports = { app, server, wss };