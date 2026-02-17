import { validateMove, validateMoveAndAttack, getEffectiveMovement } from '../movementValidation';
import { buildWallMap } from '../wallMap';
import { MapState, MapItem, CharacterToken } from '../../../types';

function makeCharacter(overrides: Partial<CharacterToken> = {}): CharacterToken {
  return {
    id: 'char-1',
    playerId: 'p1',
    playerNumber: 1,
    position: { x: 0, y: 0 },
    color: '#ff0000',
    name: 'Ninja',
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

function makeMapState(
  items: Partial<MapItem>[] = [],
  characters: CharacterToken[] = []
): MapState {
  return {
    items: items.map((item, i) => ({
      id: `item-${i}`,
      type: 'wall' as const,
      position: { x: 0, y: 0 },
      ...item,
    })) as MapItem[],
    characters,
    zones: [],
  };
}

describe('movementValidation', () => {
  describe('getEffectiveMovement', () => {
    it('move: returns base movement', () => {
      const char = makeCharacter(); // M=5
      expect(getEffectiveMovement(char, 'move')).toBe(5);
    });

    it('hustle: 2x movement + 2', () => {
      const char = makeCharacter(); // M=5
      expect(getEffectiveMovement(char, 'hustle')).toBe(12); // 2*5+2
    });

    it('sprint: 3x movement + 4', () => {
      const char = makeCharacter(); // M=5
      expect(getEffectiveMovement(char, 'sprint')).toBe(19); // 3*5+4
    });

    it('ninja-vanish: fixed 3', () => {
      const char = makeCharacter();
      expect(getEffectiveMovement(char, 'ninja-vanish')).toBe(3);
    });

    it('cqc-technique: fixed 3', () => {
      const char = makeCharacter();
      expect(getEffectiveMovement(char, 'cqc-technique')).toBe(3);
    });

    it('move-it-along: fixed 1', () => {
      const char = makeCharacter();
      expect(getEffectiveMovement(char, 'move-it-along')).toBe(1);
    });

    it('all-according-to-plan: fixed 1', () => {
      const char = makeCharacter();
      expect(getEffectiveMovement(char, 'all-according-to-plan')).toBe(1);
    });

    it('works with Muscle (M=3)', () => {
      const char = makeCharacter({
        role: 'Muscle',
        stats: {
          movement: 3, meleeSkill: 7, ballisticSkill: 8,
          wounds: 9, maxWounds: 9, defense: 7, hack: 10, con: 9,
        },
      });
      expect(getEffectiveMovement(char, 'move')).toBe(3);
      expect(getEffectiveMovement(char, 'hustle')).toBe(8); // 2*3+2
      expect(getEffectiveMovement(char, 'sprint')).toBe(13); // 3*3+4
    });
  });

  describe('validateMove', () => {
    it('valid move within range', () => {
      const char = makeCharacter({ position: { x: 0, y: 0 } }); // M=5
      const ms = makeMapState([], [char]);
      const wallMap = buildWallMap(ms);

      const result = validateMove(char, { x: 3, y: 0 }, wallMap, ms, 'hex');
      expect(result.valid).toBe(true);
      expect(result.distance).toBe(3);
      expect(result.path).toBeDefined();
      expect(result.path!.length).toBe(4); // 3 steps + start
    });

    it('invalid move beyond range', () => {
      const char = makeCharacter({ position: { x: 0, y: 0 } }); // M=5
      const ms = makeMapState([], [char]);
      const wallMap = buildWallMap(ms);

      const result = validateMove(char, { x: 6, y: 0 }, wallMap, ms, 'hex');
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('invalid move to wall', () => {
      const char = makeCharacter({ position: { x: 0, y: 0 } });
      const ms = makeMapState([
        { type: 'wall', position: { x: 2, y: 0 } },
      ], [char]);
      const wallMap = buildWallMap(ms);

      const result = validateMove(char, { x: 2, y: 0 }, wallMap, ms, 'hex');
      expect(result.valid).toBe(false);
    });

    it('uses hustle movement', () => {
      const char = makeCharacter({ position: { x: 0, y: 0 } }); // M=5, hustle=12
      const ms = makeMapState([], [char]);
      const wallMap = buildWallMap(ms);

      // 8 hexes: too far for normal move (5), fine for hustle (12)
      const result = validateMove(char, { x: 8, y: 0 }, wallMap, ms, 'hex', 'hustle');
      expect(result.valid).toBe(true);
      expect(result.distance).toBe(8);
    });
  });

  describe('validateMoveAndAttack', () => {
    it('valid: move within CQC range, target adjacent to destination', () => {
      const char = makeCharacter({ position: { x: 0, y: 0 } });
      const ms = makeMapState([], [char]);
      const wallMap = buildWallMap(ms);

      // Move 2 hexes, target at (3,0) is adjacent to destination (2,0)
      const result = validateMoveAndAttack(
        char, { x: 2, y: 0 }, { x: 3, y: 0 },
        wallMap, ms, 'hex'
      );
      expect(result.valid).toBe(true);
    });

    it('invalid: target not adjacent to destination', () => {
      const char = makeCharacter({ position: { x: 0, y: 0 } });
      const ms = makeMapState([], [char]);
      const wallMap = buildWallMap(ms);

      // Move 2 hexes, target at (5,0) is NOT adjacent to destination (2,0)
      const result = validateMoveAndAttack(
        char, { x: 2, y: 0 }, { x: 5, y: 0 },
        wallMap, ms, 'hex'
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('adjacent');
    });

    it('invalid: move destination unreachable', () => {
      const char = makeCharacter({ position: { x: 0, y: 0 } });
      const ms = makeMapState([], [char]);
      const wallMap = buildWallMap(ms);

      // CQC movement is 3, destination at 5 hexes is too far
      const result = validateMoveAndAttack(
        char, { x: 5, y: 0 }, { x: 6, y: 0 },
        wallMap, ms, 'hex'
      );
      expect(result.valid).toBe(false);
    });
  });
});
