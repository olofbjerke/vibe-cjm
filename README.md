# CJM Worker - AI-Generated Vibe Coding Experiment

This is a vibe coding experiment to see how far I can take an AI agent without writing a single line of code. All code has been generated via [Claude Code](https://claude.ai/code) except for the initial project bootstrap using the Cloudflare Next.js boilerplate.

## What's Built

This project appears to be a collaborative journey mapping application with real-time collaboration features, including:
- Real-time collaboration via WebSockets
- CRDT (Conflict-free Replicated Data Types) for collaborative editing
- Presentation mode for journey maps
- Auto-save functionality

## Framework & Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org) with React 19
- **Styling**: TailwindCSS 4
- **Real-time**: WebSockets with Express.js dev server
- **State Management**: Custom CRDT implementation
- **TypeScript**: Full type safety

## Deployment

This application is configured to deploy on **Cloudflare Workers** using:
- [`@opennextjs/cloudflare`](https://github.com/opennextjs/opennextjs-cloudflare) - OpenNext.js adapter for Cloudflare
- **Cloudflare Durable Objects** for persistent collaboration rooms
- **Wrangler** for deployment and development

## Getting Started

```bash
# Install dependencies
npm install

# Run development server with WebSocket support
npm run dev:full

# Or run separately
npm run dev        # Next.js dev server
npm run dev:ws     # WebSocket server
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Deployment Commands

```bash
# Deploy to Cloudflare Workers
npm run deploy

# Preview deployment
npm run preview

# Generate Cloudflare types
npm run cf-typegen
```

## The Experiment

This project demonstrates the capabilities of AI-assisted development, where complex features like real-time collaboration, CRDT synchronization, and WebSocket communication were implemented entirely through AI code generation. The goal is to push the boundaries of what's possible with AI-driven development workflows.