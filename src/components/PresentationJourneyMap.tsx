'use client';

import { useRef, useEffect, useState } from 'react';
import { type TouchpointWithImage } from '@/lib/indexeddb-storage';

interface PresentationJourneyMapProps {
  touchpoints: TouchpointWithImage[];
  activeIndex: number;
  onTouchpointClick: (index: number) => void;
}

export default function PresentationJourneyMap({ touchpoints, activeIndex, onTouchpointClick }: PresentationJourneyMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgWidth, setSvgWidth] = useState(1200);
  const svgHeight = 300;

  useEffect(() => {
    const updateWidth = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setSvgWidth(rect.width || 1200);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Calculate relative positions based on the total journey span and current SVG width
  const getRelativeXPosition = (touchpoint: TouchpointWithImage, index: number) => {
    if (touchpoints.length === 1) return svgWidth / 2; // Center single point
    
    // Map the index to coordinate range (5% to 95% of width to avoid edge clipping)
    const progress = index / (touchpoints.length - 1);
    return (svgWidth * 0.05) + (progress * (svgWidth * 0.9));
  };

  const getEmotionY = (emotion: string, intensity: number = 5) => {
    // Map emotion to base Y position for current viewBox height
    const baseY = {
      'positive': 60 + (5 - Math.min(intensity, 5)) * 12, // 60-120 range
      'negative': 180 + (Math.min(intensity, 5) - 1) * 12, // 180-240 range  
      'neutral': 135 + (intensity - 5) * 6 // 120-150 range
    };
    return baseY[emotion as keyof typeof baseY] || 150;
  };

  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case 'positive': return '#10b981'; // green-500
      case 'negative': return '#ef4444'; // red-500
      default: return '#6b7280'; // gray-500
    }
  };

  const createSmoothPath = (touchpoints: TouchpointWithImage[]): string => {
    // Use relative positioning for all touchpoints
    const sortedPoints = touchpoints
      .map((tp, index) => ({ x: getRelativeXPosition(tp, index), y: getEmotionY(tp.emotion, tp.intensity) }));

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
        ref={svgRef}
        className="w-full h-32 sm:h-40 rounded-lg bg-yellow-50 border-2 border-dashed border-yellow-300"
        style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background grid and gradients */}
        <defs>
          <pattern id="presentGrid" width={Math.max(30, svgWidth / 40)} height="30" patternUnits="userSpaceOnUse">
            <path d={`M ${Math.max(30, svgWidth / 40)} 0 L 0 0 0 30`} fill="none" stroke="#e9d5ff" strokeWidth="2"/>
          </pattern>
          <linearGradient id="presentEmotionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#ef4444', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#presentGrid)" />
        
        {/* Emotion level indicators */}
        <text x="12" y="66" fontSize="36" fill="#10b981" className="text-xs">😍</text>
        <text x="12" y="96" fontSize="36" fill="#10b981" className="text-xs">😊</text>
        <text x="12" y="126" fontSize="36" fill="#10b981" className="text-xs">🙂</text>
        <text x="12" y="156" fontSize="36" fill="#6b7280" className="text-xs">😐</text>
        <text x="12" y="186" fontSize="36" fill="#ef4444" className="text-xs">🙁</text>
        <text x="12" y="216" fontSize="36" fill="#ef4444" className="text-xs">😞</text>
        <text x="12" y="246" fontSize="36" fill="#ef4444" className="text-xs">😡</text>
        
        {/* Main journey path */}
        <path
          d={`M ${svgWidth * 0.05} 150 L ${svgWidth * 0.95} 150`}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="8"
          strokeDasharray="36,18"
          strokeLinecap="round"
        />
        
        {/* Touchpoint connecting line */}
        {touchpoints.length > 1 && (
          <path
            d={createSmoothPath(touchpoints)}
            fill="none"
            stroke="url(#presentEmotionGradient)"
            strokeWidth="12"
            strokeDasharray="24,12"
            strokeLinecap="round"
            opacity="0.9"
          />
        )}
        
        {/* Touchpoints */}
        {touchpoints.map((touchpoint, index) => {
          const xPos = getRelativeXPosition(touchpoint, index);
          const yPos = getEmotionY(touchpoint.emotion, touchpoint.intensity);
          
          return (
            <g key={touchpoint.id}>
              {/* Connection line to main path */}
              <line
                x1={xPos}
                y1={150}
                x2={xPos}
                y2={yPos}
                stroke="#d1d5db"
                strokeWidth="3"
                strokeDasharray="12,12"
              />
              
              {/* Touchpoint circle */}
              <circle
                cx={xPos}
                cy={yPos}
                r={activeIndex === index ? "30" : "20"}
                fill={getEmotionColor(touchpoint.emotion)}
                stroke={activeIndex === index ? "#3b82f6" : "white"}
                strokeWidth={activeIndex === index ? "6" : "4"}
                className="cursor-pointer"
                onClick={() => onTouchpointClick(index)}
                style={{ 
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
                  transition: 'all 0.3s ease'
                }}
              />
              
              {/* Image indicator */}
              {touchpoint.imageData && (
                <circle
                  cx={xPos + 15}
                  cy={yPos - 15}
                  r="8"
                  fill="#fbbf24"
                  stroke="white"
                  strokeWidth="2"
                  className="pointer-events-none"
                  style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
                />
              )}
              {touchpoint.imageData && (
                <text
                  x={xPos + 15}
                  y={yPos - 10}
                  fontSize="10"
                  textAnchor="middle"
                  fill="white"
                  className="pointer-events-none"
                >
                  📷
                </text>
              )}
              
              {/* Step number */}
              <text
                x={xPos}
                y={yPos + 8}
                fontSize="20"
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
                  x={xPos}
                  y={yPos - 45}
                  fontSize="24"
                  fontWeight="bold"
                  textAnchor="middle"
                  fill="#3b82f6"
                  className="pointer-events-none"
                >
                  {touchpoint.title}
                </text>
              )}
            </g>
          );
        })}
        
        {/* Journey start and end labels */}
        <text x={svgWidth * 0.05} y="120" fontSize="24" fill="#6b7280" textAnchor="middle" fontWeight="bold">Start</text>
        <text x={svgWidth * 0.95} y="120" fontSize="24" fill="#6b7280" textAnchor="middle" fontWeight="bold">End</text>
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