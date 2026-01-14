'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Eye, EyeOff, Palette, ChevronDown } from 'lucide-react';
import type { GeneratedRoom } from '@/lib/drafted-types';

interface GenerationData {
  id: string;
  label: string;
  svg?: string;
  rooms: GeneratedRoom[];
  color: string;
}

interface RoomOverlayViewProps {
  /** Array of generations to overlay */
  generations: GenerationData[];
  /** Height of the visualization */
  height?: number;
  /** Class name */
  className?: string;
}

// Distinct colors for overlay
const OVERLAY_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

/**
 * Extract room polygons from SVG string
 */
function extractRoomPolygons(svg: string): Array<{
  roomType: string;
  fill: string;
  points: string;
  d?: string;
}> {
  const rooms: Array<{
    roomType: string;
    fill: string;
    points: string;
    d?: string;
  }> = [];
  
  // Parse SVG
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  
  // Get viewBox for coordinate normalization
  const svgEl = doc.querySelector('svg');
  const viewBox = svgEl?.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 512, 512];
  
  // Find all shapes
  const polygons = doc.querySelectorAll('polygon');
  const paths = doc.querySelectorAll('path');
  const rects = doc.querySelectorAll('rect');
  
  polygons.forEach((poly) => {
    const fill = poly.getAttribute('fill');
    const points = poly.getAttribute('points');
    if (fill && fill !== 'none' && fill !== '#ffffff' && fill.toLowerCase() !== 'white' && points) {
      rooms.push({
        roomType: 'room',
        fill,
        points,
      });
    }
  });
  
  paths.forEach((path) => {
    const fill = path.getAttribute('fill');
    const d = path.getAttribute('d');
    if (fill && fill !== 'none' && fill !== '#ffffff' && fill.toLowerCase() !== 'white' && d) {
      rooms.push({
        roomType: 'room',
        fill,
        points: '',
        d,
      });
    }
  });
  
  rects.forEach((rect) => {
    const fill = rect.getAttribute('fill');
    const x = parseFloat(rect.getAttribute('x') || '0');
    const y = parseFloat(rect.getAttribute('y') || '0');
    const width = parseFloat(rect.getAttribute('width') || '0');
    const height = parseFloat(rect.getAttribute('height') || '0');
    
    if (fill && fill !== 'none' && fill !== '#ffffff' && fill.toLowerCase() !== 'white') {
      // Convert rect to polygon points
      const points = `${x},${y} ${x + width},${y} ${x + width},${y + height} ${x},${y + height}`;
      rooms.push({
        roomType: 'room',
        fill,
        points,
      });
    }
  });
  
  return rooms;
}

/**
 * Get SVG viewBox dimensions
 */
function getSvgViewBox(svg: string): [number, number, number, number] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  const viewBox = svgEl?.getAttribute('viewBox')?.split(' ').map(Number);
  return viewBox && viewBox.length === 4 
    ? viewBox as [number, number, number, number]
    : [0, 0, 512, 512];
}

