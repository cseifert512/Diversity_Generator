/**
 * Batch analysis utilities for statistical analysis of multiple generations
 */

import type { GeneratedRoom } from '@/lib/drafted-types';

// ============================================================================
// Types
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

export interface RoomCentroid {
  roomType: string;
  displayName: string;
  centroid: Point;
  area: number;
  width: number;
  height: number;
}

export interface PositionStats {
  roomType: string;
  displayName: string;
  meanPosition: Point;
  stdDevX: number;
  stdDevY: number;
  positions: Point[];
  confidenceEllipse: {
    rx: number;
    ry: number;
    rotation: number;
  };
}

export interface SizeStats {
  roomType: string;
  displayName: string;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  values: number[];
  quartiles: [number, number, number]; // Q1, Q2 (median), Q3
}

export interface ConsistencyMetrics {
  overallScore: number; // 0-1, higher is more consistent
  areaConsistency: number;
  roomCountConsistency: number;
  positionConsistency: number;
  roomTypeConsistency: number;
}

export interface BatchStatisticsResult {
  sampleSize: number;
  successRate: number;
  averageGenerationTime: number;
  
  // Area statistics
  totalAreaStats: SizeStats;
  roomAreaStats: Map<string, SizeStats>;
  
  // Position statistics (requires SVG parsing)
  positionStats?: Map<string, PositionStats>;
  
  // Room count statistics
  roomCountStats: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    values: number[];
  };
  
  // Room type frequency
  roomTypeFrequency: Map<string, { count: number; percentage: number }>;
  
  // Consistency metrics
  consistency: ConsistencyMetrics;
  
  // Seed variance (if applicable)
  seedVariance?: {
    seedsUsed: number[];
    uniqueSeeds: number;
  };
}

// ============================================================================
// Statistical Helper Functions
// ============================================================================

/**
 * Calculate mean of an array of numbers
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate median of an array of numbers
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate standard deviation
 */
