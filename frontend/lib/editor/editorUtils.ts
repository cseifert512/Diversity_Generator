/**
 * Utility functions for the Floor Plan Editor
 * Grid snapping, polygon math, SVG parsing/serialization
 */

import type { 
  Point, 
  BoundingBox, 
  EditorRoom, 
  GridConfig,
  HandlePosition,
  ResizeHandle,
  ViewportState
} from './editorTypes';
import { 
  HANDLE_SIZE, 
  MIN_ROOM_SIZE, 
  CANVAS_SIZE,
  PIXELS_PER_INCH 
} from './editorTypes';
import type { RoomSize, GeneratedRoom, RoomTypeDefinition } from '../drafted-types';

// ============================================================================
// Grid Snapping
// ============================================================================

/**
 * Snap a value to the nearest grid point
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Snap a point to the grid
 */
export function snapPointToGrid(point: Point, grid: GridConfig): Point {
  if (!grid.snapEnabled) return point;
  return {
    x: snapToGrid(point.x, grid.size),
    y: snapToGrid(point.y, grid.size),
  };
}

/**
 * Snap a bounding box to the grid (all corners)
 */
export function snapBoundsToGrid(bounds: BoundingBox, grid: GridConfig): BoundingBox {
  if (!grid.snapEnabled) return bounds;
  
  const x = snapToGrid(bounds.x, grid.size);
  const y = snapToGrid(bounds.y, grid.size);
  const right = snapToGrid(bounds.x + bounds.width, grid.size);
  const bottom = snapToGrid(bounds.y + bounds.height, grid.size);
  
  return {
    x,
    y,
    width: Math.max(MIN_ROOM_SIZE, right - x),
    height: Math.max(MIN_ROOM_SIZE, bottom - y),
  };
}

// ============================================================================
// Polygon Math
// ============================================================================

/**
 * Calculate the area of a polygon using the Shoelace formula
 */
export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0;
  
  let area = 0;
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  
  return Math.abs(area) / 2;
}

/**
 * Calculate the centroid of a polygon
 */
export function calculateCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );
  
  return {
    x: sum.x / points.length,
    y: sum.y / points.length,
  };
}

/**
 * Get bounding box from polygon points
 */
