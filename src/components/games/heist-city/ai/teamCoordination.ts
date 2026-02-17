/**
 * Team Coordination — Activation Order
 *
 * Decides the order in which AI characters should activate
 * based on urgency, proximity to objectives, and role.
 *
 * Considerations:
 *   - Characters in immediate danger activate first (escape or fight)
 *   - Characters near objectives activate early (capitalize on positioning)
 *   - On turn 5, characters far from deployment zone go first
 *   - Brain may go first (All According to Plan moves all allies 1)
 *   - Face may go early to set up disguise effects
 */

import { CharacterToken, MapState, GridType } from '../types';
import { TurnState, AlertLevelState } from '../engine/types';
import { canActivate } from '../engine/actions';
import { createGridUtils } from '../data/gridUtils';
import { AIDifficulty, BoardEvaluation, MAX_TURNS } from './types';
import { assessCharacterThreat } from './threatAssessment';

/**
 * Plan the activation order for all AI characters this turn.
 * Returns character IDs sorted by activation priority (first = most urgent).
 */
export function planActivationOrder(
  mapState: MapState,
  turnState: TurnState,
  gridType: GridType,
  playerNumber: 1 | 2,
  boardEval: BoardEvaluation,
  alertLevel: AlertLevelState
): string[] {
  const gridUtils = createGridUtils(gridType);

  // Get activatable characters for this player
  const team = mapState.characters.filter(
    c => c.playerNumber === playerNumber &&
         c.state !== 'Unconscious' &&
         canActivate(c, turnState)
  );

  if (team.length === 0) return [];

  // Score each character's activation urgency
  const scored: Array<{ id: string; urgency: number }> = [];

  for (const char of team) {
    let urgency = 0;

    // 1. Danger urgency: characters under threat go first
    const threats = assessCharacterThreat(char, mapState, gridType, alertLevel);
    const criticalThreats = threats.filter(t => t.urgency === 'critical' || t.urgency === 'high');
    urgency += criticalThreats.length * 3;

    // Low health = more urgent
    const healthPct = char.stats.wounds / char.stats.maxWounds;
    if (healthPct < 0.3) urgency += 2;

    // 2. Objective proximity: near an objective = act early
    const objectives = mapState.items.filter(
      item => item.type === 'computer' || item.type === 'info-drop'
    );
    for (const obj of objectives) {
      const dist = gridUtils.getCellDistance(char.position, obj.position);
      if (dist <= 1) urgency += 2; // Adjacent to objective
      else if (dist <= 3) urgency += 1;
    }

    // 3. Turn 5: far from deployment zone = urgent (need more time)
    if (turnState.turnNumber >= MAX_TURNS) {
      const deployZone = mapState.zones.find(z =>
        z.label.toLowerCase().includes('deployment') ||
        z.label.toLowerCase().includes(`player ${playerNumber}`) ||
        z.label.toLowerCase().includes(`p${playerNumber}`)
      );
      if (deployZone) {
        let distToDeploy = Infinity;
        if (deployZone.hexCells && deployZone.hexCells.length > 0) {
          for (const cell of deployZone.hexCells) {
            const d = gridUtils.getCellDistance(char.position, cell);
            if (d < distToDeploy) distToDeploy = d;
          }
        } else {
          distToDeploy = gridUtils.getCellDistance(char.position, deployZone.position);
        }
        // Farther away = more urgent to move early
        urgency += Math.min(distToDeploy, 5);
      }
    }

    // 4. Role-based ordering
    if (char.role === 'Brain') {
      // Brain may want to go first for "All According to Plan"
      urgency += 1;
    }
    if (char.role === 'Face' && char.state === 'Disguised') {
      // Face can use charm abilities to help team
      urgency += 0.5;
    }

    scored.push({ id: char.id, urgency });
  }

  // Sort by urgency (highest first)
  scored.sort((a, b) => b.urgency - a.urgency);

  return scored.map(s => s.id);
}

/**
 * Select the next character to activate from the planned order.
 * Respects the activation constraint — returns null if all have activated.
 */
export function selectNextCharacter(
  activationOrder: string[],
  turnState: TurnState,
  mapState: MapState
): string | null {
  for (const charId of activationOrder) {
    // Check if still needs to activate
    const remaining = turnState.activationsRemaining.get(charId);
    if (remaining !== true) continue;

    // Check if character is still valid
    const char = mapState.characters.find(c => c.id === charId);
    if (!char) continue;
    if (char.state === 'Unconscious') continue;

    return charId;
  }

  return null;
}
