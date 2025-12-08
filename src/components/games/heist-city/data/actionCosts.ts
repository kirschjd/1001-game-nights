/**
 * Action Costs for Heist City
 *
 * Defines how many action slots each action consumes.
 * Actions not listed here default to 1 slot.
 */

/**
 * Map of action names/patterns to their slot cost
 * Use exact action names or patterns that match the start of the action name
 */
export const ACTION_COSTS: Record<string, number> = {
  // Role abilities that cost 2 slots
  'All According to Plan': 2,
  'Nothing Personnel': 2,

  // Equipment/special actions that cost 2 slots (add more as needed)
  // 'Heavy Attack': 2,
};

/**
 * Get the slot cost for an action
 * Checks exact match first, then pattern matching
 */
export function getActionCost(actionName: string): number {
  // Check exact match
  if (ACTION_COSTS[actionName] !== undefined) {
    return ACTION_COSTS[actionName];
  }

  // Check if action starts with any known multi-slot action
  for (const [pattern, cost] of Object.entries(ACTION_COSTS)) {
    if (actionName.startsWith(pattern)) {
      return cost;
    }
  }

  // Default to 1 slot
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
