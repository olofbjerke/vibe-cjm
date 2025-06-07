export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-green-50 to-blue-50" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header className="bg-white border-b-4 border-dashed border-orange-300" style={{ boxShadow: '0 8px 0 #fed7aa' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-8">
            <a href="/" className="text-2xl sm:text-4xl font-black text-gray-800 transform -rotate-1 hover:rotate-0 transition-all" style={{ textShadow: '3px 3px 0 #fbbf24' }}>
              🛣️ Bumpy Road
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-blue-200 border-2 border-dashed border-blue-400 rounded-lg p-6 mb-8 transform -rotate-1" style={{ boxShadow: '6px 6px 0 #60a5fa' }}>
          <h1 className="text-3xl sm:text-5xl font-black text-gray-800 mb-3">🚀 About This Wild Ride</h1>
          <p className="text-gray-800 font-bold text-lg">
            Everything you wanted to know about this crazy journey mapping adventure! 🎢
          </p>
        </div>
        
        <div className="space-y-8">
          <section>
            <div className="bg-yellow-200 border-2 border-dashed border-yellow-400 rounded-lg p-6 transform rotate-1" style={{ boxShadow: '4px 4px 0 #fbbf24' }}>
              <h2 className="text-2xl font-black text-gray-800 mb-4">🧪 The Mad Science Experiment</h2>
              <p className="text-gray-800 font-bold mb-4">
                This whole thing is an AI-generated vibe coding experiment! We wanted to see how far AI assistance could take us without writing a single line of code manually. 🤖✨
              </p>
              <p className="text-gray-800 font-bold">
                Everything you see here was generated via Claude Code, except for the initial project bootstrap. It's like having a super smart coding buddy who never gets tired! 💪
              </p>
            </div>
          </section>

          <section>
            <div className="bg-green-200 border-2 border-dashed border-green-400 rounded-lg p-6 transform -rotate-1" style={{ boxShadow: '4px 4px 0 #22c55e' }}>
              <h2 className="text-2xl font-black text-gray-800 mb-4">🎯 What We Built</h2>
              <p className="text-gray-800 font-bold mb-4">
                A collaborative journey mapping tool that's actually pretty awesome:
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white border-2 border-dashed border-green-300 rounded p-3">
                  <span className="font-black text-green-800">⚡ Real-time collaboration via WebSockets</span>
                </div>
                <div className="bg-white border-2 border-dashed border-green-300 rounded p-3">
                  <span className="font-black text-green-800">🔄 CRDT for conflict-free editing</span>
                </div>
                <div className="bg-white border-2 border-dashed border-green-300 rounded p-3">
                  <span className="font-black text-green-800">🎭 Presentation mode for showing off</span>
                </div>
                <div className="bg-white border-2 border-dashed border-green-300 rounded p-3">
                  <span className="font-black text-green-800">💾 Auto-save that actually works</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="bg-purple-200 border-2 border-dashed border-purple-400 rounded-lg p-6 transform rotate-1" style={{ boxShadow: '4px 4px 0 #9333ea' }}>
              <h2 className="text-2xl font-black text-gray-800 mb-4">🛠️ The Tech Stack</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border-2 border-dashed border-purple-300 rounded-lg p-4">
                  <h3 className="text-lg font-black text-purple-800 mb-2">🎨 Frontend Magic</h3>
                  <ul className="space-y-1 text-gray-800 font-bold text-sm">
                    <li>• Next.js 15 with React 19</li>
                    <li>• TailwindCSS 4 for style</li>
                    <li>• TypeScript for safety</li>
                  </ul>
                </div>
                <div className="bg-white border-2 border-dashed border-purple-300 rounded-lg p-4">
                  <h3 className="text-lg font-black text-purple-800 mb-2">⚙️ Backend Power</h3>
                  <ul className="space-y-1 text-gray-800 font-bold text-sm">
                    <li>• Cloudflare Workers</li>
                    <li>• Durable Objects</li>
                    <li>• WebSockets + Express.js</li>
                    <li>• Custom CRDT magic</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="bg-pink-200 border-2 border-dashed border-pink-400 rounded-lg p-6 transform -rotate-1" style={{ boxShadow: '4px 4px 0 #ec4899' }}>
              <h2 className="text-2xl font-black text-gray-800 mb-4">✨ The Cool Features</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white border-2 border-dashed border-pink-300 rounded-lg p-4 transform rotate-1">
                  <h3 className="font-black text-pink-800 mb-2">🤝 Real-time Teamwork</h3>
                  <p className="text-xs text-gray-700 font-bold">
                    Work together in real-time! See changes instantly as your team builds amazing journey maps.
                  </p>
                </div>
                <div className="bg-white border-2 border-dashed border-pink-300 rounded-lg p-4 transform -rotate-1">
                  <h3 className="font-black text-pink-800 mb-2">🚫 No Conflicts Zone</h3>
                  <p className="text-xs text-gray-700 font-bold">
                    CRDT tech keeps everyone in sync without stepping on each other's toes. It's like magic! ✨
                  </p>
                </div>
                <div className="bg-white border-2 border-dashed border-pink-300 rounded-lg p-4 transform rotate-1">
                  <h3 className="font-black text-pink-800 mb-2">🎭 Show & Tell Mode</h3>
                  <p className="text-xs text-gray-700 font-bold">
                    Clean presentation view perfect for wowing stakeholders and impressing the boss! 🎩
                  </p>
                </div>
                <div className="bg-white border-2 border-dashed border-pink-300 rounded-lg p-4 transform -rotate-1">
                  <h3 className="font-black text-pink-800 mb-2">💾 Never Lose Anything</h3>
                  <p className="text-xs text-gray-700 font-bold">
                    Auto-save has your back! No more "did I save that?" panic moments. Phew! 😅
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="bg-orange-200 border-2 border-dashed border-orange-400 rounded-lg p-6 transform rotate-1" style={{ boxShadow: '4px 4px 0 #ea580c' }}>
              <h2 className="text-2xl font-black text-gray-800 mb-4">🌍 Global Deployment</h2>
              <p className="text-gray-800 font-bold mb-4">
                This baby runs on Cloudflare's edge network for lightning-fast performance everywhere:
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="bg-white border-2 border-dashed border-orange-300 rounded p-3 text-center">
                  <span className="font-black text-orange-800 text-sm">⚡ Edge Workers</span>
                </div>
                <div className="bg-white border-2 border-dashed border-orange-300 rounded p-3 text-center">
                  <span className="font-black text-orange-800 text-sm">🏠 Durable Objects</span>
                </div>
                <div className="bg-white border-2 border-dashed border-orange-300 rounded p-3 text-center">
                  <span className="font-black text-orange-800 text-sm">🚀 Global Speed</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t-4 border-dashed border-pink-300 mt-16" style={{ boxShadow: '0 -8px 0 #f9a8d4' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-pink-200 border-2 border-dashed border-pink-400 rounded-lg p-4 transform rotate-1" style={{ boxShadow: '4px 4px 0 #ec4899' }}>
            <p className="text-center text-gray-800 font-black">
              🎉 A vibe coding experiment by Olof Bjerke 🎉
            </p>
            <p className="text-center text-gray-700 text-xs font-bold mt-1">
              Made with ☕ and lots of fun! • <a href="/about" className="underline hover:text-pink-800">About this experiment</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}