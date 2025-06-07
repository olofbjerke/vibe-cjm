// Custom worker that extends OpenNext with Durable Objects
// @ts-ignore `.open-next/worker.ts` is generated at build time
import { default as openNextHandler } from "./.open-next/worker.js";

// Export the CollaborationRoom Durable Object
export { CollaborationRoom } from "./src/lib/collaboration-worker";

// Create custom worker that handles collaboration WebSocket requests
export default {
  async fetch(request: Request, env: { COLLABORATION_ROOM: DurableObjectNamespace }, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle collaboration WebSocket connections
    if (url.pathname.startsWith('/api/collaborate/')) {
      const journeyId = url.pathname.split('/').pop();
      
      if (!journeyId || request.headers.get('upgrade') !== 'websocket') {
        return new Response('WebSocket upgrade required', { status: 400 });
      }
      
      // Get the Durable Object instance
      const durableObjectId = env.COLLABORATION_ROOM.idFromName(journeyId);
      const durableObject = env.COLLABORATION_ROOM.get(durableObjectId);
      
      // Forward the request to the Durable Object
      return durableObject.fetch(request);
    }
    
    // For all other requests, use the OpenNext handler
    return openNextHandler.fetch(request, env, ctx);
  },
};