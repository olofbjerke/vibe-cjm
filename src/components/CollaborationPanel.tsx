'use client';

import { useState } from 'react';
import { type CollaborativeUser } from '@/lib/collaborative-crdt';

interface CollaborationPanelProps {
  users: CollaborativeUser[];
  isConnected: boolean;
  connectionError?: string;
  shareableUrl: string | null;
  onCopyUrl: () => Promise<boolean>;
}

export default function CollaborationPanel({
  users,
  isConnected,
  connectionError,
  shareableUrl,
  onCopyUrl,
}: CollaborationPanelProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleCopyUrl = async () => {
    const success = await onCopyUrl();
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const formatLastSeen = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ago`;
    } else if (seconds > 5) {
      return `${seconds}s ago`;
    } else {
      return 'now';
    }
  };

  return (
    <div className={`bg-white border-l-4 border-dashed border-purple-300 transition-all duration-300 ${
      isExpanded ? 'w-80' : 'w-16'
    }`} style={{ boxShadow: '-8px 0 0 #d8b4fe' }}>
      {/* Header */}
      <div className="p-4 border-b-2 border-dashed border-purple-200">
        <div className="flex items-center justify-between">
          {isExpanded && (
            <h3 className="text-lg font-black text-gray-800">
              🤝 Collaboration
            </h3>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="bg-purple-100 hover:bg-purple-200 border-2 border-dashed border-purple-300 rounded-lg p-2 transform hover:scale-105 transition-all"
          >
            <span className="text-purple-800 font-bold">
              {isExpanded ? '→' : '←'}
            </span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Connection Status */}
          <div className="p-4 border-b-2 border-dashed border-purple-200">
            <div className={`flex items-center gap-2 p-3 rounded-lg border-2 border-dashed ${
              isConnected 
                ? 'bg-green-100 border-green-300 text-green-800'
                : 'bg-red-100 border-red-300 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="font-bold text-sm">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {connectionError && (
              <p className="text-red-600 text-xs font-bold mt-2">
                {connectionError}
              </p>
            )}
          </div>

          {/* Share URL */}
          {shareableUrl && (
            <div className="p-4 border-b-2 border-dashed border-purple-200">
              <h4 className="font-black text-gray-800 mb-3">📤 Share URL</h4>
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-3 mb-3">
                <p className="text-xs font-mono text-gray-600 break-all">
                  {shareableUrl}
                </p>
              </div>
              <button
                onClick={handleCopyUrl}
                className={`w-full px-3 py-2 border-2 border-dashed font-bold text-sm rounded-lg transform hover:scale-105 transition-all ${
                  copySuccess
                    ? 'bg-green-100 border-green-300 text-green-800'
                    : 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200'
                }`}
              >
                {copySuccess ? '✓ Copied!' : '📋 Copy Link'}
              </button>
            </div>
          )}

          {/* Active Users */}
          <div className="p-4">
            <h4 className="font-black text-gray-800 mb-3">
              👥 Online ({users.length})
            </h4>
            
            {users.length === 0 ? (
              <div className="bg-yellow-100 border-2 border-dashed border-yellow-300 rounded-lg p-3">
                <p className="text-yellow-800 text-sm font-bold text-center">
                  You&apos;re the only one here! 🤗
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center gap-3 p-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg transform hover:scale-105 transition-all"
                  >
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white"
                      style={{ backgroundColor: user.color }}
                    />
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-sm">
                        {user.userName}
                      </p>
                      <p className="text-xs text-gray-600">
                        Active {formatLastSeen(user.lastSeen)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="p-4 border-t-2 border-dashed border-purple-200">
            <div className="bg-purple-100 border-2 border-dashed border-purple-300 rounded-lg p-3">
              <h5 className="font-black text-purple-800 text-sm mb-2">
                💡 Collaboration Tips
              </h5>
              <ul className="text-xs text-purple-700 space-y-1 font-bold">
                <li>• Changes sync in real-time</li>
                <li>• Everyone sees cursors moving</li>
                <li>• Works offline and syncs later</li>
                <li>• Share the URL to invite others</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}