export function stdDev(values: number[], meanValue?: number): number {
  if (values.length < 2) return 0;
  const m = meanValue ?? mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calculate quartiles (Q1, Q2, Q3)
 */
export function quartiles(values: number[]): [number, number, number] {
  if (values.length === 0) return [0, 0, 0];
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  const q2 = median(sorted);
  const lowerHalf = sorted.slice(0, Math.floor(n / 2));
  const upperHalf = sorted.slice(Math.ceil(n / 2));
  
  const q1 = median(lowerHalf);
  const q3 = median(upperHalf);
  
  return [q1, q2, q3];
}

/**
 * Calculate coefficient of variation (CV) - measures relative variability
 */
export function coefficientOfVariation(values: number[]): number {
  const m = mean(values);
  if (m === 0) return 0;
  return stdDev(values, m) / m;
}

/**
 * Calculate consistency score (0-1) based on coefficient of variation
 * Lower CV = higher consistency
 */
export function consistencyFromCV(cv: number): number {
  // Map CV to consistency score
  // CV of 0 = 1 (perfect consistency)
  // CV of 0.5 (50%) = ~0.36 
  // CV of 1 (100%) = ~0.13
  return Math.exp(-cv * 2);
}

// ============================================================================
// Room Analysis Functions
// ============================================================================

/**
 * Extract room centroids from SVG (approximation based on room areas)
 * Note: For accurate positioning, actual SVG parsing would be needed
 */
export function estimateRoomCentroids(rooms: GeneratedRoom[], totalAreaSqft: number): RoomCentroid[] {
  // This is a simplified estimation - actual implementation would parse SVG
  const centroids: RoomCentroid[] = [];
  
  // Estimate positions based on room type conventions
  const layoutPositions: Record<string, { x: number; y: number }> = {
    garage: { x: 0.15, y: 0.85 },
    kitchen: { x: 0.7, y: 0.3 },
    living: { x: 0.3, y: 0.5 },
    family_room: { x: 0.35, y: 0.6 },
    dining: { x: 0.6, y: 0.4 },
    nook: { x: 0.75, y: 0.35 },
    primary_bedroom: { x: 0.7, y: 0.75 },
    primary_bathroom: { x: 0.85, y: 0.8 },
    primary_closet: { x: 0.8, y: 0.7 },
    bedroom: { x: 0.25, y: 0.3 },
    bathroom: { x: 0.35, y: 0.25 },
    office: { x: 0.15, y: 0.4 },
    laundry: { x: 0.9, y: 0.5 },
    mudroom: { x: 0.1, y: 0.7 },
    storage: { x: 0.95, y: 0.6 },
    outdoor_living: { x: 0.5, y: 0.95 },
    foyer: { x: 0.5, y: 0.15 },
  };
  
  rooms.forEach(room => {
    const basePos = layoutPositions[room.room_type] || { x: 0.5, y: 0.5 };
    
    // Add some variance based on room index/area
    const variance = (room.area_sqft / totalAreaSqft) * 0.1;
    
    centroids.push({
      roomType: room.room_type,
      displayName: room.display_name || room.room_type,
      centroid: {
        x: basePos.x + (Math.random() - 0.5) * variance,
        y: basePos.y + (Math.random() - 0.5) * variance,
      },
      area: room.area_sqft,
      width: room.width_inches,
      height: room.height_inches,
    });
  });
  
  return centroids;
}

/**
 * Calculate size statistics for a room type across generations
 */
export function calculateRoomSizeStats(
  generations: GeneratedRoom[][],
  roomType: string
): SizeStats | null {
  const areas: number[] = [];
  let displayName = roomType;
  
  generations.forEach(rooms => {
    rooms.forEach(room => {
      if (room.room_type === roomType) {
        areas.push(room.area_sqft);
        if (room.display_name) displayName = room.display_name;
      }
    });
  });
  
  if (areas.length === 0) return null;
  
  const meanVal = mean(areas);
  const q = quartiles(areas);
  
  return {
    roomType,
    displayName,
    mean: meanVal,
    median: q[1],
    stdDev: stdDev(areas, meanVal),
    min: Math.min(...areas),
    max: Math.max(...areas),
    values: areas,
    quartiles: q,
  };
}

/**
 * Calculate position statistics for a room type across generations
 */
export function calculatePositionStats(
  centroids: RoomCentroid[][],
  roomType: string
): PositionStats | null {
  const positions: Point[] = [];
  let displayName = roomType;
  
  centroids.forEach(genCentroids => {
    genCentroids.forEach(c => {
      if (c.roomType === roomType) {
        positions.push(c.centroid);
        displayName = c.displayName;
      }
    });
  });
  
  if (positions.length === 0) return null;
  
  const meanX = mean(positions.map(p => p.x));
  const meanY = mean(positions.map(p => p.y));
  const stdX = stdDev(positions.map(p => p.x), meanX);
  const stdY = stdDev(positions.map(p => p.y), meanY);
  
  return {
    roomType,
    displayName,
    meanPosition: { x: meanX, y: meanY },
    stdDevX: stdX,
    stdDevY: stdY,
    positions,
    confidenceEllipse: {
      rx: stdX * 2, // 95% confidence
      ry: stdY * 2,
      rotation: 0, // Simplified - would need covariance for true rotation
    },
  };
}

// ============================================================================
// Main Analysis Function
// ============================================================================

export interface GenerationData {
  success: boolean;
  seed: number;
  totalAreaSqft: number;
  elapsedSeconds: number;
  rooms: GeneratedRoom[];
  svg?: string;
}

/**
 * Calculate comprehensive statistics across multiple generations
 */
export function analyzeBatchGenerations(generations: GenerationData[]): BatchStatisticsResult {
  const successful = generations.filter(g => g.success);
  const n = successful.length;
  
  if (n === 0) {
    return createEmptyResult(generations.length);
  }
  
  // Basic metrics
  const successRate = n / generations.length;
  const avgTime = mean(successful.map(g => g.elapsedSeconds));
  
  // Total area statistics
  const totalAreas = successful.map(g => g.totalAreaSqft);
  const totalAreaMean = mean(totalAreas);
  const totalAreaQ = quartiles(totalAreas);
  
  const totalAreaStats: SizeStats = {
    roomType: 'total',
    displayName: 'Total Area',
    mean: totalAreaMean,
    median: totalAreaQ[1],
    stdDev: stdDev(totalAreas, totalAreaMean),
    min: Math.min(...totalAreas),
    max: Math.max(...totalAreas),
    values: totalAreas,
    quartiles: totalAreaQ,
  };
  
  // Room count statistics
  const roomCounts = successful.map(g => g.rooms.length);
  const roomCountMean = mean(roomCounts);
  
  // Gather all room types
  const allRoomTypes = new Set<string>();
  successful.forEach(g => g.rooms.forEach(r => allRoomTypes.add(r.room_type)));
  
  // Room area statistics per type
  const roomAreaStats = new Map<string, SizeStats>();
  allRoomTypes.forEach(roomType => {
    const stats = calculateRoomSizeStats(successful.map(g => g.rooms), roomType);
    if (stats) {
      roomAreaStats.set(roomType, stats);
    }
  });
  
  // Room type frequency
  const roomTypeFrequency = new Map<string, { count: number; percentage: number }>();
  const roomTypeCounts = new Map<string, number>();
  
  successful.forEach(g => {
    const seenTypes = new Set<string>();
    g.rooms.forEach(r => {
      if (!seenTypes.has(r.room_type)) {
        seenTypes.add(r.room_type);
        roomTypeCounts.set(r.room_type, (roomTypeCounts.get(r.room_type) || 0) + 1);
      }
    });
  });
  
  roomTypeCounts.forEach((count, type) => {
    roomTypeFrequency.set(type, {
      count,
      percentage: (count / n) * 100,
    });
  });
  
  // Seed variance
  const seeds = successful.map(g => g.seed);
  const uniqueSeeds = new Set(seeds).size;
  
  // Calculate consistency metrics
  const areaCV = coefficientOfVariation(totalAreas);
  const roomCountCV = coefficientOfVariation(roomCounts);
  
  // Room type consistency (how often same types appear)
  const typePresence: number[] = [];
  allRoomTypes.forEach(type => {
    const freq = roomTypeFrequency.get(type);
    if (freq) {
      typePresence.push(freq.percentage / 100);
    }
  });
  const avgTypePresence = mean(typePresence);
  
  const consistency: ConsistencyMetrics = {
    overallScore: (consistencyFromCV(areaCV) + consistencyFromCV(roomCountCV) + avgTypePresence) / 3,
    areaConsistency: consistencyFromCV(areaCV),
    roomCountConsistency: consistencyFromCV(roomCountCV),
    positionConsistency: 0.5, // Would need SVG parsing for accurate calculation
    roomTypeConsistency: avgTypePresence,
  };
  
  return {
    sampleSize: n,
    successRate,
    averageGenerationTime: avgTime,
    totalAreaStats,
    roomAreaStats,
    roomCountStats: {
      mean: roomCountMean,
      stdDev: stdDev(roomCounts, roomCountMean),
      min: Math.min(...roomCounts),
      max: Math.max(...roomCounts),
      values: roomCounts,
    },
    roomTypeFrequency,
    consistency,
    seedVariance: {
      seedsUsed: seeds,
      uniqueSeeds,
    },
  };
}

/**
 * Create empty result for when no successful generations exist
 */
function createEmptyResult(totalAttempts: number): BatchStatisticsResult {
  return {
    sampleSize: 0,
    successRate: 0,
    averageGenerationTime: 0,
    totalAreaStats: {
      roomType: 'total',
      displayName: 'Total Area',
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      values: [],
      quartiles: [0, 0, 0],
    },
    roomAreaStats: new Map(),
    roomCountStats: {
      mean: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      values: [],
    },
    roomTypeFrequency: new Map(),
    consistency: {
      overallScore: 0,
      areaConsistency: 0,
      roomCountConsistency: 0,
      positionConsistency: 0,
      roomTypeConsistency: 0,
    },
  };
}

/**
 * Compare two generations and return similarity score
 */
export function compareGenerations(gen1: GenerationData, gen2: GenerationData): number {
  if (!gen1.success || !gen2.success) return 0;
  
  // Area similarity (normalized difference)
  const areaDiff = Math.abs(gen1.totalAreaSqft - gen2.totalAreaSqft);
  const avgArea = (gen1.totalAreaSqft + gen2.totalAreaSqft) / 2;
  const areaSimilarity = 1 - Math.min(areaDiff / avgArea, 1);
  
  // Room count similarity
  const countDiff = Math.abs(gen1.rooms.length - gen2.rooms.length);
  const avgCount = (gen1.rooms.length + gen2.rooms.length) / 2;
  const countSimilarity = avgCount > 0 ? 1 - Math.min(countDiff / avgCount, 1) : 1;
  
  // Room type overlap (Jaccard similarity)
  const types1 = new Set(gen1.rooms.map(r => r.room_type));
  const types2 = new Set(gen2.rooms.map(r => r.room_type));
  const types1Array = Array.from(types1);
  const types2Array = Array.from(types2);
  const intersection = new Set(types1Array.filter(t => types2.has(t)));
  const union = new Set(types1Array.concat(types2Array));
  const typeSimilarity = union.size > 0 ? intersection.size / union.size : 1;
  
  // Weighted average
  return areaSimilarity * 0.3 + countSimilarity * 0.3 + typeSimilarity * 0.4;
}

/**
 * Calculate pairwise similarity matrix for all generations
 */
export function calculateSimilarityMatrix(generations: GenerationData[]): number[][] {
  const n = generations.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else {
        const similarity = compareGenerations(generations[i], generations[j]);
        matrix[i][j] = similarity;
        matrix[j][i] = similarity;
      }
    }
  }
  
  return matrix;
}

