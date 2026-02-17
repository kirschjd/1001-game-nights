import {
  getStateTransition,
  getWoundStateTransition,
  applyStateTransition,
  getStateModifiers,
  preservesHiddenState,
  preservesDisguisedState,
} from '../stateTransitions';
import { CharacterToken } from '../../types';

function makeCharacter(overrides: Partial<CharacterToken> = {}): CharacterToken {
  return {
    id: 'ninja-1',
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
    state: 'Hidden',
    ...overrides,
  };
}

describe('stateTransitions', () => {
  describe('getStateTransition', () => {
    it('Face Off → Disguised', () => {
      const char = makeCharacter({ state: 'Overt', role: 'Face' });
      expect(getStateTransition(char, 'Face Off', null, null)).toBe('Disguised');
    });

    it('Ninja Vanish → Hidden', () => {
      const char = makeCharacter({ state: 'Overt' });
      expect(getStateTransition(char, 'Ninja Vanish', null, null)).toBe('Hidden');
    });

    it('Go Loud: Hidden → Overt', () => {
      const char = makeCharacter({ state: 'Hidden' });
      expect(getStateTransition(char, 'Go Loud', null, null)).toBe('Overt');
    });

    it('Go Loud: Disguised → Overt', () => {
      const char = makeCharacter({ state: 'Disguised' });
      expect(getStateTransition(char, 'Go Loud', null, null)).toBe('Overt');
    });

    it('Go Loud: Overt → no change', () => {
      const char = makeCharacter({ state: 'Overt' });
      expect(getStateTransition(char, 'Go Loud', null, null)).toBeNull();
    });

    it('Wake Up: Stunned → Overt', () => {
      const char = makeCharacter({ state: 'Stunned' });
      expect(getStateTransition(char, 'Wake Up', null, null)).toBe('Overt');
    });

    it('attack with non-stealth weapon: Hidden → Overt', () => {
      const char = makeCharacter({ state: 'Hidden' });
      // 'Machine Gun' has no Notice.H flag, so it breaks Hidden
      expect(getStateTransition(char, 'attack', 'Machine Gun', 'hit')).toBe('Overt');
    });

    it('no transition when no relevant action', () => {
      const char = makeCharacter({ state: 'Overt' });
      expect(getStateTransition(char, 'Move', null, null)).toBeNull();
    });
  });

  describe('getWoundStateTransition', () => {
    it('wounds reach 0 first time → Stunned', () => {
      const char = makeCharacter({ state: 'Overt' });
      expect(getWoundStateTransition(char, 0, false)).toBe('Stunned');
    });

    it('wounds reach 0 second time → Unconscious', () => {
      const char = makeCharacter({ state: 'Overt' });
      expect(getWoundStateTransition(char, 0, true)).toBe('Unconscious');
    });

    it('wounds > 0 → no transition', () => {
      const char = makeCharacter({ state: 'Overt' });
      expect(getWoundStateTransition(char, 3, false)).toBeNull();
    });

    it('already Stunned and wounds reach 0 → Unconscious', () => {
      const char = makeCharacter({ state: 'Stunned' });
      expect(getWoundStateTransition(char, 0, false)).toBe('Unconscious');
    });
  });

  describe('applyStateTransition', () => {
    it('Wake Up resets wounds to 4', () => {
      const char = makeCharacter({
        state: 'Stunned',
        stats: { movement: 5, meleeSkill: 7, ballisticSkill: 9, wounds: 0, maxWounds: 7, defense: 9, hack: 8, con: 8 },
      });
      const updated = applyStateTransition(char, 'Overt');
      expect(updated.state).toBe('Overt');
      expect(updated.stats.wounds).toBe(4);
    });

    it('non-wake-up transition does not change wounds', () => {
      const char = makeCharacter({ state: 'Hidden' });
      const updated = applyStateTransition(char, 'Overt');
      expect(updated.state).toBe('Overt');
      expect(updated.stats.wounds).toBe(7); // unchanged
    });
  });

  describe('getStateModifiers', () => {
    it('Overt: +1 defense', () => {
      const mods = getStateModifiers('Overt');
      expect(mods.defenseModifier).toBe(1);
      expect(mods.hitModifier).toBe(0);
    });

    it('Hidden: -1 hit, +1 damage, -1 hack', () => {
      const mods = getStateModifiers('Hidden');
      expect(mods.hitModifier).toBe(-1);
      expect(mods.damageModifier).toBe(1);
      expect(mods.hackModifier).toBe(-1);
    });

    it('Disguised: -1 hit, +1 damage, -1 charm', () => {
      const mods = getStateModifiers('Disguised');
      expect(mods.hitModifier).toBe(-1);
      expect(mods.damageModifier).toBe(1);
      expect(mods.charmModifier).toBe(-1);
    });

    it('Stunned: no modifiers', () => {
      const mods = getStateModifiers('Stunned');
      expect(mods.hitModifier).toBe(0);
      expect(mods.defenseModifier).toBe(0);
    });
  });
});
