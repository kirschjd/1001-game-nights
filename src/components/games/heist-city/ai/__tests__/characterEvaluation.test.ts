import { evaluateCharacterPosition, evaluateTeamPosition } from '../characterEvaluation';
import { CharacterToken, MapItem, MapState } from '../../types';
import { AlertLevelState } from '../../engine/types';

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

function makeAlertLevel(level: 0 | 1 | 2 | 3): AlertLevelState {
  const actionMap: Record<number, number> = { 0: 0, 1: 1, 2: 2, 3: 2 };
  return {
    level,
    unitsRevealed: level * 3,
    modifier: 0,
    total: level * 3,
    npcActionsPerActivation: actionMap[level],
  };
}

describe('characterEvaluation', () => {
  describe('evaluateCharacterPosition', () => {
    it('returns higher score for healthy character', () => {
      const healthy = makeCharacter({ stats: { movement: 3, meleeSkill: 7, ballisticSkill: 8, wounds: 9, maxWounds: 9, defense: 7, hack: 10, con: 9 } });
      const injured = makeCharacter({
        id: 'char-2',
        stats: { movement: 3, meleeSkill: 7, ballisticSkill: 8, wounds: 2, maxWounds: 9, defense: 7, hack: 10, con: 9 },
      });
      const ms = makeMapState([], [healthy]);
      const msInjured = makeMapState([], [injured]);
      const alert = makeAlertLevel(0);

      const scoreHealthy = evaluateCharacterPosition(healthy, ms, 'hex', alert);
      const scoreInjured = evaluateCharacterPosition(injured, msInjured, 'hex', alert);

      expect(scoreHealthy.healthPercent).toBe(1);
      expect(scoreInjured.healthPercent).toBeCloseTo(2 / 9, 2);
      expect(scoreHealthy.overall).toBeGreaterThan(scoreInjured.overall);
    });

    it('Hidden state scores higher than Overt', () => {
      const hidden = makeCharacter({ state: 'Hidden' });
      const overt = makeCharacter({ id: 'char-2', state: 'Overt' });
      const ms = makeMapState([], [hidden]);
      const msOvert = makeMapState([], [overt]);
      const alert = makeAlertLevel(0);

      const scoreHidden = evaluateCharacterPosition(hidden, ms, 'hex', alert);
      const scoreOvert = evaluateCharacterPosition(overt, msOvert, 'hex', alert);

      expect(scoreHidden.stateScore).toBeGreaterThan(scoreOvert.stateScore);
    });

    it('scores distance to objective', () => {
      const nearObj = makeCharacter({ position: { x: 0, y: 0 } });
      const farObj = makeCharacter({ id: 'char-2', position: { x: 10, y: 0 } });
      const computer: MapItem = { id: 'comp1', type: 'computer', position: { x: 1, y: 0 } };
      const msNear = makeMapState([computer], [nearObj]);
      const msFar = makeMapState([computer], [farObj]);
      const alert = makeAlertLevel(0);

      const scoreNear = evaluateCharacterPosition(nearObj, msNear, 'hex', alert);
      const scoreFar = evaluateCharacterPosition(farObj, msFar, 'hex', alert);

      expect(scoreNear.distanceToObjective).toBeLessThan(scoreFar.distanceToObjective);
    });

    it('Unconscious scores 0 state score', () => {
      const unconscious = makeCharacter({ state: 'Unconscious', stats: { movement: 3, meleeSkill: 7, ballisticSkill: 8, wounds: 0, maxWounds: 9, defense: 7, hack: 10, con: 9 } });
      const ms = makeMapState([], [unconscious]);
      const alert = makeAlertLevel(0);

      const score = evaluateCharacterPosition(unconscious, ms, 'hex', alert);
      expect(score.stateScore).toBe(0);
    });
  });

  describe('evaluateTeamPosition', () => {
    it('returns 0 for team with no active characters', () => {
      const unconscious = makeCharacter({ state: 'Unconscious' });
      const ms = makeMapState([], [unconscious]);
      expect(evaluateTeamPosition(ms, 1, 'hex', makeAlertLevel(0))).toBe(0);
    });

    it('returns average of team scores', () => {
      const char1 = makeCharacter({ id: 'c1', playerNumber: 1, state: 'Overt' });
      const char2 = makeCharacter({ id: 'c2', playerNumber: 1, state: 'Hidden' });
      const ms = makeMapState([], [char1, char2]);
      const alert = makeAlertLevel(0);

      const teamScore = evaluateTeamPosition(ms, 1, 'hex', alert);
      expect(teamScore).toBeGreaterThan(0);
      expect(teamScore).toBeLessThanOrEqual(1);
    });

    it('ignores opponent characters', () => {
      const myChar = makeCharacter({ id: 'c1', playerNumber: 1 });
      const enemyChar = makeCharacter({ id: 'c2', playerNumber: 2, state: 'Unconscious' });
      const ms = makeMapState([], [myChar, enemyChar]);
      const alert = makeAlertLevel(0);

      // Should only evaluate player 1's characters
      const teamScore = evaluateTeamPosition(ms, 1, 'hex', alert);
      expect(teamScore).toBeGreaterThan(0);
    });
  });
});
