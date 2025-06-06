'use client';

import { type Touchpoint } from '@/lib/storage';

interface PresentationJourneyMapProps {
  touchpoints: Touchpoint[];
  activeIndex: number;
  onTouchpointClick: (index: number) => void;
}

export default function PresentationJourneyMap({ touchpoints, activeIndex, onTouchpointClick }: PresentationJourneyMapProps) {
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

  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case 'positive': return '#10b981'; // green-500
      case 'negative': return '#ef4444'; // red-500
      default: return '#6b7280'; // gray-500
    }
  };

  const createSmoothPath = (touchpoints: Touchpoint[]): string => {
    const sortedPoints = touchpoints
      .map(tp => ({ x: tp.xPosition, y: getEmotionY(tp.emotion, tp.intensity) }));

    if (sortedPoints.length === 0) return '';
    if (sortedPoints.length === 1) return `M ${sortedPoints[0].x} ${sortedPoints[0].y}`;
    if (sortedPoints.length === 2) {
      return `M ${sortedPoints[0].x} ${sortedPoints[0].y} L ${sortedPoints[1].x} ${sortedPoints[1].y}`;
    }

    // Create smooth curve using cubic Bezier curves
    let path = `M ${sortedPoints[0].x} ${sortedPoints[0].y}`;
    
    for (let i = 1; i < sortedPoints.length; i++) {
      const curr = sortedPoints[i];
      const prev = sortedPoints[i - 1];
      const next = sortedPoints[i + 1];
      
      // Calculate control points for smooth curve
      const tension = 0.3; // Adjust smoothness (0-1)
      
      if (i === 1) {
        // First curve segment
        const cp1x = prev.x + (curr.x - prev.x) * tension;
        const cp1y = prev.y + (curr.y - prev.y) * tension;
        const cp2x = curr.x - (next ? (next.x - prev.x) : (curr.x - prev.x)) * tension;
        const cp2y = curr.y - (next ? (next.y - prev.y) : (curr.y - prev.y)) * tension;
        
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
      } else if (i === sortedPoints.length - 1) {
        // Last curve segment
        const prev2 = sortedPoints[i - 2];
        const cp1x = prev.x + (curr.x - prev2.x) * tension;
        const cp1y = prev.y + (curr.y - prev2.y) * tension;
        const cp2x = curr.x - (curr.x - prev.x) * tension;
        const cp2y = curr.y - (curr.y - prev.y) * tension;
        
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
      } else {
        // Middle curve segments
        const prev2 = sortedPoints[i - 2];
        const cp1x = prev.x + (curr.x - prev2.x) * tension;
        const cp1y = prev.y + (curr.y - prev2.y) * tension;
        const cp2x = curr.x - (next.x - prev.x) * tension;
        const cp2y = curr.y - (next.y - prev.y) * tension;
        
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
      }
    }
    
    return path;
  };

  return (
    <div className="w-full">
      <svg
        className="w-full h-32 sm:h-40 rounded-lg bg-yellow-50 border-2 border-dashed border-yellow-300"
        style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}
        viewBox="0 0 800 200"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background grid and gradients */}
        <defs>
          <pattern id="presentGrid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e9d5ff" strokeWidth="0.5"/>
          </pattern>
          <linearGradient id="presentEmotionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#ef4444', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#presentGrid)" />
        
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
          d="M 40 100 L 760 100"
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="4"
          strokeDasharray="12,6"
          strokeLinecap="round"
        />
        
        {/* Touchpoint connecting line */}
        {touchpoints.length > 1 && (
          <path
            d={createSmoothPath(touchpoints)}
            fill="none"
            stroke="url(#presentEmotionGradient)"
            strokeWidth="5"
            strokeDasharray="10,5"
            strokeLinecap="round"
            opacity="0.9"
          />
        )}
        
        {/* Touchpoints */}
        {touchpoints.map((touchpoint, index) => (
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
              r={activeIndex === index ? "16" : "12"}
              fill={getEmotionColor(touchpoint.emotion)}
              stroke={activeIndex === index ? "#3b82f6" : "white"}
              strokeWidth={activeIndex === index ? "4" : "3"}
              className="cursor-pointer"
              onClick={() => onTouchpointClick(index)}
              style={{ 
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
                transition: 'all 0.3s ease'
              }}
            />
            
            {/* Step number */}
            <text
              x={touchpoint.xPosition}
              y={getEmotionY(touchpoint.emotion, touchpoint.intensity) + 1}
              fontSize="10"
              fontWeight="bold"
              textAnchor="middle"
              fill="white"
              className="pointer-events-none"
            >
              {index + 1}
            </text>
            
            {/* Touchpoint title (only for active) */}
            {activeIndex === index && (
              <text
                x={touchpoint.xPosition}
                y={getEmotionY(touchpoint.emotion, touchpoint.intensity) - 24}
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
                fill="#3b82f6"
                className="pointer-events-none"
              >
                {touchpoint.title}
              </text>
            )}
          </g>
        ))}
        
        {/* Journey start and end labels */}
        <text x="40" y="90" fontSize="12" fill="#6b7280" textAnchor="middle" fontWeight="bold">Start</text>
        <text x="760" y="90" fontSize="12" fill="#6b7280" textAnchor="middle" fontWeight="bold">End</text>
      </svg>
      
      {/* Navigation hints */}
      <div className="mt-3 text-center">
        <div className="bg-purple-200 border-2 border-dashed border-purple-400 rounded-lg p-2 inline-block transform -rotate-1" style={{ boxShadow: '2px 2px 0 #9333ea' }}>
          <p className="text-gray-800 font-bold text-xs">
            👆 Click any step to jump to its details below!
          </p>
        </div>
      </div>
    </div>
  );
}