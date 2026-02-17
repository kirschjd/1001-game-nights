/**
 * Threat Assessment
 *
 * Evaluates threats to AI-controlled characters from enemy players and NPCs.
 * Used by utility scoring to weigh safety and by strategic planning to
 * determine posture.
 */

import { CharacterToken, MapState, GridType } from '../types';
import { AlertLevelState } from '../engine/types';
import { createGridUtils } from '../data/gridUtils';
import { buildLOSBlockers, buildItemPositionMap } from '../engine/spatial/wallMap';
import { hasLineOfSight } from '../engine/spatial/lineOfSight';
import { getNPCStatsForItem } from '../engine/npc/npcActions';
import { isVisibleToMob } from '../engine/npc/npcTargeting';
import { probability2d6 } from '../engine/dice';
import { getEquipmentById } from '../data/equipmentLoader';
import { ThreatInfo } from './types';

/**
 * Assess all threats to a player's characters.
 *
 * Checks:
 *   - Enemy player characters that can attack
 *   - NPCs that would target AI characters (guards, turrets, elites)
 *
 * @param mapState - Current map state
 * @param gridType - Grid type
 * @param playerNumber - Which player the AI controls
 * @param alertLevel - Current alert level (affects NPC actions)
 */
export function assessThreats(
  mapState: MapState,
  gridType: GridType,
  playerNumber: 1 | 2,
  alertLevel: AlertLevelState
): ThreatInfo[] {
  const threats: ThreatInfo[] = [];

  const myCharacters = mapState.characters.filter(
    c => c.playerNumber === playerNumber && c.state !== 'Unconscious'
  );

  for (const char of myCharacters) {
    const charThreats = assessCharacterThreat(char, mapState, gridType, alertLevel);
    for (const t of charThreats) {
      threats.push(t);
    }
  }

  return threats;
}

/**
 * Assess threats to a single character.
 */
export function assessCharacterThreat(
  character: CharacterToken,
  mapState: MapState,
  gridType: GridType,
  alertLevel: AlertLevelState
): ThreatInfo[] {
  const threats: ThreatInfo[] = [];
  const gridUtils = createGridUtils(gridType);

  // 1. Enemy player characters
  const enemies = mapState.characters.filter(
    c => c.playerNumber !== character.playerNumber &&
         c.state !== 'Unconscious' &&
         c.state !== 'Stunned'
  );

  for (const enemy of enemies) {
    const distance = gridUtils.getCellDistance(character.position, enemy.position);

    // Check melee threat (adjacent)
    if (distance <= 1) {
      const expectedDmg = estimateCharacterDamage(enemy, 'melee');
      threats.push({
        characterId: character.id,
        threatSourceId: enemy.id,
        threatType: 'melee',
        expectedDamagePerTurn: expectedDmg,
        distanceInMoves: 0,
        urgency: getUrgency(expectedDmg, character.stats.wounds),
      });
    }

    // Check ranged threat
    const maxRange = getCharacterMaxRange(enemy);
    if (maxRange > 0 && distance <= maxRange) {
      const expectedDmg = estimateCharacterDamage(enemy, 'ranged');
      const movesAway = Math.max(0, distance - 1);
      threats.push({
        characterId: character.id,
        threatSourceId: enemy.id,
        threatType: 'ranged',
        expectedDamagePerTurn: expectedDmg,
        distanceInMoves: movesAway,
        urgency: getUrgency(expectedDmg, character.stats.wounds),
      });
    }
  }

  // 2. NPC threats (only if character is visible to mobs)
  if (alertLevel.level > 0 && isVisibleToMob(character)) {
    const npcThreats = assessNPCThreats(character, mapState, gridType, alertLevel);
    for (const t of npcThreats) {
      threats.push(t);
    }
  }

  return threats;
}

/**
 * Predict expected damage from NPCs to a specific character.
 * Uses NPC stats and distance to estimate per-turn incoming damage.
 */
export function predictNPCThreat(
  character: CharacterToken,
  mapState: MapState,
  gridType: GridType,
  alertLevel: AlertLevelState
): number {
  if (alertLevel.level === 0) return 0;
  if (!isVisibleToMob(character)) return 0;

  const npcThreats = assessNPCThreats(character, mapState, gridType, alertLevel);
  let totalExpected = 0;
  for (const t of npcThreats) {
    totalExpected += t.expectedDamagePerTurn;
  }
  return totalExpected;
}

// ============== Helpers ==============

