/**
 * Utility functions for prompt comparison and diffing
 */

export interface PromptLine {
  content: string;
  type: 'area' | 'room' | 'other';
  roomType?: string;
  size?: string;
}

export interface PromptDiffLine {
  original: string | null;
  edited: string | null;
  type: 'unchanged' | 'added' | 'removed' | 'modified';
  lineType: 'area' | 'room' | 'other';
}

/**
 * Parse a prompt into structured lines
 */
export function parsePromptLines(prompt: string): PromptLine[] {
  const lines = prompt.split('\n').filter(l => l.trim());
  
  return lines.map(line => {
    const trimmed = line.trim();
    
    // Check if it's an area line
    if (trimmed.toLowerCase().startsWith('area')) {
      return { content: trimmed, type: 'area' };
    }
    
    // Check if it's a room line (contains = and a color/size)
    const roomMatch = trimmed.match(/^([^=]+)\s*=\s*(.+)$/);
    if (roomMatch) {
      const [, roomPart, valuePart] = roomMatch;
      return {
        content: trimmed,
        type: 'room',
        roomType: roomPart.trim(),
        size: valuePart.trim(),
      };
    }
    
    return { content: trimmed, type: 'other' };
  });
}

/**
 * Extract room specifications from a prompt for comparison
 */
export function extractRoomSpecs(prompt: string): Map<string, string[]> {
  const rooms = new Map<string, string[]>();
  const lines = parsePromptLines(prompt);
  
  for (const line of lines) {
    if (line.type === 'room' && line.roomType) {
      if (!rooms.has(line.roomType)) {
        rooms.set(line.roomType, []);
      }
      rooms.get(line.roomType)!.push(line.size || '');
    }
  }
  
  return rooms;
}

/**
 * Compute line-by-line diff between two prompts
 */
export function computePromptDiff(originalPrompt: string, editedPrompt: string): PromptDiffLine[] {
  const originalLines = parsePromptLines(originalPrompt);
  const editedLines = parsePromptLines(editedPrompt);
  
  const diffLines: PromptDiffLine[] = [];
  
  // Create maps for room lines by room type
  const originalRooms = new Map<string, PromptLine[]>();
  const editedRooms = new Map<string, PromptLine[]>();
  
  let originalAreaLine: PromptLine | null = null;
  let editedAreaLine: PromptLine | null = null;
  
  for (const line of originalLines) {
    if (line.type === 'area') {
      originalAreaLine = line;
    } else if (line.type === 'room' && line.roomType) {
      if (!originalRooms.has(line.roomType)) {
        originalRooms.set(line.roomType, []);
      }
      originalRooms.get(line.roomType)!.push(line);
    }
  }
  
  for (const line of editedLines) {
    if (line.type === 'area') {
      editedAreaLine = line;
    } else if (line.type === 'room' && line.roomType) {
      if (!editedRooms.has(line.roomType)) {
        editedRooms.set(line.roomType, []);
      }
      editedRooms.get(line.roomType)!.push(line);
    }
  }
  
  // Compare area lines
  if (originalAreaLine || editedAreaLine) {
    if (!originalAreaLine) {
      diffLines.push({
        original: null,
        edited: editedAreaLine!.content,
        type: 'added',
        lineType: 'area',
      });
    } else if (!editedAreaLine) {
      diffLines.push({
        original: originalAreaLine.content,
        edited: null,
        type: 'removed',
        lineType: 'area',
      });
    } else if (originalAreaLine.content !== editedAreaLine.content) {
      diffLines.push({
        original: originalAreaLine.content,
        edited: editedAreaLine.content,
        type: 'modified',
        lineType: 'area',
      });
    } else {
      diffLines.push({
        original: originalAreaLine.content,
        edited: editedAreaLine.content,
        type: 'unchanged',
        lineType: 'area',
      });
    }
  }
  
  // Compare room lines
  const allRoomTypes = new Set<string>();
  originalRooms.forEach((_, key) => allRoomTypes.add(key));
  editedRooms.forEach((_, key) => allRoomTypes.add(key));
  
  allRoomTypes.forEach((roomType) => {
    const origRooms = originalRooms.get(roomType) || [];
    const editRooms = editedRooms.get(roomType) || [];
    
    const maxLen = Math.max(origRooms.length, editRooms.length);
    
    for (let i = 0; i < maxLen; i++) {
      const orig = origRooms[i];
      const edit = editRooms[i];
      
      if (!orig) {
        diffLines.push({
          original: null,
          edited: edit.content,
          type: 'added',
          lineType: 'room',
        });
      } else if (!edit) {
        diffLines.push({
          original: orig.content,
          edited: null,
          type: 'removed',
          lineType: 'room',
        });
      } else if (orig.content !== edit.content) {
        diffLines.push({
          original: orig.content,
          edited: edit.content,
          type: 'modified',
          lineType: 'room',
        });
      } else {
        diffLines.push({
          original: orig.content,
          edited: edit.content,
          type: 'unchanged',
          lineType: 'room',
        });
      }
    }
  });
  
  return diffLines;
}

/**
 * Count tokens in a prompt (rough estimate)
 */
export function estimateTokenCount(prompt: string): number {
  // CLIP tokenizer roughly splits on whitespace and punctuation
  // This is a rough estimate
  const words = prompt.split(/[\s,=]+/).filter(w => w.length > 0);
  return words.length;
}

/**
 * Format prompt for display with syntax highlighting hints
 */
export function formatPromptForDisplay(prompt: string): { line: string; type: 'area' | 'room' | 'other' }[] {
  return parsePromptLines(prompt).map(line => ({
    line: line.content,
    type: line.type,
  }));
}

/**
 * Get a summary of prompt differences
 */
export function getPromptDiffSummary(diffLines: PromptDiffLine[]): {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
} {
  let added = 0;
  let removed = 0;
  let modified = 0;
  let unchanged = 0;
  
  for (const line of diffLines) {
    switch (line.type) {
      case 'added': added++; break;
      case 'removed': removed++; break;
      case 'modified': modified++; break;
      case 'unchanged': unchanged++; break;
    }
  }
  
  return { added, removed, modified, unchanged };
}

