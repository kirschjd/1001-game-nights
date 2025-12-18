import { ItemType } from '../../types';

/**
 * Enemy unit stats for Heist City
 */
export interface EnemyStats {
  name: string;
  movement: number | null;  // M (null for turrets)
  meleeSkill: number | null; // MS (null for ranged-only units)
  ballisticSkill: number | null; // BS (null for melee-only units)
  wounds: number; // W
  defense: number; // Def
  range: number | null; // Range (null for melee-only units)
  damage: number; // Dam
}

export const ENEMY_STATS: Record<string, EnemyStats> = {
  'enemy-security-guard': {
    name: 'Security Guard',
    movement: 4,
    meleeSkill: 7,
    ballisticSkill: null,
    wounds: 1,
    defense: 10,
    range: null,
    damage: 2,
  },
  'enemy-elite': {
    name: 'Elite',
    movement: 4,
    meleeSkill: 7,
    ballisticSkill: 9,
    wounds: 1,
    defense: 7,
    range: 7,
    damage: 3,
  },
  'enemy-camera': {
    name: 'Turret',
    movement: null, // Turrets don't move
    meleeSkill: null, // Not applicable
    ballisticSkill: 7,
    wounds: 1,
    defense: 7,
    range: 12,
    damage: 2,
  },
};

/**
 * Get enemy stats for a specific enemy type
 */
export function getEnemyStats(itemType: ItemType): EnemyStats | null {
  if (itemType in ENEMY_STATS) {
    return ENEMY_STATS[itemType];
  }
  return null;
}

/**
 * Check if an item type is a movable enemy unit
 */
export function isMovableEnemy(itemType: ItemType): boolean {
  return itemType === 'enemy-security-guard' || itemType === 'enemy-elite';
}

/**
 * Check if an item type is an enemy unit (movable or not)
 */
export function isEnemyUnit(itemType: ItemType): boolean {
  return itemType === 'enemy-security-guard' ||
         itemType === 'enemy-elite' ||
         itemType === 'enemy-camera';
}
