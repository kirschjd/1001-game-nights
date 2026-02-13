/**
 * Action Slot Logic for Heist City
 *
 * Pure functions for managing action slot assignment,
 * continuation slots, and clearing.
 */

import { getActionCost } from './actionCosts';

/**
 * Check if a slot contains a continuation marker (e.g., "[Move cont.]")
 */
export function isContinuationSlot(actions: string[], slotIndex: number): boolean {
  const currentAction = actions[slotIndex] || '';
  return currentAction.startsWith('[') && currentAction.endsWith(' cont.]');
}

/**
 * Assign an action to a slot, handling multi-slot costs and continuation markers.
 * Returns a new actions array.
 *
 * - Clears any continuation slots from the previous action in this slot
 * - If actionName is empty, clears the slot and trims trailing empty slots
 * - If actionName has a cost > 1, fills subsequent slots with continuation markers
 */
export function assignAction(
  currentActions: string[],
  slotIndex: number,
  actionName: string,
  totalSlots: number = 3,
): string[] {
  const newActions = [...currentActions];

  // Clear any continuation slots from the previous action in this slot
  const previousAction = newActions[slotIndex];
  if (previousAction && !previousAction.startsWith('[')) {
    const previousCost = getActionCost(previousAction);
    for (let i = 0; i < previousCost && slotIndex + i < totalSlots; i++) {
      newActions[slotIndex + i] = '';
    }
  }

  if (actionName === '') {
    // Trim trailing empty slots
    while (newActions.length > 0 && newActions[newActions.length - 1] === '') {
      newActions.pop();
    }
  } else {
    const cost = getActionCost(actionName);
    newActions[slotIndex] = actionName;
    for (let i = 1; i < cost && slotIndex + i < totalSlots; i++) {
      newActions[slotIndex + i] = `[${actionName} cont.]`;
    }
  }

  return newActions;
}
