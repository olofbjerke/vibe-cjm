'use client';

import { useRef } from 'react';

interface Touchpoint {
  id: string;
  title: string;
  description: string;
  emotion: 'positive' | 'neutral' | 'negative';
  intensity: number; // 1-10 scale for emotion intensity
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
    const x = ((event.clientX - rect.left) / rect.width) * 800;
    
    // Clamp x position between 40 and 760 to keep touchpoints visible
    const clampedX = Math.min(Math.max(x, 40), 760);

    const newTouchpoint: Touchpoint = {
      id: Date.now().toString(),
      title: 'New Touchpoint',
      description: 'Double-click to edit this touchpoint',
      emotion: 'neutral',
      intensity: 5,
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

  const getEmotionY = (emotion: string, intensity: number = 5) => {
    // Map emotion to base Y position, then apply intensity (1-10 scale)
    // Scale all Y coordinates by 2 for the 800x200 viewBox
    const baseY = {
      'positive': 40 + (5 - Math.min(intensity, 5)) * 8, // 40-80 range
      'negative': 120 + (Math.min(intensity, 5) - 1) * 8, // 120-160 range  
      'neutral': 90 + (intensity - 5) * 4 // 80-100 range
    };
    return baseY[emotion as keyof typeof baseY] || 100;
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
        viewBox="0 0 800 200"
        preserveAspectRatio="xMidYMid meet"
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
        <text x="8" y="44" fontSize="12" fill="#10b981" className="text-xs">😍</text>
        <text x="8" y="64" fontSize="12" fill="#10b981" className="text-xs">😊</text>
        <text x="8" y="84" fontSize="12" fill="#10b981" className="text-xs">🙂</text>
        <text x="8" y="104" fontSize="12" fill="#6b7280" className="text-xs">😐</text>
        <text x="8" y="124" fontSize="12" fill="#ef4444" className="text-xs">🙁</text>
        <text x="8" y="144" fontSize="12" fill="#ef4444" className="text-xs">😞</text>
        <text x="8" y="164" fontSize="12" fill="#ef4444" className="text-xs">😡</text>
        
        {/* Main journey path */}
        <path
          d="M 40 100 Q 200 90 400 100 Q 600 110 760 100"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeDasharray="8,4"
        />
        
        {/* Touchpoint connecting line */}
        {touchpoints.length > 1 && (
          <path
            d={touchpoints
              .sort((a, b) => a.xPosition - b.xPosition)
              .map((tp, index) => 
                `${index === 0 ? 'M' : 'L'} ${tp.xPosition} ${getEmotionY(tp.emotion, tp.intensity)}`
              )
              .join(' ')}
            fill="none"
            stroke="#10b981"
            strokeWidth="4"
            strokeDasharray="8,8"
            opacity="0.8"
          />
        )}
        
        {/* Touchpoints */}
        {touchpoints.map((touchpoint) => (
          <g key={touchpoint.id}>
            {/* Connection line to main path */}
            <line
              x1={touchpoint.xPosition}
              y1={100}
              x2={touchpoint.xPosition}
              y2={getEmotionY(touchpoint.emotion, touchpoint.intensity)}
              stroke="#d1d5db"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            
            {/* Touchpoint circle */}
            <circle
              cx={touchpoint.xPosition}
              cy={getEmotionY(touchpoint.emotion, touchpoint.intensity)}
              r="10"
              fill={getEmotionColor(touchpoint.emotion)}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:r-12 transition-all"
              onClick={() => handleTouchpointClick(touchpoint)}
            />
            
            {/* Touchpoint label */}
            <text
              x={touchpoint.xPosition}
              y={getEmotionY(touchpoint.emotion, touchpoint.intensity) - 16}
              fontSize="12"
              textAnchor="middle"
              fill="#374151"
              className="pointer-events-none text-xs font-medium"
            >
              {touchpoint.title}
            </text>
          </g>
        ))}
        
        {/* Journey start and end labels */}
        <text x="40" y="90" fontSize="12" fill="#6b7280" textAnchor="middle">Start</text>
        <text x="760" y="90" fontSize="12" fill="#6b7280" textAnchor="middle">End</text>
      </svg>
    </div>
  );
}