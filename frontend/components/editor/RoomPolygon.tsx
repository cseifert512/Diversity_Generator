'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { EditorRoom, HandlePosition, ResizeHandle } from '@/lib/editor/editorTypes';
import { HANDLE_SIZE } from '@/lib/editor/editorTypes';
import { getResizeHandles, calculateCentroid } from '@/lib/editor/editorUtils';

// Constants for text sizing
const MIN_FONT_SIZE = 6;
const MAX_FONT_SIZE = 18;
const FONT_SIZE_FACTOR = 0.15; // Font size as fraction of smallest dimension
const PADDING_FACTOR = 0.85; // Use 85% of available width for text

/**
 * Calculate optimal font size for text to fit within a room
 */
function calculateFittedFontSize(
  text: string,
  roomWidth: number,
  roomHeight: number
): number {
  // Base font size on smallest dimension
  const smallestDim = Math.min(roomWidth, roomHeight);
  let fontSize = smallestDim * FONT_SIZE_FACTOR;
  
  // Estimate text width (rough approximation: each char is ~0.6 of font size)
  const charWidthRatio = 0.6;
  const estimatedTextWidth = text.length * fontSize * charWidthRatio;
  const availableWidth = roomWidth * PADDING_FACTOR;
  
  // If text is too wide, reduce font size to fit
  if (estimatedTextWidth > availableWidth) {
    fontSize = availableWidth / (text.length * charWidthRatio);
  }
  
  // Clamp to min/max bounds
  return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, fontSize));
}

interface RoomPolygonProps {
  room: EditorRoom;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onResizeStart?: (handle: HandlePosition, e: React.MouseEvent) => void;
  showLabel?: boolean;
  interactive?: boolean;
}

export function RoomPolygon({
  room,
  isSelected,
  isHovered,
  onSelect,
  onHoverStart,
  onHoverEnd,
  onResizeStart,
  showLabel = true,
  interactive = true,
}: RoomPolygonProps) {
  const pointsString = useMemo(() => {
    return room.points.map(p => `${p.x},${p.y}`).join(' ');
  }, [room.points]);
  
  const centroid = useMemo(() => {
    return calculateCentroid(room.points);
  }, [room.points]);
  
  const handles = useMemo(() => {
    if (!isSelected) return [];
    return getResizeHandles(room.bounds);
  }, [isSelected, room.bounds]);
  
  // Calculate dynamic font size based on room dimensions
  const labelFontSize = useMemo(() => {
    return calculateFittedFontSize(
      room.displayName,
      room.bounds.width,
      room.bounds.height
    );
  }, [room.displayName, room.bounds.width, room.bounds.height]);
  
  // Calculate smaller font size for area label
  const areaFontSize = useMemo(() => {
    return Math.max(MIN_FONT_SIZE - 1, labelFontSize * 0.75);
  }, [labelFontSize]);
  
  // Determine stroke based on state
  const getStroke = () => {
    if (isSelected) return '#0ea5e9'; // sky-500
    if (isHovered) return '#64748b'; // slate-500
    return '#374151'; // gray-700
  };
  
  const getStrokeWidth = () => {
    if (isSelected) return 2.5;
    if (isHovered) return 2;
    return 1.5;
  };
  
  return (
    <g className="room-polygon">
      {/* Room Shape */}
      <motion.polygon
        points={pointsString}
        fill={room.fillColor}
        stroke={getStroke()}
        strokeWidth={getStrokeWidth()}
        style={{ cursor: interactive ? 'move' : 'default' }}
        onClick={(e) => {
          e.stopPropagation();
          if (interactive) onSelect();
        }}
        onMouseEnter={interactive ? onHoverStart : undefined}
        onMouseLeave={interactive ? onHoverEnd : undefined}
        initial={false}
        animate={{
          opacity: room.isLocked ? 0.6 : 1,
        }}
      />
      
      {/* Room Label */}
      {showLabel && (
        <text
          x={centroid.x}
          y={centroid.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="pointer-events-none select-none"
          fill="#1f2937"
          fontSize={labelFontSize}
          fontWeight={500}
        >
          {room.displayName}
        </text>
      )}
      
      {/* Area Label (below room name) */}
      {showLabel && isSelected && (
        <text
          x={centroid.x}
          y={centroid.y + labelFontSize + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="pointer-events-none select-none"
          fill="#6b7280"
          fontSize={areaFontSize}
        >
          {Math.round(room.areaSqft)} sqft
        </text>
      )}
      
      {/* Selection Highlight */}
      {isSelected && (
        <polygon
          points={pointsString}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth={1}
          strokeDasharray="4 2"
          className="pointer-events-none"
          style={{ opacity: 0.5 }}
        />
      )}
      
      {/* Resize Handles */}
      {isSelected && interactive && handles.map((handle) => (
        <ResizeHandleComponent
          key={handle.position}
          handle={handle}
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart?.(handle.position, e);
          }}
        />
      ))}
    </g>
  );
}

// Resize Handle Component
interface ResizeHandleComponentProps {
  handle: ResizeHandle;
  onMouseDown: (e: React.MouseEvent) => void;
}

function ResizeHandleComponent({ handle, onMouseDown }: ResizeHandleComponentProps) {
  const halfSize = HANDLE_SIZE / 2;
  
  return (
    <rect
      x={handle.x - halfSize}
      y={handle.y - halfSize}
      width={HANDLE_SIZE}
      height={HANDLE_SIZE}
      fill="white"
      stroke="#0ea5e9"
      strokeWidth={1.5}
      style={{ cursor: handle.cursor }}
      onMouseDown={onMouseDown}
      rx={1}
    />
  );
}

// Simple non-interactive room display
interface SimpleRoomProps {
  room: EditorRoom;
  showLabel?: boolean;
}

export function SimpleRoom({ room, showLabel = true }: SimpleRoomProps) {
  const pointsString = room.points.map(p => `${p.x},${p.y}`).join(' ');
  const centroid = calculateCentroid(room.points);
  const fontSize = calculateFittedFontSize(
    room.displayName,
    room.bounds.width,
    room.bounds.height
  );
  
  return (
    <g className="simple-room">
      <polygon
        points={pointsString}
        fill={room.fillColor}
        stroke="#374151"
        strokeWidth={1.5}
      />
      {showLabel && (
        <text
          x={centroid.x}
          y={centroid.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#1f2937"
          fontSize={fontSize}
          fontWeight={500}
        >
          {room.displayName}
        </text>
      )}
    </g>
  );
}

