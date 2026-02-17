/**
 * Action Legality
 *
 * Determines what actions a character can legally perform given the full
 * game state. This is the strict version used by the AI. The Rules Advisor
 * (Phase 5) uses these same checks but in an advisory capacity.
 *
 * Builds on existing getAvailableActions() from actionUtils.ts but adds:
 *   - Slot availability (enough remaining slots?)
 *   - State restrictions (Stunned = only Wake Up, Unconscious = nothing)
 *   - Target validation (something in range to attack/hack/charm?)
 *   - Cooldown tracking (limit-1-per-game abilities)
 *   - Repeat penalty tracking
 *
 * Phase 1 uses simple hexDistance for range checks. Phase 2 upgrades
 * these with proper pathfinding and LOS.
 */

import { CharacterToken, MapState, GridType } from '../types';
import { LegalAction, TurnState } from './types';
import { getAvailableActions } from '../data/characters/actionUtils';
import { getActionCost } from '../data/characters/actionCosts';
import { getEquipmentById } from '../data/equipmentLoader';
import { isContinuationSlot } from '../data/characters/actionSlots';
import { createGridUtils } from '../data/gridUtils';

/**
 * Count the number of remaining action slots for a character.
 * Accounts for filled slots and continuation markers.
 */
export function getRemainingSlots(character: CharacterToken): number {
  const actions = character.actions || [];
  const totalSlots = 3;
  let filled = 0;
  for (let i = 0; i < totalSlots; i++) {
    if (actions[i] && actions[i] !== '') {
      filled++;
    }
  }
  return totalSlots - filled;
}

/**
 * Get the first empty slot index for a character, or -1 if all slots are full.
 */
export function getFirstEmptySlot(character: CharacterToken): number {
  const actions = character.actions || [];
  for (let i = 0; i < 3; i++) {
    if (!actions[i] || actions[i] === '') {
      return i;
    }
  }
  return -1;
}

/**
 * Can this character still be activated this turn?
 * Checks exhausted flag and whether they've already activated.
 */
export function canActivate(character: CharacterToken, turnState: TurnState): boolean {
  if (character.state === 'Unconscious') return false;
  if (character.exhausted) return false;

  const activated = turnState.activationsRemaining.get(character.id);
  // If the character is in the map and hasn't been marked as activated
  return activated !== false;
}

/**
 * Count how many times a specific attack type has been used this turn
 * by looking at the character's current action slots.
 */
export function getRepeatPenalty(character: CharacterToken, actionId: string): number {
  const actions = character.actions || [];
  let count = 0;
  for (const action of actions) {
    if (!action || action === '' || isContinuationSlot(actions, actions.indexOf(action))) {
      continue;
    }
    // Check if this action matches (weapon attacks contain the weapon ID)
    if (action.includes(actionId) || action === actionId) {
      count++;
    }
  }
  // Repeat penalty starts at 0 for first use, +1 for second, etc.
  return count;
}

/**
 * Check if a specific action has been used this game (for limit-1-per-game abilities).
 * This requires tracking across turns — the usedAbilities set should be maintained
 * externally and passed in.
 */
export function isLimitedAbilityUsed(
  actionId: string,
  usedAbilities: Set<string>
): boolean {
  return usedAbilities.has(actionId);
}

/** Abilities that can only be used once per game */
const ONCE_PER_GAME_ABILITIES = new Set([
  'In Plain Sight',
  'All Eyes On Me',
  'Ninja Vanish',
  'All According to Plan',
]);

/**
 * Get all legal actions for a character given the full game state.
 *
 * @param character - The character to check
 * @param mapState - Current map state
 * @param turnState - Current turn state
 * @param gridType - Grid type for distance calculations
 * @param usedAbilities - Set of ability IDs already used this game (for once-per-game limits)
 */
