import { calculateNPCMove, isAdjacentToTarget } from '../npcMovement';
import { CharacterToken, MapItem, MapState } from '../../../types';

function makeCharacter(overrides: Partial<CharacterToken> = {}): CharacterToken {
  return {
    id: 'char-1',
    playerId: 'p1',
    playerNumber: 1,
    position: { x: 0, y: 0 },
    color: '#ff0000',
    name: 'TestChar',
    role: 'Ninja',
    stats: {
      movement: 5, meleeSkill: 7, ballisticSkill: 9,
      wounds: 7, maxWounds: 7, defense: 9, hack: 8, con: 8,
    },
    state: 'Overt',
    equipment: [],
    ...overrides,
  };
}

function makeGuard(overrides: Partial<MapItem> = {}): MapItem {
  return {
    id: 'guard-1',
    type: 'enemy-security-guard',
    position: { x: 0, y: 0 },
    ...overrides,
  };
}

function makeMapState(
  items: MapItem[] = [],
  characters: CharacterToken[] = []
): MapState {
  return { items, characters, zones: [] };
}

describe('npcMovement', () => {
  describe('isAdjacentToTarget', () => {
    it('returns true for adjacent hexes', () => {
      expect(isAdjacentToTarget({ x: 0, y: 0 }, { x: 1, y: 0 }, 'hex')).toBe(true);
    });

    it('returns false for distant hexes', () => {
      expect(isAdjacentToTarget({ x: 0, y: 0 }, { x: 3, y: 0 }, 'hex')).toBe(false);
    });

    it('returns true for same position', () => {
      expect(isAdjacentToTarget({ x: 2, y: 2 }, { x: 2, y: 2 }, 'hex')).toBe(true);
    });
  });

  describe('calculateNPCMove', () => {
    it('guard moves toward target', () => {
      const guard = makeGuard({ position: { x: 0, y: 0 } });
      const target = makeCharacter({ position: { x: 8, y: 0 } }); // far enough that M=4 isn't enough
      const ms = makeMapState([guard], [target]);

      const result = calculateNPCMove(guard, 4, target, ms, 'hex');
      expect(result).not.toBeNull();
      expect(result!.distanceMoved).toBe(4);
      expect(result!.path.length).toBe(5); // start + 4 steps
    });

    it('returns null for camera/turret (stationary)', () => {
      const camera: MapItem = {
        id: 'cam-1', type: 'enemy-camera', position: { x: 0, y: 0 },
      };
      const target = makeCharacter({ position: { x: 5, y: 0 } });
      const ms = makeMapState([camera], [target]);

      expect(calculateNPCMove(camera, 0, target, ms, 'hex')).toBeNull();
    });

    it('returns null if already adjacent to target', () => {
      const guard = makeGuard({ position: { x: 1, y: 0 } });
      const target = makeCharacter({ position: { x: 0, y: 0 } });
      const ms = makeMapState([guard], [target]);

      expect(calculateNPCMove(guard, 4, target, ms, 'hex')).toBeNull();
    });

    it('moves around walls', () => {
      const guard = makeGuard({ position: { x: 0, y: 0 } });
      const target = makeCharacter({ position: { x: 5, y: 0 } }); // far enough for wall detour
      const wall: MapItem = { id: 'wall-1', type: 'wall', position: { x: 2, y: 0 } };
      const ms = makeMapState([guard, wall], [target]);

      const result = calculateNPCMove(guard, 4, target, ms, 'hex');
      expect(result).not.toBeNull();
      // Path should not pass through the wall
      for (const pos of result!.path) {
        expect(pos.x === 2 && pos.y === 0).toBe(false);
      }
    });

    it('caps movement at movement stat', () => {
      const guard = makeGuard({ position: { x: 0, y: 0 } });
      const target = makeCharacter({ position: { x: 12, y: 0 } }); // well beyond M=4
      const ms = makeMapState([guard], [target]);

      const result = calculateNPCMove(guard, 4, target, ms, 'hex');
      expect(result).not.toBeNull();
      expect(result!.distanceMoved).toBeLessThanOrEqual(4);
    });
  });
});
