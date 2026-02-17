import {
  validateMovement,
  validateAlertLevel,
  validateActionSlots,
  validateStateChange,
  validateStealthAfterAttack,
  validateCombatAction,
  validateVPAward,
  validateTurnEnd,
} from '../rulesAdvisor';
import { shouldShow, muteCategory, DEFAULT_ADVISOR_CONFIG } from '../advisorConfig';
import { CharacterToken, MapItem, MapState } from '../../../types';
import { TurnState } from '../../types';

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
  items: MapItem[] = [],
  characters: CharacterToken[] = [],
): MapState {
  return { items, characters, zones: [] };
}

function makeTurnState(
  characters: CharacterToken[],
  overrides: Partial<TurnState> = {},
): TurnState {
  const activations = new Map<string, boolean>();
  for (const char of characters) {
    activations.set(char.id, true);
  }
  return {
    turnNumber: 1,
    phase: 'player-activation',
    activePlayerNumber: 1,
    activationsRemaining: activations,
    npcPhaseComplete: false,
    ...overrides,
  };
}

describe('rulesAdvisor', () => {
  // ============== Movement ==============
  describe('validateMovement', () => {
    it('no advisories for valid move within range', () => {
      const char = makeCharacter({ position: { x: 3, y: 0 } });
      const ms = makeMapState([], [char]);
      const entries = validateMovement(char, { x: 0, y: 0 }, { x: 3, y: 0 }, ms, 'hex');
      expect(entries).toHaveLength(0);
    });

    it('warns when move exceeds movement stat', () => {
      const char = makeCharacter({ stats: { ...makeCharacter().stats, movement: 5 } });
      const ms = makeMapState([], [char]);
      const entries = validateMovement(char, { x: 0, y: 0 }, { x: 7, y: 0 }, ms, 'hex');
      const moveWarning = entries.find(e => e.category === 'movement' && e.severity === 'warning');
      expect(moveWarning).toBeDefined();
      expect(moveWarning!.message).toContain('7 hexes');
      expect(moveWarning!.message).toContain('movement is 5');
    });

    it('warns when stunned character moves', () => {
      const char = makeCharacter({ state: 'Stunned' });
      const ms = makeMapState([], [char]);
      const entries = validateMovement(char, { x: 0, y: 0 }, { x: 1, y: 0 }, ms, 'hex');
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toContain('Stunned');
    });

    it('detects wall obstruction', () => {
      // Surround the destination (5,0) with walls on all 6 hex neighbors
      const walls: MapItem[] = [
        { id: 'w1', type: 'wall', position: { x: 4, y: 0 } },
        { id: 'w2', type: 'wall', position: { x: 4, y: 1 } },
        { id: 'w3', type: 'wall', position: { x: 5, y: -1 } },
        { id: 'w4', type: 'wall', position: { x: 5, y: 1 } },
        { id: 'w5', type: 'wall', position: { x: 6, y: -1 } },
        { id: 'w6', type: 'wall', position: { x: 6, y: 0 } },
      ];
      const char = makeCharacter();
      const ms = makeMapState(walls, [char]);
      const entries = validateMovement(char, { x: 0, y: 0 }, { x: 5, y: 0 }, ms, 'hex');
      const wallEntry = entries.find(e => e.message.includes('no valid path'));
      expect(wallEntry).toBeDefined();
    });
  });

  // ============== Alert Level ==============
  describe('validateAlertLevel', () => {
    it('no advisories when level matches', () => {
      const ms = makeMapState([], [
        makeCharacter({ id: 'c1', state: 'Overt' }),
        makeCharacter({ id: 'c2', state: 'Overt' }),
        makeCharacter({ id: 'c3', state: 'Overt' }),
      ]);
      // 3 overt + 0 modifier = 3 → level 1
      const entries = validateAlertLevel(ms, 0, 1);
      expect(entries).toHaveLength(0);
    });

    it('warns when displayed level does not match computed', () => {
      const ms = makeMapState([], [
        makeCharacter({ id: 'c1', state: 'Overt' }),
        makeCharacter({ id: 'c2', state: 'Overt' }),
        makeCharacter({ id: 'c3', state: 'Overt' }),
        makeCharacter({ id: 'c4', state: 'Overt' }),
        makeCharacter({ id: 'c5', state: 'Overt' }),
        makeCharacter({ id: 'c6', state: 'Overt' }),
      ]);
      // 6 overt → level 2, but displayed as 1
      const entries = validateAlertLevel(ms, 0, 1);
      expect(entries).toHaveLength(1);
      expect(entries[0].severity).toBe('warning');
      expect(entries[0].category).toBe('alert');
      expect(entries[0].message).toContain('should be level 2');
    });
  });

  // ============== Action Slots ==============
  describe('validateActionSlots', () => {
    it('no advisories for valid single actions', () => {
      const char = makeCharacter();
      const entries = validateActionSlots(char, ['Move (5")']);
      expect(entries).toHaveLength(0);
    });

    it('errors when total slot cost exceeds 3', () => {
      const char = makeCharacter();
      // Simulate 4 single-slot actions — shouldn't be possible
      const entries = validateActionSlots(char, ['Move (5")', 'Hack', 'Con', 'Move (5")']);
      const err = entries.find(e => e.severity === 'error' && e.category === 'action-slots');
      expect(err).toBeDefined();
      expect(err!.message).toContain('4 slots');
    });

    it('warns when Stunned character uses non-Wake-Up action', () => {
      const char = makeCharacter({ state: 'Stunned' });
      const entries = validateActionSlots(char, ['Move (5")']);
      const warn = entries.find(e => e.message.includes('Stunned'));
      expect(warn).toBeDefined();
    });

    it('no warning for Stunned character using Wake Up', () => {
      const char = makeCharacter({ state: 'Stunned' });
      const entries = validateActionSlots(char, ['Wake Up']);
      const stunnedWarnings = entries.filter(e => e.message.includes('Stunned'));
      expect(stunnedWarnings).toHaveLength(0);
    });

    it('errors when Unconscious character has actions', () => {
      const char = makeCharacter({ state: 'Unconscious' });
      const entries = validateActionSlots(char, ['Move (5")']);
      const err = entries.find(e => e.severity === 'error');
      expect(err).toBeDefined();
      expect(err!.message).toContain('Unconscious');
    });

    it('errors when once-per-game ability used twice', () => {
      const char = makeCharacter({ role: 'Ninja' });
      const used = new Set(['Ninja Vanish']);
      const entries = validateActionSlots(char, ['Ninja Vanish'], used);
      const err = entries.find(e => e.severity === 'error' && e.message.includes('already used'));
      expect(err).toBeDefined();
    });

    it('warns when Ninja Vanish used while already Hidden', () => {
      const char = makeCharacter({ state: 'Hidden' });
      const entries = validateActionSlots(char, ['Ninja Vanish']);
      const warn = entries.find(e => e.message.includes('already Hidden'));
      expect(warn).toBeDefined();
    });
  });

  // ============== State Change ==============
  describe('validateStateChange', () => {
    it('no advisories for valid Face Off → Disguised', () => {
      const char = makeCharacter();
      const entries = validateStateChange(char, 'Overt', 'Disguised', 'Face Off');
      expect(entries).toHaveLength(0);
    });

    it('no advisories for valid Ninja Vanish → Hidden', () => {
      const char = makeCharacter();
      const entries = validateStateChange(char, 'Overt', 'Hidden', 'Ninja Vanish');
      expect(entries).toHaveLength(0);
    });

    it('no advisories for valid Go Loud → Overt', () => {
      const char = makeCharacter({ state: 'Hidden' });
      const entries = validateStateChange(char, 'Hidden', 'Overt', 'Go Loud');
      expect(entries).toHaveLength(0);
    });

    it('no advisories when state unchanged', () => {
      const char = makeCharacter();
      const entries = validateStateChange(char, 'Overt', 'Overt', null);
      expect(entries).toHaveLength(0);
    });

    it('warns when going Hidden without Ninja Vanish', () => {
      const char = makeCharacter();
      const entries = validateStateChange(char, 'Overt', 'Hidden', null);
      const warn = entries.find(e => e.message.includes('without using Ninja Vanish'));
      expect(warn).toBeDefined();
    });

    it('warns when going Disguised without Face Off', () => {
      const char = makeCharacter();
      const entries = validateStateChange(char, 'Overt', 'Disguised', null);
      const warn = entries.find(e => e.message.includes('without using Face Off'));
      expect(warn).toBeDefined();
    });
  });

  // ============== Stealth After Attack ==============
  describe('validateStealthAfterAttack', () => {
    it('warns when Hidden character attacks with non-hidden weapon', () => {
      const char = makeCharacter({ state: 'Hidden' });
      // 'Machine Gun' is not in the equipment DB with Notice.Hidden flag
      const entries = validateStealthAfterAttack(char, 'Machine Gun');
      expect(entries.length).toBeGreaterThanOrEqual(1);
      expect(entries[0].message).toContain('not Hidden-compatible');
    });

    it('no warning when Overt character attacks', () => {
      const char = makeCharacter({ state: 'Overt' });
      const entries = validateStealthAfterAttack(char, 'Machine Gun');
      expect(entries).toHaveLength(0);
    });
  });

  // ============== Combat Validation ==============
  describe('validateCombatAction', () => {
    it('warns when melee target is out of range', () => {
      const attacker = makeCharacter({ position: { x: 0, y: 0 } });
      const target = makeCharacter({ id: 'target', position: { x: 5, y: 0 } });
      const ms = makeMapState([], [attacker, target]);
      const entries = validateCombatAction(attacker, target, 'fist', 'melee', null, ms, 'hex');
      const warn = entries.find(e => e.category === 'targeting');
      expect(warn).toBeDefined();
      expect(warn!.message).toContain('5 hexes');
    });

    it('no warning for adjacent melee target', () => {
      const attacker = makeCharacter({ position: { x: 0, y: 0 } });
      const target = makeCharacter({ id: 'target', position: { x: 1, y: 0 } });
      const ms = makeMapState([], [attacker, target]);
      const entries = validateCombatAction(attacker, target, 'fist', 'melee', 1, ms, 'hex');
      const targeting = entries.filter(e => e.category === 'targeting');
      expect(targeting).toHaveLength(0);
    });

    it('warns when ranged target is beyond weapon range', () => {
      const attacker = makeCharacter({ position: { x: 0, y: 0 } });
      const target = makeCharacter({ id: 'target', position: { x: 15, y: 0 } });
      const ms = makeMapState([], [attacker, target]);
      // Plink Gun has range 7 in equipment.json
      const entries = validateCombatAction(attacker, target, 'Plink Gun', 'ranged', null, ms, 'hex');
      const rangeWarn = entries.find(e => e.category === 'targeting' && e.message.includes('range'));
      expect(rangeWarn).toBeDefined();
    });

    it('warns when reported damage is impossibly high', () => {
      const attacker = makeCharacter({ position: { x: 0, y: 0 } });
      const target = makeCharacter({ id: 'target', position: { x: 1, y: 0 } });
      const ms = makeMapState([], [attacker, target]);
      // Fist does 1 base damage, report 5
      const entries = validateCombatAction(attacker, target, 'fist', 'melee', 5, ms, 'hex');
      const dmgWarn = entries.find(e => e.category === 'combat' && e.message.includes('damage'));
      expect(dmgWarn).toBeDefined();
    });
  });

  // ============== VP Validation ==============
  describe('validateVPAward', () => {
    it('no advisories for normal 1 VP gain', () => {
      const char = makeCharacter({ victoryPoints: 1 });
      const entries = validateVPAward(char, 1, 0);
      expect(entries).toHaveLength(0);
    });

    it('warns on VP loss', () => {
      const char = makeCharacter({ victoryPoints: 0 });
      const entries = validateVPAward(char, -1, 1);
      const warn = entries.find(e => e.message.includes('lost'));
      expect(warn).toBeDefined();
    });

    it('warns on VP gain > 3', () => {
      const char = makeCharacter({ victoryPoints: 4 });
      const entries = validateVPAward(char, 4, 0);
      const warn = entries.find(e => e.message.includes('4 VP'));
      expect(warn).toBeDefined();
    });

    it('allows 3 VP gain (info drop extract)', () => {
      const char = makeCharacter({ victoryPoints: 3 });
      const entries = validateVPAward(char, 3, 0);
      const warn = entries.find(e => e.severity === 'warning');
      expect(warn).toBeUndefined();
    });
  });

  // ============== Turn End ==============
  describe('validateTurnEnd', () => {
    it('flags unactivated characters', () => {
      const c1 = makeCharacter({ id: 'c1', name: 'Brain' });
      const c2 = makeCharacter({ id: 'c2', name: 'Muscle' });
      const ms = makeMapState([], [c1, c2]);
      const ts = makeTurnState([c1, c2]);
      // c1 hasn't activated (still true in activationsRemaining)
      ts.activationsRemaining.set('c2', false); // c2 has activated

      const entries = validateTurnEnd(ms, ts, 0, 0);
      const unactivated = entries.filter(e => e.category === 'turn-order' && e.message.includes('not activated'));
      expect(unactivated).toHaveLength(1);
      expect(unactivated[0].message).toContain('Brain');
    });

    it('no unactivated warnings when all activated', () => {
      const c1 = makeCharacter({ id: 'c1' });
      const ms = makeMapState([], [c1]);
      const ts = makeTurnState([c1]);
      ts.activationsRemaining.set('c1', false);

      const entries = validateTurnEnd(ms, ts, 0, 0);
      const unactivated = entries.filter(e => e.message.includes('not activated'));
      expect(unactivated).toHaveLength(0);
    });

    it('skips Unconscious characters', () => {
      const c1 = makeCharacter({ id: 'c1', state: 'Unconscious' });
      const ms = makeMapState([], [c1]);
      const ts = makeTurnState([c1]);

      const entries = validateTurnEnd(ms, ts, 0, 0);
      const unactivated = entries.filter(e => e.message.includes('not activated'));
      expect(unactivated).toHaveLength(0);
    });

    it('includes alert level check', () => {
      const chars = [
        makeCharacter({ id: 'c1', state: 'Overt' }),
        makeCharacter({ id: 'c2', state: 'Overt' }),
        makeCharacter({ id: 'c3', state: 'Overt' }),
      ];
      const ms = makeMapState([], chars);
      const ts = makeTurnState(chars);
      chars.forEach(c => ts.activationsRemaining.set(c.id, false));
      // 3 overt → level 1, but say displayed is 0
      const entries = validateTurnEnd(ms, ts, 0, 0);
      const alertWarn = entries.find(e => e.category === 'alert');
      expect(alertWarn).toBeDefined();
    });
  });

  // ============== Muting Integration ==============
  describe('muting integration', () => {
    it('entries are created but filtered by muted config', () => {
      const char = makeCharacter({ stats: { ...makeCharacter().stats, movement: 5 } });
      const ms = makeMapState([], [char]);
      const entries = validateMovement(char, { x: 0, y: 0 }, { x: 7, y: 0 }, ms, 'hex');
      expect(entries.length).toBeGreaterThan(0);

      const mutedConfig = muteCategory(DEFAULT_ADVISOR_CONFIG, 'movement');
      for (const entry of entries) {
        expect(shouldShow(entry, mutedConfig)).toBe(false);
      }
    });

    it('non-muted categories still show', () => {
      const char = makeCharacter({ stats: { ...makeCharacter().stats, movement: 5 } });
      const ms = makeMapState([], [char]);
      const entries = validateMovement(char, { x: 0, y: 0 }, { x: 7, y: 0 }, ms, 'hex');
      expect(entries.length).toBeGreaterThan(0);

      const mutedConfig = muteCategory(DEFAULT_ADVISOR_CONFIG, 'combat');
      for (const entry of entries) {
        expect(shouldShow(entry, mutedConfig)).toBe(true);
      }
    });
  });
});
