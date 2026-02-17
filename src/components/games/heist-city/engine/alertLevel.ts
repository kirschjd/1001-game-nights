/**
 * Alert Level Computation
 *
 * Formalizes the alert level logic from AlertLevelIndicator.tsx as
 * pure functions for use by the rules engine, NPC automation, and AI.
 *
 * Alert levels:
 *   Level 0 (total 0-2): Guards passive, 0 actions
 *   Level 1 (total 3-5): Guards attack overt, 1 action each
 *   Level 2 (total 6-7): Guards attack overt, 2 actions each
 *   Level 3 (total 8+):  All previous + elite spawns on security portals
 */

import { MapState } from '../types';
import { AlertLevelState } from './types';

/**
 * Count all revealed units: Overt + Stunned + Unconscious characters (both teams).
 */
export function countRevealedUnits(mapState: MapState): number {
  return mapState.characters.filter(
    (char) => char.state === 'Overt' || char.state === 'Stunned' || char.state === 'Unconscious'
  ).length;
}

/**
 * Compute the current alert level with all derived values.
 */
export function computeAlertLevel(mapState: MapState, alertModifier: number): AlertLevelState {
  const unitsRevealed = countRevealedUnits(mapState);
  const total = unitsRevealed + alertModifier;

  let level: 0 | 1 | 2 | 3;
  if (total <= 2) level = 0;
  else if (total <= 5) level = 1;
  else if (total <= 7) level = 2;
  else level = 3;

  return {
    level,
    unitsRevealed,
    modifier: alertModifier,
    total,
    npcActionsPerActivation: getNPCActionCount(level),
  };
}

/**
 * How many actions does each NPC get at this alert level?
 */
export function getNPCActionCount(alertLevel: 0 | 1 | 2 | 3): number {
  switch (alertLevel) {
    case 0: return 0;
    case 1: return 1;
    case 2: return 2;
    case 3: return 2;
  }
}

/**
 * Does this alert level trigger elite spawns?
 */
export function shouldSpawnElites(alertLevel: 0 | 1 | 2 | 3): boolean {
  return alertLevel >= 3;
}

/**
 * Predict what the alert level would be with a hypothetical number of
 * additional overt characters. Used by AI to evaluate the cost of going loud.
 */
export function predictAlertLevel(
  mapState: MapState,
  alertModifier: number,
  additionalOvertCount: number
): AlertLevelState {
  const unitsRevealed = countRevealedUnits(mapState) + additionalOvertCount;
  const total = unitsRevealed + alertModifier;

  let level: 0 | 1 | 2 | 3;
  if (total <= 2) level = 0;
  else if (total <= 5) level = 1;
  else if (total <= 7) level = 2;
  else level = 3;

  return {
    level,
    unitsRevealed,
    modifier: alertModifier,
    total,
    npcActionsPerActivation: getNPCActionCount(level),
  };
}
