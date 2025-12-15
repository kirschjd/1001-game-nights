// Initial character stats for Heist City

import { CharacterRole, CharacterStats } from '../types';

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
      wounds: 6,
      maxWounds: 6,
      defense: 8,
      hack: 8,
      con: 6,
    },
    description: 'A master of disguise, no one has seen this person\'s true face. Regardless of race or gender, the crew suspects this person is old, because their favorite TV show is "All Creatures Great and Small".',
    abilities: [
      {
        name: 'Not the mook you are looking for',
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
      defense: 7,
      hack: 8,
      con: 7,
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
      defense: 9,
      hack: 6,
      con: 8,
    },
    description: 'The only thing more elaborate than her heist plans are her gadgets. Regardless of the complexity, she is sure the next one will succeed like nothing has before. First the city, then the world.',
    abilities: [
      {
        name: 'Experimental Gadget',
        actionCost: 1,
        description: 'Roll a D6: (1) 1 unblockable damage on enemy, (2) Disable enemy gear for 1 turn, (3) Disable enemy abilities for 1 turn, (4) Attack for 3 damage if hits and not defended, (5) Attack to stun if hits and not defended, (6) Does nothing',
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
      meleeSkill: 8,
      ballisticSkill: 7,
      wounds: 8,
      maxWounds: 8,
      defense: 8,
      hack: 8,
      con: 8,
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
        actionCost: 1,
        description: 'Can deploy anywhere on the map at least 8" away from enemy deployment zone',
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
