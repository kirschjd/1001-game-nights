import { evaluateBoard, getStrategicPosture, prioritizeObjectives, assignCharactersToObjectives } from '../strategicPlanning';
import { CharacterToken, MapItem, MapState } from '../../types';
import { TurnState } from '../../engine/types';
import { DIFFICULTY_NORMAL, DIFFICULTY_EASY, DIFFICULTY_HARD } from '../types';

function makeCharacter(overrides: Partial<CharacterToken> = {}): CharacterToken {
  return {
    id: 'char-1',
    playerId: 'p1',
    playerNumber: 1,
    position: { x: 0, y: 0 },
    color: '#ff0000',
    name: 'TestChar',
    role: 'Muscle',
    stats: {
      movement: 3, meleeSkill: 7, ballisticSkill: 8,
      wounds: 9, maxWounds: 9, defense: 7, hack: 10, con: 9,
    },
    state: 'Overt',
    equipment: [],
    ...overrides,
  };
}

function makeMapState(
  items: MapItem[] = [],
  characters: CharacterToken[] = []
): MapState {
  return { items, characters, zones: [] };
}

function makeTurnState(overrides: Partial<TurnState> = {}): TurnState {
  return {
    turnNumber: 1,
    phase: 'player-activation',
    activePlayerNumber: 1,
    activationsRemaining: new Map(),
    npcPhaseComplete: false,
    ...overrides,
  };
}

