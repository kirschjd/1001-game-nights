import { scoreActions, scoreVPValue, scoreCombatValue, scoreAlertPenalty, applyWeights } from '../utilityScoring';
import { CharacterToken, MapItem, MapState } from '../../types';
import { LegalAction, TurnState, AlertLevelState } from '../../engine/types';
import { BoardEvaluation, POSTURE_WEIGHTS, ScoreBreakdown } from '../types';

function makeCharacter(overrides: Partial<CharacterToken> = {}): CharacterToken {
  return {
    id: 'char-1',
    playerId: 'p1',
    playerNumber: 1,
    position: { x: 0, y: 0 },
    color: '#ff0000',
    name: 'TestChar',
    role: 'Ninja',
    stats: {
      movement: 5, meleeSkill: 7, ballisticSkill: 9,
      wounds: 7, maxWounds: 7, defense: 9, hack: 8, con: 8,
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

function makeBoardEval(overrides: Partial<BoardEvaluation> = {}): BoardEvaluation {
  return {
    playerVP: 0,
    opponentVP: 0,
    vpDifferential: 0,
    alertLevel: 0,
    turnsRemaining: 4,
    objectivesAvailable: [],
    characterHealth: [],
    threats: [],
    strategicPosture: 'balanced',
    ...overrides,
  };
}

describe('utilityScoring', () => {
  describe('scoreVPValue', () => {
    it('scores hack action near computer', () => {
      const char = makeCharacter({ stats: { movement: 5, meleeSkill: 7, ballisticSkill: 9, wounds: 7, maxWounds: 7, defense: 9, hack: 8, con: 8 } });
      const computer: MapItem = { id: 'comp1', type: 'computer', position: { x: 1, y: 0 } };
      const ms = makeMapState([computer], [char]);
      const ts = makeTurnState();

      const hackAction: LegalAction = {
        actionId: 'Hack',
        name: 'Hack',
        slotCost: 1,
        requiresTarget: true,
        validTargets: ['comp1'],
      };

      const vpScore = scoreVPValue(hackAction, char, ms, ts);
      expect(vpScore).toBeGreaterThan(0); // P(>8) * 1 VP
    });

    it('scores 0 for move action', () => {
      const char = makeCharacter();
      const ms = makeMapState([], [char]);
      const ts = makeTurnState();

      const moveAction: LegalAction = {
        actionId: 'Move (5")',
        name: 'Move (5")',
        slotCost: 1,
        requiresTarget: false,
      };

      expect(scoreVPValue(moveAction, char, ms, ts)).toBe(0);
    });
  });

  describe('scoreCombatValue', () => {
    it('scores attack on enemy character', () => {
      const attacker = makeCharacter();
      const target = makeCharacter({
        id: 'target-1', playerNumber: 2, position: { x: 1, y: 0 },
        stats: { movement: 3, meleeSkill: 7, ballisticSkill: 8, wounds: 5, maxWounds: 9, defense: 7, hack: 10, con: 9 },
      });
      const ms = makeMapState([], [attacker, target]);

      const attackAction: LegalAction = {
        actionId: 'Fist (MS 7+)',
        name: 'Fist',
        slotCost: 1,
        requiresTarget: true,
        validTargets: ['target-1'],
        metadata: { isAttack: true, attackType: 'melee', weaponId: 'fist', repeatPenalty: 0 },
      };

      const combatScore = scoreCombatValue(attackAction, attacker, target, ms, 'hex');
      expect(combatScore).toBeGreaterThan(0);
    });

    it('scores 0 for non-attack action', () => {
      const char = makeCharacter();
      const ms = makeMapState([], [char]);

      const moveAction: LegalAction = {
        actionId: 'Move (5")',
        name: 'Move',
        slotCost: 1,
        requiresTarget: false,
      };

      expect(scoreCombatValue(moveAction, char, null, ms, 'hex')).toBe(0);
    });
  });

  describe('scoreAlertPenalty', () => {
    it('returns 0 for actions that do not raise alert', () => {
      const char = makeCharacter({ state: 'Overt' });
      const ms = makeMapState([], [char]);
      const ts = makeTurnState();

      const moveAction: LegalAction = {
        actionId: 'Move (5")',
        name: 'Move',
        slotCost: 1,
        requiresTarget: false,
      };

      expect(scoreAlertPenalty(moveAction, char, ms, 0, ts)).toBe(0);
    });

    it('returns negative penalty for Go Loud', () => {
      const char = makeCharacter({ state: 'Hidden' });
      const ms = makeMapState([], [char]);
      const ts = makeTurnState();

      const goLoudAction: LegalAction = {
        actionId: 'Go Loud',
        name: 'Go Loud',
        slotCost: 1,
        requiresTarget: false,
      };

      const penalty = scoreAlertPenalty(goLoudAction, char, ms, 0, ts);
      expect(penalty).toBeLessThan(0);
    });
  });

  describe('applyWeights', () => {
    it('applies balanced weights correctly', () => {
      const breakdown: ScoreBreakdown = {
        vpValue: 1.0,
        damageValue: 0.5,
        safetyValue: 0.5,
        positionValue: 0.6,
        objectiveProgress: 0.3,
        alertPenalty: -0.1,
        synergy: 0,
      };

      const weights = POSTURE_WEIGHTS['balanced'];
      const score = applyWeights(breakdown, weights);
      expect(score).toBeGreaterThan(0);
    });

    it('aggressive weights emphasize VP over safety', () => {
      const highVP: ScoreBreakdown = {
        vpValue: 1.0, damageValue: 0, safetyValue: 0, positionValue: 0,
        objectiveProgress: 0, alertPenalty: 0, synergy: 0,
      };
      const highSafety: ScoreBreakdown = {
        vpValue: 0, damageValue: 0, safetyValue: 1.0, positionValue: 0,
        objectiveProgress: 0, alertPenalty: 0, synergy: 0,
      };

      const aggressive = POSTURE_WEIGHTS['aggressive'];
      const vpScore = applyWeights(highVP, aggressive);
      const safetyScore = applyWeights(highSafety, aggressive);
      expect(vpScore).toBeGreaterThan(safetyScore);
    });

    it('defensive weights emphasize safety over combat', () => {
      const highCombat: ScoreBreakdown = {
        vpValue: 0, damageValue: 1.0, safetyValue: 0, positionValue: 0,
        objectiveProgress: 0, alertPenalty: 0, synergy: 0,
      };
      const highSafety: ScoreBreakdown = {
        vpValue: 0, damageValue: 0, safetyValue: 1.0, positionValue: 0,
        objectiveProgress: 0, alertPenalty: 0, synergy: 0,
      };

      const defensive = POSTURE_WEIGHTS['defensive'];
      const combatScore = applyWeights(highCombat, defensive);
      const safetyScore = applyWeights(highSafety, defensive);
      expect(safetyScore).toBeGreaterThan(combatScore);
    });
  });

  describe('scoreActions', () => {
    it('returns sorted actions highest first', () => {
      const char = makeCharacter({ position: { x: 0, y: 0 } });
      const computer: MapItem = { id: 'comp1', type: 'computer', position: { x: 1, y: 0 } };
      const ms = makeMapState([computer], [char]);
      const ts = makeTurnState();
      const boardEval = makeBoardEval();

      const actions: LegalAction[] = [
        { actionId: 'Move (5")', name: 'Move', slotCost: 1, requiresTarget: false },
        { actionId: 'Hack', name: 'Hack', slotCost: 1, requiresTarget: true, validTargets: ['comp1'] },
      ];

      const scored = scoreActions(char, actions, ms, ts, 'hex', boardEval, 0);
      expect(scored.length).toBe(2);
      expect(scored[0].score).toBeGreaterThanOrEqual(scored[1].score);
    });

    it('returns empty for empty actions', () => {
      const char = makeCharacter();
      const ms = makeMapState([], [char]);
      const ts = makeTurnState();
      const boardEval = makeBoardEval();

      expect(scoreActions(char, [], ms, ts, 'hex', boardEval, 0)).toHaveLength(0);
    });
  });
});
