import { MapDefinition, MapItem, MapState, CharacterToken, Position, CharacterRole } from '../types';
import { GRID_SIZE_INCHES } from './mapConstants';
import { INITIAL_CHARACTER_STATS, CHARACTER_ROLES } from './characterStats';

// Import all map definitions
import bankJobMap from './maps/bank-job.json';
import treasureHuntMap from './maps/treasure-hunt.json';
import trainRobberyMap from './maps/train-robbery.json';
import serverHackMap from './maps/server-hack.json';
import jailBreakMap from './maps/jail-break.json';

// Map registry
const MAP_REGISTRY: Record<string, MapDefinition> = {
  'bank-job': bankJobMap as MapDefinition,
  'treasure-hunt': treasureHuntMap as MapDefinition,
  'train-robbery': trainRobberyMap as MapDefinition,
  'server-hack': serverHackMap as MapDefinition,
  'jail-break': jailBreakMap as MapDefinition,
};

/**
 * Get all available maps
 */
export function getAvailableMaps(): Array<{ id: string; name: string; description: string }> {
  return Object.values(MAP_REGISTRY).map((map) => ({
    id: map.id,
    name: map.name,
    description: map.description,
  }));
}

/**
 * Generate a unique ID for map items
 */
let itemIdCounter = 0;
function generateItemId(prefix: string): string {
  itemIdCounter++;
  return `${prefix}-${Date.now()}-${itemIdCounter}`;
}

/**
 * Expand a linear segment (wall) into individual position-based items
 */
function expandLinearSegment(item: MapItem): MapItem[] {
  if (!item.endPosition) {
    return [item];
  }

  const items: MapItem[] = [];
  const { position, endPosition } = item;

  // Calculate direction and distance
  const dx = endPosition.x - position.x;
  const dy = endPosition.y - position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(distance / GRID_SIZE_INCHES);

  // Generate items along the line
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const x = position.x + dx * t;
    const y = position.y + dy * t;

    items.push({
      ...item,
      id: generateItemId(`${item.type}-segment`),
      position: { x, y },
      endPosition: undefined, // Remove endPosition for individual segments
      size: item.size || 1,
    });
  }

  return items;
}

/**
 * Expand a rectangular block into individual position-based items
 */
function expandRectangularBlock(item: MapItem): MapItem[] {
  if (!item.width || !item.height) {
    return [item];
  }

  const items: MapItem[] = [];
  const { position, width, height } = item;

  // For walls, create a hollow rectangle (only the perimeter)
  if (item.type === 'wall') {
    // Top and bottom edges
    for (let x = 0; x < width; x++) {
      // Top edge
      items.push({
        ...item,
        id: generateItemId(`${item.type}-block`),
        position: { x: position.x + x * GRID_SIZE_INCHES, y: position.y },
        width: undefined,
        height: undefined,
        size: 1,
      });
      // Bottom edge
      items.push({
        ...item,
        id: generateItemId(`${item.type}-block`),
        position: { x: position.x + x * GRID_SIZE_INCHES, y: position.y + (height - 1) * GRID_SIZE_INCHES },
        width: undefined,
        height: undefined,
        size: 1,
      });
    }
    // Left and right edges (excluding corners already done)
    for (let y = 1; y < height - 1; y++) {
      // Left edge
      items.push({
        ...item,
        id: generateItemId(`${item.type}-block`),
        position: { x: position.x, y: position.y + y * GRID_SIZE_INCHES },
        width: undefined,
        height: undefined,
        size: 1,
      });
      // Right edge
      items.push({
        ...item,
        id: generateItemId(`${item.type}-block`),
        position: { x: position.x + (width - 1) * GRID_SIZE_INCHES, y: position.y + y * GRID_SIZE_INCHES },
        width: undefined,
        height: undefined,
        size: 1,
      });
    }
  } else {
    // For non-walls (tables, etc.), keep as a single block but set size
    return [{
      ...item,
      id: item.id || generateItemId(item.type),
      size: Math.max(width, height), // Use larger dimension as size
    }];
  }

  return items.length > 0 ? items : [item];
}

/**
 * Process a map definition item and expand it as needed
 */
function processMapItem(item: MapItem): MapItem[] {
  // If it has an endPosition, it's a linear segment
  if (item.endPosition) {
    return expandLinearSegment(item);
  }

  // If it has width and height, it's a rectangular block
  if (item.width && item.height) {
    return expandRectangularBlock(item);
  }

  // Otherwise, it's a simple point item
  return [{
    ...item,
    id: item.id || generateItemId(item.type),
    size: item.size || 1,
    maxHealth: item.health, // Set maxHealth to initial health
  }];
}

/**
 * Create character tokens from start positions
 */
function createCharacterTokens(
  player1Id: string,
  player2Id: string,
  startPositions: { player1: Position[]; player2: Position[] }
): CharacterToken[] {
  const tokens: CharacterToken[] = [];

  // Player 1 tokens (blue)
  startPositions.player1.forEach((pos, index) => {
    const role = CHARACTER_ROLES[index];
    tokens.push({
      id: `p1-token-${index + 1}`,
      playerId: player1Id,
      playerNumber: 1,
      position: pos,
      color: '#3b82f6', // Blue
      name: `P1 ${role}`,
      role: role,
      stats: { ...INITIAL_CHARACTER_STATS[role] }, // Clone stats
      state: 'Overt',
      isSelected: false,
    });
  });

  // Player 2 tokens (red)
  startPositions.player2.forEach((pos, index) => {
    const role = CHARACTER_ROLES[index];
    tokens.push({
      id: `p2-token-${index + 1}`,
      playerId: player2Id,
      playerNumber: 2,
      position: pos,
      color: '#ef4444', // Red
      name: `P2 ${role}`,
      role: role,
      stats: { ...INITIAL_CHARACTER_STATS[role] }, // Clone stats
      state: 'Overt',
      isSelected: false,
    });
  });

  return tokens;
}

/**
 * Load a map by ID and create the initial map state
 */
export function loadMap(
  mapId: string,
  player1Id: string,
  player2Id: string
): MapState {
  const mapDefinition = MAP_REGISTRY[mapId];

  if (!mapDefinition) {
    throw new Error(`Map not found: ${mapId}`);
  }

  // Process all map items and expand geometry
  const expandedItems: MapItem[] = [];
  mapDefinition.items.forEach((item) => {
    const processed = processMapItem(item as MapItem);
    expandedItems.push(...processed);
  });

  // Create character tokens
  const characters = createCharacterTokens(
    player1Id,
    player2Id,
    mapDefinition.startPositions
  );

  return {
    items: expandedItems,
    characters,
  };
}

/**
 * Get map definition without expanding items (for preview/info)
 */
export function getMapDefinition(mapId: string): MapDefinition | null {
  return MAP_REGISTRY[mapId] || null;
}
