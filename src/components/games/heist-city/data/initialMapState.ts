import { MapState, CharacterToken } from '../types';
import { PLAYER_COLORS, TOKENS_PER_PLAYER } from './mapConstants';
import { INITIAL_CHARACTER_STATS, CHARACTER_ROLES } from './characterStats';

// Initial character tokens for both players
export const createInitialTokens = (player1Id: string, player2Id: string): CharacterToken[] => {
  const tokens: CharacterToken[] = [];

  // Player 1 tokens - start at bottom left
  for (let i = 0; i < TOKENS_PER_PLAYER; i++) {
    const role = CHARACTER_ROLES[i];
    tokens.push({
      id: `p1-token-${i}`,
      playerId: player1Id,
      playerNumber: 1,
      position: { x: 2 + i * 2, y: 34 }, // Spread along bottom
      color: PLAYER_COLORS[1],
      name: `P1 ${role}`,
      role: role,
      stats: { ...INITIAL_CHARACTER_STATS[role] }, // Clone stats
      state: 'Overt',
      isSelected: false,
    });
  }

  // Player 2 tokens - start at top right
  for (let i = 0; i < TOKENS_PER_PLAYER; i++) {
    const role = CHARACTER_ROLES[i];
    tokens.push({
      id: `p2-token-${i}`,
      playerId: player2Id,
      playerNumber: 2,
      position: { x: 34 - i * 2, y: 2 }, // Spread along top
      color: PLAYER_COLORS[2],
      name: `P2 ${role}`,
      role: role,
      stats: { ...INITIAL_CHARACTER_STATS[role] }, // Clone stats
      state: 'Overt',
      isSelected: false,
    });
  }

  return tokens;
};

// Create an empty map state
export const createEmptyMapState = (): MapState => {
  return {
    items: [],
    characters: [],
    zones: [],
  };
};

// Sample map with some items (for testing/demo)
export const createSampleMap = (player1Id: string, player2Id: string): MapState => {
  return {
    characters: createInitialTokens(player1Id, player2Id),
    zones: [],
    items: [
      // Walls forming a simple room structure
      { id: 'wall-1', type: 'wall', position: { x: 10, y: 10 } },
      { id: 'wall-2', type: 'wall', position: { x: 11, y: 10 } },
      { id: 'wall-3', type: 'wall', position: { x: 12, y: 10 } },
      { id: 'wall-4', type: 'wall', position: { x: 10, y: 11 } },
      { id: 'wall-5', type: 'wall', position: { x: 12, y: 11 } },

      // Tables
      { id: 'table-1', type: 'table', position: { x: 15, y: 15 } },
      { id: 'table-2', type: 'table', position: { x: 20, y: 20 } },

      // Computers
      { id: 'computer-1', type: 'computer', position: { x: 18, y: 18 } },

      // Gear
      { id: 'gear-1', type: 'gear', position: { x: 25, y: 15 } },
      { id: 'gear-2', type: 'gear', position: { x: 12, y: 25 } },

      // Teleporter pair
      { id: 'teleporter-1', type: 'teleporter', position: { x: 5, y: 18 }, properties: { linkedTo: 'teleporter-2' } },
      { id: 'teleporter-2', type: 'teleporter', position: { x: 30, y: 18 }, properties: { linkedTo: 'teleporter-1' } },

      // Info drops
      { id: 'info-1', type: 'info-drop', position: { x: 18, y: 10 } },

      // Enemy elements
      { id: 'camera-1', type: 'enemy-camera', position: { x: 18, y: 5 }, rotation: 180 },
      { id: 'guard-1', type: 'enemy-security-guard', position: { x: 18, y: 25 } },
    ],
  };
};
