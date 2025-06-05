'use client';

import { useRef } from 'react';

interface Touchpoint {
  id: string;
  title: string;
  description: string;
  emotion: 'positive' | 'neutral' | 'negative';
  xPosition: number;
}

interface JourneyMapProps {
  touchpoints: Touchpoint[];
  onTouchpointClick?: (touchpoint: Touchpoint) => void;
  onAddTouchpoint?: (touchpoint: Touchpoint) => void;
}

export default function JourneyMap({ touchpoints, onTouchpointClick, onAddTouchpoint }: JourneyMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const handleDoubleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    
    // Clamp x position between 5% and 95% to keep touchpoints visible
    const clampedX = Math.min(Math.max(x, 5), 95);

    const newTouchpoint: Touchpoint = {
      id: Date.now().toString(),
      title: 'New Touchpoint',
      description: 'Double-click to edit this touchpoint',
      emotion: 'neutral',
      xPosition: clampedX,
    };

    onAddTouchpoint?.(newTouchpoint);
  };

  const handleTouchpointClick = (touchpoint: Touchpoint) => {
    onTouchpointClick?.(touchpoint);
  };

  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case 'positive': return '#10b981'; // green-500
      case 'negative': return '#ef4444'; // red-500
      default: return '#6b7280'; // gray-500
    }
  };

  const getEmotionY = (emotion: string) => {
    switch (emotion) {
      case 'positive': return 30;
      case 'negative': return 70;
      default: return 50;
    }
  };

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Customer Journey Map</h2>
        <p className="text-sm text-gray-600">Double-click on the path to add touchpoints</p>
      </div>
      
      <svg
        ref={svgRef}
        className="w-full h-48 sm:h-64 cursor-pointer"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onDoubleClick={handleDoubleClick}
      >
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f3f4f6" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Emotion level indicators */}
        <text x="1" y="32" fontSize="2" fill="#10b981" className="text-xs">😊</text>
        <text x="1" y="52" fontSize="2" fill="#6b7280" className="text-xs">😐</text>
        <text x="1" y="72" fontSize="2" fill="#ef4444" className="text-xs">😞</text>
        
        {/* Main journey path */}
        <path
          d="M 5 50 Q 25 45 50 50 Q 75 55 95 50"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="0.8"
          strokeDasharray="2,1"
        />
        
        {/* Touchpoints */}
        {touchpoints.map((touchpoint) => (
          <g key={touchpoint.id}>
            {/* Connection line to main path */}
            <line
              x1={touchpoint.xPosition}
              y1={50}
              x2={touchpoint.xPosition}
              y2={getEmotionY(touchpoint.emotion)}
              stroke="#d1d5db"
              strokeWidth="0.3"
              strokeDasharray="1,1"
            />
            
            {/* Touchpoint circle */}
            <circle
              cx={touchpoint.xPosition}
              cy={getEmotionY(touchpoint.emotion)}
              r="2.5"
              fill={getEmotionColor(touchpoint.emotion)}
              stroke="white"
              strokeWidth="0.5"
              className="cursor-pointer hover:r-3 transition-all"
              onClick={() => handleTouchpointClick(touchpoint)}
            />
            
            {/* Touchpoint label */}
            <text
              x={touchpoint.xPosition}
              y={getEmotionY(touchpoint.emotion) - 4}
              fontSize="1.5"
              textAnchor="middle"
              fill="#374151"
              className="pointer-events-none text-xs font-medium"
            >
              {touchpoint.title}
            </text>
          </g>
        ))}
        
        {/* Journey start and end labels */}
        <text x="5" y="45" fontSize="1.5" fill="#6b7280" textAnchor="middle">Start</text>
        <text x="95" y="45" fontSize="1.5" fill="#6b7280" textAnchor="middle">End</text>
      </svg>
    </div>
  );
}