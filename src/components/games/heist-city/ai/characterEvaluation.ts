/**
 * Character & Board Position Evaluation
 *
 * Evaluates how good a character's current position is and
 * provides aggregate team scoring for strategic planning.
 */

import { CharacterToken, MapState, GridType } from '../types';
import { AlertLevelState } from '../engine/types';
import { createGridUtils } from '../data/gridUtils';
import { buildLOSBlockers, buildItemPositionMap } from '../engine/spatial/wallMap';
import { hasCover } from '../engine/spatial/coverDetection';
import { getEnemiesInRange } from '../engine/spatial/rangeQueries';
import { CharacterPositionScore, ThreatInfo } from './types';
import { assessCharacterThreat } from './threatAssessment';

// State safety scores: higher = safer
const STATE_SCORES: Record<string, number> = {
  'Hidden': 1.0,
  'Disguised': 0.8,
  'Overt': 0.5,
  'Stunned': 0.1,
  'Unconscious': 0.0,
};

/**
 * Evaluate how good a character's current board position is.
 *
 * Considers health, cover, threats, proximity to objectives,
 * and character state.
 */
export function evaluateCharacterPosition(
  character: CharacterToken,
  mapState: MapState,
  gridType: GridType,
  alertLevel: AlertLevelState
): CharacterPositionScore {
  const gridUtils = createGridUtils(gridType);
  const losBlockers = buildLOSBlockers(mapState);
  const itemMap = buildItemPositionMap(mapState);

  // Health percentage
  const healthPercent = character.stats.maxWounds > 0
    ? character.stats.wounds / character.stats.maxWounds
    : 0;

  // Cover check: is this character covered from any nearby enemy?
  let isCovered = false;
  const nearbyEnemies = getEnemiesInRange(character.position, 12, mapState, gridType);
  for (const enemy of nearbyEnemies) {
    const coverResult = hasCover(enemy.position, character.position, losBlockers, itemMap);
    if (coverResult.covered) {
      isCovered = true;
      break;
    }
  }

  // Count threats in range (NPC enemies that could hit us this turn)
  const threats = assessCharacterThreat(character, mapState, gridType, alertLevel);
  const threatsInRange = threats.filter(t => t.distanceInMoves === 0).length;

  // Distance to nearest objective (computer or info-drop)
  const objectives = mapState.items.filter(
    item => item.type === 'computer' || item.type === 'info-drop'
  );
  let distanceToObjective = Infinity;
  for (const obj of objectives) {
    const dist = gridUtils.getCellDistance(character.position, obj.position);
    if (dist < distanceToObjective) distanceToObjective = dist;
  }
  if (distanceToObjective === Infinity) distanceToObjective = 0;

  // Distance to deployment zone (simplified: use zone center or nearest zone cell)
  const deployZone = mapState.zones.find(z =>
    z.label.toLowerCase().includes('deployment') ||
    z.label.toLowerCase().includes(`player ${character.playerNumber}`) ||
    z.label.toLowerCase().includes(`p${character.playerNumber}`)
  );
  let distanceToDeployment = 0;
  if (deployZone && deployZone.hexCells && deployZone.hexCells.length > 0) {
    let minDist = Infinity;
    for (const cell of deployZone.hexCells) {
      const d = gridUtils.getCellDistance(character.position, cell);
      if (d < minDist) minDist = d;
    }
    distanceToDeployment = minDist === Infinity ? 0 : minDist;
  } else if (deployZone) {
    distanceToDeployment = gridUtils.getCellDistance(
      character.position,
      deployZone.position
    );
  }

  // State score
  const stateScore = STATE_SCORES[character.state] || 0;

  // Overall score: weighted combination
  // Health: 0-1, cover bonus: 0.1, threats penalty, objective proximity bonus
  const coverBonus = isCovered ? 0.1 : 0;
  const threatPenalty = Math.min(threatsInRange * 0.15, 0.5);
  const objectiveBonus = distanceToObjective <= 1 ? 0.2 : Math.max(0, 0.15 - distanceToObjective * 0.01);

  const overall = (
    healthPercent * 0.4 +
    stateScore * 0.25 +
    coverBonus +
    objectiveBonus -
    threatPenalty
  );

  return {
    healthPercent,
    hasCover: isCovered,
    threatsInRange,
    distanceToObjective,
    distanceToDeployment,
    stateScore,
    overall: Math.max(0, Math.min(1, overall)),
  };
}

/**
 * Aggregate team position score.
 * Average of all active (non-Unconscious) characters' position scores.
 */
export function evaluateTeamPosition(
  mapState: MapState,
  playerNumber: 1 | 2,
  gridType: GridType,
  alertLevel: AlertLevelState
): number {
  const team = mapState.characters.filter(
    c => c.playerNumber === playerNumber && c.state !== 'Unconscious'
  );

  if (team.length === 0) return 0;

  let total = 0;
  for (const char of team) {
    const score = evaluateCharacterPosition(char, mapState, gridType, alertLevel);
    total += score.overall;
  }

  return total / team.length;
}