export function getLegalActions(
  character: CharacterToken,
  mapState: MapState,
  turnState: TurnState,
  gridType: GridType,
  usedAbilities: Set<string> = new Set()
): LegalAction[] {
  const remainingSlots = getRemainingSlots(character);
  if (remainingSlots <= 0) return [];

  // Get the base available actions from the existing data layer
  const availableActionNames = getAvailableActions(character);
  const gridUtils = createGridUtils(gridType);

  const legalActions: LegalAction[] = [];

  for (const actionName of availableActionNames) {
    const slotCost = getActionCost(actionName);

    // Skip if not enough slots
    if (slotCost > remainingSlots) continue;

    // Skip once-per-game abilities that have been used
    const baseActionName = extractBaseActionName(actionName);
    if (ONCE_PER_GAME_ABILITIES.has(baseActionName) && usedAbilities.has(baseActionName)) {
      continue;
    }

    // Determine if this action requires a target and what targets are valid
    const actionInfo = categorizeAction(actionName, character, mapState, gridType, gridUtils);
    if (actionInfo.requiresTarget && (!actionInfo.validTargets || actionInfo.validTargets.length === 0)) {
      // No valid targets — skip (but Move is always legal if there's somewhere to go)
      continue;
    }

    legalActions.push({
      actionId: actionName,
      name: actionInfo.displayName,
      slotCost,
      requiresTarget: actionInfo.requiresTarget,
      validTargets: actionInfo.validTargets,
      metadata: {
        repeatPenalty: actionInfo.isAttack ? getRepeatPenalty(character, actionName) : 0,
        isAttack: actionInfo.isAttack,
        attackType: actionInfo.attackType,
        weaponId: actionInfo.weaponId,
      },
    });
  }

  return legalActions;
}

/**
 * Validate whether a specific action is legal for a character.
 */
export function isActionLegal(
  character: CharacterToken,
  actionId: string,
  mapState: MapState,
  turnState: TurnState,
  gridType: GridType,
  usedAbilities: Set<string> = new Set()
): { legal: boolean; reason?: string } {
  if (character.state === 'Unconscious') {
    return { legal: false, reason: 'Character is Unconscious and cannot act' };
  }

  const remainingSlots = getRemainingSlots(character);
  if (remainingSlots <= 0) {
    return { legal: false, reason: 'No action slots remaining' };
  }

  const slotCost = getActionCost(actionId);
  if (slotCost > remainingSlots) {
    return { legal: false, reason: `Action costs ${slotCost} slots but only ${remainingSlots} remain` };
  }

  const baseAction = extractBaseActionName(actionId);
  if (ONCE_PER_GAME_ABILITIES.has(baseAction) && usedAbilities.has(baseAction)) {
    return { legal: false, reason: `${baseAction} has already been used this game (limit: 1 per game)` };
  }

  // Check if this action is in the available list
  const available = getAvailableActions(character);
  const isAvailable = available.some(a =>
    a === actionId || a.startsWith(actionId) || actionId.startsWith(a)
  );

  if (!isAvailable) {
    return { legal: false, reason: `${actionId} is not available to this character in state ${character.state}` };
  }

  return { legal: true };
}

// ============== Helpers ==============

interface ActionCategorization {
  displayName: string;
  requiresTarget: boolean;
  validTargets?: string[];
  isAttack: boolean;
  attackType?: 'melee' | 'ranged';
  weaponId?: string;
}

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

/**
 * Categorize an action to determine targeting, attack type, etc.
 * Phase 1: uses simple hex distance for range checks.
 */
