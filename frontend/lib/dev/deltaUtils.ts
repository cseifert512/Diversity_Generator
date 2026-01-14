/**
 * Utility functions for computing room deltas between floor plans
 */

import type { GeneratedRoom, RoomSize } from '@/lib/drafted-types';
import type { RoomDelta, PlanSnapshot } from '@/contexts/DevModeContext';

/**
 * Estimate size category from area
 */
export function estimateSizeFromArea(roomType: string, areaSqft: number): RoomSize {
  // Generic size thresholds (could be refined per room type)
  if (areaSqft < 100) return 'S';
  if (areaSqft < 200) return 'M';
  if (areaSqft < 350) return 'L';
  return 'XL';
}

/**
 * Group rooms by type for comparison
 */
function groupRoomsByType(rooms: GeneratedRoom[]): Map<string, GeneratedRoom[]> {
  const grouped = new Map<string, GeneratedRoom[]>();
  for (const room of rooms) {
    const key = room.canonical_key || room.room_type;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(room);
  }
  return grouped;
}

/**
 * Format room type for display
 */
export function formatRoomType(roomType: string): string {
  return roomType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Compute deltas between original and edited room lists
 */
export function computeRoomDeltas(
  originalRooms: GeneratedRoom[],
  editedRooms: GeneratedRoom[]
): RoomDelta[] {
  const deltas: RoomDelta[] = [];
  
  const originalGrouped = groupRoomsByType(originalRooms);
  const editedGrouped = groupRoomsByType(editedRooms);
  
  // Get all unique room types
  const allTypes = new Set<string>();
  originalGrouped.forEach((_, key) => allTypes.add(key));
  editedGrouped.forEach((_, key) => allTypes.add(key));
  
  allTypes.forEach((roomType) => {
    const origRooms = originalGrouped.get(roomType) || [];
    const editRooms = editedGrouped.get(roomType) || [];
    
    const origCount = origRooms.length;
    const editCount = editRooms.length;
    
    // Calculate totals for this room type
    const origTotalArea = origRooms.reduce((sum, r) => sum + r.area_sqft, 0);
    const editTotalArea = editRooms.reduce((sum, r) => sum + r.area_sqft, 0);
    
    if (origCount === 0 && editCount > 0) {
      // Room type was added
      for (const room of editRooms) {
        deltas.push({
          type: 'added',
          roomType,
          displayName: room.display_name || formatRoomType(roomType),
          editedSize: estimateSizeFromArea(roomType, room.area_sqft),
          editedArea: room.area_sqft,
        });
      }
    } else if (origCount > 0 && editCount === 0) {
      // Room type was removed
      for (const room of origRooms) {
        deltas.push({
          type: 'removed',
          roomType,
          displayName: room.display_name || formatRoomType(roomType),
          originalSize: estimateSizeFromArea(roomType, room.area_sqft),
          originalArea: room.area_sqft,
        });
      }
    } else if (origCount !== editCount || Math.abs(origTotalArea - editTotalArea) > 10) {
      // Room count or total area changed significantly
      const countDiff = editCount - origCount;
      
      if (countDiff > 0) {
        // Some rooms added
        for (let i = origCount; i < editCount; i++) {
          const room = editRooms[i];
          deltas.push({
            type: 'added',
            roomType,
            displayName: room.display_name || formatRoomType(roomType),
            editedSize: estimateSizeFromArea(roomType, room.area_sqft),
            editedArea: room.area_sqft,
          });
        }
      } else if (countDiff < 0) {
        // Some rooms removed
        for (let i = editCount; i < origCount; i++) {
          const room = origRooms[i];
          deltas.push({
            type: 'removed',
            roomType,
            displayName: room.display_name || formatRoomType(roomType),
            originalSize: estimateSizeFromArea(roomType, room.area_sqft),
            originalArea: room.area_sqft,
          });
        }
      }
      
      // Check for modifications in matched rooms
      const matchCount = Math.min(origCount, editCount);
      for (let i = 0; i < matchCount; i++) {
        const orig = origRooms[i];
        const edit = editRooms[i];
        const areaDiff = edit.area_sqft - orig.area_sqft;
        
        if (Math.abs(areaDiff) > 10) {
          deltas.push({
            type: 'modified',
            roomType,
            displayName: orig.display_name || formatRoomType(roomType),
            originalSize: estimateSizeFromArea(roomType, orig.area_sqft),
            editedSize: estimateSizeFromArea(roomType, edit.area_sqft),
            originalArea: orig.area_sqft,
            editedArea: edit.area_sqft,
            areaDelta: areaDiff,
          });
        }
      }
    } else {
      // Same count, check for individual modifications
      for (let i = 0; i < origCount; i++) {
        const orig = origRooms[i];
        const edit = editRooms[i];
        const areaDiff = edit.area_sqft - orig.area_sqft;
        
        if (Math.abs(areaDiff) > 10) {
          deltas.push({
            type: 'modified',
            roomType,
            displayName: orig.display_name || formatRoomType(roomType),
            originalSize: estimateSizeFromArea(roomType, orig.area_sqft),
            editedSize: estimateSizeFromArea(roomType, edit.area_sqft),
            originalArea: orig.area_sqft,
            editedArea: edit.area_sqft,
            areaDelta: areaDiff,
          });
        }
      }
    }
  });
  
  // Sort: added first, then removed, then modified
  const typeOrder = { added: 0, removed: 1, modified: 2 };
  deltas.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
  
  return deltas;
}

/**
 * Compute summary statistics for room deltas
 */
export function computeDeltaSummary(deltas: RoomDelta[]): {
  added: number;
  removed: number;
  modified: number;
  totalAreaDelta: number;
} {
  let added = 0;
  let removed = 0;
  let modified = 0;
  let totalAreaDelta = 0;
  
  for (const delta of deltas) {
    switch (delta.type) {
      case 'added':
        added++;
        totalAreaDelta += delta.editedArea || 0;
        break;
      case 'removed':
        removed++;
        totalAreaDelta -= delta.originalArea || 0;
        break;
      case 'modified':
        modified++;
        totalAreaDelta += delta.areaDelta || 0;
        break;
    }
  }
  
  return { added, removed, modified, totalAreaDelta };
}

/**
 * Compare two plan snapshots and compute all deltas
 */
export function comparePlanSnapshots(
  original: PlanSnapshot,
  edited: PlanSnapshot
): {
  roomDeltas: RoomDelta[];
  summary: ReturnType<typeof computeDeltaSummary>;
  originalTotalArea: number;
  editedTotalArea: number;
  seedChanged: boolean;
} {
  const roomDeltas = computeRoomDeltas(original.rooms, edited.rooms);
  const summary = computeDeltaSummary(roomDeltas);
  
  const originalTotalArea = original.rooms.reduce((sum, r) => sum + r.area_sqft, 0);
  const editedTotalArea = edited.rooms.reduce((sum, r) => sum + r.area_sqft, 0);
  
  return {
    roomDeltas,
    summary,
    originalTotalArea,
    editedTotalArea,
    seedChanged: original.seed !== edited.seed,
  };
}

