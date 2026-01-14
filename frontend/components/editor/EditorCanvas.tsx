'use client';

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import type { 
  EditorRoom, 
  Point, 
  HandlePosition,
  ViewportState,
  GridConfig,
  DragItem,
} from '@/lib/editor/editorTypes';
import { CANVAS_SIZE } from '@/lib/editor/editorTypes';
import { screenToCanvas, snapPointToGrid } from '@/lib/editor/editorUtils';
import { RoomPolygon } from './RoomPolygon';
import { GridOverlay } from './GridOverlay';

// Pan sensitivity - higher = less reactive (requires more mouse movement)
const PAN_SENSITIVITY = 0.4;
// Minimum movement in pixels before pan kicks in
const PAN_THRESHOLD = 3;

interface EditorCanvasProps {
  rooms: EditorRoom[];
  viewport: ViewportState;
  grid: GridConfig;
  selectedRoomId: string | null;
  hoveredRoomId: string | null;
  isDragging: boolean;
  isResizing: boolean;
  activeHandle: HandlePosition | null;
  
  // Callbacks
  onSelectRoom: (roomId: string | null) => void;
  onHoverRoom: (roomId: string | null) => void;
  onMoveRoom: (roomId: string, delta: Point) => void;
  onResizeRoom: (roomId: string, handle: HandlePosition, delta: Point) => void;
  onStartDrag: (point: Point) => void;
  onEndDrag: () => void;
  onStartResize: (handle: HandlePosition, point: Point) => void;
  onEndResize: () => void;
  onPan: (deltaX: number, deltaY: number) => void;
  onZoom: (zoom: number) => void;
  onFitToView?: () => void;
  onDropRoom?: (item: DragItem, position: Point) => void;
}

