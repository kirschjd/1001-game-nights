/**
 * Action Costs for Heist City
 *
 * Derives action costs from CHARACTER_DATA and STATE_DATA to avoid duplication.
 * Core actions (Move, Hack, Con, weapon attacks) default to 1 slot.
 */

import { CHARACTER_DATA } from './characterStats';
import { getAllStateActions } from './stateAbilities';
import { CORE_ACTIONS, DEFAULT_MELEE } from './coreActions';

/**
 * Build a map of ability names to their slot costs from CHARACTER_DATA and STATE_DATA
 */
function buildAbilityCostMap(): Map<string, number> {
  const costMap = new Map<string, number>();

  // Extract all abilities from all character roles
  for (const role of Object.values(CHARACTER_DATA)) {
    for (const ability of role.abilities) {
      costMap.set(ability.name, ability.actionCost);
    }
  }

  // Extract all state-based actions
  const stateActions = getAllStateActions();
  for (const action of stateActions) {
    costMap.set(action.name, action.actionCost);
  }

  return costMap;
}

// Cache the ability cost map
const ABILITY_COSTS = buildAbilityCostMap();

/**
 * Get the slot cost for an action
 * Checks ability names from CHARACTER_DATA first, defaults to 1 for core actions
 */
export function getActionCost(actionName: string): number {
  // Check exact match in abilities
  if (ABILITY_COSTS.has(actionName)) {
    return ABILITY_COSTS.get(actionName)!;
  }

  // Check if action starts with any known ability name (for cases like "Ability Name (details)")
  const entries = Array.from(ABILITY_COSTS.entries());
  for (let i = 0; i < entries.length; i++) {
    const [abilityName, cost] = entries[i];
    if (actionName.startsWith(abilityName)) {
      return cost;
    }
  }

  // Default to 1 slot for core actions (Move, Hack, Con, weapon attacks, etc.)
  return 1;
}

/**
 * Check if an action can fit in the remaining slots
 */
export function canSelectAction(actionName: string, slotIndex: number, totalSlots: number = 3): boolean {
  const cost = getActionCost(actionName);
  const remainingSlots = totalSlots - slotIndex;
  return cost <= remainingSlots;
}

/**
 * Get display suffix for multi-slot actions (e.g., "(2 slots)")
 */
export function getActionCostDisplay(actionName: string): string | null {
  const cost = getActionCost(actionName);
  if (cost > 1) {
    return `(${cost} slots)`;
  }
  return null;
}

/**
 * Get all ability costs (useful for debugging/display)
 */
export function getAllAbilityCosts(): Map<string, number> {
  return new Map(ABILITY_COSTS);
}

/**
 * Build a map of action names to their descriptions
 */
function buildActionDescriptionMap(): Map<string, string> {
  const descMap = new Map<string, string>();

  // Extract all abilities from all character roles
  for (const role of Object.values(CHARACTER_DATA)) {
    for (const ability of role.abilities) {
      descMap.set(ability.name, ability.description);
    }
  }

  // Extract all state-based actions
  const stateActions = getAllStateActions();
  for (const action of stateActions) {
    descMap.set(action.name, action.description);
  }

  // Extract core actions
  for (const action of CORE_ACTIONS) {
    descMap.set(action.id, action.description);
  }

  // Add default melee
  descMap.set(DEFAULT_MELEE.id, DEFAULT_MELEE.description);

  // Add equipment-based actions
  descMap.set('Reload', 'Reload a weapon with the Reload special. Required before the weapon can be used again.');

  return descMap;
}

// Cache the action description map
const ACTION_DESCRIPTIONS = buildActionDescriptionMap();

/**
 * Get the description for an action
 * Returns null if no description is found
 */
export function getActionDescription(actionName: string): string | null {
  // Check exact match first
  if (ACTION_DESCRIPTIONS.has(actionName)) {
    return ACTION_DESCRIPTIONS.get(actionName)!;
  }

  // Check if action starts with any known action name (for formatted actions like "Move (4")")
  const entries = Array.from(ACTION_DESCRIPTIONS.entries());
  for (let i = 0; i < entries.length; i++) {
    const [name, description] = entries[i];
    if (actionName.startsWith(name)) {
      return description;
    }
  }

  // For weapon actions, return a generic description
  if (actionName.includes('(MS ') || actionName.includes('(BS ')) {
    return 'Attack with this weapon';
  }

  return null;
}
