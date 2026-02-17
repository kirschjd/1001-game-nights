/**
 * Strategic Planning
 *
 * Top-level strategy selection: evaluates the board, determines
 * strategic posture (aggressive/balanced/defensive/escape),
 * prioritizes objectives, and assigns characters to them.
 */

import { CharacterToken, MapState, GridType } from '../types';
import { TurnState, AlertLevelState } from '../engine/types';
import { computeAlertLevel } from '../engine/alertLevel';
import { calculateTeamVP } from '../engine/victoryPoints';
import { createGridUtils } from '../data/gridUtils';
import {
  BoardEvaluation,
  ObjectiveInfo,
  AIDifficulty,
  StrategicPosture,
  MAX_TURNS,
} from './types';
import { assessThreats } from './threatAssessment';

/**
 * Full board evaluation. Computes VP differential, available objectives,
 * threats, and recommends strategic posture.
 */
export function evaluateBoard(
  mapState: MapState,
  turnState: TurnState,
  gridType: GridType,
  playerNumber: 1 | 2,
  alertModifier: number,
  difficulty: AIDifficulty
): BoardEvaluation {
  const opponentNumber: 1 | 2 = playerNumber === 1 ? 2 : 1;
  const playerVP = calculateTeamVP(mapState, playerNumber);
  const opponentVP = calculateTeamVP(mapState, opponentNumber);
  const vpDifferential = playerVP - opponentVP;

  const alertLevel = computeAlertLevel(mapState, alertModifier);
  const turnsRemaining = MAX_TURNS - turnState.turnNumber;

  // Find objectives
  const objectives = prioritizeObjectives(mapState, gridType, playerNumber);

  // Assess character health
  const characterHealth = mapState.characters
    .filter(c => c.playerNumber === playerNumber)
    .map(c => ({
      characterId: c.id,
      current: c.stats.wounds,
      max: c.stats.maxWounds,
      state: c.state,
    }));

  // Assess threats
  const threats = assessThreats(mapState, gridType, playerNumber, alertLevel);

  // Determine posture
  const posture = getStrategicPosture(
    vpDifferential, turnsRemaining, alertLevel.level, threats.length, difficulty
  );

  // Assign characters to objectives
  const teamChars = mapState.characters.filter(
    c => c.playerNumber === playerNumber && c.state !== 'Unconscious'
  );
  const assignments = assignCharactersToObjectives(objectives, teamChars, mapState, gridType);
  for (const a of assignments) {
    const obj = objectives.find(o => o.targetId === a.objectiveId);
    if (obj) obj.assignedTo = a.characterId;
  }

  return {
    playerVP,
    opponentVP,
    vpDifferential,
    alertLevel: alertLevel.level,
    turnsRemaining,
    objectivesAvailable: objectives,
    characterHealth,
    threats,
    strategicPosture: posture,
  };
}

/**
 * Choose strategic posture based on game situation.
 */
export function getStrategicPosture(
  vpDifferential: number,
  turnsRemaining: number,
  alertLevel: number,
  threatCount: number,
  difficulty: AIDifficulty
): StrategicPosture {
  // Turn 4-5: prioritize escape if needed
  if (turnsRemaining <= 1) {
    return 'escape';
  }

  // Behind by 2+ VP: aggressive
  if (vpDifferential <= -2) {
    return 'aggressive';
  }

  // Ahead by 2+ VP: defensive
  if (vpDifferential >= 2) {
    return 'defensive';
  }

  // Many threats + low safety weight = still balanced
  // Many threats + high safety weight = defensive
  if (threatCount >= 4 && difficulty.safetyWeight >= 0.7) {
    return 'defensive';
  }

  // High alert: more cautious
  if (alertLevel >= 2 && difficulty.safetyWeight >= 0.5) {
    return 'defensive';
  }

  // Close game or neutral: balanced
  return 'balanced';
}

/**
 * Find and prioritize all available objectives on the board.
 * Sorted by estimated VP value and accessibility.
 */
