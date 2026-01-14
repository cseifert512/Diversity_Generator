'use client';

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize,
  Shrink,
  Grid3X3,
  Magnet,
  Undo,
  Redo,
  Download,
  Save,
  Trash2,
} from 'lucide-react';
import { useFloorPlanEditor } from '@/hooks/useFloorPlanEditor';
import { ModeToggle } from './ModeToggle';
import { EditorCanvas } from './EditorCanvas';
import { RoomPalette } from './RoomPalette';
import { RoomPropertiesPanel } from './RoomPropertiesPanel';
import { RegeneratePanel } from './RegeneratePanel';
import { CompareView } from './CompareView';
import type { DraftedPlan, RoomTypeDefinition } from '@/lib/drafted-types';
import type { EditorRoom, DragItem, Point } from '@/lib/editor/editorTypes';
import { createRoom, roomsToSvg } from '@/lib/editor/editorUtils';

interface FloorPlanEditorProps {
  initialPlan?: DraftedPlan;
  roomTypes: RoomTypeDefinition[];
  onSave?: (svg: string, rooms: EditorRoom[]) => void;
  onRegenerate?: (prompt: string, seed: number) => Promise<DraftedPlan>;
}

export function FloorPlanEditor({
  initialPlan,
  roomTypes,
  onSave,
  onRegenerate,
}: FloorPlanEditorProps) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  const roomTypesMap = useMemo(() => {
    return new Map(roomTypes.map(rt => [rt.key, rt]));
  }, [roomTypes]);
  
  const editor = useFloorPlanEditor({
    initialPlan,
    roomTypes: roomTypesMap,
  });
  
  // Fit to view handler that gets container dimensions
  const handleFitToView = useCallback(() => {
    const container = canvasContainerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      editor.fitToView(rect.width - 32, rect.height - 32); // Account for padding
    } else {
      editor.fitToView();
    }
  }, [editor]);
  
  // Load initial plan when it changes or when roomTypes become available
  // Room types MUST be loaded first because display names come from color mapping
  useEffect(() => {
    if (initialPlan && roomTypes.length > 0) {
      console.log('[FloorPlanEditor] Loading plan with', roomTypes.length, 'room types available');
      editor.loadPlan(initialPlan);
    }
  }, [initialPlan, roomTypes.length, editor.loadPlan]);
  
  // Handle drop from palette
  const handleDropRoom = useCallback((item: DragItem, position: Point) => {
    if (item.type !== 'palette-room' || !item.roomType) return;
    
    const roomDef = roomTypesMap.get(item.roomType);
    if (!roomDef) {
      // Generic room
      const genericRoom: EditorRoom = {
        id: `room-${Date.now()}`,
        roomType: 'generic',
        displayName: 'New Room',
        points: [
          position,
          { x: position.x + 100, y: position.y },
          { x: position.x + 100, y: position.y + 100 },
          { x: position.x, y: position.y + 100 },
        ],
        bounds: { x: position.x, y: position.y, width: 100, height: 100 },
        fillColor: '#e5e7eb',
        trainingColor: '#e5e7eb',
        areaSqft: 100,
        widthInches: 120,
        heightInches: 120,
        estimatedSize: 'M',
        isSelected: false,
        isHovered: false,
        isLocked: false,
      };
      editor.addRoom(genericRoom);
      editor.selectRoom(genericRoom.id);
      return;
    }
    
    const newRoom = createRoom(
      item.roomType,
      position,
      item.defaultSize || 'M',
      roomDef,
      editor.grid
    );
    
    editor.addRoom(newRoom);
    editor.selectRoom(newRoom.id);
  }, [editor, roomTypesMap]);
  
  // Handle regeneration
  const handleRegenerate = useCallback(async (prompt: string, seed: number) => {
    if (!onRegenerate) return;
    
    editor.setLoading(true);
    editor.setError(null);
    
    try {
      const result = await onRegenerate(prompt, seed);
      editor.setRegeneratedPlan(result);
    } catch (err) {
      editor.setError(err instanceof Error ? err.message : 'Regeneration failed');
    } finally {
      editor.setLoading(false);
    }
  }, [editor, onRegenerate]);
  
  // Handle save
  const handleSave = useCallback(() => {
    const svg = roomsToSvg(editor.rooms);
    onSave?.(svg, editor.rooms);
  }, [editor.rooms, onSave]);
  
  // Handle export SVG
  const handleExportSvg = useCallback(() => {
    const svg = roomsToSvg(editor.rooms);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'floor-plan.svg';
    a.click();
    URL.revokeObjectURL(url);
  }, [editor.rooms]);
  
  // Keyboard shortcuts for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editor.selectedRoomId && 
            !(e.target instanceof HTMLInputElement) && 
            !(e.target instanceof HTMLTextAreaElement)) {
          editor.deleteSelectedRoom();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor]);
  
  return (
    <div className="h-full flex flex-col bg-drafted-bg">
      {/* Toolbar */}
      <div className="bg-white border-b border-drafted-border px-4 py-2 flex items-center justify-between">
        {/* Left: Mode Toggle */}
        <ModeToggle
          mode={editor.mode}
          onModeChange={editor.setMode}
          disabled={editor.isLoading}
        />
        
        {/* Center: View Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={editor.zoomOut}
            className="p-2 hover:bg-drafted-bg rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="w-14 text-center text-sm text-drafted-gray">
            {Math.round(editor.viewport.zoom * 100)}%
          </span>
          <button
            onClick={editor.zoomIn}
            className="p-2 hover:bg-drafted-bg rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={editor.resetZoom}
            className="p-2 hover:bg-drafted-bg rounded-lg transition-colors"
            title="Reset View"
          >
            <Maximize className="w-4 h-4" />
          </button>
          <button
            onClick={handleFitToView}
            className="p-2 hover:bg-drafted-bg rounded-lg transition-colors"
            title="Fit Plan to View"
          >
            <Shrink className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-drafted-border mx-2" />
          
          <button
            onClick={editor.toggleGridVisibility}
            className={`p-2 rounded-lg transition-colors ${
              editor.grid.visible ? 'bg-drafted-bg text-coral-500' : 'hover:bg-drafted-bg'
            }`}
            title="Toggle Grid"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={editor.toggleGridSnap}
            className={`p-2 rounded-lg transition-colors ${
              editor.grid.snapEnabled ? 'bg-drafted-bg text-coral-500' : 'hover:bg-drafted-bg'
            }`}
            title="Toggle Snap"
          >
            <Magnet className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-drafted-border mx-2" />
          
          <button
            onClick={editor.undo}
            disabled={!editor.canUndo}
            className="p-2 hover:bg-drafted-bg rounded-lg transition-colors disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={editor.redo}
            disabled={!editor.canRedo}
            className="p-2 hover:bg-drafted-bg rounded-lg transition-colors disabled:opacity-30"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {editor.selectedRoomId && (
            <button
              onClick={editor.deleteSelectedRoom}
              className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
              title="Delete Selected Room"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={handleExportSvg}
            className="flex items-center gap-2 px-3 py-2 hover:bg-drafted-bg rounded-lg transition-colors text-sm"
            title="Export SVG"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          
          {onSave && (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Room Palette */}
        <RoomPalette
          roomTypes={roomTypes}
          isOpen={editor.isPaletteOpen}
          onToggle={() => editor.togglePalette()}
        />
        
        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Hybrid Mode: Regenerate Panel */}
          {editor.mode === 'hybrid' && (
            <div className="p-3 bg-white border-b border-drafted-border">
              <RegeneratePanel
                currentPrompt={editor.currentPrompt}
                originalPrompt={editor.originalPrompt}
                originalSeed={editor.originalSeed}
                isLoading={editor.isLoading}
                onRegenerate={handleRegenerate}
                disabled={!onRegenerate}
              />
            </div>
          )}
          
          {/* Canvas */}
          <div ref={canvasContainerRef} className="flex-1 p-4">
            <EditorCanvas
              rooms={editor.rooms}
              viewport={editor.viewport}
              grid={editor.grid}
              selectedRoomId={editor.selectedRoomId}
              hoveredRoomId={editor.hoveredRoomId}
              isDragging={editor.isDragging}
              isResizing={editor.isResizing}
              activeHandle={editor.activeHandle}
              onSelectRoom={editor.selectRoom}
              onHoverRoom={editor.hoverRoom}
              onMoveRoom={editor.moveRoom}
              onResizeRoom={editor.resizeRoom}
              onStartDrag={editor.startDrag}
              onEndDrag={editor.endDrag}
              onStartResize={editor.startResize}
              onEndResize={editor.endResize}
              onPan={editor.pan}
              onZoom={editor.setZoom}
              onFitToView={handleFitToView}
              onDropRoom={handleDropRoom}
            />
          </div>
          
          {/* Status Bar */}
          <div className="px-4 py-2 bg-white border-t border-drafted-border flex items-center justify-between text-xs text-drafted-gray">
            <div className="flex items-center gap-4">
              <span>{editor.rooms.length} rooms</span>
              <span>{editor.layoutSummary.totalArea.toLocaleString()} sqft</span>
              <span>{editor.layoutSummary.bedrooms} bed / {editor.layoutSummary.bathrooms} bath</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Grid: {editor.grid.size}px</span>
              <span>Snap: {editor.grid.snapEnabled ? 'On' : 'Off'}</span>
            </div>
          </div>
        </div>
        
        {/* Right Sidebar: Properties Panel */}
        <RoomPropertiesPanel
          room={editor.selectedRoom}
          roomTypes={roomTypes}
          onUpdateRoom={editor.updateRoom}
          onDeleteRoom={editor.deleteRoom}
          onClose={editor.clearSelection}
          isOpen={editor.isPropertiesOpen && !!editor.selectedRoom}
        />
      </div>
      
      {/* Compare View Modal */}
      <AnimatePresence>
        {editor.showComparison && editor.regeneratedPlan && (
          <CompareView
            beforeSvg={roomsToSvg(editor.rooms)}
            beforeRooms={editor.rooms}
            afterPlan={editor.regeneratedPlan}
            onAccept={editor.acceptRegeneration}
            onReject={editor.rejectRegeneration}
          />
        )}
      </AnimatePresence>
      
      {/* Error Toast */}
      <AnimatePresence>
        {editor.error && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm">
            <div className="font-medium mb-1">Error</div>
            <div className="text-sm opacity-90">{editor.error}</div>
            <button
              onClick={() => editor.setError(null)}
              className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded"
            >
              ×
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

