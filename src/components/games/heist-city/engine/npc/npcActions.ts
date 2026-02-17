/**
 * NPC Actions — Action selection and attack resolution
 *
 * Determines what each NPC does with an action and resolves NPC attacks
 * using the combat engine from Phase 1.
 *
 * NPC Stats:
 *   | Type           | M  | MS | BS  | W | D  | Range | Damage |
 *   |----------------|----|----|-----|---|----|-------|--------|
 *   | Security Guard | 4  | 7  | N/A | 1 | 10 | N/A   | 2      |
 *   | Turret/Camera  | 0  | N/A| 7   | 1 | 8  | 12    | 2      |
 *   | Elite          | 4  | 7  | 9   | 1 | 7  | 7     | 3      |
 */

import { MapItem, MapState, CharacterToken, GridType } from '../../types';
import { DiceRollResult, CombatResult, AttackResult, DefenseResult } from '../types';
import { resolveDefenseSave, applyDamage } from '../combat';
import { hasLineOfSight } from '../spatial/lineOfSight';
import { buildLOSBlockers, buildItemPositionMap } from '../spatial/wallMap';
import { createGridUtils } from '../../data/gridUtils';

export interface NPCStats {
  type: 'security-guard' | 'turret' | 'elite';
  movement: number;
  meleeSkill: number | null;
  ballisticSkill: number | null;
  wounds: number;
  defense: number;
  range: number | null;
  damage: number;
}

/** Fixed NPC stats by type */
const NPC_STATS_TABLE: Record<string, NPCStats> = {
  'enemy-security-guard': {
    type: 'security-guard',
    movement: 4,
    meleeSkill: 7,
    ballisticSkill: null,
    wounds: 1,
    defense: 10,
    range: null,
    damage: 2,
  },
  'enemy-camera': {
    type: 'turret',
    movement: 0,
    meleeSkill: null,
    ballisticSkill: 7,
    wounds: 1,
    defense: 8,
    range: 12,
    damage: 2,
  },
  'enemy-elite': {
    type: 'elite',
    movement: 4,
    meleeSkill: 7,
    ballisticSkill: 9,
    wounds: 1,
    defense: 7,
    range: 7,
    damage: 3,
  },
};

/**
 * Get stats for an NPC based on its item type.
 * Returns null if the item is not an NPC type.
 */
export function getNPCStatsForItem(npc: MapItem): NPCStats | null {
  return NPC_STATS_TABLE[npc.type] || null;
}

export type NPCActionType = 'move' | 'melee-attack' | 'ranged-attack' | 'idle';

/**
 * Determine what action this NPC should take.
 *
 * - Guard: melee-attack if adjacent, else move
 * - Turret: ranged-attack if target in range with LOS, else idle
 * - Elite: ranged-attack if in range with LOS, else melee-attack if adjacent, else move
 */
export function selectNPCAction(
  npc: MapItem,
  npcStats: NPCStats,
  target: CharacterToken,
  mapState: MapState,
  gridType: GridType
): NPCActionType {
  const gridUtils = createGridUtils(gridType);
  const distance = gridUtils.getCellDistance(npc.position, target.position);
  const isAdjacent = distance <= 1;

  // Check ranged capability
  const canRanged = npcStats.ballisticSkill !== null && npcStats.range !== null;
  const inRange = canRanged && distance <= npcStats.range!;

  // Check LOS for ranged attacks
  let hasLOS = false;
  if (inRange) {
    const losBlockers = buildLOSBlockers(mapState);
    const itemMap = buildItemPositionMap(mapState);
    const los = hasLineOfSight(npc.position, target.position, losBlockers, itemMap);
    hasLOS = los.clear;
  }

  // Check melee capability
  const canMelee = npcStats.meleeSkill !== null;

  switch (npcStats.type) {
    case 'security-guard':
      // Melee only: attack if adjacent, else move
      if (isAdjacent && canMelee) return 'melee-attack';
      return 'move';

    case 'turret':
      // Ranged only, stationary: attack if in range + LOS, else idle
      if (inRange && hasLOS) return 'ranged-attack';
      return 'idle';

    case 'elite':
      // Prefer ranged if in range + LOS, then melee if adjacent, else move
      if (inRange && hasLOS) return 'ranged-attack';
      if (isAdjacent && canMelee) return 'melee-attack';
      return 'move';

    default:
      return 'idle';
  }
}

/**
 * Extract attack stats for an NPC based on attack type.
 */
export function getNPCAttackInfo(
  npcStats: NPCStats,
  attackType: 'melee' | 'ranged'
): { skill: number; range: number | null; damage: number } | null {
  if (attackType === 'melee') {
    if (npcStats.meleeSkill === null) return null;
    return { skill: npcStats.meleeSkill, range: null, damage: npcStats.damage };
  } else {
    if (npcStats.ballisticSkill === null) return null;
    return { skill: npcStats.ballisticSkill, range: npcStats.range, damage: npcStats.damage };
  }
}

/**
 * Resolve an NPC attack against a player character.
 *
 * NPC attack: 2d6 > skill → hit, fixed damage.
 * Target gets a normal defense save.
 *
 * @param npc - The attacking NPC item
 * @param npcStats - NPC stat block
 * @param target - Target player character
 * @param attackType - melee or ranged
 * @param attackRoll - The attack dice roll
 * @param defenseRoll - The defense dice roll (used only if hit)
 */
export function resolveNPCAttack(
  npc: MapItem,
  npcStats: NPCStats,
  target: CharacterToken,
  attackType: 'melee' | 'ranged',
  attackRoll: DiceRollResult,
  defenseRoll: DiceRollResult
): CombatResult {
  const info = getNPCAttackInfo(npcStats, attackType);

  // NPC can't perform this attack type
  if (!info) {
    const missAttack: AttackResult = {
      hit: false,
      roll: attackRoll,
      targetNumber: 99,
      damage: 0,
      weaponId: `npc-${attackType}`,
      attackerState: 'Overt',
    };
    return {
      attack: missAttack,
      defense: null,
      targetWoundsAfter: target.stats.wounds,
      targetStateAfter: target.state,
      targetDowned: false,
    };
  }

  // NPC attack: 2d6 > skill
  const hit = attackRoll.total > info.skill;
  const attack: AttackResult = {
    hit,
    roll: attackRoll,
    targetNumber: info.skill,
    damage: hit ? info.damage : 0,
    weaponId: `npc-${attackType}`,
    attackerState: 'Overt',
  };

  if (!hit) {
    return {
      attack,
      defense: null,
      targetWoundsAfter: target.stats.wounds,
      targetStateAfter: target.state,
      targetDowned: false,
    };
  }

  // Resolve defense save using Phase 1 combat engine
  const defense = resolveDefenseSave(target, info.damage, defenseRoll);

  // Apply damage
  const { updatedTarget, vpAwarded } = applyDamage(target, defense.finalDamage);

  return {
    attack,
    defense,
    targetWoundsAfter: updatedTarget.stats.wounds,
    targetStateAfter: updatedTarget.state,
    targetDowned: vpAwarded,
  };
}
