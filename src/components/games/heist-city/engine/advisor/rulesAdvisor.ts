/**
 * Rules Advisor — Validation Logic
 *
 * Post-action validators for each category of game action.
 * All functions are pure: they take state and return AdvisorEntry[].
 * Nothing is blocked — violations are advisory only.
 *
 * Validators:
 *   validateMovement — distance, path, stunned check
 *   validateAlertLevel — displayed vs computed level
 *   validateActionSlots — slot costs, availability, once-per-game
 *   validateStateChange — transition legality
 *   validateCombatAction — range, LOS, damage
 *   validateVPAward — VP justification
 *   validateTurnEnd — unactivated characters, alert sync
 */

import { CharacterToken, MapState, GridType, Position } from '../../types';
import { TurnState, AlertLevelState } from '../types';
import { createAdvisorEntry, AdvisorEntry } from './advisorLog';
import { createGridUtils } from '../../data/gridUtils';
import { getEquipmentById } from '../../data/equipmentLoader';
import { getEffectiveMovement } from '../spatial/movementValidation';
import { buildWallMap, buildLOSBlockers, buildItemPositionMap, posKey } from '../spatial/wallMap';
import { findPath } from '../spatial/pathfinding';
import { hasLineOfSight } from '../spatial/lineOfSight';
import { computeAlertLevel, countRevealedUnits } from '../alertLevel';
import { getAvailableActions } from '../../data/characters/actionUtils';
import { getActionCost } from '../../data/characters/actionCosts';
import { preservesHiddenState, preservesDisguisedState } from '../stateTransitions';

// ============== Movement Validation ==============

/**
 * Validate a character move. Checks:
 * - Distance within effective movement stat
 * - Path exists (no walls blocking)
 * - Character isn't Stunned (Stunned can only Wake Up)
 */
export function validateMovement(
  character: CharacterToken,
  fromPos: Position,
  toPos: Position,
  mapState: MapState,
  gridType: GridType,
): AdvisorEntry[] {
  const entries: AdvisorEntry[] = [];
  const gridUtils = createGridUtils(gridType);
  const distance = gridUtils.getCellDistance(fromPos, toPos);
  const charDetail = { characterId: character.id, characterName: character.name };

  // Stunned characters shouldn't move
  if (character.state === 'Stunned') {
    entries.push(createAdvisorEntry(
      'movement', 'warning',
      `${character.name} moved but is Stunned (can only Wake Up)`,
      charDetail,
    ));
    return entries;
  }

  // Check distance against base movement (Move action)
  const maxMove = getEffectiveMovement(character, 'move');
  if (distance > maxMove) {
    entries.push(createAdvisorEntry(
      'movement', 'warning',
      `${character.name} moved ${distance} hexes but movement is ${maxMove}`,
      { ...charDetail, details: { distance, maxMove } },
    ));
  }

  // Check for wall obstruction via pathfinding
  const wallMap = buildWallMap(mapState);
  const path = findPath(fromPos, toPos, wallMap, mapState, gridType, 100, character.id);
  if (!path) {
    entries.push(createAdvisorEntry(
      'movement', 'info',
      `${character.name} moved to a position with no valid path (wall obstruction)`,
      { ...charDetail, details: { from: fromPos, to: toPos } },
    ));
  } else if (path.length - 1 > maxMove) {
    // Path exists but is longer than movement allows (had to detour)
    const pathDist = path.length - 1;
    if (pathDist > maxMove && distance <= maxMove) {
      entries.push(createAdvisorEntry(
        'movement', 'info',
        `${character.name} moved ${distance} hexes straight-line but shortest path is ${pathDist} hexes (detour around obstacles)`,
        { ...charDetail, details: { straightLine: distance, pathDistance: pathDist, maxMove } },
      ));
    }
  }

  return entries;
}

// ============== Alert Level Validation ==============

/**
 * Validate that the displayed alert level matches the computed level.
 */
export function validateAlertLevel(
  mapState: MapState,
  alertModifier: number,
  displayedLevel: number,
): AdvisorEntry[] {
  const entries: AdvisorEntry[] = [];
  const computed = computeAlertLevel(mapState, alertModifier);

  if (computed.level !== displayedLevel) {
    const revealed = countRevealedUnits(mapState);
    entries.push(createAdvisorEntry(
      'alert', 'warning',
      `Alert level shows ${displayedLevel} but ${revealed} units are revealed + modifier ${alertModifier} = total ${computed.total} (should be level ${computed.level})`,
      { details: { displayedLevel, computedLevel: computed.level, unitsRevealed: revealed, alertModifier, total: computed.total } },
    ));
  }

  return entries;
}

