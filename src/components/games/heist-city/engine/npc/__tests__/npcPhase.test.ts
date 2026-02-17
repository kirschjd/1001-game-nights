import { executeNPCPhase, previewNPCPhase } from '../npcPhase';
import { CharacterToken, MapItem, MapState } from '../../../types';
import { DiceRollResult, AlertLevelState } from '../../types';

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

// Deterministic roll provider for tests
function createRollProvider(rolls: number[]): () => DiceRollResult {
  let idx = 0;
  return () => {
    const total = rolls[idx % rolls.length];
    idx++;
    return {
      dice1: Math.ceil(total / 2),
      dice2: Math.floor(total / 2),
      total,
    };
  };
}

describe('npcPhase', () => {
  describe('executeNPCPhase', () => {
    it('returns empty result at alert level 0', () => {
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 5, y: 0 } };
      const char = makeCharacter({ state: 'Overt' });
      const ms = makeMapState([guard], [char]);
      const alert = makeAlertLevel(0);

      const result = executeNPCPhase(ms, alert, 'hex', createRollProvider([8]));

      expect(result.combatLog).toHaveLength(0);
      expect(result.stateChanges).toHaveLength(0);
      expect(result.elitesSpawned).toHaveLength(0);
    });

    it('guard moves toward overt character at alert 1', () => {
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 8, y: 0 } };
      const char = makeCharacter({ position: { x: 0, y: 0 }, state: 'Overt' });
      const ms = makeMapState([guard], [char]);
      const alert = makeAlertLevel(1); // 1 action per NPC

      const result = executeNPCPhase(ms, alert, 'hex', createRollProvider([8]));

      expect(result.combatLog.length).toBeGreaterThanOrEqual(1);
      const moveEntry = result.combatLog.find(e => e.action === 'move');
      expect(moveEntry).toBeDefined();
      expect(moveEntry!.newPosition).toBeDefined();
    });

    it('guard attacks adjacent overt character at alert 1', () => {
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 1, y: 0 } };
      const char = makeCharacter({ position: { x: 0, y: 0 }, state: 'Overt' });
      const ms = makeMapState([guard], [char]);
      const alert = makeAlertLevel(1);

      // Roll 8 → hit (MS=7), defense roll 6 → fail (D=7, Overt +1 = 7, 7 >= 7 → save)
      // Actually: defense effective = 6 + 1 = 7, target D = 7, 7 >= 7 = saved
      // Damage prevented: 1 + (7-7) = 1. Incoming 2. Final: 1 damage.
      const result = executeNPCPhase(ms, alert, 'hex', createRollProvider([8, 6]));

      const attackEntry = result.combatLog.find(e => e.action === 'melee-attack');
      expect(attackEntry).toBeDefined();
      expect(attackEntry!.result).toBeDefined();
      expect(attackEntry!.result!.attack.hit).toBe(true);
    });

    it('turret attacks in range with LOS at alert 1', () => {
      const turret: MapItem = { id: 'c1', type: 'enemy-camera', position: { x: 5, y: 0 } };
      const char = makeCharacter({ position: { x: 0, y: 0 }, state: 'Overt' });
      const ms = makeMapState([turret], [char]);
      const alert = makeAlertLevel(1);

      const result = executeNPCPhase(ms, alert, 'hex', createRollProvider([8, 6]));

      const attackEntry = result.combatLog.find(e => e.action === 'ranged-attack');
      expect(attackEntry).toBeDefined();
    });

    it('ignores Hidden characters', () => {
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 5, y: 0 } };
      const hidden = makeCharacter({ id: 'h1', state: 'Hidden' });
      const ms = makeMapState([guard], [hidden]);
      const alert = makeAlertLevel(1);

      const result = executeNPCPhase(ms, alert, 'hex', createRollProvider([8]));

      // No target → no actions logged
      expect(result.combatLog).toHaveLength(0);
    });

    it('spawns elites at alert level 3', () => {
      const portal: MapItem = { id: 'tp1', type: 'teleporter', position: { x: 10, y: 0 } };
      const char = makeCharacter({ position: { x: 0, y: 0 }, state: 'Overt' });
      const ms = makeMapState([portal], [char]);
      const alert = makeAlertLevel(3);

      const result = executeNPCPhase(ms, alert, 'hex', createRollProvider([8, 6]));

      expect(result.elitesSpawned).toHaveLength(1);
      expect(result.elitesSpawned[0].type).toBe('enemy-elite');
    });

    it('NPCs get 2 actions at alert level 2', () => {
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 1, y: 0 } };
      const char = makeCharacter({ position: { x: 0, y: 0 }, state: 'Overt' });
      const ms = makeMapState([guard], [char]);
      const alert = makeAlertLevel(2); // 2 actions

      // Provide enough rolls: 2 attacks × (attackRoll + defenseRoll)
      const result = executeNPCPhase(ms, alert, 'hex', createRollProvider([8, 6, 8, 6]));

      // Guard is adjacent, so should attack twice (2 actions at alert level 2)
      const attacks = result.combatLog.filter(e => e.action === 'melee-attack');
      expect(attacks.length).toBe(2);
    });

    it('records state changes when target is downed', () => {
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 1, y: 0 } };
      // Character with very low wounds
      const char = makeCharacter({
        position: { x: 0, y: 0 }, state: 'Overt',
        stats: { movement: 3, meleeSkill: 7, ballisticSkill: 8, wounds: 1, maxWounds: 9, defense: 10, hack: 10, con: 9 },
      });
      const ms = makeMapState([guard], [char]);
      const alert = makeAlertLevel(1);

      // Attack hits (8 > 7), defense fails (3 + 1 = 4 < 10)
      const result = executeNPCPhase(ms, alert, 'hex', createRollProvider([8, 3]));

      // Character should lose wounds
      const updatedChar = result.updatedMapState.characters.find(c => c.id === char.id);
      expect(updatedChar!.stats.wounds).toBeLessThan(1);
    });
  });

  describe('previewNPCPhase', () => {
    it('returns empty at alert level 0', () => {
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 5, y: 0 } };
      const char = makeCharacter({ state: 'Overt' });
      const ms = makeMapState([guard], [char]);
      const alert = makeAlertLevel(0);

      expect(previewNPCPhase(ms, alert, 'hex')).toHaveLength(0);
    });

    it('previews guard targeting nearest overt', () => {
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 3, y: 0 } };
      const char = makeCharacter({ id: 'target', position: { x: 0, y: 0 }, state: 'Overt' });
      const ms = makeMapState([guard], [char]);
      const alert = makeAlertLevel(1);

      const previews = previewNPCPhase(ms, alert, 'hex');
      expect(previews).toHaveLength(1);
      expect(previews[0].npcId).toBe('g1');
      expect(previews[0].targetId).toBe('target');
      expect(previews[0].wouldReachTarget).toBe(true); // 3 distance, M=4
    });

    it('previews turret with expected damage', () => {
      const turret: MapItem = { id: 'c1', type: 'enemy-camera', position: { x: 5, y: 0 } };
      const char = makeCharacter({ id: 'target', position: { x: 0, y: 0 }, state: 'Overt' });
      const ms = makeMapState([turret], [char]);
      const alert = makeAlertLevel(1);

      const previews = previewNPCPhase(ms, alert, 'hex');
      expect(previews).toHaveLength(1);
      expect(previews[0].expectedDamage).toBeGreaterThan(0);
    });

    it('preview returns null targetId when no targets', () => {
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 5, y: 0 } };
      const hidden = makeCharacter({ id: 'h1', state: 'Hidden' });
      const ms = makeMapState([guard], [hidden]);
      const alert = makeAlertLevel(1);

      const previews = previewNPCPhase(ms, alert, 'hex');
      expect(previews).toHaveLength(1);
      expect(previews[0].targetId).toBeNull();
      expect(previews[0].expectedDamage).toBe(0);
    });
  });
});
