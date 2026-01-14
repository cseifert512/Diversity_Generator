'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ArrowLeftRight,
  Layers,
  SplitSquareVertical,
  Image as ImageIcon,
  Link2,
} from 'lucide-react';
import { ImageFormatToggle, ImageFormat } from './ImageFormatToggle';
import type { PlanSnapshot } from '@/contexts/DevModeContext';
import type { GeneratedRoom } from '@/lib/drafted-types';

type CompareMode = 'side-by-side' | 'overlay' | 'slider' | 'linked';

interface DevCompareViewProps {
  original: PlanSnapshot;
  edited: PlanSnapshot;
  className?: string;
}

/**
 * Get room type from SVG element by analyzing fill color
 */
function getRoomTypeFromFill(fill: string, rooms: GeneratedRoom[]): string | null {
  if (!fill) return null;
  
  // Normalize color to lowercase
  const normalizedFill = fill.toLowerCase();
  
  // Room color mapping (approximations)
  const colorToTypeHints: Record<string, string[]> = {
    'f4a460': ['primary_bedroom'],
    'ffd700': ['primary_bathroom'],
    'daa520': ['primary_closet'],
    'ff8c00': ['bedroom'],
    'ff69b4': ['bathroom'],
    '87ceeb': ['living', 'family_room'],
    '98fb98': ['kitchen'],
    'dda0dd': ['dining', 'nook'],
    'f0e68c': ['garage'],
    'b0c4de': ['laundry'],
    'd3d3d3': ['storage', 'mudroom'],
    'add8e6': ['office', 'den'],
    'ffa07a': ['outdoor_living'],
    '90ee90': ['pool'],
  };
  
  for (const [colorHex, types] of Object.entries(colorToTypeHints)) {
    if (normalizedFill.includes(colorHex)) {
      for (const room of rooms) {
        if (types.includes(room.room_type)) {
          return room.room_type;
        }
      }
    }
  }
  
  return null;
}

/**
 * Process SVG to add interactive room attributes and hover highlighting
 */
function processSvgForHover(svgString: string, rooms: GeneratedRoom[], panelId: string): string {
  // Use DOMParser for safer SVG manipulation
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  
  const shapes = doc.querySelectorAll('polygon, rect, path, ellipse, circle');
  shapes.forEach((shape, idx) => {
    const fill = shape.getAttribute('fill');
    if (!fill || fill === 'none' || fill === '#ffffff' || fill.toLowerCase() === 'white') {
      return;
    }
    
    // Add interactive class
    shape.classList.add('svg-room-interactive');
    shape.setAttribute('data-panel', panelId);
    
    // Try to identify room type
    const roomType = getRoomTypeFromFill(fill, rooms);
    if (roomType) {
      shape.setAttribute('data-room-type', roomType);
      
      // Find room info for tooltip
      const room = rooms.find(r => r.room_type === roomType);
      if (room) {
        shape.setAttribute('data-room-name', room.display_name || roomType);
        shape.setAttribute('data-room-area', String(Math.round(room.area_sqft)));
      }
    }
  });
  
  return new XMLSerializer().serializeToString(doc);
}

