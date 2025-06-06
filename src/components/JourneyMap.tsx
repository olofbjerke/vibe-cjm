'use client';

import { useRef, useState } from 'react';
import { type Touchpoint } from '@/lib/storage';

interface JourneyMapProps {
  touchpoints: Touchpoint[];
  onTouchpointClick?: (touchpoint: Touchpoint) => void;
  onAddTouchpoint?: (touchpoint: Touchpoint) => void;
  onUpdateTouchpoint?: (touchpoint: Touchpoint) => void;
}

export default function JourneyMap({ touchpoints, onTouchpointClick, onAddTouchpoint, onUpdateTouchpoint }: JourneyMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{ id: string; offset: { x: number; y: number }; hasMoved: boolean } | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const handleDoubleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || dragging) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 800;
    const y = ((event.clientY - rect.top) / rect.height) * 200;
    
    // Clamp x position between 40 and 760 to keep touchpoints visible
    const clampedX = Math.min(Math.max(x, 40), 760);
    // Clamp y position to valid emotion ranges
    const clampedY = Math.min(Math.max(y, 40), 160);
    
    const { emotion, intensity } = getEmotionFromY(clampedY);

    const newTouchpoint: Touchpoint = {
      id: Date.now().toString(),
      title: 'New Touchpoint',
      description: 'Click to edit this touchpoint',
      emotion,
      intensity,
      xPosition: clampedX,
    };

    onAddTouchpoint?.(newTouchpoint);
  };

  const handleTouchpointClick = (touchpoint: Touchpoint) => {
    if (!dragging || !dragging.hasMoved) {
      onTouchpointClick?.(touchpoint);
    }
  };

  const handleMouseDown = (event: React.MouseEvent, touchpoint: Touchpoint) => {
    event.stopPropagation();
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * 800;
    const mouseY = ((event.clientY - rect.top) / rect.height) * 200;
    
    setDragging({
      id: touchpoint.id,
      offset: {
        x: mouseX - touchpoint.xPosition,
        y: mouseY - getEmotionY(touchpoint.emotion, touchpoint.intensity)
      },
      hasMoved: false
    });
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging || !svgRef.current) return;

    // Throttle updates to improve performance
    const now = Date.now();
    if (now - lastUpdateRef.current < 16) return; // ~60fps
    lastUpdateRef.current = now;

    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * 800;
    const mouseY = ((event.clientY - rect.top) / rect.height) * 200;
    
    const newX = Math.min(Math.max(mouseX - dragging.offset.x, 40), 760);
    const newY = Math.min(Math.max(mouseY - dragging.offset.y, 40), 160);
    
    const touchpoint = touchpoints.find(tp => tp.id === dragging.id);
    if (touchpoint) {
      // Mark as moved if there's significant movement (only check once)
      if (!dragging.hasMoved) {
        const deltaX = Math.abs(newX - touchpoint.xPosition);
        const deltaY = Math.abs(newY - getEmotionY(touchpoint.emotion, touchpoint.intensity));
        if (deltaX > 3 || deltaY > 3) {
          setDragging({ ...dragging, hasMoved: true });
        }
      }
      
      const { emotion, intensity } = getEmotionFromY(newY);
      
      // Only update if position actually changed to reduce re-renders
      if (Math.abs(newX - touchpoint.xPosition) > 1 || 
          Math.abs(newY - getEmotionY(touchpoint.emotion, touchpoint.intensity)) > 1) {
        onUpdateTouchpoint?.({
          ...touchpoint,
          xPosition: newX,
          emotion,
          intensity
        });
      }
    }
  };

  const handleMouseUp = () => {
    if (dragging && !dragging.hasMoved) {
      // Only trigger click behavior if we didn't actually drag
      const touchpoint = touchpoints.find(tp => tp.id === dragging.id);
      if (touchpoint) {
        onTouchpointClick?.(touchpoint);
      }
    }
    setDragging(null);
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

  const getEmotionFromY = (y: number): { emotion: 'positive' | 'neutral' | 'negative'; intensity: number } => {
    // Convert Y position back to emotion and intensity
    if (y <= 80) {
      // Positive range (40-80)
      const intensity = Math.round(5 - (y - 40) / 8);
      return { emotion: 'positive', intensity: Math.max(1, Math.min(5, intensity)) };
    } else if (y >= 120) {
      // Negative range (120-160)
      const intensity = Math.round(1 + (y - 120) / 8);
      return { emotion: 'negative', intensity: Math.max(1, Math.min(5, intensity)) };
    } else {
      // Neutral range (80-100)
      const intensity = Math.round(5 + (y - 90) / 4);
      return { emotion: 'neutral', intensity: Math.max(1, Math.min(10, intensity)) };
    }
  };

  const createSmoothPath = (touchpoints: Touchpoint[]): string => {
    const sortedPoints = touchpoints
      .sort((a, b) => a.xPosition - b.xPosition)
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
    <div className="w-full bg-white border-3 border-dashed border-blue-400 rounded-lg p-8" style={{ boxShadow: '8px 8px 0 #60a5fa' }}>
      <div className="mb-8">
        <div className="bg-blue-200 border-2 border-dashed border-blue-400 rounded-lg p-4 transform rotate-2" style={{ boxShadow: '4px 4px 0 #3b82f6' }}>
          <h2 className="text-2xl font-black text-gray-800 mb-1 flex items-center">
            🎨 Your Journey Canvas
          </h2>
          <p className="text-sm text-gray-700 font-bold">
            Double-click anywhere to plop down a touchpoint! Then drag &apos;em around! 🎯
          </p>
        </div>
      </div>
      
      <svg
        ref={svgRef}
        className={`w-full h-48 sm:h-64 rounded-lg bg-yellow-50 border-2 border-dashed border-yellow-300 ${dragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
        style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}
        viewBox="0 0 800 200"
        preserveAspectRatio="xMidYMid meet"
        onDoubleClick={handleDoubleClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background grid and gradients */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e9d5ff" strokeWidth="0.5"/>
          </pattern>
          <linearGradient id="emotionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#ef4444', stopOpacity: 1 }} />
          </linearGradient>
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
            stroke="url(#emotionGradient)"
            strokeWidth="5"
            strokeDasharray="10,5"
            strokeLinecap="round"
            opacity="0.9"
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
              r={dragging?.id === touchpoint.id ? "14" : "12"}
              fill={getEmotionColor(touchpoint.emotion)}
              stroke="white"
              strokeWidth="3"
              className={`${dragging?.id === touchpoint.id ? 'cursor-grabbing' : 'cursor-grab'}`}
              onClick={() => handleTouchpointClick(touchpoint)}
              onMouseDown={(e) => handleMouseDown(e, touchpoint)}
              style={{ 
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
                transition: dragging?.id === touchpoint.id ? 'none' : 'r 0.2s ease'
              }}
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