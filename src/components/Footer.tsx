import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t-2 border-dashed border-pink-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-pink-200 border-2 border-dashed border-pink-400 rounded-lg p-4 transform rotate-1" style={{ boxShadow: '4px 4px 0 #ec4899' }}>
          <p className="text-center text-gray-800 font-black">
            🎉 A vibe coding experiment by Olof Bjerke 🎉
          </p>
          <p className="text-center text-gray-700 text-xs font-bold mt-1">
            Made with ☕ and lots of fun! • <Link href="/about" className="underline hover:text-pink-800">About this experiment</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}