describe('strategicPlanning', () => {
  describe('getStrategicPosture', () => {
    it('returns escape on turn 5', () => {
      expect(getStrategicPosture(0, 0, 0, 0, DIFFICULTY_NORMAL)).toBe('escape');
    });

    it('returns aggressive when behind by 2+ VP', () => {
      expect(getStrategicPosture(-2, 3, 0, 0, DIFFICULTY_NORMAL)).toBe('aggressive');
      expect(getStrategicPosture(-3, 3, 0, 0, DIFFICULTY_NORMAL)).toBe('aggressive');
    });

    it('returns defensive when ahead by 2+ VP', () => {
      expect(getStrategicPosture(2, 3, 0, 0, DIFFICULTY_NORMAL)).toBe('defensive');
    });

    it('returns balanced in close game', () => {
      expect(getStrategicPosture(0, 3, 0, 0, DIFFICULTY_NORMAL)).toBe('balanced');
      expect(getStrategicPosture(1, 3, 0, 0, DIFFICULTY_NORMAL)).toBe('balanced');
    });

    it('returns defensive with many threats and high safety weight', () => {
      expect(getStrategicPosture(0, 3, 1, 5, DIFFICULTY_EASY)).toBe('defensive');
    });
  });

  describe('prioritizeObjectives', () => {
    it('finds computers', () => {
      const computer: MapItem = { id: 'comp1', type: 'computer', position: { x: 3, y: 0 } };
      const ms = makeMapState([computer], [makeCharacter()]);

      const objectives = prioritizeObjectives(ms, 'hex', 1);
      const comp = objectives.find(o => o.type === 'computer');
      expect(comp).toBeDefined();
      expect(comp!.vpValue).toBe(1);
    });

    it('finds info drops with higher VP value', () => {
      const drop: MapItem = { id: 'drop1', type: 'info-drop', position: { x: 3, y: 0 } };
      const ms = makeMapState([drop], [makeCharacter()]);

      const objectives = prioritizeObjectives(ms, 'hex', 1);
      const infoDrop = objectives.find(o => o.type === 'info-drop');
      expect(infoDrop).toBeDefined();
      expect(infoDrop!.vpValue).toBe(3);
    });

    it('finds enemy characters as objectives', () => {
      const enemy = makeCharacter({ id: 'enemy-1', playerNumber: 2 });
      const ms = makeMapState([], [makeCharacter(), enemy]);

      const objectives = prioritizeObjectives(ms, 'hex', 1);
      const enemyObj = objectives.find(o => o.type === 'enemy-character');
      expect(enemyObj).toBeDefined();
      expect(enemyObj!.vpValue).toBe(1);
    });

    it('sorted by VP value (highest first)', () => {
      const computer: MapItem = { id: 'comp1', type: 'computer', position: { x: 3, y: 0 } };
      const drop: MapItem = { id: 'drop1', type: 'info-drop', position: { x: 5, y: 0 } };
      const ms = makeMapState([computer, drop], [makeCharacter()]);

      const objectives = prioritizeObjectives(ms, 'hex', 1);
      expect(objectives[0].vpValue).toBeGreaterThanOrEqual(objectives[objectives.length - 1].vpValue);
    });

    it('excludes unconscious enemies', () => {
      const enemy = makeCharacter({ id: 'e1', playerNumber: 2, state: 'Unconscious' });
      const ms = makeMapState([], [makeCharacter(), enemy]);

      const objectives = prioritizeObjectives(ms, 'hex', 1);
      const enemyObj = objectives.find(o => o.targetId === 'e1');
      expect(enemyObj).toBeUndefined();
    });
  });

  describe('assignCharactersToObjectives', () => {
    it('assigns Brain to computer', () => {
      const brain = makeCharacter({ id: 'brain', role: 'Brain', position: { x: 0, y: 0 } });
      const muscle = makeCharacter({ id: 'muscle', role: 'Muscle', position: { x: 0, y: 0 } });
      const computer: MapItem = { id: 'comp1', type: 'computer', position: { x: 2, y: 0 } };
      const ms = makeMapState([computer], [brain, muscle]);

      const objectives = prioritizeObjectives(ms, 'hex', 1);
      const assignments = assignCharactersToObjectives(objectives, [brain, muscle], ms, 'hex');

      const computerAssignment = assignments.find(a => a.objectiveId === 'comp1');
      expect(computerAssignment).toBeDefined();
      expect(computerAssignment!.characterId).toBe('brain');
    });

    it('assigns Muscle to enemy character', () => {
      const ninja = makeCharacter({ id: 'ninja', role: 'Ninja', position: { x: 0, y: 0 } });
      const muscle = makeCharacter({ id: 'muscle', role: 'Muscle', position: { x: 0, y: 0 } });
      const enemy = makeCharacter({ id: 'e1', playerNumber: 2, position: { x: 5, y: 0 } });
      const ms = makeMapState([], [ninja, muscle, enemy]);

      const objectives = prioritizeObjectives(ms, 'hex', 1);
      const assignments = assignCharactersToObjectives(objectives, [ninja, muscle], ms, 'hex');

      const enemyAssignment = assignments.find(a => a.objectiveId === 'e1');
      expect(enemyAssignment).toBeDefined();
      expect(enemyAssignment!.characterId).toBe('muscle');
    });

    it('handles empty objectives', () => {
      const char = makeCharacter();
      const ms = makeMapState();
      const assignments = assignCharactersToObjectives([], [char], ms, 'hex');
      expect(assignments).toHaveLength(0);
    });
  });

  describe('evaluateBoard', () => {
    it('returns complete board evaluation', () => {
      const myChar = makeCharacter({ playerNumber: 1, state: 'Overt' });
      const enemy = makeCharacter({ id: 'e1', playerNumber: 2, state: 'Overt' });
      const computer: MapItem = { id: 'comp1', type: 'computer', position: { x: 5, y: 0 } };
      const ms = makeMapState([computer], [myChar, enemy]);
      const ts = makeTurnState({ turnNumber: 2 });

      const eval_ = evaluateBoard(ms, ts, 'hex', 1, 0, DIFFICULTY_NORMAL);

      expect(eval_.turnsRemaining).toBe(3);
      expect(eval_.objectivesAvailable.length).toBeGreaterThan(0);
      expect(eval_.characterHealth).toHaveLength(1); // only player 1
      expect(eval_.strategicPosture).toBeDefined();
    });

    it('VP differential is correct', () => {
      const myChar = makeCharacter({ playerNumber: 1, victoryPoints: 3 });
      const enemy = makeCharacter({ id: 'e1', playerNumber: 2, victoryPoints: 1 });
      const ms = makeMapState([], [myChar, enemy]);
      const ts = makeTurnState();

      const eval_ = evaluateBoard(ms, ts, 'hex', 1, 0, DIFFICULTY_NORMAL);
      expect(eval_.playerVP).toBe(3);
      expect(eval_.opponentVP).toBe(1);
      expect(eval_.vpDifferential).toBe(2);
    });
  });
});