export function prioritizeObjectives(
  mapState: MapState,
  gridType: GridType,
  playerNumber: 1 | 2
): ObjectiveInfo[] {
  const objectives: ObjectiveInfo[] = [];

  // Computers — 1 VP each (hack check)
  const computers = mapState.items.filter(item => item.type === 'computer');
  for (const comp of computers) {
    objectives.push({
      type: 'computer',
      position: comp.position,
      targetId: comp.id,
      vpValue: 1,
    });
  }

  // Info drops — 1 VP to upload, 3 VP to extract
  const infoDrops = mapState.items.filter(item => item.type === 'info-drop');
  for (const drop of infoDrops) {
    objectives.push({
      type: 'info-drop',
      position: drop.position,
      targetId: drop.id,
      vpValue: 3, // Potential max (extract)
    });
  }

  // Enemy characters — 1 VP for first down
  const enemies = mapState.characters.filter(
    c => c.playerNumber !== playerNumber &&
         c.state !== 'Unconscious'
  );
  for (const enemy of enemies) {
    objectives.push({
      type: 'enemy-character',
      position: enemy.position,
      targetId: enemy.id,
      vpValue: 1,
    });
  }

  // Escape zones (turn 4+)
  const deployZone = mapState.zones.find(z =>
    z.label.toLowerCase().includes('deployment') ||
    z.label.toLowerCase().includes(`player ${playerNumber}`) ||
    z.label.toLowerCase().includes(`p${playerNumber}`)
  );
  if (deployZone) {
    objectives.push({
      type: 'escape-zone',
      position: deployZone.position,
      targetId: deployZone.id,
      vpValue: 1, // Per character that escapes
    });
  }

  // Sort by VP value (highest first)
  objectives.sort((a, b) => b.vpValue - a.vpValue);

  return objectives;
}

/**
 * Assign characters to objectives using greedy proximity matching.
 * Considers role affinity:
 *   - Brain → computers (best Hack stat)
 *   - Face → charm objectives (disguised, Get Mob Intel)
 *   - Ninja → infiltration (fast movement, Hidden)
 *   - Muscle → combat (draw aggro, tank)
 *   - Spook → flexible
 */
export function assignCharactersToObjectives(
  objectives: ObjectiveInfo[],
  characters: CharacterToken[],
  mapState: MapState,
  gridType: GridType
): Array<{ characterId: string; objectiveId: string }> {
  const gridUtils = createGridUtils(gridType);
  const assignments: Array<{ characterId: string; objectiveId: string }> = [];
  const assignedChars = new Set<string>();
  const assignedObjs = new Set<string>();

  // Role affinity scores for each objective type
  const roleAffinity: Record<string, Record<string, number>> = {
    'computer': { 'Brain': 3, 'Ninja': 1, 'Spook': 1, 'Face': 0, 'Muscle': 0 },
    'info-drop': { 'Ninja': 3, 'Spook': 2, 'Brain': 1, 'Face': 1, 'Muscle': 0 },
    'enemy-character': { 'Muscle': 3, 'Spook': 2, 'Ninja': 1, 'Face': 0, 'Brain': 0 },
    'escape-zone': { 'Brain': 1, 'Face': 1, 'Ninja': 1, 'Muscle': 1, 'Spook': 1 },
  };

  // Greedy assignment: for each objective (by priority), find best character
  for (const obj of objectives) {
    let bestChar: string | null = null;
    let bestScore = -Infinity;

    for (const char of characters) {
      if (assignedChars.has(char.id)) continue;

      const distance = gridUtils.getCellDistance(char.position, obj.position);
      const affinity = roleAffinity[obj.type]?.[char.role] || 0;

      // Score: affinity bonus - distance penalty
      const score = affinity * 2 - distance * 0.5;

      if (score > bestScore) {
        bestScore = score;
        bestChar = char.id;
      }
    }

    if (bestChar) {
      assignments.push({ characterId: bestChar, objectiveId: obj.targetId });
      assignedChars.add(bestChar);
      assignedObjs.add(obj.targetId);
    }
  }

  return assignments;
}