export function DevCompareView({ original, edited, className = '' }: DevCompareViewProps) {
  const [mode, setMode] = useState<CompareMode>('linked');
  const [originalFormat, setOriginalFormat] = useState<ImageFormat>('svg');
  const [editedFormat, setEditedFormat] = useState<ImageFormat>('svg');
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredRoomType, setHoveredRoomType] = useState<string | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<{ x: number; y: number; name: string; area: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const originalPanelRef = useRef<HTMLDivElement>(null);
  const editedPanelRef = useRef<HTMLDivElement>(null);
  
  // Check what formats are available
  const hasOriginalJpeg = !!original.imageBase64;
  const hasOriginalSvg = !!original.svg;
  const hasEditedJpeg = !!edited.imageBase64;
  const hasEditedSvg = !!edited.svg;
  
  // Process SVGs for interactive hover
  const processedOriginalSvg = useMemo(() => {
    if (!original.svg) return '';
    return processSvgForHover(original.svg, original.rooms, 'original');
  }, [original.svg, original.rooms]);
  
  const processedEditedSvg = useMemo(() => {
    if (!edited.svg) return '';
    return processSvgForHover(edited.svg, edited.rooms, 'edited');
  }, [edited.svg, edited.rooms]);
  
  // Set initial format based on availability
  useEffect(() => {
    if (!hasOriginalSvg && hasOriginalJpeg) setOriginalFormat('jpeg');
    if (!hasEditedSvg && hasEditedJpeg) setEditedFormat('jpeg');
  }, [hasOriginalSvg, hasOriginalJpeg, hasEditedSvg, hasEditedJpeg]);
  
  // Handle room hover events
  const handleRoomEnter = useCallback((event: MouseEvent) => {
    const target = event.target as SVGElement;
    const roomType = target.getAttribute('data-room-type');
    const roomName = target.getAttribute('data-room-name');
    const roomArea = target.getAttribute('data-room-area');
    
    if (roomType) {
      setHoveredRoomType(roomType);
      if (roomName && roomArea) {
        setTooltipInfo({
          x: event.clientX,
          y: event.clientY - 60,
          name: roomName,
          area: parseInt(roomArea),
        });
      }
    }
  }, []);
  
  const handleRoomLeave = useCallback(() => {
    setHoveredRoomType(null);
    setTooltipInfo(null);
  }, []);
  
  // Apply highlighting based on hovered room type
  useEffect(() => {
    const panels = [originalPanelRef.current, editedPanelRef.current];
    
    panels.forEach(panel => {
      if (!panel) return;
      
      // Remove existing highlights
      panel.querySelectorAll('.svg-room-highlighted').forEach(el => {
        el.classList.remove('svg-room-highlighted');
      });
      
      // Add highlights for hovered room type
      if (hoveredRoomType) {
        panel.querySelectorAll(`[data-room-type="${hoveredRoomType}"]`).forEach(el => {
          el.classList.add('svg-room-highlighted');
        });
      }
    });
  }, [hoveredRoomType]);
  
  // Attach hover event listeners
  useEffect(() => {
    const panels = [originalPanelRef.current, editedPanelRef.current];
    const cleanups: Array<() => void> = [];
    
    panels.forEach(panel => {
      if (!panel) return;
      
      const rooms = panel.querySelectorAll('[data-room-type]');
      rooms.forEach(room => {
        room.addEventListener('mouseenter', handleRoomEnter as EventListener);
        room.addEventListener('mouseleave', handleRoomLeave);
        cleanups.push(() => {
          room.removeEventListener('mouseenter', handleRoomEnter as EventListener);
          room.removeEventListener('mouseleave', handleRoomLeave);
        });
      });
    });
    
    return () => cleanups.forEach(fn => fn());
  }, [processedOriginalSvg, processedEditedSvg, handleRoomEnter, handleRoomLeave, mode]);
  
  // Zoom/pan handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.min(Math.max(0.5, prev + delta), 4));
  }, []);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && zoom > 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan, zoom]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  }, [isPanning, panStart]);
  
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);
  
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);
  
  // Render content based on format
  const renderPlanContent = (
    snapshot: PlanSnapshot,
    format: ImageFormat,
    side: 'original' | 'edited',
    processedSvg?: string
  ) => {
    if (format === 'svg' && processedSvg) {
      return (
        <div
          className="w-full h-full flex items-center justify-center p-4"
          dangerouslySetInnerHTML={{
            __html: processedSvg.replace(
              /<svg([^>]*)>/,
              '<svg$1 style="max-width: 100%; max-height: 100%; width: auto; height: auto;">'
            ),
          }}
        />
      );
    }
    
    if (format === 'jpeg' && snapshot.imageBase64) {
      return (
        <div className="w-full h-full flex items-center justify-center p-4">
          <img
            src={`data:image/jpeg;base64,${snapshot.imageBase64}`}
            alt={`${side} floor plan`}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    }
    
    return (
      <div className="w-full h-full flex items-center justify-center text-drafted-muted">
        No {format.toUpperCase()} available
      </div>
    );
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-drafted-bg rounded-lg p-1">
          <button
            onClick={() => setMode('linked')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              mode === 'linked'
                ? 'bg-white shadow-sm text-drafted-black'
                : 'text-drafted-gray hover:text-drafted-black'
            }`}
            title="Linked hover - highlight matching rooms"
          >
            <Link2 className="w-4 h-4" />
            <span>Linked</span>
          </button>
          <button
            onClick={() => setMode('side-by-side')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              mode === 'side-by-side'
                ? 'bg-white shadow-sm text-drafted-black'
                : 'text-drafted-gray hover:text-drafted-black'
            }`}
          >
            <SplitSquareVertical className="w-4 h-4" />
            <span>Split</span>
          </button>
          <button
            onClick={() => setMode('overlay')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              mode === 'overlay'
                ? 'bg-white shadow-sm text-drafted-black'
                : 'text-drafted-gray hover:text-drafted-black'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Overlay</span>
          </button>
          <button
            onClick={() => setMode('slider')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              mode === 'slider'
                ? 'bg-white shadow-sm text-drafted-black'
                : 'text-drafted-gray hover:text-drafted-black'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Slider</span>
          </button>
        </div>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-drafted-gray">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(prev => Math.min(prev + 0.25, 4))}
            className="p-1.5 hover:bg-drafted-bg rounded transition-colors"
          >
            <ZoomIn className="w-4 h-4 text-drafted-gray" />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
            className="p-1.5 hover:bg-drafted-bg rounded transition-colors"
          >
            <ZoomOut className="w-4 h-4 text-drafted-gray" />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 hover:bg-drafted-bg rounded transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-drafted-gray" />
          </button>
        </div>
      </div>
      
      {/* Format Toggles & Mode-specific controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-drafted-gray">Original:</span>
          <ImageFormatToggle
            format={originalFormat}
            onChange={setOriginalFormat}
            hasJpeg={hasOriginalJpeg}
            hasSvg={hasOriginalSvg}
            size="sm"
          />
        </div>
        
        {mode === 'overlay' && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-drafted-gray">Opacity:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
              className="w-24 accent-coral-500"
            />
            <span className="text-xs text-drafted-muted w-8">{Math.round(overlayOpacity * 100)}%</span>
          </div>
        )}
        
        {mode === 'slider' && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-drafted-gray">Slide:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(parseInt(e.target.value))}
              className="w-32 accent-coral-500"
            />
          </div>
        )}
        
        {mode === 'linked' && (
          <div className="text-xs text-drafted-muted italic">
            Hover over a room to highlight matching rooms
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-drafted-gray">Edited:</span>
          <ImageFormatToggle
            format={editedFormat}
            onChange={setEditedFormat}
            hasJpeg={hasEditedJpeg}
            hasSvg={hasEditedSvg}
            size="sm"
          />
        </div>
      </div>
      
      {/* Comparison View */}
      <div
        ref={containerRef}
        className="bg-drafted-bg rounded-lg border border-drafted-border overflow-hidden relative"
        style={{ height: '400px', cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {(mode === 'side-by-side' || mode === 'linked') && (
          <div className="grid grid-cols-2 h-full divide-x divide-drafted-border">
            {/* Original */}
            <div ref={originalPanelRef} className="relative bg-white overflow-hidden">
              <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-drafted-bg/90 backdrop-blur rounded text-xs font-medium text-drafted-gray">
                Original • Seed: {original.seed}
              </div>
              <div
                className="w-full h-full"
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transformOrigin: 'center center',
                }}
              >
                {renderPlanContent(original, originalFormat, 'original', processedOriginalSvg)}
              </div>
            </div>
            
            {/* Edited */}
            <div ref={editedPanelRef} className="relative bg-white overflow-hidden">
              <div className="absolute top-2 right-2 z-10 px-2 py-1 bg-coral-500/90 backdrop-blur rounded text-xs font-medium text-white">
                Edited • Seed: {edited.seed}
              </div>
              <div
                className="w-full h-full"
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transformOrigin: 'center center',
                }}
              >
                {renderPlanContent(edited, editedFormat, 'edited', processedEditedSvg)}
              </div>
            </div>
          </div>
        )}
        
        {mode === 'overlay' && (
          <div className="relative w-full h-full bg-white">
            <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
              <span className="px-2 py-1 bg-drafted-bg/90 backdrop-blur rounded text-xs font-medium text-drafted-gray">
                Original (base)
              </span>
              <span className="px-2 py-1 bg-coral-500/90 backdrop-blur rounded text-xs font-medium text-white">
                Edited ({Math.round(overlayOpacity * 100)}%)
              </span>
            </div>
            
            {/* Base layer (original) */}
            <div
              ref={originalPanelRef}
              className="absolute inset-0"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: 'center center',
              }}
            >
              {renderPlanContent(original, originalFormat, 'original', processedOriginalSvg)}
            </div>
            
            {/* Overlay layer (edited) */}
            <div
              ref={editedPanelRef}
              className="absolute inset-0"
              style={{
                opacity: overlayOpacity,
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: 'center center',
              }}
            >
              {renderPlanContent(edited, editedFormat, 'edited', processedEditedSvg)}
            </div>
          </div>
        )}
        
        {mode === 'slider' && (
          <div className="relative w-full h-full bg-white overflow-hidden">
            {/* Edited (full width) */}
            <div
              ref={editedPanelRef}
              className="absolute inset-0"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: 'center center',
              }}
            >
              {renderPlanContent(edited, editedFormat, 'edited', processedEditedSvg)}
            </div>
            
            {/* Original (clipped) */}
            <div
              ref={originalPanelRef}
              className="absolute inset-0"
              style={{
                clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: 'center center',
              }}
            >
              {renderPlanContent(original, originalFormat, 'original', processedOriginalSvg)}
            </div>
            
            {/* Slider handle */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-coral-500 z-20"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-coral-500 rounded-full flex items-center justify-center shadow-lg">
                <ArrowLeftRight className="w-4 h-4 text-white" />
              </div>
            </div>
            
            {/* Labels */}
            <div className="absolute top-2 left-2 px-2 py-1 bg-drafted-bg/90 backdrop-blur rounded text-xs font-medium text-drafted-gray z-10">
              Original
            </div>
            <div className="absolute top-2 right-2 px-2 py-1 bg-coral-500/90 backdrop-blur rounded text-xs font-medium text-white z-10">
              Edited
            </div>
          </div>
        )}
        
        {/* Room Tooltip */}
        <AnimatePresence>
          {tooltipInfo && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="room-tooltip"
              style={{
                position: 'fixed',
                left: tooltipInfo.x,
                top: tooltipInfo.y,
                transform: 'translateX(-50%)',
                zIndex: 1000,
              }}
            >
              <div className="font-medium capitalize">{tooltipInfo.name.replace(/_/g, ' ')}</div>
              <div className="text-drafted-muted">{tooltipInfo.area.toLocaleString()} sqft</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* JPEG Preview Panel (always visible when available) */}
      {(hasOriginalJpeg || hasEditedJpeg) && (
        <div className="border-t border-drafted-border pt-4">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-4 h-4 text-drafted-gray" />
            <span className="text-sm font-medium text-drafted-black">JPEG Previews</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {hasOriginalJpeg && (
              <div className="bg-white rounded-lg border border-drafted-border p-2">
                <div className="text-xs text-drafted-gray mb-2">Original JPEG</div>
                <img
                  src={`data:image/jpeg;base64,${original.imageBase64}`}
                  alt="Original JPEG"
                  className="w-full h-32 object-contain"
                />
              </div>
            )}
            {hasEditedJpeg && (
              <div className="bg-white rounded-lg border border-coral-200 p-2">
                <div className="text-xs text-coral-600 mb-2">Edited JPEG</div>
                <img
                  src={`data:image/jpeg;base64,${edited.imageBase64}`}
                  alt="Edited JPEG"
                  className="w-full h-32 object-contain"
                />
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Plan Info */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="p-3 bg-drafted-bg rounded-lg">
          <div className="font-medium text-drafted-black mb-1">Original</div>
          <div className="space-y-0.5 text-drafted-gray">
            <div>Seed: <span className="font-mono">{original.seed}</span></div>
            <div>Rooms: {original.rooms.length}</div>
            <div>Area: {Math.round(original.rooms.reduce((s, r) => s + r.area_sqft, 0)).toLocaleString()} sqft</div>
          </div>
        </div>
        <div className="p-3 bg-coral-50 border border-coral-100 rounded-lg">
          <div className="font-medium text-coral-700 mb-1">Edited</div>
          <div className="space-y-0.5 text-coral-600">
            <div>Seed: <span className="font-mono">{edited.seed}</span></div>
            <div>Rooms: {edited.rooms.length}</div>
            <div>Area: {Math.round(edited.rooms.reduce((s, r) => s + r.area_sqft, 0)).toLocaleString()} sqft</div>
          </div>
        </div>
      </div>
    </div>
  );
}
