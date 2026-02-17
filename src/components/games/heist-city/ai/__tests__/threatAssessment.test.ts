import { assessThreats, assessCharacterThreat, predictNPCThreat } from '../threatAssessment';
import { CharacterToken, MapItem, MapState } from '../../types';
import { AlertLevelState } from '../../engine/types';

function makeCharacter(overrides: Partial<CharacterToken> = {}): CharacterToken {
  return {
    id: 'char-1',
    playerId: 'p1',
    playerNumber: 1,
    position: { x: 0, y: 0 },
    color: '#ff0000',
    name: 'TestChar',
    role: 'Muscle',
    stats: {
      movement: 3, meleeSkill: 7, ballisticSkill: 8,
      wounds: 9, maxWounds: 9, defense: 7, hack: 10, con: 9,
    },
    state: 'Overt',
    equipment: [],
    ...overrides,
  };
}

function makeMapState(
  items: MapItem[] = [],
  characters: CharacterToken[] = []
): MapState {
  return { items, characters, zones: [] };
}

function makeAlertLevel(level: 0 | 1 | 2 | 3): AlertLevelState {
  const actionMap: Record<number, number> = { 0: 0, 1: 1, 2: 2, 3: 2 };
  return {
    level,
    unitsRevealed: level * 3,
    modifier: 0,
    total: level * 3,
    npcActionsPerActivation: actionMap[level],
  };
}

describe('threatAssessment', () => {
  describe('assessThreats', () => {
    it('returns empty when no enemies exist', () => {
      const myChar = makeCharacter({ playerNumber: 1 });
      const ms = makeMapState([], [myChar]);
      const threats = assessThreats(ms, 'hex', 1, makeAlertLevel(0));
      expect(threats).toHaveLength(0);
    });

    it('detects melee threat from adjacent enemy character', () => {
      const myChar = makeCharacter({ playerNumber: 1, position: { x: 0, y: 0 } });
      const enemy = makeCharacter({
        id: 'enemy-1', playerNumber: 2, position: { x: 1, y: 0 },
        stats: { movement: 3, meleeSkill: 7, ballisticSkill: 8, wounds: 9, maxWounds: 9, defense: 7, hack: 10, con: 9 },
      });
      const ms = makeMapState([], [myChar, enemy]);
      const threats = assessThreats(ms, 'hex', 1, makeAlertLevel(0));

      expect(threats.length).toBeGreaterThanOrEqual(1);
      const meleeThreat = threats.find(t => t.threatType === 'melee');
      expect(meleeThreat).toBeDefined();
      expect(meleeThreat!.characterId).toBe('char-1');
      expect(meleeThreat!.threatSourceId).toBe('enemy-1');
    });

    it('detects NPC guard threat at alert level 1', () => {
      const myChar = makeCharacter({ playerNumber: 1, position: { x: 0, y: 0 }, state: 'Overt' });
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 3, y: 0 } };
      const ms = makeMapState([guard], [myChar]);
      const threats = assessThreats(ms, 'hex', 1, makeAlertLevel(1));

      const npcThreat = threats.find(t => t.threatType === 'npc');
      expect(npcThreat).toBeDefined();
      expect(npcThreat!.threatSourceId).toBe('g1');
    });

    it('no NPC threats at alert level 0', () => {
      const myChar = makeCharacter({ playerNumber: 1, position: { x: 0, y: 0 }, state: 'Overt' });
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 3, y: 0 } };
      const ms = makeMapState([guard], [myChar]);
      const threats = assessThreats(ms, 'hex', 1, makeAlertLevel(0));

      const npcThreat = threats.find(t => t.threatType === 'npc');
      expect(npcThreat).toBeUndefined();
    });

    it('hidden characters are not threatened by NPCs', () => {
      const myChar = makeCharacter({ playerNumber: 1, position: { x: 0, y: 0 }, state: 'Hidden' });
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 3, y: 0 } };
      const ms = makeMapState([guard], [myChar]);
      const threats = assessThreats(ms, 'hex', 1, makeAlertLevel(1));

      const npcThreat = threats.find(t => t.threatType === 'npc');
      expect(npcThreat).toBeUndefined();
    });

    it('turret threatens overt character in range', () => {
      const myChar = makeCharacter({ playerNumber: 1, position: { x: 0, y: 0 }, state: 'Overt' });
      const turret: MapItem = { id: 'c1', type: 'enemy-camera', position: { x: 5, y: 0 } };
      const ms = makeMapState([turret], [myChar]);
      const threats = assessThreats(ms, 'hex', 1, makeAlertLevel(1));

      const npcThreat = threats.find(t => t.threatSourceId === 'c1');
      expect(npcThreat).toBeDefined();
      expect(npcThreat!.expectedDamagePerTurn).toBeGreaterThan(0);
    });
  });

  describe('assessCharacterThreat', () => {
    it('returns empty for character with no nearby threats', () => {
      const myChar = makeCharacter({ playerNumber: 1, position: { x: 0, y: 0 } });
      const ms = makeMapState([], [myChar]);
      const threats = assessCharacterThreat(myChar, ms, 'hex', makeAlertLevel(0));
      expect(threats).toHaveLength(0);
    });
  });

  describe('predictNPCThreat', () => {
    it('returns 0 at alert level 0', () => {
      const myChar = makeCharacter({ playerNumber: 1, state: 'Overt' });
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 1, y: 0 } };
      const ms = makeMapState([guard], [myChar]);
      expect(predictNPCThreat(myChar, ms, 'hex', makeAlertLevel(0))).toBe(0);
    });

    it('returns 0 for hidden character', () => {
      const myChar = makeCharacter({ playerNumber: 1, state: 'Hidden' });
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 1, y: 0 } };
      const ms = makeMapState([guard], [myChar]);
      expect(predictNPCThreat(myChar, ms, 'hex', makeAlertLevel(1))).toBe(0);
    });

    it('returns positive for overt character near guard', () => {
      const myChar = makeCharacter({ playerNumber: 1, state: 'Overt', position: { x: 0, y: 0 } });
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 1, y: 0 } };
      const ms = makeMapState([guard], [myChar]);
      const threat = predictNPCThreat(myChar, ms, 'hex', makeAlertLevel(1));
      expect(threat).toBeGreaterThan(0);
    });
  });
});
