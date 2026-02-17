/**
 * Combat Resolution
 *
 * Resolves attacks, defense saves, damage application, and skill checks.
 * All functions are pure — they take state + dice roll as input and return results.
 *
 * Attack rules:
 *   Melee: 2d6 > MS → hit. Damage = weapon damage.
 *   Ranged: 2d6 > BS → hit. Must be within weapon range.
 *   Repeat penalty: +1 to DC per repeat of same attack type this turn.
 *   Into melee: +1 to ranged DC if target is adjacent to an ally.
 *   Hidden: -1 DC, +1 damage vs undamaged enemies.
 *   Disguised: -1 DC on melee, +1 damage on melee.
 *
 * Defense rules:
 *   2d6 >= D → prevent 1 damage. Each point exceeding D prevents 1 more.
 *   Overt: +1 to defense rolls.
 *
 * Wound rules:
 *   0 wounds → Stunned. Wake Up → 4 wounds. 0 again → Unconscious.
 */

import { CharacterToken, MapState } from '../types';
import { AttackResult, CombatResult, DefenseResult, DiceRollResult } from './types';
import { getEquipmentById } from '../data/equipmentLoader';
import { getEffectiveStats } from '../data/equipmentLoader';
import { getStateModifiers, getWoundStateTransition } from './stateTransitions';
import { probability2d6, probability2d6GTE, expectedSuccessMargin } from './dice';

/**
 * Resolve a ranged attack with a given dice roll.
 *
 * @param attacker - The attacking character
 * @param target - The target character
 * @param weaponId - Equipment ID of the weapon
 * @param roll - The 2d6 result
 * @param repeatPenalty - Number of repeat attacks this turn (0 for first)
 * @param intoMelee - True if target is in melee with an ally
 */
export function resolveRangedAttack(
  attacker: CharacterToken,
  target: CharacterToken,
  weaponId: string,
  roll: DiceRollResult,
  repeatPenalty: number = 0,
  intoMelee: boolean = false
): AttackResult {
  const weapon = getEquipmentById(weaponId);
  const effectiveStats = getEffectiveStats(attacker.stats, attacker.equipment || []);
  const stateModifiers = getStateModifiers(attacker.state);

  // Base DC is Ballistic Skill
  let targetNumber = effectiveStats.ballisticSkill;

  // Hidden bonus: -1 to DC (but only applies to ranged if Hidden)
  // Per rules, Hidden gives -1 to hit. This makes it easier (lower DC).
  if (attacker.state === 'Hidden') {
    targetNumber += stateModifiers.hitModifier; // -1
  }

  // Repeat penalty: +1 per repeat
  targetNumber += repeatPenalty;

  // Into melee penalty: +1 to DC
  if (intoMelee) {
    targetNumber += 1;
  }

  const hit = roll.total > targetNumber;
  let damage = 0;

  if (hit && weapon) {
    damage = weapon.Damage || 0;
    // Hidden damage bonus: +1 vs undamaged enemies
    if (attacker.state === 'Hidden' && target.stats.wounds === target.stats.maxWounds) {
      damage += stateModifiers.damageModifier; // +1
    }
  }

  return {
    hit,
    roll,
    targetNumber,
    damage,
    weaponId,
    attackerState: attacker.state,
  };
}

/**
 * Resolve a melee attack with a given dice roll.
 */
export function resolveMeleeAttack(
  attacker: CharacterToken,
  target: CharacterToken,
  weaponId: string,
  roll: DiceRollResult,
  repeatPenalty: number = 0
): AttackResult {
  const weapon = getEquipmentById(weaponId);
  const effectiveStats = getEffectiveStats(attacker.stats, attacker.equipment || []);
  const stateModifiers = getStateModifiers(attacker.state);

  let targetNumber = effectiveStats.meleeSkill;

  // Hidden bonus: -1 to DC for melee too
  if (attacker.state === 'Hidden') {
    targetNumber += stateModifiers.hitModifier;
  }

  // Disguised melee bonus: -1 to DC
  if (attacker.state === 'Disguised') {
    targetNumber += stateModifiers.hitModifier;
  }

  // Repeat penalty
  targetNumber += repeatPenalty;

  const hit = roll.total > targetNumber;
  let damage = 0;

  if (hit) {
    // Default fist damage is 1 if no weapon found
    damage = weapon?.Damage ?? 1;

    // Hidden damage bonus: +1 vs undamaged enemies
    if (attacker.state === 'Hidden' && target.stats.wounds === target.stats.maxWounds) {
      damage += getStateModifiers('Hidden').damageModifier;
    }

    // Disguised melee damage bonus: +1
    if (attacker.state === 'Disguised') {
      damage += getStateModifiers('Disguised').damageModifier;
    }
  }

  return {
    hit,
    roll,
    targetNumber,
    damage,
    weaponId,
    attackerState: attacker.state,
  };
}