export function EditorCanvas({
  rooms,
  viewport,
  grid,
  selectedRoomId,
  hoveredRoomId,
  isDragging,
  isResizing,
  activeHandle,
  onSelectRoom,
  onHoverRoom,
  onMoveRoom,
  onResizeRoom,
  onStartDrag,
  onEndDrag,
  onStartResize,
  onEndResize,
  onPan,
  onZoom,
  onFitToView,
  onDropRoom,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [lastMousePos, setLastMousePos] = useState<Point | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panAccumulator, setPanAccumulator] = useState<Point>({ x: 0, y: 0 });
  
  // Get canvas rect for coordinate transformation
  const getCanvasRect = useCallback(() => {
    return svgRef.current?.getBoundingClientRect() || new DOMRect();
  }, []);
  
  // Convert mouse event to canvas coordinates
  const getCanvasPoint = useCallback((e: React.MouseEvent | MouseEvent): Point => {
    const rect = getCanvasRect();
    return screenToCanvas({ x: e.clientX, y: e.clientY }, viewport, rect);
  }, [viewport, getCanvasRect]);
  
  // Handle mouse down on canvas background
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle click or Alt+click for panning
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    } else if (e.button === 0) {
      // Left click - deselect
      onSelectRoom(null);
    }
  }, [onSelectRoom]);
  
  // Handle mouse down on a room
  const handleRoomMouseDown = useCallback((roomId: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    
    e.stopPropagation();
    onSelectRoom(roomId);
    
    const point = getCanvasPoint(e);
    onStartDrag(point);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  }, [onSelectRoom, onStartDrag, getCanvasPoint]);
  
  // Handle resize start
  const handleResizeStart = useCallback((roomId: string, handle: HandlePosition, e: React.MouseEvent) => {
    e.stopPropagation();
    const point = getCanvasPoint(e);
    onStartResize(handle, point);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  }, [onStartResize, getCanvasPoint]);
  
  // Handle mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!lastMousePos) return;
    
    const rawDeltaX = e.clientX - lastMousePos.x;
    const rawDeltaY = e.clientY - lastMousePos.y;
    
    if (isPanning) {
      // Accumulate small movements and apply with reduced sensitivity
      const newAccumX = panAccumulator.x + rawDeltaX;
      const newAccumY = panAccumulator.y + rawDeltaY;
      
      // Only apply pan when accumulated movement exceeds threshold
      if (Math.abs(newAccumX) >= PAN_THRESHOLD || Math.abs(newAccumY) >= PAN_THRESHOLD) {
        // Apply with reduced sensitivity
        const dampedDeltaX = newAccumX * PAN_SENSITIVITY;
        const dampedDeltaY = newAccumY * PAN_SENSITIVITY;
        
        onPan(dampedDeltaX, dampedDeltaY);
        setPanAccumulator({ x: 0, y: 0 });
      } else {
        setPanAccumulator({ x: newAccumX, y: newAccumY });
      }
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (isDragging && selectedRoomId) {
      // Convert screen delta to canvas delta
      const canvasDelta: Point = {
        x: rawDeltaX / viewport.zoom,
        y: rawDeltaY / viewport.zoom,
      };
      
      // Snap to grid
      const snappedDelta = grid.snapEnabled ? {
        x: Math.round(canvasDelta.x / grid.size) * grid.size,
        y: Math.round(canvasDelta.y / grid.size) * grid.size,
      } : canvasDelta;
      
      if (snappedDelta.x !== 0 || snappedDelta.y !== 0) {
        onMoveRoom(selectedRoomId, snappedDelta);
        setLastMousePos({ x: e.clientX, y: e.clientY });
      }
    } else if (isResizing && selectedRoomId && activeHandle) {
      const canvasDelta: Point = {
        x: rawDeltaX / viewport.zoom,
        y: rawDeltaY / viewport.zoom,
      };
      
      onResizeRoom(selectedRoomId, activeHandle, canvasDelta);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [
    lastMousePos, isPanning, isDragging, isResizing, selectedRoomId, 
    activeHandle, viewport.zoom, grid, panAccumulator, onPan, onMoveRoom, onResizeRoom
  ]);
  
  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      setPanAccumulator({ x: 0, y: 0 });
    }
    if (isDragging) {
      onEndDrag();
    }
    if (isResizing) {
      onEndResize();
    }
    setLastMousePos(null);
  }, [isPanning, isDragging, isResizing, onEndDrag, onEndResize]);
  
  // Handle wheel for zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      onZoom(viewport.zoom * delta);
    }
  }, [viewport.zoom, onZoom]);
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't handle if focused on input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        // Delete selected room - handled by parent
        break;
      case 'Escape':
        onSelectRoom(null);
        break;
      case 'ArrowUp':
        if (selectedRoomId) {
          e.preventDefault();
          onMoveRoom(selectedRoomId, { x: 0, y: -grid.size });
        }
        break;
      case 'ArrowDown':
        if (selectedRoomId) {
          e.preventDefault();
          onMoveRoom(selectedRoomId, { x: 0, y: grid.size });
        }
        break;
      case 'ArrowLeft':
        if (selectedRoomId) {
          e.preventDefault();
          onMoveRoom(selectedRoomId, { x: -grid.size, y: 0 });
        }
        break;
      case 'ArrowRight':
        if (selectedRoomId) {
          e.preventDefault();
          onMoveRoom(selectedRoomId, { x: grid.size, y: 0 });
        }
        break;
    }
  }, [selectedRoomId, grid.size, onSelectRoom, onMoveRoom]);
  
  // Attach event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleMouseMove, handleMouseUp, handleKeyDown, handleWheel]);
  
  // Handle drag and drop from palette
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    
    try {
      const item: DragItem = JSON.parse(data);
      const point = getCanvasPoint(e.nativeEvent);
      const snappedPoint = snapPointToGrid(point, grid);
      onDropRoom?.(item, snappedPoint);
    } catch (err) {
      console.error('Failed to parse drop data:', err);
    }
  }, [getCanvasPoint, grid, onDropRoom]);
  
  // Cursor based on state
  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (isDragging) return 'move';
    if (isResizing && activeHandle) {
      const handleCursors: Record<HandlePosition, string> = {
        'top-left': 'nwse-resize',
        'top': 'ns-resize',
        'top-right': 'nesw-resize',
        'right': 'ew-resize',
        'bottom-right': 'nwse-resize',
        'bottom': 'ns-resize',
        'bottom-left': 'nesw-resize',
        'left': 'ew-resize',
      };
      return handleCursors[activeHandle];
    }
    return 'default';
  };
  
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-white rounded-lg border border-drafted-border"
      style={{ cursor: getCursor() }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={handleCanvasMouseDown}
        style={{
          transform: `scale(${viewport.zoom}) translate(${viewport.panX / viewport.zoom}px, ${viewport.panY / viewport.zoom}px)`,
          transformOrigin: 'center center',
        }}
      >
        {/* Background */}
        <rect x="0" y="0" width={CANVAS_SIZE} height={CANVAS_SIZE} fill="#fafafa" />
        
        {/* Grid */}
        <GridOverlay grid={grid} viewport={viewport} canvasSize={CANVAS_SIZE} />
        
        {/* Rooms */}
        <g className="rooms-layer">
          {rooms.map((room) => (
            <g
              key={room.id}
              onMouseDown={(e) => handleRoomMouseDown(room.id, e)}
            >
              <RoomPolygon
                room={room}
                isSelected={room.id === selectedRoomId}
                isHovered={room.id === hoveredRoomId}
                onSelect={() => onSelectRoom(room.id)}
                onHoverStart={() => onHoverRoom(room.id)}
                onHoverEnd={() => onHoverRoom(null)}
                onResizeStart={(handle, e) => handleResizeStart(room.id, handle, e)}
                showLabel={true}
                interactive={!room.isLocked}
              />
            </g>
          ))}
        </g>
      </svg>
      
      {/* Zoom controls */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <div className="px-2 py-1 bg-black/60 text-white text-xs rounded">
          {Math.round(viewport.zoom * 100)}%
        </div>
        {onFitToView && (
          <button
            onClick={onFitToView}
            className="px-2 py-1 bg-drafted-coral text-white text-xs rounded hover:bg-drafted-coral/90 transition-colors flex items-center gap-1"
            title="Fit plan to view"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            Fit
          </button>
        )}
      </div>
    </div>
  );
}

