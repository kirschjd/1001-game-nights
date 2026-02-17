/**
 * NPC Phase Orchestration
 *
 * Main entry point for automating the NPC phase. Called after all player
 * activations are complete each turn.
 *
 * Execution order:
 *   1. Check alert level — level 0 means NPCs are passive
 *   2. If alert level 3, spawn elites first
 *   3. For each NPC: select target → execute N actions → record results
 *   4. Return updated map state and combat log
 */

import { MapItem, MapState, CharacterToken, CharacterState, GridType, Position } from '../../types';
import { DiceRollResult, AlertLevelState, CombatResult } from '../types';
import { expectedDamage } from '../combat';
import { probability2d6 } from '../dice';
import { selectMobTarget } from './npcTargeting';
import { calculateNPCMove, isAdjacentToTarget } from './npcMovement';
import { selectNPCAction, resolveNPCAttack, getNPCStatsForItem, getNPCAttackInfo, NPCStats, NPCActionType } from './npcActions';
import { spawnElites } from './eliteSpawner';
import { shouldSpawnElites } from '../alertLevel';
import { posKey } from '../spatial/wallMap';
import { createGridUtils } from '../../data/gridUtils';

// ============== Result Types ==============

export interface NPCCombatLogEntry {
  npcId: string;
  npcType: string;
  action: NPCActionType;
  targetId?: string;
  result?: CombatResult;
  newPosition?: Position;
}

export interface StateChangeEntry {
  characterId: string;
  oldState: CharacterState;
  newState: CharacterState;
  cause: string;
}

export interface NPCPhaseResult {
  updatedMapState: MapState;
  combatLog: NPCCombatLogEntry[];
  stateChanges: StateChangeEntry[];
  elitesSpawned: MapItem[];
}

export interface NPCPhasePreview {
  npcId: string;
  targetId: string | null;
  expectedDamage: number;
  wouldReachTarget: boolean;
}

// ============== Main Entry Point ==============

/**
 * Execute the full NPC phase.
 *
 * @param mapState - Current map state
 * @param alertLevel - Current alert level state
 * @param gridType - Grid type
 * @param rollProvider - Function that provides dice rolls (random or predetermined)
 * @returns Full NPC phase result with updated state
 */
export function executeNPCPhase(
  mapState: MapState,
  alertLevel: AlertLevelState,
  gridType: GridType,
  rollProvider: () => DiceRollResult
): NPCPhaseResult {
  const combatLog: NPCCombatLogEntry[] = [];
  const stateChanges: StateChangeEntry[] = [];
  let elitesSpawned: MapItem[] = [];

  // Working copy of map state (mutated as NPCs act)
  let workingState: MapState = {
    items: mapState.items.slice(),
    characters: mapState.characters.map(c => ({
      ...c,
      stats: { ...c.stats },
    })),
    zones: mapState.zones.slice(),
  };

  // Alert level 0 → NPCs passive
  if (alertLevel.level === 0) {
    return { updatedMapState: workingState, combatLog, stateChanges, elitesSpawned };
  }

  // Spawn elites at alert level 3
  if (shouldSpawnElites(alertLevel.level)) {
    elitesSpawned = spawnElites(workingState);
    if (elitesSpawned.length > 0) {
      workingState = {
        ...workingState,
        items: [...workingState.items, ...elitesSpawned],
      };
    }
  }

  // Get all NPC items
  const npcs = workingState.items.filter(item =>
    item.type === 'enemy-security-guard' ||
    item.type === 'enemy-elite' ||
    item.type === 'enemy-camera'
  );

  const actionsPerNPC = alertLevel.npcActionsPerActivation;

  // Process each NPC
  for (const npc of npcs) {
    const npcStats = getNPCStatsForItem(npc);
    if (!npcStats) continue;

    // Select target
    const target = selectMobTarget(npc, workingState, gridType);
    if (!target) continue;

    // Track the NPC's current position (may change as it moves)
    let currentNPCPosition = { ...npc.position };

    // Execute N actions
    for (let actionIdx = 0; actionIdx < actionsPerNPC; actionIdx++) {
      // Re-find the target character in working state (may have taken damage)
      const currentTarget = workingState.characters.find(c => c.id === target.id);
      if (!currentTarget) break;

      // Skip if target was downed
      if (currentTarget.state === 'Unconscious' || currentTarget.state === 'Stunned') break;

      // Create a virtual NPC at current position for action selection
      const virtualNPC: MapItem = { ...npc, position: currentNPCPosition };

      const action = selectNPCAction(virtualNPC, npcStats, currentTarget, workingState, gridType);

      if (action === 'move') {
        const moveResult = calculateNPCMove(virtualNPC, npcStats.movement, currentTarget, workingState, gridType);

        if (moveResult) {
          currentNPCPosition = moveResult.newPosition;

          // Update the NPC's position in working state
          workingState = updateNPCPosition(workingState, npc.id, moveResult.newPosition);

          combatLog.push({
            npcId: npc.id,
            npcType: npc.type,
            action: 'move',
            targetId: currentTarget.id,
            newPosition: moveResult.newPosition,
          });
        } else {
          combatLog.push({
            npcId: npc.id,
            npcType: npc.type,
            action: 'idle',
            targetId: currentTarget.id,
          });
        }
      } else if (action === 'melee-attack' || action === 'ranged-attack') {
        const attackType = action === 'melee-attack' ? 'melee' : 'ranged';
        const attackRoll = rollProvider();
        const defenseRoll = rollProvider();

        const result = resolveNPCAttack(
          virtualNPC, npcStats, currentTarget,
          attackType as 'melee' | 'ranged',
          attackRoll, defenseRoll
        );

        // Apply damage to working state
        if (result.attack.hit && result.defense) {
          workingState = applyNPCCombatResult(workingState, currentTarget.id, result);

          if (result.targetStateAfter !== currentTarget.state) {
            stateChanges.push({
              characterId: currentTarget.id,
              oldState: currentTarget.state,
              newState: result.targetStateAfter,
              cause: `${npc.type} ${attackType} attack`,
            });
          }
        }

        combatLog.push({
          npcId: npc.id,
          npcType: npc.type,
          action,
          targetId: currentTarget.id,
          result,
        });
      } else {
        // idle
        combatLog.push({
          npcId: npc.id,
          npcType: npc.type,
          action: 'idle',
        });
      }
    }
  }

  return { updatedMapState: workingState, combatLog, stateChanges, elitesSpawned };
}