/**
 * Resolve a defense save.
 * Success: roll >= D stat → prevent 1 damage + 1 per point exceeding D.
 * Overt characters get +1 to defense rolls.
 */
export function resolveDefenseSave(
  defender: CharacterToken,
  incomingDamage: number,
  roll: DiceRollResult
): DefenseResult {
  const effectiveStats = getEffectiveStats(defender.stats, defender.equipment || []);
  const stateModifiers = getStateModifiers(defender.state);

  // Defense target number (lower is easier to save)
  const targetNumber = effectiveStats.defense;

  // Apply state modifier to the roll (Overt: +1 to defense rolls)
  const effectiveRoll = roll.total + stateModifiers.defenseModifier;

  const saved = effectiveRoll >= targetNumber;
  let damageReduced = 0;

  if (saved) {
    // Prevent 1 damage + 1 per point exceeding the target
    damageReduced = 1 + (effectiveRoll - targetNumber);
  }

  const finalDamage = Math.max(0, incomingDamage - damageReduced);

  return {
    saved,
    roll,
    targetNumber,
    damageReduced,
    finalDamage,
  };
}

/**
 * Apply damage to a character's wounds and determine state transitions.
 *
 * @param target - The character taking damage
 * @param finalDamage - Damage after defense saves
 * @param wasStunnedBefore - True if target has been Stunned previously this game
 * @returns Updated target, whether state changed, and whether a VP is awarded (first down)
 */
export function applyDamage(
  target: CharacterToken,
  finalDamage: number,
  wasStunnedBefore: boolean = false
): {
  updatedTarget: CharacterToken;
  stateChanged: boolean;
  newState: string | null;
  vpAwarded: boolean;
} {
  const newWounds = Math.max(0, target.stats.wounds - finalDamage);
  const updatedTarget: CharacterToken = {
    ...target,
    stats: { ...target.stats, wounds: newWounds },
  };

  const newState = getWoundStateTransition(target, newWounds, wasStunnedBefore);

  if (newState) {
    updatedTarget.state = newState;
  }

  // VP awarded when downing an enemy for the first time (wounds reach 0)
  const vpAwarded = newWounds <= 0 && target.stats.wounds > 0;

  return {
    updatedTarget,
    stateChanged: newState !== null,
    newState: newState,
    vpAwarded,
  };
}

/**
 * Full combat resolution: attack → defense → damage.
 *
 * @param attacker - Attacking character
 * @param target - Target character
 * @param weaponId - Weapon used
 * @param attackRoll - The attack dice roll
 * @param defenseRoll - The defense dice roll (only used if attack hits)
 * @param attackType - 'melee' or 'ranged'
 * @param repeatPenalty - Repeat attack penalty
 * @param intoMelee - Whether this is a ranged attack into melee
 * @param wasStunnedBefore - Whether target was previously stunned this game
 */
export function resolveCombat(
  attacker: CharacterToken,
  target: CharacterToken,
  weaponId: string,
  attackRoll: DiceRollResult,
  defenseRoll: DiceRollResult,
  attackType: 'melee' | 'ranged',
  repeatPenalty: number = 0,
  intoMelee: boolean = false,
  wasStunnedBefore: boolean = false
): CombatResult {
  // Resolve attack
  const attack = attackType === 'ranged'
    ? resolveRangedAttack(attacker, target, weaponId, attackRoll, repeatPenalty, intoMelee)
    : resolveMeleeAttack(attacker, target, weaponId, attackRoll, repeatPenalty);

  // If miss, no defense needed
  if (!attack.hit) {
    return {
      attack,
      defense: null,
      targetWoundsAfter: target.stats.wounds,
      targetStateAfter: target.state,
      targetDowned: false,
    };
  }

  // Resolve defense
  const defense = resolveDefenseSave(target, attack.damage, defenseRoll);

  // Apply damage
  const { updatedTarget, vpAwarded } = applyDamage(target, defense.finalDamage, wasStunnedBefore);

  return {
    attack,
    defense,
    targetWoundsAfter: updatedTarget.stats.wounds,
    targetStateAfter: updatedTarget.state,
    targetDowned: vpAwarded,
  };
}

/**
 * Resolve a hack check. 2d6 > Hack stat → success.
 * Hidden characters get -1 to hack DC (easier).
 */
