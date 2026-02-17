import { planActivationOrder, selectNextCharacter } from '../teamCoordination';
import { CharacterToken, MapItem, MapState, MapZone } from '../../types';
import { TurnState, AlertLevelState } from '../../engine/types';
import { BoardEvaluation } from '../types';

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
  characters: CharacterToken[] = [],
  zones: MapZone[] = []
): MapState {
  return { items, characters, zones };
}

function makeTurnState(
  characters: CharacterToken[],
  overrides: Partial<TurnState> = {}
): TurnState {
  const activations = new Map<string, boolean>();
  for (const char of characters) {
    activations.set(char.id, true); // all need to activate
  }
  return {
    turnNumber: 1,
    phase: 'player-activation',
    activePlayerNumber: 1,
    activationsRemaining: activations,
    npcPhaseComplete: false,
    ...overrides,
  };
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

function makeBoardEval(overrides: Partial<BoardEvaluation> = {}): BoardEvaluation {
  return {
    playerVP: 0, opponentVP: 0, vpDifferential: 0, alertLevel: 0,
    turnsRemaining: 4, objectivesAvailable: [], characterHealth: [],
    threats: [], strategicPosture: 'balanced', ...overrides,
  };
}

describe('teamCoordination', () => {
  describe('planActivationOrder', () => {
    it('returns all team characters', () => {
      const c1 = makeCharacter({ id: 'c1', playerNumber: 1, role: 'Muscle' });
      const c2 = makeCharacter({ id: 'c2', playerNumber: 1, role: 'Brain' });
      const ms = makeMapState([], [c1, c2]);
      const ts = makeTurnState([c1, c2]);
      const alert = makeAlertLevel(0);
      const boardEval = makeBoardEval();

      const order = planActivationOrder(ms, ts, 'hex', 1, boardEval, alert);
      expect(order).toHaveLength(2);
      expect(order).toContain('c1');
      expect(order).toContain('c2');
    });

    it('excludes Unconscious characters', () => {
      const c1 = makeCharacter({ id: 'c1', playerNumber: 1, state: 'Overt' });
      const c2 = makeCharacter({ id: 'c2', playerNumber: 1, state: 'Unconscious' });
      const ms = makeMapState([], [c1, c2]);
      const ts = makeTurnState([c1, c2]);
      const alert = makeAlertLevel(0);
      const boardEval = makeBoardEval();

      const order = planActivationOrder(ms, ts, 'hex', 1, boardEval, alert);
      expect(order).toHaveLength(1);
      expect(order[0]).toBe('c1');
    });

    it('excludes opponent characters', () => {
      const mine = makeCharacter({ id: 'c1', playerNumber: 1 });
      const enemy = makeCharacter({ id: 'c2', playerNumber: 2 });
      const ms = makeMapState([], [mine, enemy]);
      const ts = makeTurnState([mine, enemy]);
      const alert = makeAlertLevel(0);
      const boardEval = makeBoardEval();

      const order = planActivationOrder(ms, ts, 'hex', 1, boardEval, alert);
      expect(order).toHaveLength(1);
      expect(order[0]).toBe('c1');
    });

    it('character near objective is higher priority', () => {
      const nearObj = makeCharacter({ id: 'near', playerNumber: 1, position: { x: 1, y: 0 } });
      const farObj = makeCharacter({ id: 'far', playerNumber: 1, position: { x: 10, y: 0 } });
      const computer: MapItem = { id: 'comp1', type: 'computer', position: { x: 0, y: 0 } };
      const ms = makeMapState([computer], [nearObj, farObj]);
      const ts = makeTurnState([nearObj, farObj]);
      const alert = makeAlertLevel(0);
      const boardEval = makeBoardEval();

      const order = planActivationOrder(ms, ts, 'hex', 1, boardEval, alert);
      expect(order[0]).toBe('near');
    });
  });

  describe('selectNextCharacter', () => {
    it('returns first unactivated character', () => {
      const c1 = makeCharacter({ id: 'c1', playerNumber: 1 });
      const c2 = makeCharacter({ id: 'c2', playerNumber: 1 });
      const ms = makeMapState([], [c1, c2]);
      const ts = makeTurnState([c1, c2]);

      const next = selectNextCharacter(['c1', 'c2'], ts, ms);
      expect(next).toBe('c1');
    });

    it('skips already-activated characters', () => {
      const c1 = makeCharacter({ id: 'c1', playerNumber: 1 });
      const c2 = makeCharacter({ id: 'c2', playerNumber: 1 });
      const ms = makeMapState([], [c1, c2]);
      const ts = makeTurnState([c1, c2]);
      ts.activationsRemaining.set('c1', false); // already activated

      const next = selectNextCharacter(['c1', 'c2'], ts, ms);
      expect(next).toBe('c2');
    });

    it('returns null when all activated', () => {
      const c1 = makeCharacter({ id: 'c1', playerNumber: 1 });
      const ms = makeMapState([], [c1]);
      const ts = makeTurnState([c1]);
      ts.activationsRemaining.set('c1', false);

      const next = selectNextCharacter(['c1'], ts, ms);
      expect(next).toBeNull();
    });

    it('skips Unconscious characters', () => {
      const c1 = makeCharacter({ id: 'c1', playerNumber: 1, state: 'Unconscious' });
      const c2 = makeCharacter({ id: 'c2', playerNumber: 1, state: 'Overt' });
      const ms = makeMapState([], [c1, c2]);
      const ts = makeTurnState([c1, c2]);

      const next = selectNextCharacter(['c1', 'c2'], ts, ms);
      expect(next).toBe('c2');
    });
  });
});
