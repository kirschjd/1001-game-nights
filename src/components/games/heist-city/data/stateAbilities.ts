/**
 * State Abilities for Heist City
 *
 * This file defines the abilities and effects for each character state.
 * Edit this file to modify state descriptions and abilities.
 */

import { CharacterState } from '../types';

export interface StateAbility {
  description: string;
}

export interface StateInfo {
  name: CharacterState;
  color: string; // Tailwind color class for display
  abilities: StateAbility[];
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
        description: 'Move up to full M value',
      },
      {
        description: 'All actions available',
      },
    ],
  },

  Hidden: {
    name: 'Hidden',
    color: 'text-blue-400',
    abilities: [
      {
        description: 'Movement reduced by 1',
      },
      {
        description: 'Cannot be targeted by enemies',
      },
      {
        description: '+1 damage on first attack (reveals)',
      },
      {
        description: 'Attacking, running, or being adjacent to enemy reveals',
      },
    ],
  },

  Disguised: {
    name: 'Disguised',
    color: 'text-yellow-400',
    abilities: [
      {
        description: 'Can move through guard zones',
      },
      {
        description: 'Enemies ignore unless suspicious',
      },
      {
        description: 'Roll C vs enemy notice to maintain disguise',
      },
      {
        description: 'Attacking or failing Con check reveals',
      },
    ],
  },

  Stunned: {
    name: 'Stunned',
    color: 'text-orange-400',
    abilities: [
      {
        description: 'Only 1 action per turn',
      },
      {
        description: 'Cannot move this turn',
      },
      {
        description: 'Becomes Overt at end of turn',
      },
    ],
  },

  Unconscious: {
    name: 'Unconscious',
    color: 'text-red-400',
    abilities: [
      {
        description: 'Cannot take any actions',
      },
      {
        description: 'Defense reduced to 10',
      },
      {
        description: 'Ally must spend 2 actions adjacent to revive',
      },
      {
        description: 'Revives with 1 wound after 3 turns',
      },
    ],
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
