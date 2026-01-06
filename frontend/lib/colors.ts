/**
 * Color constants matching drafted.ai aesthetic
 */

export const BRAND_COLORS = {
  coral: '#e86c5d',
  coralLight: '#ff8d7a',
  black: '#1a1a1a',
  gray: '#6b6b6b',
  light: '#9a9a9a',
  muted: '#c4c4c4',
  border: '#e8e8e8',
  bg: '#f7f7f5',
  cream: '#fffcf7',
};

// Room colors matching drafted.ai floor plans
export const ROOM_COLORS: Record<string, string> = {
  bedroom: '#e6e0f0',     // Lavender
  bathroom: '#a8d5e5',    // Light blue
  kitchen: '#f4c4a0',     // Peach
  living: '#f5e6d3',      // Cream
  dining: '#ffe4b5',      // Moccasin
  garage: '#d4d4d4',      // Gray
  outdoor: '#c5e8c5',     // Light green
  pool: '#87ceeb',        // Sky blue
  office: '#d4e4ed',      // Light blue-gray
  circulation: '#f0f0f0', // Very light gray
  unknown: '#e8e8e8',
};

// Cluster colors - softer, more harmonious
export const CLUSTER_COLORS = [
  '#6366f1',  // Indigo
  '#ec4899',  // Pink
  '#14b8a6',  // Teal
  '#f59e0b',  // Amber
  '#8b5cf6',  // Violet
  '#06b6d4',  // Cyan
  '#f97316',  // Orange
  '#84cc16',  // Lime
];

export const DIVERSITY_COLORS = {
  excellent: '#22c55e',  // Green
  moderate: '#eab308',   // Amber
  low: '#e86c5d',        // Coral (brand color)
};

/**
 * Get color for a diversity score
 */
export function getDiversityColor(score: number): string {
  if (score >= 0.7) return DIVERSITY_COLORS.excellent;
  if (score >= 0.4) return DIVERSITY_COLORS.moderate;
  return DIVERSITY_COLORS.low;
}

/**
 * Get color for a cluster
 */
export function getClusterColor(clusterId: number): string {
  return CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length];
}

/**
 * Get color for a room type
 */
export function getRoomColor(roomType: string): string {
  return ROOM_COLORS[roomType.toLowerCase()] || ROOM_COLORS.unknown;
}