export function resolveHackCheck(
  character: CharacterToken,
  roll: DiceRollResult,
  difficultyModifier: number = 0
): { success: boolean; margin: number } {
  const effectiveStats = getEffectiveStats(character.stats, character.equipment || []);
  const stateModifiers = getStateModifiers(character.state);

  let targetNumber = effectiveStats.hack + difficultyModifier;
  targetNumber += stateModifiers.hackModifier; // Hidden: -1

  const success = roll.total > targetNumber;
  const margin = roll.total - targetNumber;

  return { success, margin };
}

/**
 * Resolve a charm check. 2d6 > Con stat → success.
 * Disguised characters get -1 to charm DC (easier).
 */
export function resolveCharmCheck(
  character: CharacterToken,
  roll: DiceRollResult,
  difficultyModifier: number = 0
): { success: boolean; margin: number } {
  const effectiveStats = getEffectiveStats(character.stats, character.equipment || []);
  const stateModifiers = getStateModifiers(character.state);

  let targetNumber = effectiveStats.con + difficultyModifier;
  targetNumber += stateModifiers.charmModifier; // Disguised: -1

  const success = roll.total > targetNumber;
  const margin = roll.total - targetNumber;

  return { success, margin };
}

/**
 * Resolve an opposed roll. Both characters roll 2d6 vs their stat.
 * Winner has the higher margin (roll - stat). Ties go to the defender (char2).
 */
export function resolveOpposedRoll(
  char1: CharacterToken,
  char2: CharacterToken,
  stat: 'hack' | 'con',
  roll1: DiceRollResult,
  roll2: DiceRollResult
): { winnerId: string; char1Margin: number; char2Margin: number } {
  const stats1 = getEffectiveStats(char1.stats, char1.equipment || []);
  const stats2 = getEffectiveStats(char2.stats, char2.equipment || []);

  const target1 = stat === 'hack' ? stats1.hack : stats1.con;
  const target2 = stat === 'hack' ? stats2.hack : stats2.con;

  const char1Margin = roll1.total - target1;
  const char2Margin = roll2.total - target2;

  // Higher margin wins. Ties go to char2 (defender).
  const winnerId = char1Margin > char2Margin ? char1.id : char2.id;

  return { winnerId, char1Margin, char2Margin };
}

/**
 * Expected damage calculation for AI decision-making.
 * Computes: P(hit) * damage - P(hit) * P(defend) * expectedReduction
 */
export function expectedDamage(
  attacker: CharacterToken,
  target: CharacterToken,
  weaponId: string,
  attackType: 'melee' | 'ranged',
  repeatPenalty: number = 0,
  intoMelee: boolean = false
): number {
  const weapon = getEquipmentById(weaponId);
  if (!weapon) return 0;

  const effectiveAttackerStats = getEffectiveStats(attacker.stats, attacker.equipment || []);
  const effectiveTargetStats = getEffectiveStats(target.stats, target.equipment || []);
  const stateModifiers = getStateModifiers(attacker.state);

  // Calculate attack DC
  let attackDC = attackType === 'ranged'
    ? effectiveAttackerStats.ballisticSkill
    : effectiveAttackerStats.meleeSkill;

  if (attacker.state === 'Hidden') {
    attackDC += stateModifiers.hitModifier;
  }
  if (attacker.state === 'Disguised' && attackType === 'melee') {
    attackDC += stateModifiers.hitModifier;
  }
  attackDC += repeatPenalty;
  if (intoMelee && attackType === 'ranged') {
    attackDC += 1;
  }

  const pHit = probability2d6(attackDC);

  // Calculate expected damage on hit
  let baseDamage = weapon.Damage || 0;
  if (attacker.state === 'Hidden' && target.stats.wounds === target.stats.maxWounds) {
    baseDamage += 1;
  }
  if (attacker.state === 'Disguised' && attackType === 'melee') {
    baseDamage += 1;
  }

  // Calculate defense
  const defenseTarget = effectiveTargetStats.defense;
  const defenseRollBonus = getStateModifiers(target.state).defenseModifier;
  // Effective defense: need (defenseTarget - defenseRollBonus) on the roll
  const effectiveDefenseTarget = defenseTarget - defenseRollBonus;
  const pDefend = probability2d6GTE(effectiveDefenseTarget);

  // Average damage reduction when defense succeeds
  const avgMargin = expectedSuccessMargin(effectiveDefenseTarget - 1);
  const avgReduction = 1 + avgMargin;

  // Expected damage = P(hit) * (baseDamage - P(defend) * avgReduction)
  const expectedDmg = pHit * Math.max(0, baseDamage - pDefend * avgReduction);

  return expectedDmg;
}
