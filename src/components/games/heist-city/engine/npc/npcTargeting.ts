/**
 * NPC Target Selection
 *
 * Determines which player character each NPC targets.
 *
 * Rules:
 *   - NPCs target the nearest Overt character
 *   - Hidden, Disguised characters are invisible to mobs
 *   - Characters with "Security Uniform" or "In Plain Sight" are immune
 *   - Ties on distance: prefer lower defense (easier to hit)
 */

import { Position, MapItem, MapState, CharacterToken, GridType } from '../../types';
import { createGridUtils } from '../../data/gridUtils';

/**
 * Check whether a character is visible to mobs.
 * Returns false for Hidden, Disguised, characters with Security Uniform,
 * or characters under "In Plain Sight" effect.
 */
export function isVisibleToMob(character: CharacterToken): boolean {
  // Hidden and Disguised characters are invisible
  if (character.state === 'Hidden' || character.state === 'Disguised') {
    return false;
  }

  // Stunned and Unconscious characters can't be targeted
  if (character.state === 'Stunned' || character.state === 'Unconscious') {
    return false;
  }

  // Security Uniform makes character immune to mobs
  if (character.equipment && character.equipment.indexOf('security-uniform') >= 0) {
    return false;
  }

  // "In Plain Sight" Face ability (tracked via actions array)
  if (character.actions && character.actions.indexOf('in-plain-sight') >= 0) {
    return false;
  }

  return true;
}

/**
 * Select the best target for a mob NPC.
 *
 * 1. Filter to Overt characters only (isVisibleToMob)
 * 2. Sort by distance (nearest first)
 * 3. Tiebreak: prefer lower defense (easier to hit)
 * 4. Return null if no valid targets
 */
export function selectMobTarget(
  npc: MapItem,
  mapState: MapState,
  gridType: GridType
): CharacterToken | null {
  const gridUtils = createGridUtils(gridType);

  // Get all visible targets
  const targets = mapState.characters.filter(isVisibleToMob);

  if (targets.length === 0) return null;

  // Sort by distance, then by defense (lower defense = easier to hit)
  const sorted = targets.slice().sort((a, b) => {
    const distA = gridUtils.getCellDistance(npc.position, a.position);
    const distB = gridUtils.getCellDistance(npc.position, b.position);

    if (distA !== distB) return distA - distB;

    // Tiebreak: prefer lower defense
    return a.stats.defense - b.stats.defense;
  });

  return sorted[0];
}

/**
 * Resolve mob target tiebreak using opposed Charm rolls.
 * When multiple characters are equally close, rules say to use
 * opposed Charm rolls to determine who gets attacked.
 *
 * The character with the LOWER roll loses (gets targeted).
 */
export function resolveMobTargetTiebreak(
  candidates: CharacterToken[],
  npc: MapItem,
  rolls: Map<string, number>
): CharacterToken {
  if (candidates.length === 1) return candidates[0];

  // Character with lowest charm roll gets targeted
  let worstCandidate = candidates[0];
  let worstRoll = rolls.get(candidates[0].id) ?? Infinity;

  for (let i = 1; i < candidates.length; i++) {
    const roll = rolls.get(candidates[i].id) ?? Infinity;
    if (roll < worstRoll) {
      worstRoll = roll;
      worstCandidate = candidates[i];
    }
  }

  return worstCandidate;
}