export function getBoundingBox(points: Point[]): BoundingBox {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Convert bounding box to polygon points (rectangle)
 */
export function boundsToPoints(bounds: BoundingBox): Point[] {
  return [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ];
}

/**
 * Check if a point is inside a polygon (ray casting algorithm)
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  const n = polygon.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

/**
 * Check if a point is inside a bounding box
 */
export function isPointInBounds(point: Point, bounds: BoundingBox): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

// ============================================================================
// Collision Detection & Spring-Network System
// ============================================================================

/**
 * Check if two bounding boxes overlap (not just touch)
 */
export function boundsOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

/**
 * Check if two bounding boxes are adjacent (touching or very close)
 */
export function boundsAdjacent(a: BoundingBox, b: BoundingBox, tolerance: number = 5): boolean {
  // Check if they're overlapping (not adjacent)
  if (boundsOverlap(a, b)) return false;
  
  // Calculate gaps
  const gapLeft = a.x - (b.x + b.width);
  const gapRight = b.x - (a.x + a.width);
  const gapTop = a.y - (b.y + b.height);
  const gapBottom = b.y - (a.y + a.height);
  
  // Check horizontal adjacency
  const horizontalOverlap = !(a.y + a.height <= b.y || b.y + b.height <= a.y);
  const horizontallyAdjacent = horizontalOverlap && (
    (gapLeft >= 0 && gapLeft <= tolerance) ||
    (gapRight >= 0 && gapRight <= tolerance)
  );
  
  // Check vertical adjacency
  const verticalOverlap = !(a.x + a.width <= b.x || b.x + b.width <= a.x);
  const verticallyAdjacent = verticalOverlap && (
    (gapTop >= 0 && gapTop <= tolerance) ||
    (gapBottom >= 0 && gapBottom <= tolerance)
  );
  
  return horizontallyAdjacent || verticallyAdjacent;
}

/**
 * Get the center point of a bounding box
 */
export function getBoundsCenter(bounds: BoundingBox): Point {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

/**
 * Determine the connection side between two adjacent rooms
 */
export type ConnectionSide = 'left' | 'right' | 'top' | 'bottom';

export interface RoomConnection {
  roomId: string;
  side: ConnectionSide;
  offset: number; // How far along the edge the connection is (0-1)
}

/**
 * Find all rooms adjacent to a given room
 */
export function findAdjacentRooms(
  room: EditorRoom,
  allRooms: EditorRoom[],
  tolerance: number = 5
): RoomConnection[] {
  const connections: RoomConnection[] = [];
  
  for (const other of allRooms) {
    if (other.id === room.id) continue;
    
    if (boundsAdjacent(room.bounds, other.bounds, tolerance)) {
      // Determine which side the connection is on
      const roomCenter = getBoundsCenter(room.bounds);
      const otherCenter = getBoundsCenter(other.bounds);
      
      const dx = otherCenter.x - roomCenter.x;
      const dy = otherCenter.y - roomCenter.y;
      
      let side: ConnectionSide;
      let offset: number;
      
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal connection
        side = dx > 0 ? 'right' : 'left';
        // Calculate vertical offset (0-1 along the edge)
        const overlapTop = Math.max(room.bounds.y, other.bounds.y);
        const overlapBottom = Math.min(room.bounds.y + room.bounds.height, other.bounds.y + other.bounds.height);
        offset = (((overlapTop + overlapBottom) / 2) - room.bounds.y) / room.bounds.height;
      } else {
        // Vertical connection
        side = dy > 0 ? 'bottom' : 'top';
        // Calculate horizontal offset
        const overlapLeft = Math.max(room.bounds.x, other.bounds.x);
        const overlapRight = Math.min(room.bounds.x + room.bounds.width, other.bounds.x + other.bounds.width);
        offset = (((overlapLeft + overlapRight) / 2) - room.bounds.x) / room.bounds.width;
      }
      
      connections.push({ roomId: other.id, side, offset: Math.max(0, Math.min(1, offset)) });
    }
  }
  
  return connections;
}

/**
 * Build a connectivity graph for all rooms
 */
export interface ConnectivityGraph {
  // Map of roomId -> array of connected room IDs and their relationship
  connections: Map<string, RoomConnection[]>;
}

export function buildConnectivityGraph(rooms: EditorRoom[]): ConnectivityGraph {
  const connections = new Map<string, RoomConnection[]>();
  
  for (const room of rooms) {
    const adjacent = findAdjacentRooms(room, rooms);
    connections.set(room.id, adjacent);
  }
  
  return { connections };
}

/**
 * Calculate where a connected room should be positioned relative to a moved room
 * to maintain their connection relationship
 */
export function calculateConnectedPosition(
  movedBounds: BoundingBox,
  connectedRoom: EditorRoom,
  connection: RoomConnection
): Point {
  let targetX = connectedRoom.bounds.x;
  let targetY = connectedRoom.bounds.y;
  
  switch (connection.side) {
    case 'right':
      // Connected room should be to the right of moved room
      targetX = movedBounds.x + movedBounds.width;
      // Maintain vertical alignment with offset
      targetY = movedBounds.y + (connection.offset * movedBounds.height) - (connectedRoom.bounds.height / 2);
      break;
    case 'left':
      // Connected room should be to the left
      targetX = movedBounds.x - connectedRoom.bounds.width;
      targetY = movedBounds.y + (connection.offset * movedBounds.height) - (connectedRoom.bounds.height / 2);
      break;
    case 'bottom':
      // Connected room should be below
      targetY = movedBounds.y + movedBounds.height;
      targetX = movedBounds.x + (connection.offset * movedBounds.width) - (connectedRoom.bounds.width / 2);
      break;
    case 'top':
      // Connected room should be above
      targetY = movedBounds.y - connectedRoom.bounds.height;
      targetX = movedBounds.x + (connection.offset * movedBounds.width) - (connectedRoom.bounds.width / 2);
      break;
  }
  
  return { x: targetX, y: targetY };
}

/**
 * Check if new bounds would collide with any other room
 */
export function wouldCollide(
  roomId: string,
  newBounds: BoundingBox,
  allRooms: EditorRoom[]
): boolean {
  for (const other of allRooms) {
    if (other.id === roomId) continue;
    if (boundsOverlap(newBounds, other.bounds)) {
      return true;
    }
  }
  return false;
}

/**
 * Spring-Network system: rooms maintain connections while avoiding overlap
 * Uses a physics-inspired approach with:
 * - Repulsive forces (prevent overlap)
 * - Attractive forces (maintain connections)
 */
export function applySpringNetwork(
  movedRoomId: string,
  newBounds: BoundingBox,
  rooms: EditorRoom[],
  grid: GridConfig,
  iterations: number = 8
): EditorRoom[] {
  // Build initial connectivity graph BEFORE the move
  const originalGraph = buildConnectivityGraph(rooms);
  
  // Create a working copy of bounds
  const workingBounds = new Map<string, BoundingBox>();
  rooms.forEach(r => workingBounds.set(r.id, { ...r.bounds }));
  
  // Set the moved room's new position
  workingBounds.set(movedRoomId, newBounds);
  
  // Get rooms directly connected to the moved room
  const directConnections = originalGraph.connections.get(movedRoomId) || [];
  
  // Iteratively apply forces to settle the layout
  for (let iter = 0; iter < iterations; iter++) {
    // First pass: Move connected rooms to maintain connections
    for (const connection of directConnections) {
      const connectedRoom = rooms.find(r => r.id === connection.roomId);
      if (!connectedRoom || connectedRoom.isLocked) continue;
      
      const movedBounds = workingBounds.get(movedRoomId)!;
      const currentBounds = workingBounds.get(connection.roomId)!;
      
      // Calculate ideal position to maintain connection
      const idealPos = calculateConnectedPosition(movedBounds, connectedRoom, connection);
      
      // Move partially towards ideal position (spring-like behavior)
      const springStrength = 0.6; // How strongly rooms try to stay connected
      const newX = currentBounds.x + (idealPos.x - currentBounds.x) * springStrength;
      const newY = currentBounds.y + (idealPos.y - currentBounds.y) * springStrength;
      
      workingBounds.set(connection.roomId, {
        ...currentBounds,
        x: newX,
        y: newY,
      });
    }
    
    // Second pass: Resolve overlaps (repulsive forces)
    for (const room of rooms) {
      if (room.id === movedRoomId) continue; // Don't move the room being dragged
      if (room.isLocked) continue;
      
      const bounds = workingBounds.get(room.id)!;
      let adjustX = 0;
      let adjustY = 0;
      
      for (const other of rooms) {
        if (other.id === room.id) continue;
        
        const otherBounds = workingBounds.get(other.id)!;
        
        if (boundsOverlap(bounds, otherBounds)) {
          // Calculate separation vector
          const centerA = getBoundsCenter(bounds);
          const centerB = getBoundsCenter(otherBounds);
          
          // Direction to push (away from other room)
          let dx = centerA.x - centerB.x;
          let dy = centerA.y - centerB.y;
          
          // Normalize and scale by overlap amount
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Calculate overlap magnitude
          const overlapX = Math.min(
            bounds.x + bounds.width - otherBounds.x,
            otherBounds.x + otherBounds.width - bounds.x
          );
          const overlapY = Math.min(
            bounds.y + bounds.height - otherBounds.y,
            otherBounds.y + otherBounds.height - bounds.y
          );
          
          // Push in the direction of least overlap
          if (overlapX < overlapY) {
            adjustX += (dx > 0 ? 1 : -1) * (overlapX + 2);
          } else {
            adjustY += (dy > 0 ? 1 : -1) * (overlapY + 2);
          }
        }
      }
      
      // Apply adjustments
      if (adjustX !== 0 || adjustY !== 0) {
        workingBounds.set(room.id, {
          ...bounds,
          x: bounds.x + adjustX,
          y: bounds.y + adjustY,
        });
      }
    }
    
    // Third pass: Also move secondary connections (rooms connected to connected rooms)
    if (iter < 3) { // Only do this in early iterations
      for (const connection of directConnections) {
        const secondaryConnections = originalGraph.connections.get(connection.roomId) || [];
        
        for (const secondary of secondaryConnections) {
          if (secondary.roomId === movedRoomId) continue; // Skip back-connection
          
          const secondaryRoom = rooms.find(r => r.id === secondary.roomId);
          if (!secondaryRoom || secondaryRoom.isLocked) continue;
          
          const parentBounds = workingBounds.get(connection.roomId)!;
          const currentBounds = workingBounds.get(secondary.roomId)!;
          
          const idealPos = calculateConnectedPosition(parentBounds, secondaryRoom, secondary);
          const springStrength = 0.3; // Weaker for secondary connections
          
          const newX = currentBounds.x + (idealPos.x - currentBounds.x) * springStrength;
          const newY = currentBounds.y + (idealPos.y - currentBounds.y) * springStrength;
          
          workingBounds.set(secondary.roomId, {
            ...currentBounds,
            x: newX,
            y: newY,
          });
        }
      }
    }
  }
  
  // Snap all positions to grid and apply bounds
  workingBounds.forEach((bounds, roomId) => {
    let snapped = snapBoundsToGrid(bounds, grid);
    
    // Keep within canvas
    snapped.x = Math.max(0, Math.min(CANVAS_SIZE - snapped.width, snapped.x));
    snapped.y = Math.max(0, Math.min(CANVAS_SIZE - snapped.height, snapped.y));
    
    workingBounds.set(roomId, snapped);
  });
  
  // Final overlap resolution pass
  let hasOverlap = true;
  let safetyCounter = 0;
  while (hasOverlap && safetyCounter < 10) {
    hasOverlap = false;
    safetyCounter++;
    
    for (const room of rooms) {
      if (room.id === movedRoomId) continue;
      if (room.isLocked) continue;
      
      const bounds = workingBounds.get(room.id)!;
      
      for (const other of rooms) {
        if (other.id === room.id) continue;
        const otherBounds = workingBounds.get(other.id)!;
        
        if (boundsOverlap(bounds, otherBounds)) {
          hasOverlap = true;
          
          // Push this room away
          const centerA = getBoundsCenter(bounds);
          const centerB = getBoundsCenter(otherBounds);
          
          const overlapX = Math.min(
            bounds.x + bounds.width - otherBounds.x,
            otherBounds.x + otherBounds.width - bounds.x
          );
          const overlapY = Math.min(
            bounds.y + bounds.height - otherBounds.y,
            otherBounds.y + otherBounds.height - bounds.y
          );
          
          let newBounds = { ...bounds };
          if (overlapX < overlapY) {
            newBounds.x += (centerA.x > centerB.x ? 1 : -1) * (overlapX + grid.size);
          } else {
            newBounds.y += (centerA.y > centerB.y ? 1 : -1) * (overlapY + grid.size);
          }
          
          newBounds = snapBoundsToGrid(newBounds, grid);
          newBounds.x = Math.max(0, Math.min(CANVAS_SIZE - newBounds.width, newBounds.x));
          newBounds.y = Math.max(0, Math.min(CANVAS_SIZE - newBounds.height, newBounds.y));
          
          workingBounds.set(room.id, newBounds);
        }
      }
    }
  }
  
  // Apply all updates to rooms
  return rooms.map(room => {
    const newRoomBounds = workingBounds.get(room.id)!;
    
    // Skip if bounds haven't changed
    if (
      newRoomBounds.x === room.bounds.x &&
      newRoomBounds.y === room.bounds.y &&
      newRoomBounds.width === room.bounds.width &&
      newRoomBounds.height === room.bounds.height
    ) {
      return room;
    }
    
    const newPoints = boundsToPoints(newRoomBounds);
    
    return {
      ...room,
      bounds: newRoomBounds,
      points: newPoints,
      widthInches: pixelsToInches(newRoomBounds.width),
      heightInches: pixelsToInches(newRoomBounds.height),
      areaSqft: pixelsToSqft(newRoomBounds.width * newRoomBounds.height),
    };
  });
}

// Keep backward compatibility alias
export const applyMagneticPush = applySpringNetwork;

/**
 * Find a non-overlapping position for a new room (used when adding rooms)
 */
export function findNonOverlappingPosition(
  room: EditorRoom,
  desiredBounds: BoundingBox,
  allRooms: EditorRoom[],
  grid: GridConfig,
  maxIterations: number = 20
): BoundingBox {
  let currentBounds = { ...desiredBounds };
  
  for (let i = 0; i < maxIterations; i++) {
    let hasOverlap = false;
    
    for (const other of allRooms) {
      if (other.id === room.id) continue;
      
      if (boundsOverlap(currentBounds, other.bounds)) {
        hasOverlap = true;
        
        // Calculate push direction
        const centerA = getBoundsCenter(currentBounds);
        const centerB = getBoundsCenter(other.bounds);
        
        const overlapX = Math.min(
          currentBounds.x + currentBounds.width - other.bounds.x,
          other.bounds.x + other.bounds.width - currentBounds.x
        );
        const overlapY = Math.min(
          currentBounds.y + currentBounds.height - other.bounds.y,
          other.bounds.y + other.bounds.height - currentBounds.y
        );
        
        if (overlapX < overlapY) {
          currentBounds.x += (centerA.x > centerB.x ? 1 : -1) * (overlapX + 2);
        } else {
          currentBounds.y += (centerA.y > centerB.y ? 1 : -1) * (overlapY + 2);
        }
        
        currentBounds = snapBoundsToGrid(currentBounds, grid);
        currentBounds.x = Math.max(0, Math.min(CANVAS_SIZE - currentBounds.width, currentBounds.x));
        currentBounds.y = Math.max(0, Math.min(CANVAS_SIZE - currentBounds.height, currentBounds.y));
        
        break;
      }
    }
    
    if (!hasOverlap) break;
  }
  
  return currentBounds;
}

/**
 * Move polygon points by a delta
 */
export function movePolygon(points: Point[], delta: Point): Point[] {
  return points.map(p => ({
    x: p.x + delta.x,
    y: p.y + delta.y,
  }));
}

/**
 * Move bounding box by a delta
 */
export function moveBounds(bounds: BoundingBox, delta: Point): BoundingBox {
  return {
    ...bounds,
    x: bounds.x + delta.x,
    y: bounds.y + delta.y,
  };
}

// ============================================================================
// Resize Handles
// ============================================================================

/**
 * Get resize handles for a bounding box
 */
export function getResizeHandles(bounds: BoundingBox): ResizeHandle[] {
  const { x, y, width, height } = bounds;
  const halfW = width / 2;
  const halfH = height / 2;
  
  return [
    { position: 'top-left', x, y, cursor: 'nwse-resize' },
    { position: 'top', x: x + halfW, y, cursor: 'ns-resize' },
    { position: 'top-right', x: x + width, y, cursor: 'nesw-resize' },
    { position: 'right', x: x + width, y: y + halfH, cursor: 'ew-resize' },
    { position: 'bottom-right', x: x + width, y: y + height, cursor: 'nwse-resize' },
    { position: 'bottom', x: x + halfW, y: y + height, cursor: 'ns-resize' },
    { position: 'bottom-left', x, y: y + height, cursor: 'nesw-resize' },
    { position: 'left', x, y: y + halfH, cursor: 'ew-resize' },
  ];
}

/**
 * Apply resize delta to bounds based on handle position
 */
export function resizeBounds(
  bounds: BoundingBox,
  handle: HandlePosition,
  delta: Point,
  grid: GridConfig
): BoundingBox {
  let { x, y, width, height } = bounds;
  
  switch (handle) {
    case 'top-left':
      x += delta.x;
      y += delta.y;
      width -= delta.x;
      height -= delta.y;
      break;
    case 'top':
      y += delta.y;
      height -= delta.y;
      break;
    case 'top-right':
      y += delta.y;
      width += delta.x;
      height -= delta.y;
      break;
    case 'right':
      width += delta.x;
      break;
    case 'bottom-right':
      width += delta.x;
      height += delta.y;
      break;
    case 'bottom':
      height += delta.y;
      break;
    case 'bottom-left':
      x += delta.x;
      width -= delta.x;
      height += delta.y;
      break;
    case 'left':
      x += delta.x;
      width -= delta.x;
      break;
  }
  
  // Ensure minimum size
  if (width < MIN_ROOM_SIZE) {
    if (handle.includes('left')) {
      x = bounds.x + bounds.width - MIN_ROOM_SIZE;
    }
    width = MIN_ROOM_SIZE;
  }
  if (height < MIN_ROOM_SIZE) {
    if (handle.includes('top')) {
      y = bounds.y + bounds.height - MIN_ROOM_SIZE;
    }
    height = MIN_ROOM_SIZE;
  }
  
  const newBounds = { x, y, width, height };
  return snapBoundsToGrid(newBounds, grid);
}

/**
 * Check if a point is near a resize handle
 */
export function getHandleAtPoint(
  point: Point,
  bounds: BoundingBox,
  threshold: number = HANDLE_SIZE
): HandlePosition | null {
  const handles = getResizeHandles(bounds);
  
  for (const handle of handles) {
    const dist = Math.sqrt(
      Math.pow(point.x - handle.x, 2) + Math.pow(point.y - handle.y, 2)
    );
    if (dist <= threshold) {
      return handle.position;
    }
  }
  
  return null;
}

// ============================================================================
// Coordinate Transforms
// ============================================================================

/**
 * Convert screen coordinates to canvas coordinates
 */
export function screenToCanvas(
  screenPoint: Point,
  viewport: ViewportState,
  canvasRect: DOMRect
): Point {
  return {
    x: (screenPoint.x - canvasRect.left - viewport.panX) / viewport.zoom,
    y: (screenPoint.y - canvasRect.top - viewport.panY) / viewport.zoom,
  };
}

/**
 * Convert canvas coordinates to screen coordinates
 */
export function canvasToScreen(
  canvasPoint: Point,
  viewport: ViewportState,
  canvasRect: DOMRect
): Point {
  return {
    x: canvasPoint.x * viewport.zoom + viewport.panX + canvasRect.left,
    y: canvasPoint.y * viewport.zoom + viewport.panY + canvasRect.top,
  };
}

// ============================================================================
// Dimension Calculations
// ============================================================================

/**
 * Convert pixel area to square feet (approximate)
 * Based on typical SVG scale where the canvas represents a house
 */
export function pixelsToSqft(pixelArea: number, canvasSize: number = CANVAS_SIZE): number {
  // Assume a typical house of ~2000 sqft fits in the canvas
  // This gives us a rough scale factor
  const typicalHouseSqft = 2000;
  const canvasArea = canvasSize * canvasSize;
  const scaleFactor = typicalHouseSqft / canvasArea;
  
  return pixelArea * scaleFactor;
}

/**
 * Convert square feet to pixels
 */
export function sqftToPixels(sqft: number, canvasSize: number = CANVAS_SIZE): number {
  const typicalHouseSqft = 2000;
  const canvasArea = canvasSize * canvasSize;
  const scaleFactor = canvasArea / typicalHouseSqft;
  
  return sqft * scaleFactor;
}

/**
 * Convert pixel dimension to inches
 */
export function pixelsToInches(pixels: number, canvasSize: number = CANVAS_SIZE): number {
  // Assume typical house width of ~50 feet (600 inches) fits in canvas
  const typicalWidthInches = 600;
  return (pixels / canvasSize) * typicalWidthInches;
}

/**
 * Estimate room size category from area
 */
export function estimateSizeFromArea(
  areaSqft: number,
  sizeRanges: Array<{ size: RoomSize; min: number; max: number }>
): RoomSize {
  for (const range of sizeRanges) {
    if (areaSqft >= range.min && areaSqft <= range.max) {
      return range.size;
    }
  }
  
  // Default to medium if out of range
  if (areaSqft < sizeRanges[0]?.min) return 'S';
  return 'XL';
}

// ============================================================================
// SVG Parsing
// ============================================================================

/**
 * Normalize a color value to lowercase hex format
 */
function normalizeColor(color: string): string {
  if (!color) return '';
  const c = color.toLowerCase().trim();
  // Expand 3-digit hex to 6-digit
  if (c.match(/^#[0-9a-f]{3}$/)) {
    return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
  }
  return c;
}

/**
 * Format a room type string to display name
 * "primary_bedroom" -> "Primary Bedroom"
 */
function formatRoomType(roomType: string): string {
  return roomType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Check if a color is a valid room color (not background/border)
 */
function isRoomColor(fill: string): boolean {
  const color = normalizeColor(fill);
  if (!color || color === 'none' || color === 'transparent') return false;
  // Skip white and near-white colors (backgrounds)
  if (color === '#ffffff' || color === '#fff' || color === 'white') return false;
  // Skip black (usually borders/strokes)
  if (color === '#000000' || color === '#000' || color === 'black') return false;
  return true;
}

/**
 * Parse SVG string to extract room polygons.
 * 
 * STRATEGY: COLOR-BASED room type identification.
 * 
 * The SVG does NOT contain labels. Room types are identified by their fill color:
 * - Each room type has a unique `training_hex` color in rooms.json
 * - Example: #FD4041 = primary_bedroom, #C46E72 = bedroom, #3A6DF8 = bathroom
 * 
 * The display name comes from the room type definition, NOT from the roomData array.
 * The roomData array is only used for additional metadata (area, dimensions) if available.
 */
export function parseSvgRooms(
  svgString: string,
  roomData: GeneratedRoom[],
  roomTypes: Map<string, RoomTypeDefinition>
): EditorRoom[] {
  console.log('[parseSvgRooms] Called with:', {
    svgLength: svgString?.length,
    roomDataCount: roomData?.length,
    roomTypesCount: roomTypes?.size
  });
  
  if (!svgString) {
    console.warn('[parseSvgRooms] No SVG string provided');
    return [];
  }
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  
  if (!svg) {
    console.warn('[parseSvgRooms] No SVG element found in document');
    return [];
  }
  
  // Build color to room type map
  // This is the KEY mapping: SVG fill color → room type definition
  const colorToType = new Map<string, RoomTypeDefinition>();
  roomTypes.forEach((def) => {
    if (def.colors.training_hex) {
      colorToType.set(normalizeColor(def.colors.training_hex), def);
    }
  });
  
  console.log('[parseSvgRooms] Color map has', colorToType.size, 'room type colors');
  
  // Extract room shapes from SVG
  const elements = svg.querySelectorAll('rect, polygon, path');
  console.log('[parseSvgRooms] Found', elements.length, 'SVG elements');
  
  const rooms: EditorRoom[] = [];
  
  elements.forEach((el, elementIndex) => {
    const rawFill = el.getAttribute('fill') || '';
    const fill = normalizeColor(rawFill);
    
    // Skip non-room elements (no fill, white/black/transparent)
    if (!isRoomColor(fill)) {
      return;
    }
    
    // Look up room type by color
    const roomDef = colorToType.get(fill);
    
    // Parse geometry
    let points: Point[] = [];
    
    if (el.tagName === 'rect') {
      const x = parseFloat(el.getAttribute('x') || '0');
      const y = parseFloat(el.getAttribute('y') || '0');
      const width = parseFloat(el.getAttribute('width') || '0');
      const height = parseFloat(el.getAttribute('height') || '0');
      
      if (width < 5 || height < 5) return; // Skip tiny elements
      
      points = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ];
    } else if (el.tagName === 'polygon') {
      const pointsAttr = el.getAttribute('points') || '';
      points = parsePolygonPoints(pointsAttr);
    } else if (el.tagName === 'path') {
      const d = el.getAttribute('d') || '';
      points = parsePathBounds(d);
    }
    
    if (points.length < 3) return;
    
    const bounds = getBoundingBox(points);
    if (bounds.width < 10 || bounds.height < 10) return; // Skip very small shapes
    
    const areaPx = calculatePolygonArea(points);
    
    // Get room type and display name FROM THE COLOR MAP
    // If no match, use 'Room' as fallback but still show the shape
    const roomType = roomDef?.key || 'room';
    const displayName = roomDef?.display || 'Room';
    
    rooms.push({
      id: `room-${elementIndex}`,
      roomType,
      displayName,
      points,
      bounds,
      fillColor: roomDef?.colors.ui_hex || fill,
      trainingColor: fill,
      areaSqft: pixelsToSqft(areaPx),
      widthInches: pixelsToInches(bounds.width),
      heightInches: pixelsToInches(bounds.height),
      estimatedSize: 'M',
      isSelected: false,
      isHovered: false,
      isLocked: false,
      originalRoomData: undefined,
    });
  });
  
  console.log('[parseSvgRooms] Created', rooms.length, 'rooms from SVG');
  
  return rooms;
}

/**
 * Parse polygon points attribute
 */
function parsePolygonPoints(pointsStr: string): Point[] {
  const points: Point[] = [];
  const pairs = pointsStr.match(/[\d.]+[,\s]+[\d.]+/g) || [];
  
  for (const pair of pairs) {
    const [x, y] = pair.split(/[,\s]+/).map(Number);
    if (!isNaN(x) && !isNaN(y)) {
      points.push({ x, y });
    }
  }
  
  return points;
}

/**
 * Parse path to get bounding points (simplified)
 */
function parsePathBounds(d: string): Point[] {
  const coords: Point[] = [];
  const numbers = d.match(/[\d.]+/g) || [];
  
  for (let i = 0; i < numbers.length - 1; i += 2) {
    const x = parseFloat(numbers[i]);
    const y = parseFloat(numbers[i + 1]);
    if (!isNaN(x) && !isNaN(y)) {
      coords.push({ x, y });
    }
  }
  
  if (coords.length < 2) return [];
  
  const bounds = getBoundingBox(coords);
  return boundsToPoints(bounds);
}

// ============================================================================
// SVG Serialization
// ============================================================================

/**
 * Generate SVG string from editor rooms
 */
export function roomsToSvg(
  rooms: EditorRoom[],
  width: number = CANVAS_SIZE,
  height: number = CANVAS_SIZE
): string {
  const polygons = rooms.map(room => {
    const pointsStr = room.points.map(p => `${p.x},${p.y}`).join(' ');
    return `  <polygon points="${pointsStr}" fill="${room.trainingColor}" stroke="#000" stroke-width="2"/>`;
  }).join('\n');
  
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
${polygons}
</svg>`;
}

/**
 * Generate SVG with room labels
 */
export function roomsToLabeledSvg(
  rooms: EditorRoom[],
  width: number = CANVAS_SIZE,
  height: number = CANVAS_SIZE
): string {
  const elements: string[] = [];
  
  rooms.forEach(room => {
    const pointsStr = room.points.map(p => `${p.x},${p.y}`).join(' ');
    elements.push(`  <polygon points="${pointsStr}" fill="${room.fillColor}" stroke="#000" stroke-width="2"/>`);
    
    // Add label at centroid
    const centroid = calculateCentroid(room.points);
    elements.push(`  <text x="${centroid.x}" y="${centroid.y}" text-anchor="middle" font-size="10" fill="#333">${room.displayName}</text>`);
  });
  
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
${elements.join('\n')}
</svg>`;
}

// ============================================================================
// Room Creation
// ============================================================================

/**
 * Create a new room at a position
 */
export function createRoom(
  roomType: string,
  position: Point,
  size: RoomSize,
  roomDef: RoomTypeDefinition,
  grid: GridConfig
): EditorRoom {
  // Get default size for room type
  const sizeInfo = roomDef.sizes.find(s => s.key === size);
  const midSqft = sizeInfo ? (sizeInfo.sqft_range[0] + sizeInfo.sqft_range[1]) / 2 : 100;
  
  // Convert sqft to approximate pixel size
  const pixelArea = sqftToPixels(midSqft);
  const sideLength = Math.sqrt(pixelArea);
  
  // Snap to grid
  const snappedPos = snapPointToGrid(position, grid);
  const width = snapToGrid(sideLength, grid.size);
  const height = snapToGrid(sideLength, grid.size);
  
  const bounds: BoundingBox = {
    x: snappedPos.x,
    y: snappedPos.y,
    width: Math.max(MIN_ROOM_SIZE, width),
    height: Math.max(MIN_ROOM_SIZE, height),
  };
  
  const points = boundsToPoints(bounds);
  
  return {
    id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    roomType,
    displayName: roomDef.display,
    points,
    bounds,
    fillColor: roomDef.colors.ui_hex || '#cccccc',
    trainingColor: roomDef.colors.training_hex || '#cccccc',
    areaSqft: midSqft,
    widthInches: pixelsToInches(bounds.width),
    heightInches: pixelsToInches(bounds.height),
    estimatedSize: size,
    isSelected: false,
    isHovered: false,
    isLocked: false,
  };
}

// ============================================================================
// Export Helpers
// ============================================================================

export {
  parsePolygonPoints,
  parsePathBounds,
};

