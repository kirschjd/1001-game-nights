/**
 * State Abilities for Heist City
 *
 * This file defines the abilities and effects for each character state.
 * Edit this file to modify state descriptions and abilities.
 */

import { CharacterState } from '../../types';

export interface StateAbility {
  description: string;
}

/**
 * State-based action that characters can perform based on their state
 */
export interface StateAction {
  name: string;
  actionCost: number;
  description: string;
}

export interface StateInfo {
  name: CharacterState;
  color: string; // Tailwind color class for display
  abilities: StateAbility[];
  // Actions added to character when in this state
  additionalActions?: StateAction[];
  // If true, character can ONLY use the state's actions (no normal actions)
  exclusiveActions?: boolean;
}

/**
 * State definitions with their abilities
 * Edit this object to modify state behaviors
 */
export const STATE_DATA: Record<CharacterState, StateInfo> = {
  Overt: {
    name: 'Overt',
    color: 'text-green-400',
    abilities: [
      {
        description: 'No special abilities',
      },
    ],
    additionalActions: [
      {
        name: 'Hustle',
        actionCost: 2,
        description: 'Move 2X movement +2 spaces',
      },
      {
        name: 'Sprint',
        actionCost: 3,
        description: 'Move 3X movement +4 spaces',
      },
    ],
  },

  Hidden: {
    name: 'Hidden',
    color: 'text-blue-400',
    abilities: [
      {
        description: 'Don\'t draw mob aggro',
      },
      {
        description: 'Can hack disguised enemies',
      },
    ],
    additionalActions: [
      {
        name: 'Remove Disguise',
        actionCost: 1,
        description: 'Hack Check - Any success: Return target to Overt state',
      },
      {
        name: 'Go Loud',
        actionCost: 1,
        description: 'Return to Overt state',
      },
      {
        name: 'Hustle',
        actionCost: 2,
        description: 'Move 2X movement +2 spaces',
      },
    ],
  },

  Disguised: {
    name: 'Disguised',
    color: 'text-yellow-400',
    abilities: [
      {
        description: '+1 to Con rolls',
      },
      {
        description: 'Don\'t draw mob aggro',
      },
      {
        description: 'Can charm mobs',
      },
      {
        description: 'Bonus in melee',
      },
    ],
    additionalActions: [
      {
        name: 'Get Mob Intel',
        actionCost: 2,
        description: 'Charm Check - +2: Get 1 VP (Once per turn)',
      },
      {
        name: 'Go Loud',
        actionCost: 1,
        description: 'Return to Overt state',
      },
    ],
  },

  Stunned: {
    name: 'Stunned',
    color: 'text-orange-400',
    abilities: [
      {
        description: 'Can only Wake Up',
      },
    ],
    additionalActions: [
      {
        name: 'Wake Up',
        actionCost: 3,
        description: 'Recover from stunned state, become Overt',
      },
    ],
    exclusiveActions: true, // Can ONLY use Wake Up when stunned
  },

  Unconscious: {
    name: 'Unconscious',
    color: 'text-red-400',
    abilities: [
      {
        description: 'Cannot take any actions',
      },
    ],
    exclusiveActions: true, // No actions available when unconscious
  },
};

/**
 * Get state info by state name
 */
export function getStateInfo(state: CharacterState): StateInfo {
  return STATE_DATA[state];
}

/**
 * Get all available states
 */
export function getAllStates(): CharacterState[] {
  return Object.keys(STATE_DATA) as CharacterState[];
}

/**
 * Get all state actions for action cost calculation
 */
export function getAllStateActions(): StateAction[] {
  const actions: StateAction[] = [];
  for (const stateInfo of Object.values(STATE_DATA)) {
    if (stateInfo.additionalActions) {
      actions.push(...stateInfo.additionalActions);
    }
  }
  return actions;
}