// ============== Action Slot Validation ==============

/**
 * Validate assigned actions against slot rules.
 * Checks total cost, action availability, state restrictions, once-per-game limits.
 */
export function validateActionSlots(
  character: CharacterToken,
  assignedActions: string[],
  usedAbilities: Set<string> = new Set(),
): AdvisorEntry[] {
  const entries: AdvisorEntry[] = [];
  const charDetail = { characterId: character.id, characterName: character.name };
  const totalSlots = 3;

  // Count total slot cost
  let totalCost = 0;
  for (const action of assignedActions) {
    if (!action || action === '') continue;
    totalCost += getActionCost(action);
  }

  if (totalCost > totalSlots) {
    entries.push(createAdvisorEntry(
      'action-slots', 'error',
      `${character.name} assigned ${totalCost} slots of actions but only has ${totalSlots} slots`,
      { ...charDetail, details: { totalCost, totalSlots, actions: assignedActions } },
    ));
  }

  // Check Stunned restriction
  if (character.state === 'Stunned') {
    for (const action of assignedActions) {
      if (!action || action === '') continue;
      const baseName = extractBaseActionName(action);
      if (baseName !== 'Wake Up') {
        entries.push(createAdvisorEntry(
          'action-slots', 'warning',
          `${character.name} is Stunned but assigned "${action}" (can only Wake Up)`,
          { ...charDetail, actionId: action },
        ));
      }
    }
  }

  // Check Unconscious
  if (character.state === 'Unconscious') {
    const nonEmpty = assignedActions.filter(a => a && a !== '');
    if (nonEmpty.length > 0) {
      entries.push(createAdvisorEntry(
        'action-slots', 'error',
        `${character.name} is Unconscious and cannot take actions`,
        charDetail,
      ));
    }
  }

  // Check action availability
  const availableActions = getAvailableActions(character);
  for (const action of assignedActions) {
    if (!action || action === '') continue;
    const baseName = extractBaseActionName(action);
    const isAvailable = availableActions.some(a =>
      a === action || a.startsWith(baseName) || action.startsWith(extractBaseActionName(a))
    );
    if (!isAvailable) {
      entries.push(createAdvisorEntry(
        'action-slots', 'warning',
        `${character.name} used "${action}" but it may not be available (role: ${character.role}, state: ${character.state})`,
        { ...charDetail, actionId: action },
      ));
    }
  }

  // Check once-per-game abilities
  const ONCE_PER_GAME = ['In Plain Sight', 'All Eyes On Me', 'Ninja Vanish', 'All According to Plan'];
  for (const action of assignedActions) {
    if (!action || action === '') continue;
    const baseName = extractBaseActionName(action);
    if (ONCE_PER_GAME.indexOf(baseName) !== -1 && usedAbilities.has(baseName)) {
      entries.push(createAdvisorEntry(
        'action-slots', 'error',
        `${character.name} used "${baseName}" but it was already used this game (limit: 1 per game)`,
        { ...charDetail, actionId: action },
      ));
    }
  }

  // Check redundant state actions
  for (const action of assignedActions) {
    if (!action || action === '') continue;
    const baseName = extractBaseActionName(action);
    if (baseName === 'Ninja Vanish' && character.state === 'Hidden') {
      entries.push(createAdvisorEntry(
        'action-slots', 'warning',
        `${character.name} used Ninja Vanish but is already Hidden`,
        { ...charDetail, actionId: action },
      ));
    }
    if (baseName === 'Face Off' && character.state === 'Disguised') {
      entries.push(createAdvisorEntry(
        'action-slots', 'warning',
        `${character.name} used Face Off but is already Disguised`,
        { ...charDetail, actionId: action },
      ));
    }
  }

  return entries;
}

// ============== State Change Validation ==============

/**
 * Validate a character state change.
 * Checks if the transition is justified by an action or if it's missing.
 */