function categorizeAction(
  actionName: string,
  character: CharacterToken,
  mapState: MapState,
  gridType: GridType,
  gridUtils: ReturnType<typeof createGridUtils>
): ActionCategorization {
  const baseName = extractBaseActionName(actionName);

  // Move action — always available (Phase 2 will populate destinations)
  if (baseName === 'Move' || baseName === 'Hustle' || baseName === 'Sprint') {
    return {
      displayName: actionName,
      requiresTarget: false,
      isAttack: false,
    };
  }

  // Hack — needs a computer or info drop nearby
  if (baseName === 'Hack') {
    const targets = mapState.items
      .filter(item => item.type === 'computer' || item.type === 'info-drop')
      .filter(item => gridUtils.getCellDistance(character.position, item.position) <= 1)
      .map(item => item.id);
    return {
      displayName: actionName,
      requiresTarget: targets.length > 0,
      validTargets: targets,
      isAttack: false,
    };
  }

  // Charm/Con
  if (baseName === 'Charm' || baseName === 'Con') {
    return {
      displayName: actionName,
      requiresTarget: false, // Charm targets are context-dependent
      isAttack: false,
    };
  }

  // Pick up item
  if (baseName === 'Pick Up Item' || baseName === 'Pick up item') {
    const items = mapState.items
      .filter(item => item.type === 'gear' || item.type === 'info-drop')
      .filter(item => gridUtils.getCellDistance(character.position, item.position) <= 1)
      .map(item => item.id);
    return {
      displayName: actionName,
      requiresTarget: items.length > 0,
      validTargets: items,
      isAttack: false,
    };
  }

  // Weapon attacks — check if it's melee or ranged
  if (actionName.includes('(MS ')) {
    // Melee attack — needs adjacent enemy
    const targets = findMeleeTargets(character, mapState, gridUtils);
    return {
      displayName: actionName,
      requiresTarget: true,
      validTargets: targets,
      isAttack: true,
      attackType: 'melee',
      weaponId: baseName === 'Fist' ? 'fist' : baseName,
    };
  }

  if (actionName.includes('(BS ')) {
    // Ranged attack — needs enemy within weapon range
    const weapon = getEquipmentById(baseName);
    const range = weapon?.Range || 12;
    const targets = findRangedTargets(character, mapState, gridUtils, range);
    return {
      displayName: actionName,
      requiresTarget: true,
      validTargets: targets,
      isAttack: true,
      attackType: 'ranged',
      weaponId: baseName,
    };
  }

  // Special abilities — mostly don't require targets
  // Go Loud, Face Off, Ninja Vanish, Wake Up, etc.
  if (baseName === 'Get Mob Intel') {
    // Needs adjacent mob
    const mobs = mapState.items
      .filter(item => item.type === 'enemy-security-guard' || item.type === 'enemy-elite')
      .filter(item => gridUtils.getCellDistance(character.position, item.position) <= 1)
      .map(item => item.id);
    return {
      displayName: actionName,
      requiresTarget: mobs.length > 0,
      validTargets: mobs,
      isAttack: false,
    };
  }

  if (baseName === 'Remove Disguise') {
    // Needs adjacent disguised enemy
    const targets = mapState.characters
      .filter(c => c.playerNumber !== character.playerNumber && c.state === 'Disguised')
      .filter(c => gridUtils.getCellDistance(character.position, c.position) <= 1)
      .map(c => c.id);
    return {
      displayName: actionName,
      requiresTarget: true,
      validTargets: targets,
      isAttack: false,
    };
  }

  // Default: no target required (Go Loud, Face Off, Ninja Vanish, Wake Up, etc.)
  return {
    displayName: actionName,
    requiresTarget: false,
    isAttack: false,
  };
}

/**
 * Find valid melee targets (enemy characters and enemy items adjacent to attacker).
 */
function findMeleeTargets(
  attacker: CharacterToken,
  mapState: MapState,
  gridUtils: ReturnType<typeof createGridUtils>
): string[] {
  const targets: string[] = [];

  // Enemy characters adjacent
  for (const char of mapState.characters) {
    if (char.playerNumber === attacker.playerNumber) continue;
    if (char.state === 'Unconscious') continue;
    if (gridUtils.getCellDistance(attacker.position, char.position) <= 1) {
      targets.push(char.id);
    }
  }

  // Enemy items adjacent (guards, elites)
  for (const item of mapState.items) {
    if (item.type === 'enemy-security-guard' || item.type === 'enemy-elite') {
      if (gridUtils.getCellDistance(attacker.position, item.position) <= 1) {
        targets.push(item.id);
      }
    }
  }

  return targets;
}

/**
 * Find valid ranged targets within weapon range.
 * Phase 1: simple hex distance. Phase 2 adds LOS checks.
 */
function findRangedTargets(
  attacker: CharacterToken,
  mapState: MapState,
  gridUtils: ReturnType<typeof createGridUtils>,
  range: number
): string[] {
  const targets: string[] = [];

  // Enemy characters in range
  for (const char of mapState.characters) {
    if (char.playerNumber === attacker.playerNumber) continue;
    if (char.state === 'Unconscious') continue;
    if (gridUtils.getCellDistance(attacker.position, char.position) <= range) {
      targets.push(char.id);
    }
  }

  // Enemy items in range (guards, elites, turrets)
  for (const item of mapState.items) {
    if (item.type === 'enemy-security-guard' || item.type === 'enemy-elite' || item.type === 'enemy-camera') {
      if (gridUtils.getCellDistance(attacker.position, item.position) <= range) {
        targets.push(item.id);
      }
    }
  }

  return targets;
}
