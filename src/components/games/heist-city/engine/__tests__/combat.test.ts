import {
  resolveRangedAttack,
  resolveMeleeAttack,
  resolveDefenseSave,
  applyDamage,
  resolveCombat,
  resolveHackCheck,
  resolveCharmCheck,
} from '../combat';
import { CharacterToken } from '../../types';
import { DiceRollResult } from '../types';

function makeCharacter(overrides: Partial<CharacterToken> = {}): CharacterToken {
  return {
    id: 'char-1',
    playerId: 'p1',
    playerNumber: 1,
    position: { x: 0, y: 0 },
    color: '#ff0000',
    name: 'Test',
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

function makeRoll(dice1: number, dice2: number): DiceRollResult {
  return { dice1, dice2, total: dice1 + dice2 };
}

describe('combat', () => {
  describe('resolveRangedAttack', () => {
    it('hits when roll > BS', () => {
      const attacker = makeCharacter({ state: 'Overt' });
      const target = makeCharacter({ id: 'target' });
      // BS is 9, roll 10 → hit
      const result = resolveRangedAttack(attacker, target, 'Plink Gun', makeRoll(5, 5));
      expect(result.hit).toBe(true);
      expect(result.targetNumber).toBe(9);
    });

    it('misses when roll <= BS', () => {
      const attacker = makeCharacter({ state: 'Overt' });
      const target = makeCharacter({ id: 'target' });
      // BS is 9, roll 9 → miss (need strictly greater)
      const result = resolveRangedAttack(attacker, target, 'Plink Gun', makeRoll(4, 5));
      expect(result.hit).toBe(false);
    });

    it('applies repeat penalty', () => {
      const attacker = makeCharacter({ state: 'Overt' });
      const target = makeCharacter({ id: 'target' });
      // BS is 9, repeat penalty +1 → need >10, roll 10 → miss
      const result = resolveRangedAttack(attacker, target, 'Plink Gun', makeRoll(5, 5), 1);
      expect(result.hit).toBe(false);
      expect(result.targetNumber).toBe(10);
    });

    it('applies into-melee penalty', () => {
      const attacker = makeCharacter({ state: 'Overt' });
      const target = makeCharacter({ id: 'target' });
      // BS is 9, into melee +1 → need >10, roll 10 → miss
      const result = resolveRangedAttack(attacker, target, 'Plink Gun', makeRoll(5, 5), 0, true);
      expect(result.hit).toBe(false);
      expect(result.targetNumber).toBe(10);
    });

    it('Hidden: -1 to DC', () => {
      const attacker = makeCharacter({ state: 'Hidden' });
      const target = makeCharacter({ id: 'target' });
      // BS is 9, Hidden -1 → DC 8, roll 9 → hit
      const result = resolveRangedAttack(attacker, target, 'Plink Gun', makeRoll(4, 5));
      expect(result.hit).toBe(true);
      expect(result.targetNumber).toBe(8);
    });
  });

  describe('resolveMeleeAttack', () => {
    it('hits when roll > MS', () => {
      const attacker = makeCharacter({ state: 'Overt' });
      const target = makeCharacter({ id: 'target' });
      // MS is 7, roll 8 → hit
      const result = resolveMeleeAttack(attacker, target, 'fist', makeRoll(4, 4));
      expect(result.hit).toBe(true);
    });

    it('Disguised: -1 to melee DC', () => {
      const attacker = makeCharacter({ state: 'Disguised', role: 'Face' });
      const target = makeCharacter({ id: 'target' });
      // MS is 7 (from base Ninja stats but role is Face so MS=8), Disguised -1 → need >7
      // Wait, we set role to Face. Face MS=8. Disguised -1 → DC 7.
      // Actually makeCharacter uses Ninja stats by default (MS=7), but role is overridden to Face.
      // The effective stats come from the stats object, not the role.
      // MS is 7 (from stats), Disguised -1 → DC 6, roll 7 → hit
      const result = resolveMeleeAttack(attacker, target, 'fist', makeRoll(3, 4));
      expect(result.hit).toBe(true);
      expect(result.targetNumber).toBe(6);
    });
  });

  describe('resolveDefenseSave', () => {
    it('saves when roll >= D, prevents 1+ damage', () => {
      const defender = makeCharacter({ state: 'Hidden' }); // D=9, no defense modifier for Hidden
      // Roll 10 >= 9 → save. Exceeds by 1 → prevent 2 damage (1 + 1).
      const result = resolveDefenseSave(defender, 3, makeRoll(5, 5));
      expect(result.saved).toBe(true);
      expect(result.damageReduced).toBe(2);
      expect(result.finalDamage).toBe(1);
    });

    it('fails when roll < D', () => {
      const defender = makeCharacter({ state: 'Hidden' }); // D=9
      // Roll 8 < 9 → fail
      const result = resolveDefenseSave(defender, 3, makeRoll(4, 4));
      expect(result.saved).toBe(false);
      expect(result.damageReduced).toBe(0);
      expect(result.finalDamage).toBe(3);
    });

    it('Overt: +1 to defense roll', () => {
      const defender = makeCharacter({ state: 'Overt' }); // D=9, Overt +1
      // Roll 8 + 1 (overt bonus) = 9 >= 9 → save. Prevent 1 damage.
      const result = resolveDefenseSave(defender, 3, makeRoll(4, 4));
      expect(result.saved).toBe(true);
      expect(result.damageReduced).toBe(1);
      expect(result.finalDamage).toBe(2);
    });
  });

  describe('applyDamage', () => {
    it('reduces wounds', () => {
      const target = makeCharacter({ stats: { ...makeCharacter().stats, wounds: 7 } });
      const { updatedTarget } = applyDamage(target, 3);
      expect(updatedTarget.stats.wounds).toBe(4);
    });

    it('wounds to 0 → Stunned (first time)', () => {
      const target = makeCharacter({
        state: 'Overt',
        stats: { ...makeCharacter().stats, wounds: 2 },
      });
      const { updatedTarget, stateChanged, vpAwarded } = applyDamage(target, 3, false);
      expect(updatedTarget.stats.wounds).toBe(0);
      expect(updatedTarget.state).toBe('Stunned');
      expect(stateChanged).toBe(true);
      expect(vpAwarded).toBe(true);
    });

    it('wounds to 0 → Unconscious (second time)', () => {
      const target = makeCharacter({
        state: 'Overt',
        stats: { ...makeCharacter().stats, wounds: 2 },
      });
      const { updatedTarget } = applyDamage(target, 3, true);
      expect(updatedTarget.stats.wounds).toBe(0);
      expect(updatedTarget.state).toBe('Unconscious');
    });

    it('damage doesn\'t go below 0 wounds', () => {
      const target = makeCharacter({
        stats: { ...makeCharacter().stats, wounds: 1 },
      });
      const { updatedTarget } = applyDamage(target, 5);
      expect(updatedTarget.stats.wounds).toBe(0);
    });
  });

  describe('resolveCombat', () => {
    it('full combat: hit → defense → damage', () => {
      const attacker = makeCharacter({ state: 'Overt' });
      const target = makeCharacter({
        id: 'target',
        state: 'Overt',
        stats: { ...makeCharacter().stats, wounds: 7, defense: 9 },
      });

      // Attack roll 10 > MS 7 → hit
      // Defense roll 8 + 1 (overt) = 9 >= 9 → save, prevent 1
      const result = resolveCombat(
        attacker, target, 'fist',
        makeRoll(5, 5), // attack
        makeRoll(4, 4), // defense
        'melee'
      );

      expect(result.attack.hit).toBe(true);
      expect(result.defense).not.toBeNull();
      expect(result.defense!.saved).toBe(true);
    });

    it('miss → no defense roll', () => {
      const attacker = makeCharacter({ state: 'Overt' });
      const target = makeCharacter({ id: 'target' });

      // Attack roll 5 <= MS 7 → miss
      const result = resolveCombat(
        attacker, target, 'fist',
        makeRoll(2, 3), // attack → 5, miss
        makeRoll(6, 6), // defense (shouldn't be used)
        'melee'
      );

      expect(result.attack.hit).toBe(false);
      expect(result.defense).toBeNull();
      expect(result.targetWoundsAfter).toBe(target.stats.wounds);
    });
  });

  describe('resolveHackCheck', () => {
    it('succeeds when roll > hack stat', () => {
      const char = makeCharacter(); // hack = 8
      const result = resolveHackCheck(char, makeRoll(5, 4)); // total 9 > 8
      expect(result.success).toBe(true);
      expect(result.margin).toBe(1);
    });

    it('fails when roll <= hack stat', () => {
      const char = makeCharacter(); // hack = 8
      const result = resolveHackCheck(char, makeRoll(4, 4)); // total 8 <= 8
      expect(result.success).toBe(false);
    });

    it('Hidden: -1 to hack DC', () => {
      const char = makeCharacter({ state: 'Hidden' }); // hack = 8, Hidden -1 → DC 7
      const result = resolveHackCheck(char, makeRoll(4, 4)); // total 8 > 7
      expect(result.success).toBe(true);
    });

    it('applies difficulty modifier', () => {
      const char = makeCharacter(); // hack = 8
      // +1 difficulty → DC 9. Roll 9 → success
      const result = resolveHackCheck(char, makeRoll(5, 4), 1);
      expect(result.success).toBe(false); // 9 is not > 9
    });
  });

  describe('resolveCharmCheck', () => {
    it('Disguised: -1 to charm DC', () => {
      const char = makeCharacter({ state: 'Disguised' }); // con = 8, Disguised -1 → DC 7
      const result = resolveCharmCheck(char, makeRoll(4, 4)); // total 8 > 7
      expect(result.success).toBe(true);
    });
  });
});
