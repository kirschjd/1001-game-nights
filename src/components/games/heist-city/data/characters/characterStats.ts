// Initial character stats for Heist City

import { CharacterRole, CharacterStats } from '../../types';

export interface CharacterAbility {
  name: string;
  actionCost: number;
  description: string;
}

export interface CharacterInfo {
  stats: CharacterStats;
  description: string;
  abilities: CharacterAbility[];
}

export const CHARACTER_DATA: Record<CharacterRole, CharacterInfo> = {
  Face: {
    stats: {
      movement: 4,
      meleeSkill: 8,
      ballisticSkill: 9,
      wounds: 7,
      maxWounds: 7,
      defense: 9,
      hack: 8,
      con: 6,
    },
    description: 'A master of disguise, no one has seen this person\'s true face. Regardless of race or gender, the crew suspects this person is old, because their favorite TV show is "All Creatures Great and Small".',
    abilities: [
      {
        name: 'In Plain Sight',
        actionCost: 1,
        description: '1 character becomes immune to mobs (Limit: 1 per game)',
      },
      {
        name: 'Face Off',
        actionCost: 2,
        description: 'Set state to disguised',
      },
    ],
  },
  Muscle: {
    stats: {
      movement: 3,
      meleeSkill: 7,
      ballisticSkill: 8,
      wounds: 9,
      maxWounds: 9,
      defense: 7,
      hack: 10,
      con: 9,
    },
    description: 'After losing her job as shift boss during the collapse of the Pittsburgh steel industry, she decided to turn to crime. She stays in it for love of the game.',
    abilities: [
      {
        name: 'Push',
        actionCost: 1,
        description: 'Make an attack roll, if successful, move an enemy 2 in a push motion in addition to attack damage',
      },
      {
        name: 'All Eyes On Me',
        actionCost: 2,
        description: 'Draw aggro from all mobs. Get damage reduction 1 until next turn (Limit: 1 per game)',
      },
    ],
  },
  Ninja: {
    stats: {
      movement: 5,
      meleeSkill: 7,
      ballisticSkill: 9,
      wounds: 7,
      maxWounds: 7,
      defense: 9,
      hack: 8,
      con: 8,
    },
    description: 'This guy was born in Wisconsin, but got way too into Japan, and trained himself in the art of Ninjutsu. Turns out it worked for him, as he has turned it into a successful career as a ninja, just don\'t get him started on anime.',
    abilities: [
      {
        name: 'Ghost Hand',
        actionCost: 2,
        description: 'Make a melee attack with reach 5 (ignore walls and cover)',
      },
      {
        name: 'Ninja Vanish',
        actionCost: 2,
        description: 'Set state to hidden, move up to 3  (Limit: 1 per game)',
      },
    ],
  },
  Brain: {
    stats: {
      movement: 3,
      meleeSkill: 9,
      ballisticSkill: 8,
      wounds: 6,
      maxWounds: 6,
      defense: 8,
      hack: 6,
      con: 8,
    },
    description: 'The only thing more elaborate than her heist plans are her gadgets. Regardless of the complexity, she is sure the next one will succeed like nothing has before. First the city, then the world.',
    abilities: [
      {
        name: 'Move It Along',
        actionCost: 2,
        description: 'Move an allied unit or mob 1 move',
      },
      {
        name: 'All According to Plan',
        actionCost: 3,
        description: 'Move every allied unit 1 free move (Limit: 1 per game)',
      },
    ],
  },
  Spook: {
    stats: {
      movement: 5,
      meleeSkill: 9,
      ballisticSkill: 7,
      wounds: 8,
      maxWounds: 8,
      defense: 8,
      hack: 9,
      con: 9,
    },
    description: 'Supposedly he did something in Afghanistan for the Reagan Administration, but he refuses to confirm or deny it one way or another. Still, he definitely knows way too many languages for someone on the up and up.',
    abilities: [
      {
        name: 'CQC Technique',
        actionCost: 1,
        description: 'Move 3 then do a melee attack',
      },
      {
        name: 'Under Cover',
        actionCost: 0,
        description: 'Can move 2 times before the game',
      },
    ],
  },
};

export const INITIAL_CHARACTER_STATS: Record<CharacterRole, CharacterStats> = {
  Face: CHARACTER_DATA.Face.stats,
  Muscle: CHARACTER_DATA.Muscle.stats,
  Ninja: CHARACTER_DATA.Ninja.stats,
  Brain: CHARACTER_DATA.Brain.stats,
  Spook: CHARACTER_DATA.Spook.stats,
};

export const CHARACTER_ROLES: CharacterRole[] = ['Face', 'Muscle', 'Ninja', 'Brain', 'Spook'];

/**
 * Calculate level from experience points
 * Level 1: 0-5 XP
 * Level 2: 6-14 XP
 * Level 3: 15-25 XP
 * Level 4+: Every 15 XP thereafter
 */
export function calculateLevel(experience: number): number {
  if (experience <= 5) return 1;
  if (experience <= 14) return 2;
  if (experience <= 25) return 3;
  return 4 + Math.floor((experience - 26) / 15);
}

/**
 * Get XP thresholds for a level
 */
export function getLevelThresholds(level: number): { min: number; max: number } {
  if (level === 1) return { min: 0, max: 5 };
  if (level === 2) return { min: 6, max: 14 };
  if (level === 3) return { min: 15, max: 25 };
  const min = 26 + (level - 4) * 15;
  const max = min + 14;
  return { min, max };
}