export function RoomOverlayView({
  generations,
  height = 400,
  className = '',
}: RoomOverlayViewProps) {
  const [visibleGenerations, setVisibleGenerations] = useState<Set<string>>(
    new Set(generations.map(g => g.id))
  );
  const [opacity, setOpacity] = useState(0.4);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [showFill, setShowFill] = useState(false);
  
  // Assign colors to generations
  const generationsWithColors = useMemo(() => {
    return generations.map((gen, i) => ({
      ...gen,
      color: gen.color || OVERLAY_COLORS[i % OVERLAY_COLORS.length],
    }));
  }, [generations]);
  
  // Extract room polygons from each generation
  const extractedData = useMemo(() => {
    return generationsWithColors.map(gen => {
      if (!gen.svg) return { ...gen, polygons: [] };
      return {
        ...gen,
        polygons: extractRoomPolygons(gen.svg),
        viewBox: getSvgViewBox(gen.svg),
      };
    });
  }, [generationsWithColors]);
  
  // Get unified viewBox (use first available)
  const viewBox = useMemo(() => {
    const firstWithSvg = extractedData.find(d => 'viewBox' in d && d.viewBox);
    if (firstWithSvg && 'viewBox' in firstWithSvg) {
      return firstWithSvg.viewBox;
    }
    return [0, 0, 512, 512];
  }, [extractedData]);
  
  // Toggle generation visibility
  const toggleGeneration = useCallback((id: string) => {
    setVisibleGenerations(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  
  // Toggle all
  const toggleAll = useCallback(() => {
    if (visibleGenerations.size === generations.length) {
      setVisibleGenerations(new Set());
    } else {
      setVisibleGenerations(new Set(generations.map(g => g.id)));
    }
  }, [generations, visibleGenerations.size]);
  
  if (generations.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-drafted-bg rounded-lg border border-drafted-border p-8 ${className}`}>
        <div className="text-center text-drafted-muted">
          <Layers className="w-8 h-8 mx-auto mb-2" />
          <p>No generations to overlay</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-drafted-black">Room Boundary Overlay</h4>
        <span className="text-xs text-drafted-muted">
          {visibleGenerations.size} of {generations.length} visible
        </span>
      </div>
      
      {/* Generation Toggles */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={toggleAll}
          className="px-2 py-1 text-xs bg-drafted-bg text-drafted-gray hover:bg-drafted-border rounded transition-colors"
        >
          {visibleGenerations.size === generations.length ? 'Hide All' : 'Show All'}
        </button>
        
        {generationsWithColors.map((gen) => (
          <button
            key={gen.id}
            onClick={() => toggleGeneration(gen.id)}
            className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-all ${
              visibleGenerations.has(gen.id)
                ? 'bg-drafted-black text-white'
                : 'bg-drafted-bg text-drafted-gray hover:bg-drafted-border'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: gen.color }}
            />
            {gen.label}
          </button>
        ))}
      </div>
      
      {/* Controls */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-drafted-gray">Opacity:</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-20 accent-coral-500"
          />
          <span className="text-drafted-muted w-6">{Math.round(opacity * 100)}%</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-drafted-gray">Stroke:</span>
          <input
            type="range"
            min="1"
            max="5"
            step="0.5"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseFloat(e.target.value))}
            className="w-16 accent-coral-500"
          />
          <span className="text-drafted-muted w-4">{strokeWidth}</span>
        </div>
        
        <button
          onClick={() => setShowFill(!showFill)}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            showFill
              ? 'bg-coral-500 text-white'
              : 'bg-drafted-bg text-drafted-gray hover:text-drafted-black'
          }`}
        >
          <Palette className="w-3 h-3" />
          Fill
        </button>
      </div>
      
      {/* SVG Overlay Canvas */}
      <div 
        className="relative bg-white rounded-lg border border-drafted-border overflow-hidden"
        style={{ height }}
      >
        <svg
          viewBox={viewBox.join(' ')}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="#f0f0f0"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Room overlays */}
          <AnimatePresence>
            {extractedData.map((gen) => {
              if (!visibleGenerations.has(gen.id)) return null;
              
              return (
                <g key={gen.id} opacity={opacity}>
                  {gen.polygons.map((poly, i) => {
                    if (poly.d) {
                      // Path element
                      return (
                        <motion.path
                          key={`${gen.id}-path-${i}`}
                          d={poly.d}
                          fill={showFill ? gen.color : 'none'}
                          fillOpacity={showFill ? 0.2 : 0}
                          stroke={gen.color}
                          strokeWidth={strokeWidth}
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5, delay: i * 0.02 }}
                        />
                      );
                    }
                    
                    // Polygon element
                    return (
                      <motion.polygon
                        key={`${gen.id}-poly-${i}`}
                        points={poly.points}
                        fill={showFill ? gen.color : 'none'}
                        fillOpacity={showFill ? 0.2 : 0}
                        stroke={gen.color}
                        strokeWidth={strokeWidth}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.02 }}
                      />
                    );
                  })}
                </g>
              );
            })}
          </AnimatePresence>
        </svg>
        
        {/* Legend */}
        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur rounded px-2 py-1 text-xs">
          <div className="flex items-center gap-2">
            {generationsWithColors
              .filter(g => visibleGenerations.has(g.id))
              .slice(0, 4)
              .map(gen => (
                <div key={gen.id} className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: gen.color }}
                  />
                  <span className="text-drafted-gray">{gen.label}</span>
                </div>
              ))}
            {visibleGenerations.size > 4 && (
              <span className="text-drafted-muted">+{visibleGenerations.size - 4}</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Info */}
      <p className="text-xs text-drafted-muted">
        Room boundaries from multiple generations overlaid to visualize position variance.
        Consistent layouts will show overlapping outlines.
      </p>
    </div>
  );
}

