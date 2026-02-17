/**
 * Victory Points Calculation
 *
 * VP scoring events:
 *   Hack computer (opposed)         1 VP
 *   Upload info (from info drop)    1 VP  (hack +1 check, 1/turn/drop)
 *   Extract info drop               3 VP  (carry to deployment zone by end of combat)
 *   Down enemy (first time)         1 VP
 *   Reveal hidden/disguised         1 VP
 *   Get mob intel                   1 VP  (disguised, charm +2, 1/turn)
 *   Escape                          1 VP  (each character in deployment zone at turn 5)
 */

import { CharacterToken, MapState, MapZone, GridType, Position } from '../types';
import { VPEvent, VPEventType, TurnState } from './types';
import { createGridUtils } from '../data/gridUtils';

let vpIdCounter = 0;

/**
 * Create a VP event record.
 */
export function awardVP(
  characterId: string,
  eventType: VPEventType,
  turnNumber: number,
  description: string,
  points?: number
): VPEvent {
  return {
    type: eventType,
    characterId,
    points: points ?? getDefaultVPAmount(eventType),
    turnNumber,
    description,
  };
}

/**
 * Get the default VP amount for an event type.
 */
function getDefaultVPAmount(type: VPEventType): number {
  switch (type) {
    case 'hack-computer': return 1;
    case 'hack-info-drop': return 1;
    case 'info-drop-extract': return 3;
    case 'down-enemy': return 1;
    case 'reveal-hidden': return 1;
    case 'reveal-disguised': return 1;
    case 'mob-intel': return 1;
    case 'escape': return 1;
  }
}

/**
 * Calculate total VP for a team by summing character victoryPoints fields.
 */
export function calculateTeamVP(mapState: MapState, playerNumber: 1 | 2): number {
  return mapState.characters
    .filter(c => c.playerNumber === playerNumber)
    .reduce((sum, c) => sum + (c.victoryPoints || 0), 0);
}

/**
 * At turn 5: check which characters are in their deployment zone.
 * Returns VP events for each escaping character.
 */
export function calculateEscapeVP(
  mapState: MapState,
  zones: MapZone[],
  turnNumber: number,
  playerNumber: 1 | 2,
  gridType: GridType
): VPEvent[] {
  if (turnNumber < 5) return [];

  const gridUtils = createGridUtils(gridType);
  const events: VPEvent[] = [];

  // Find deployment zone for this player
  const deploymentZone = zones.find(z =>
    z.label.toLowerCase().includes(`player ${playerNumber}`) ||
    z.label.toLowerCase().includes(`p${playerNumber}`) ||
    z.label.toLowerCase().includes('deployment')
  );

  if (!deploymentZone) return events;

  const teamCharacters = mapState.characters.filter(
    c => c.playerNumber === playerNumber && c.state !== 'Unconscious'
  );

  for (const char of teamCharacters) {
    if (isInZone(char.position, deploymentZone, gridType, gridUtils)) {
      events.push(
        awardVP(char.id, 'escape', turnNumber, `${char.name} escaped to deployment zone`)
      );
    }
  }

  return events;
}

/**
 * Check if a position is within a zone.
 * For hex grids: checks hexCells array if available.
 * For square grids: checks rectangular bounds.
 */
function isInZone(
  position: Position,
  zone: MapZone,
  gridType: GridType,
  gridUtils: ReturnType<typeof createGridUtils>
): boolean {
  if (gridType === 'hex' && zone.hexCells) {
    return zone.hexCells.some(cell => cell.x === position.x && cell.y === position.y);
  }

  // Square grid: check rectangular bounds
  return (
    position.x >= zone.position.x &&
    position.x < zone.position.x + zone.width &&
    position.y >= zone.position.y &&
    position.y < zone.position.y + zone.height
  );
}

/**
 * List all VP-scoring opportunities available to a character right now.
 * Used by the AI to evaluate action value.
 *
 * Phase 1: uses simple distance checks. Phase 2 upgrades with LOS/pathfinding.
 */
export function getVPOpportunities(
  character: CharacterToken,
  mapState: MapState,
  turnState: TurnState,
  gridType: GridType
): Array<{ type: VPEventType; targetId?: string; estimatedVP: number; distance: number }> {
  const gridUtils = createGridUtils(gridType);
  const opportunities: Array<{ type: VPEventType; targetId?: string; estimatedVP: number; distance: number }> = [];

  // Nearby computers (can hack at end of turn — opposed check)
  const computers = mapState.items.filter(item => item.type === 'computer');
  for (const comp of computers) {
    const dist = gridUtils.getCellDistance(character.position, comp.position);
    if (dist <= 1) {
      opportunities.push({ type: 'hack-computer', targetId: comp.id, estimatedVP: 1, distance: dist });
    }
  }

  // Info drops (can upload or extract)
  const infoDrops = mapState.items.filter(item => item.type === 'info-drop');
  for (const drop of infoDrops) {
    const dist = gridUtils.getCellDistance(character.position, drop.position);
    if (dist <= 1) {
      opportunities.push({ type: 'hack-info-drop', targetId: drop.id, estimatedVP: 1, distance: dist });
    }
    // If carrying, extract is worth 3 VP — but we can't tell from MapState alone
    // (would need inventory tracking). Flag it as opportunity with distance.
    opportunities.push({ type: 'info-drop-extract', targetId: drop.id, estimatedVP: 3, distance: dist });
  }

  // Nearby enemies (can attack to down for VP)
  const enemies = mapState.characters.filter(
    c => c.playerNumber !== character.playerNumber && c.state !== 'Unconscious'
  );
  for (const enemy of enemies) {
    const dist = gridUtils.getCellDistance(character.position, enemy.position);
    opportunities.push({ type: 'down-enemy', targetId: enemy.id, estimatedVP: 1, distance: dist });
  }

  // Hidden/Disguised enemies (reveal for VP)
  const stealthEnemies = enemies.filter(e => e.state === 'Hidden' || e.state === 'Disguised');
  for (const enemy of stealthEnemies) {
    const dist = gridUtils.getCellDistance(character.position, enemy.position);
    const type: VPEventType = enemy.state === 'Hidden' ? 'reveal-hidden' : 'reveal-disguised';
    opportunities.push({ type, targetId: enemy.id, estimatedVP: 1, distance: dist });
  }

  // Mob intel (if disguised and adjacent to mob)
  if (character.state === 'Disguised') {
    const mobs = mapState.items.filter(
      item => item.type === 'enemy-security-guard' || item.type === 'enemy-elite'
    );
    for (const mob of mobs) {
      const dist = gridUtils.getCellDistance(character.position, mob.position);
      if (dist <= 1) {
        opportunities.push({ type: 'mob-intel', targetId: mob.id, estimatedVP: 1, distance: dist });
      }
    }
  }

  // Escape (turn 5, need to be in deployment zone)
  if (turnState.turnNumber >= 5) {
    // Distance to deployment zone — simplified, just flag it
    opportunities.push({ type: 'escape', estimatedVP: 1, distance: 0 });
  }

  return opportunities;
}