/**
 * Preview NPC phase outcomes using expected values.
 * AI helper: predicts what NPCs will do without rolling dice.
 */
export function previewNPCPhase(
  mapState: MapState,
  alertLevel: AlertLevelState,
  gridType: GridType
): NPCPhasePreview[] {
  const previews: NPCPhasePreview[] = [];

  if (alertLevel.level === 0) return previews;

  const npcs = mapState.items.filter(item =>
    item.type === 'enemy-security-guard' ||
    item.type === 'enemy-elite' ||
    item.type === 'enemy-camera'
  );

  const gridUtils = createGridUtils(gridType);

  for (const npc of npcs) {
    const npcStats = getNPCStatsForItem(npc);
    if (!npcStats) continue;

    const target = selectMobTarget(npc, mapState, gridType);

    if (!target) {
      previews.push({
        npcId: npc.id,
        targetId: null,
        expectedDamage: 0,
        wouldReachTarget: false,
      });
      continue;
    }

    const distance = gridUtils.getCellDistance(npc.position, target.position);
    const actionsPerNPC = alertLevel.npcActionsPerActivation;

    // Estimate if NPC would reach melee range
    const movementBudget = npcStats.movement * actionsPerNPC;
    const wouldReachTarget = distance <= movementBudget + 1; // +1 for adjacency

    // Estimate expected damage
    let totalExpectedDmg = 0;

    // Simplified: assume NPC uses all actions optimally
    for (let i = 0; i < actionsPerNPC; i++) {
      const attackInfo = getNPCAttackInfo(npcStats, 'ranged');
      const meleeInfo = getNPCAttackInfo(npcStats, 'melee');

      if (attackInfo && npcStats.range !== null && distance <= npcStats.range) {
        // Can ranged attack
        const pHit = probability2d6(attackInfo.skill);
        totalExpectedDmg += pHit * attackInfo.damage;
      } else if (meleeInfo && distance <= 1) {
        // Can melee attack
        const pHit = probability2d6(meleeInfo.skill);
        totalExpectedDmg += pHit * meleeInfo.damage;
      }
      // else: would move, no damage this action
    }

    previews.push({
      npcId: npc.id,
      targetId: target.id,
      expectedDamage: totalExpectedDmg,
      wouldReachTarget,
    });
  }

  return previews;
}

// ============== Helpers ==============

/**
 * Update an NPC's position in the map state.
 */
function updateNPCPosition(mapState: MapState, npcId: string, newPosition: Position): MapState {
  return {
    ...mapState,
    items: mapState.items.map(item =>
      item.id === npcId ? { ...item, position: newPosition } : item
    ),
  };
}

/**
 * Apply combat result to a character in the map state.
 */
function applyNPCCombatResult(
  mapState: MapState,
  targetId: string,
  result: CombatResult
): MapState {
  return {
    ...mapState,
    characters: mapState.characters.map(char => {
      if (char.id !== targetId) return char;
      return {
        ...char,
        stats: { ...char.stats, wounds: result.targetWoundsAfter },
        state: result.targetStateAfter,
      };
    }),
  };
}
