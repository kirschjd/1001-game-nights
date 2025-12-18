/**
 * Core Actions for Heist City
 *
 * Defines the basic actions available to all characters regardless of role.
 * These actions use character stats for their values.
 */

import { CharacterStats } from '../../types';

export interface CoreAction {
  id: string;
  name: string;
  actionCost: number;
  description: string;
  /** Function to format the action with character stats */
  format: (stats: CharacterStats) => string;
}

/**
 * Core actions available to all characters
 */
export const CORE_ACTIONS: CoreAction[] = [
  {
    id: 'Move',
    name: 'Move',
    actionCost: 1,
    description: 'Move up to your movement value in inches',
    format: (stats) => `Move (${stats.movement}")`,
  },
  {
    id: 'Pick up item',
    name: 'Pick up item',
    actionCost: 1,
    description: 'Move up to your movement value in inches',
    format: (stats) => `Pick Up Item`,
  },
  {
    id: 'Hack',
    name: 'Hack',
    actionCost: 1,
    description: 'Attempt to hack a terminal or electronic device',
    format: (stats) => `Hack (${stats.hack}+)`,
  },
  {
    id: 'Charm',
    name: 'Charm',
    actionCost: 1,
    description: 'Attempt to deceive or manipulate an NPC',
    format: (stats) => `Con (${stats.con}+)`,
  },
];

/**
 * Default melee attack when no melee weapon is equipped
 */
export const DEFAULT_MELEE: CoreAction = {
  id: 'fist',
  name: 'Fist',
  actionCost: 1,
  description: 'Unarmed melee attack',
  format: (stats) => `Fist (MS ${stats.meleeSkill}+)`,
};

/**
 * Get formatted core actions for a character
 */
export function getCoreActions(stats: CharacterStats): string[] {
  return CORE_ACTIONS.map((action) => action.format(stats));
}

/**
 * Get the default melee action formatted for a character
 */
export function getDefaultMeleeAction(stats: CharacterStats): string {
  return DEFAULT_MELEE.format(stats);
}

/**
 * Format a weapon action based on weapon type and character stats
 */
export function formatWeaponAction(
  weaponId: string,
  weaponType: 'Ranged' | 'Melee' | 'Thrown',
  stats: CharacterStats
): string {
  if (weaponType === 'Melee') {
    return `${weaponId} (MS ${stats.meleeSkill}+)`;
  }
  // Ranged and Thrown both use Ballistic Skill
  return `${weaponId} (BS ${stats.ballisticSkill}+)`;
}