export function validateStateChange(
  character: CharacterToken,
  oldState: string,
  newState: string,
  actionId: string | null,
): AdvisorEntry[] {
  const entries: AdvisorEntry[] = [];
  const charDetail = { characterId: character.id, characterName: character.name };

  if (oldState === newState) return entries;

  // Valid explicit transitions
  if (actionId === 'Face Off' && newState === 'Disguised') return entries;
  if (actionId === 'Ninja Vanish' && newState === 'Hidden') return entries;
  if (actionId === 'Go Loud' && newState === 'Overt') return entries;
  if (actionId === 'Wake Up' && oldState === 'Stunned' && newState === 'Overt') return entries;

  // Going from Hidden→Overt or Disguised→Overt due to attack is expected
  // (but should be triggered by weapon use, not arbitrary)
  if ((oldState === 'Hidden' || oldState === 'Disguised') && newState === 'Overt' && actionId) {
    // If there's an action and it's a weapon, check if it preserves stealth
    const baseName = extractBaseActionName(actionId);
    if (actionId.includes('(MS ') || actionId.includes('(BS ')) {
      // Attack broke stealth — expected behavior, no advisory needed
      return entries;
    }
  }

  // Going to Hidden without Ninja Vanish
  if (newState === 'Hidden' && actionId !== 'Ninja Vanish') {
    entries.push(createAdvisorEntry(
      'state', 'warning',
      `${character.name} changed to Hidden without using Ninja Vanish`,
      { ...charDetail, actionId: actionId || undefined, details: { oldState, newState } },
    ));
  }

  // Going to Disguised without Face Off
  if (newState === 'Disguised' && actionId !== 'Face Off') {
    entries.push(createAdvisorEntry(
      'state', 'warning',
      `${character.name} changed to Disguised without using Face Off`,
      { ...charDetail, actionId: actionId || undefined, details: { oldState, newState } },
    ));
  }

  // Overt→Hidden or Overt→Disguised without ability
  if (oldState === 'Overt' && (newState === 'Hidden' || newState === 'Disguised')) {
    entries.push(createAdvisorEntry(
      'state', 'info',
      `${character.name} went from Overt to ${newState} — check if valid ability was used`,
      { ...charDetail, details: { oldState, newState, actionId } },
    ));
  }

  return entries;
}

/**
 * Check if a character should have lost stealth after an attack.
 * Call after an attack action when the character's state didn't change.
 */
export function validateStealthAfterAttack(
  character: CharacterToken,
  weaponId: string,
): AdvisorEntry[] {
  const entries: AdvisorEntry[] = [];
  const charDetail = { characterId: character.id, characterName: character.name };

  if (character.state === 'Hidden' && !preservesHiddenState(weaponId)) {
    const weapon = getEquipmentById(weaponId);
    const weaponName = weapon?.id || weaponId;
    entries.push(createAdvisorEntry(
      'state', 'warning',
      `${character.name} attacked with ${weaponName} (not Hidden-compatible) but state is still Hidden`,
      { ...charDetail, details: { weaponId, currentState: character.state } },
    ));
  }

  if (character.state === 'Disguised' && !preservesDisguisedState(weaponId)) {
    const weapon = getEquipmentById(weaponId);
    const weaponName = weapon?.id || weaponId;
    entries.push(createAdvisorEntry(
      'state', 'warning',
      `${character.name} attacked with ${weaponName} (not Disguised-compatible) but state is still Disguised`,
      { ...charDetail, details: { weaponId, currentState: character.state } },
    ));
  }

  return entries;
}

// ============== Combat Validation ==============

/**
 * Validate a combat action. Checks range, LOS, and damage.
 */
