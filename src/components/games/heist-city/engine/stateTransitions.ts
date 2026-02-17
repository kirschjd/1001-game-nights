/**
 * Character State Transition Rules
 *
 * Rules for when and how character states change. States: Overt, Hidden,
 * Disguised, Stunned, Unconscious.
 *
 * Key transitions:
 *   Attack with non-Hidden weapon → Hidden → Overt
 *   Attack with non-Disguised weapon → Disguised → Overt
 *   Wounds reach 0 (first time) → Stunned
 *   Wounds reach 0 (second time) → Unconscious
 *   Wake Up (3-slot) → Stunned → Overt (wounds reset to 4)
 *   Face Off → Any → Disguised
 *   Ninja Vanish → Any → Hidden
 *   Go Loud → Hidden/Disguised → Overt
 */

import { CharacterState, CharacterToken } from '../types';
import { getEquipmentById } from '../data/equipmentLoader';
import { StateModifiers } from './types';

/**
 * Check if a weapon preserves Hidden state.
 * Looks at the equipment's Notice.Hidden flag.
 */
export function preservesHiddenState(weaponId: string): boolean {
  const weapon = getEquipmentById(weaponId);
  if (!weapon) return false;
  return weapon.Notice?.Hidden === true;
}

/**
 * Check if a weapon preserves Disguised state.
 * Looks at the equipment's Notice.Disguised flag.
 */
export function preservesDisguisedState(weaponId: string): boolean {
  const weapon = getEquipmentById(weaponId);
  if (!weapon) return false;
  return weapon.Notice?.Disguised === true;
}

/**
 * Determine the new state after an action, or null if no transition occurs.
 *
 * @param character - The character performing the action
 * @param actionId - The action being performed (e.g., 'Face Off', 'Ninja Vanish', 'Go Loud', weapon ID)
 * @param weaponId - The weapon used (if it's an attack action), or null
 * @param actionResult - Optional context: 'hit' | 'miss' | 'success' | 'fail' | null
 */
export function getStateTransition(
  character: CharacterToken,
  actionId: string,
  weaponId: string | null,
  actionResult: 'hit' | 'miss' | 'success' | 'fail' | null
): CharacterState | null {
  const currentState = character.state;

  // Explicit state-changing abilities
  if (actionId === 'Face Off') {
    return 'Disguised';
  }

  if (actionId === 'Ninja Vanish') {
    return 'Hidden';
  }

  if (actionId === 'Go Loud') {
    if (currentState === 'Hidden' || currentState === 'Disguised') {
      return 'Overt';
    }
    return null;
  }

  if (actionId === 'Wake Up') {
    if (currentState === 'Stunned') {
      return 'Overt';
    }
    return null;
  }

  // Attack-based state transitions (weapon breaks stealth)
  if (weaponId && (actionResult === 'hit' || actionResult === 'miss')) {
    if (currentState === 'Hidden' && !preservesHiddenState(weaponId)) {
      return 'Overt';
    }
    if (currentState === 'Disguised' && !preservesDisguisedState(weaponId)) {
      return 'Overt';
    }
  }

  return null;
}

/**
 * Determine the state transition caused by taking damage.
 * Returns the new state, or null if no transition.
 *
 * @param character - The character taking damage
 * @param woundsAfterDamage - Wound count after damage is applied
 * @param wasStunnedBefore - True if the character was already Stunned before (second KO → Unconscious)
 */
export function getWoundStateTransition(
  character: CharacterToken,
  woundsAfterDamage: number,
  wasStunnedBefore: boolean
): CharacterState | null {
  if (woundsAfterDamage <= 0) {
    if (wasStunnedBefore || character.state === 'Stunned') {
      return 'Unconscious';
    }
    return 'Stunned';
  }
  return null;
}

/**
 * Apply state transitions to a character and return the updated character.
 * Handles Wake Up's wound reset (wounds → 4).
 */
export function applyStateTransition(
  character: CharacterToken,
  newState: CharacterState
): CharacterToken {
  const updated = { ...character, state: newState };

  // Wake Up resets wounds to 4
  if (newState === 'Overt' && character.state === 'Stunned') {
    updated.stats = { ...character.stats, wounds: 4 };
  }

  return updated;
}

/**
 * Get all combat modifiers for a given state.
 *
 * Overt: +1 defense
 * Hidden: -1 to hit (harder for enemies), +1 damage vs undamaged, +1 hack
 * Disguised: -1 to hit melee (harder for enemies), +1 damage melee, +1 charm
 * Stunned/Unconscious: no modifiers
 *
 * Note: "to hit" modifiers here are from the ATTACKER's perspective.
 * hitModifier < 0 means the attack is harder to land (better for the attacker in hidden/disguised).
 * Actually per ruleset: Hidden gives -1 to the roll needed (lower DC = easier to hit).
 * Let me re-read: "Hidden: -1 to hit, +1 damage against undamaged enemies"
 * This means the Hidden character gets -1 on their attack DC (making it easier to hit)
 * and +1 damage against undamaged targets.
 */
export function getStateModifiers(state: CharacterState): StateModifiers {
  switch (state) {
    case 'Overt':
      return {
        hitModifier: 0,
        damageModifier: 0,
        defenseModifier: 1, // +1 to defense rolls when Overt
        hackModifier: 0,
        charmModifier: 0,
      };
    case 'Hidden':
      return {
        hitModifier: -1,     // -1 to hit DC (easier to hit)
        damageModifier: 1,   // +1 damage vs undamaged enemies
        defenseModifier: 0,
        hackModifier: -1,    // +1 to hack (lower DC = better)
        charmModifier: 0,
      };
    case 'Disguised':
      return {
        hitModifier: -1,     // -1 to hit DC on melee attacks
        damageModifier: 1,   // +1 damage on melee attacks
        defenseModifier: 0,
        hackModifier: 0,
        charmModifier: -1,   // +1 to charm (lower DC = better)
      };
    case 'Stunned':
    case 'Unconscious':
      return {
        hitModifier: 0,
        damageModifier: 0,
        defenseModifier: 0,
        hackModifier: 0,
        charmModifier: 0,
      };
  }
}