function assessNPCThreats(
  character: CharacterToken,
  mapState: MapState,
  gridType: GridType,
  alertLevel: AlertLevelState
): ThreatInfo[] {
  const threats: ThreatInfo[] = [];
  const gridUtils = createGridUtils(gridType);
  const losBlockers = buildLOSBlockers(mapState);
  const itemMap = buildItemPositionMap(mapState);

  const npcs = mapState.items.filter(item =>
    item.type === 'enemy-security-guard' ||
    item.type === 'enemy-elite' ||
    item.type === 'enemy-camera'
  );

  const actionsPerNPC = alertLevel.npcActionsPerActivation;

  for (const npc of npcs) {
    const npcStats = getNPCStatsForItem(npc);
    if (!npcStats) continue;

    const distance = gridUtils.getCellDistance(npc.position, character.position);

    // Turrets: ranged only, stationary
    if (npc.type === 'enemy-camera') {
      if (npcStats.range !== null && distance <= npcStats.range && npcStats.ballisticSkill !== null) {
        const los = hasLineOfSight(npc.position, character.position, losBlockers, itemMap);
        if (los.clear) {
          const pHit = probability2d6(npcStats.ballisticSkill);
          const expectedDmg = pHit * npcStats.damage * actionsPerNPC;
          threats.push({
            characterId: character.id,
            threatSourceId: npc.id,
            threatType: 'npc',
            expectedDamagePerTurn: expectedDmg,
            distanceInMoves: 0,
            urgency: getUrgency(expectedDmg, character.stats.wounds),
          });
        }
      }
      continue;
    }

    // Guards and elites: can move + attack
    const movementBudget = npcStats.movement * actionsPerNPC;
    const canReach = distance <= movementBudget + 1;

    if (canReach) {
      let expectedDmg = 0;

      // If already adjacent, all actions are attacks
      if (distance <= 1) {
        if (npcStats.meleeSkill !== null) {
          const pHit = probability2d6(npcStats.meleeSkill);
          expectedDmg = pHit * npcStats.damage * actionsPerNPC;
        }
      } else {
        // Would need to move first, remaining actions are attacks
        const movesNeeded = Math.max(0, distance - 1);
        const moveActions = Math.ceil(movesNeeded / npcStats.movement);
        const attackActions = Math.max(0, actionsPerNPC - moveActions);

        if (attackActions > 0 && npcStats.meleeSkill !== null) {
          const pHit = probability2d6(npcStats.meleeSkill);
          expectedDmg = pHit * npcStats.damage * attackActions;
        }
      }

      // Elites may also have ranged
      if (npc.type === 'enemy-elite' && npcStats.ballisticSkill !== null && npcStats.range !== null) {
        if (distance <= npcStats.range) {
          const los = hasLineOfSight(npc.position, character.position, losBlockers, itemMap);
          if (los.clear) {
            const pHit = probability2d6(npcStats.ballisticSkill);
            const rangedDmg = pHit * npcStats.damage * actionsPerNPC;
            // Use the higher threat estimate
            expectedDmg = Math.max(expectedDmg, rangedDmg);
          }
        }
      }

      // If the NPC can reach but can't attack this turn (spent all actions moving),
      // it's still a threat — it will be adjacent next turn and can attack then.
      if (expectedDmg === 0 && npcStats.meleeSkill !== null) {
        const pHit = probability2d6(npcStats.meleeSkill);
        expectedDmg = pHit * npcStats.damage * 0.5; // discounted for 1-turn delay
      }

      if (expectedDmg > 0) {
        const movesAway = Math.max(0, Math.ceil((distance - 1) / npcStats.movement));
        threats.push({
          characterId: character.id,
          threatSourceId: npc.id,
          threatType: 'npc',
          expectedDamagePerTurn: expectedDmg,
          distanceInMoves: movesAway,
          urgency: getUrgency(expectedDmg, character.stats.wounds),
        });
      }
    }
  }

  return threats;
}

/**
 * Estimate how much damage an enemy character could deal per attack.
 * Simplified: uses their best weapon's expected damage.
 */
function estimateCharacterDamage(
  enemy: CharacterToken,
  attackType: 'melee' | 'ranged'
): number {
  const equipment = enemy.equipment || [];
  let bestDamage = 0;

  for (const eqId of equipment) {
    const weapon = getEquipmentById(eqId);
    if (!weapon) continue;

    if (attackType === 'melee' && (weapon.type === 'Melee' || eqId === 'fist')) {
      const dc = enemy.stats.meleeSkill;
      const pHit = probability2d6(dc);
      const dmg = pHit * (weapon.Damage || 1);
      if (dmg > bestDamage) bestDamage = dmg;
    }

    if (attackType === 'ranged' && weapon.type === 'Ranged') {
      const dc = enemy.stats.ballisticSkill;
      const pHit = probability2d6(dc);
      const dmg = pHit * (weapon.Damage || 0);
      if (dmg > bestDamage) bestDamage = dmg;
    }
  }

  // Fallback: fist attack if melee and no weapons found
  if (attackType === 'melee' && bestDamage === 0) {
    const pHit = probability2d6(enemy.stats.meleeSkill);
    bestDamage = pHit * 1; // fist = 1 damage
  }

  return bestDamage;
}

/**
 * Get the maximum weapon range for a character.
 */
function getCharacterMaxRange(character: CharacterToken): number {
  const equipment = character.equipment || [];
  let maxRange = 0;

  for (const eqId of equipment) {
    const weapon = getEquipmentById(eqId);
    if (weapon && weapon.type === 'Ranged' && weapon.Range) {
      if (weapon.Range > maxRange) maxRange = weapon.Range;
    }
  }

  return maxRange;
}

/**
 * Determine threat urgency based on expected damage vs wounds.
 */
function getUrgency(
  expectedDamage: number,
  currentWounds: number
): 'low' | 'medium' | 'high' | 'critical' {
  if (currentWounds <= 0) return 'low';

  const ratio = expectedDamage / currentWounds;
  if (ratio >= 0.8) return 'critical';
  if (ratio >= 0.5) return 'high';
  if (ratio >= 0.2) return 'medium';
  return 'low';
}