export function validateCombatAction(
  attacker: CharacterToken,
  target: CharacterToken | { id: string; position: Position },
  weaponId: string,
  attackType: 'melee' | 'ranged',
  reportedDamage: number | null,
  mapState: MapState,
  gridType: GridType,
): AdvisorEntry[] {
  const entries: AdvisorEntry[] = [];
  const charDetail = { characterId: attacker.id, characterName: attacker.name };
  const gridUtils = createGridUtils(gridType);
  const distance = gridUtils.getCellDistance(attacker.position, target.position);

  // Melee range check
  if (attackType === 'melee' && distance > 1) {
    entries.push(createAdvisorEntry(
      'targeting', 'warning',
      `${attacker.name} used melee attack but target is ${distance} hexes away (must be adjacent)`,
      { ...charDetail, details: { distance, attackType } },
    ));
  }

  // Ranged range check
  if (attackType === 'ranged') {
    const weapon = getEquipmentById(weaponId);
    const weaponRange = weapon?.Range || 12;
    if (distance > weaponRange) {
      const weaponName = weapon?.id || weaponId;
      entries.push(createAdvisorEntry(
        'targeting', 'warning',
        `Target is ${distance} hexes away but ${weaponName} range is ${weaponRange}`,
        { ...charDetail, details: { distance, weaponRange, weaponId } },
      ));
    }

    // LOS check for ranged
    const losBlockers = buildLOSBlockers(mapState);
    const itemMap = buildItemPositionMap(mapState);
    const los = hasLineOfSight(attacker.position, target.position, losBlockers, itemMap);
    if (!los.clear && los.blockedBy) {
      entries.push(createAdvisorEntry(
        'targeting', 'warning',
        `LOS to target blocked by wall at (${los.blockedBy.x},${los.blockedBy.y})`,
        { ...charDetail, details: { blockedBy: los.blockedBy } },
      ));
    }
  }

  // Damage check
  if (reportedDamage !== null) {
    const weapon = getEquipmentById(weaponId);
    const expectedDmg = weapon?.Damage ?? (weaponId === 'fist' ? 1 : null);
    if (expectedDmg !== null && reportedDamage > expectedDmg + 2) {
      // Allow +1 or +2 for state bonuses (Hidden/Disguised), but flag if way over
      entries.push(createAdvisorEntry(
        'combat', 'warning',
        `Reported ${reportedDamage} damage but ${weapon?.id || weaponId} does ${expectedDmg} base damage (max ${expectedDmg + 2} with bonuses)`,
        { ...charDetail, details: { reportedDamage, expectedDamage: expectedDmg, weaponId } },
      ));
    }
  }

  return entries;
}

// ============== VP Validation ==============

/**
 * Validate a VP award. Checks that the amount is reasonable.
 */
export function validateVPAward(
  character: CharacterToken,
  vpChange: number,
  previousVP: number,
): AdvisorEntry[] {
  const entries: AdvisorEntry[] = [];
  const charDetail = { characterId: character.id, characterName: character.name };

  // VP should only go up (no deductions in game rules)
  if (vpChange < 0) {
    entries.push(createAdvisorEntry(
      'vp', 'warning',
      `${character.name} lost ${Math.abs(vpChange)} VP (VP should only increase)`,
      { ...charDetail, details: { vpChange, previousVP } },
    ));
  }

  // Most VP events are 1 VP, max single event is 3 (info drop extract)
  if (vpChange > 3) {
    entries.push(createAdvisorEntry(
      'vp', 'warning',
      `${character.name} gained ${vpChange} VP at once (max single event is 3 VP for info drop extract)`,
      { ...charDetail, details: { vpChange } },
    ));
  }

  return entries;
}

// ============== Turn End Validation ==============

/**
 * Validate end-of-turn state. Checks for unactivated characters and alert sync.
 */
export function validateTurnEnd(
  mapState: MapState,
  turnState: TurnState,
  alertModifier: number,
  displayedAlertLevel: number,
): AdvisorEntry[] {
  const entries: AdvisorEntry[] = [];

  // Check for characters that weren't activated
  for (const char of mapState.characters) {
    if (char.state === 'Unconscious') continue;
    const activated = turnState.activationsRemaining.get(char.id);
    if (activated === true) {
      entries.push(createAdvisorEntry(
        'turn-order', 'info',
        `${char.name} was not activated this turn`,
        { characterId: char.id, characterName: char.name },
      ));
    }
  }

  // Check for characters with un-cleared actions (should be cleared at end of turn)
  for (const char of mapState.characters) {
    if (char.state === 'Unconscious') continue;
    const actions = char.actions || [];
    const hasActions = actions.some(a => a && a !== '');
    if (hasActions) {
      entries.push(createAdvisorEntry(
        'turn-order', 'info',
        `${char.name} still has actions assigned (should be cleared at end of turn)`,
        { characterId: char.id, characterName: char.name },
      ));
    }
  }

  // Check alert level sync
  const alertEntries = validateAlertLevel(mapState, alertModifier, displayedAlertLevel);
  entries.push(...alertEntries);

  return entries;
}

// ============== Helpers ==============

/**
 * Extract the base action name from a formatted action string.
 * E.g., "Move (4\")" → "Move", "Plink Gun (BS 9+)" → "Plink Gun"
 */
function extractBaseActionName(actionName: string): string {
  const parenIndex = actionName.indexOf(' (');
  if (parenIndex > 0) {
    return actionName.substring(0, parenIndex);
  }
  return actionName;
}
