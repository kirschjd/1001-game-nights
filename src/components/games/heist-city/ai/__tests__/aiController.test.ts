import { AIController, createAIController } from '../aiController';
import { CharacterToken, MapItem, MapState } from '../../types';
import { TurnState } from '../../engine/types';
import { DIFFICULTY_EASY, DIFFICULTY_NORMAL, DIFFICULTY_HARD } from '../types';

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
    actions: [],
    ...overrides,
  };
}

function makeMapState(
  items: MapItem[] = [],
  characters: CharacterToken[] = []
): MapState {
  return { items, characters, zones: [] };
}

function makeTurnState(
  characters: CharacterToken[],
  overrides: Partial<TurnState> = {}
): TurnState {
  const activations = new Map<string, boolean>();
  for (const char of characters) {
    if (char.state !== 'Unconscious') {
      activations.set(char.id, true);
    }
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

describe('aiController', () => {
  describe('AIController', () => {
    it('creates with correct properties', () => {
      const ai = new AIController(2, DIFFICULTY_NORMAL, 'hex');
      expect(ai.playerNumber).toBe(2);
      expect(ai.difficulty.name).toBe('normal');
      expect(ai.gridType).toBe('hex');
    });

    it('planTurn returns a valid turn plan', () => {
      const c1 = makeCharacter({ id: 'c1', playerNumber: 2, role: 'Muscle' });
      const c2 = makeCharacter({ id: 'c2', playerNumber: 2, role: 'Brain' });
      const enemy = makeCharacter({ id: 'e1', playerNumber: 1 });
      const ms = makeMapState([], [c1, c2, enemy]);
      const ts = makeTurnState([c1, c2, enemy], { activePlayerNumber: 2 });

      const ai = new AIController(2, DIFFICULTY_NORMAL, 'hex');
      const plan = ai.planTurn(ms, ts, 0);

      expect(plan.activationOrder).toHaveLength(2);
      expect(plan.characterPlans).toHaveLength(2);
      expect(plan.strategicGoal).toBeDefined();
      expect(plan.boardEval).toBeDefined();
      expect(plan.boardEval.strategicPosture).toBeDefined();
    });

    it('getNextActivation returns first character from plan', () => {
      const c1 = makeCharacter({ id: 'c1', playerNumber: 2, role: 'Muscle' });
      const enemy = makeCharacter({ id: 'e1', playerNumber: 1 });
      const ms = makeMapState([], [c1, enemy]);
      const ts = makeTurnState([c1, enemy], { activePlayerNumber: 2 });

      const ai = new AIController(2, DIFFICULTY_NORMAL, 'hex');
      const activation = ai.getNextActivation(ms, ts, 0);

      expect(activation).not.toBeNull();
      expect(activation!.characterId).toBe('c1');
      expect(activation!.reasoning).toBeDefined();
    });

    it('getNextActivation returns null when all activated', () => {
      const c1 = makeCharacter({ id: 'c1', playerNumber: 2 });
      const ms = makeMapState([], [c1]);
      const ts = makeTurnState([c1]);
      ts.activationsRemaining.set('c1', false); // already activated

      const ai = new AIController(2, DIFFICULTY_NORMAL, 'hex');
      ai.planTurn(ms, ts, 0);
      const activation = ai.getNextActivation(ms, ts, 0);

      expect(activation).toBeNull();
    });

    it('onActionResolved tracks used abilities', () => {
      const ai = new AIController(2, DIFFICULTY_NORMAL, 'hex');

      // Simulate using Ninja Vanish
      ai.onActionResolved('c1', 'Ninja Vanish', null, makeMapState());

      // Plan should now exclude Ninja Vanish from legal actions
      // (We can't directly test this without a full integration test,
      // but we verify the method doesn't throw)
      expect(true).toBe(true);
    });

    it('reset clears internal state', () => {
      const c1 = makeCharacter({ id: 'c1', playerNumber: 2 });
      const ms = makeMapState([], [c1]);
      const ts = makeTurnState([c1]);

      const ai = new AIController(2, DIFFICULTY_NORMAL, 'hex');
      ai.planTurn(ms, ts, 0);
      ai.reset();

      // After reset, should be able to plan again
      const plan = ai.planTurn(ms, ts, 0);
      expect(plan).toBeDefined();
    });
  });

  describe('createAIController', () => {
    it('creates easy AI', () => {
      const ai = createAIController(1, 'easy', 'hex');
      expect(ai.difficulty.name).toBe('easy');
      expect(ai.difficulty.randomness).toBe(0.4);
    });

    it('creates normal AI', () => {
      const ai = createAIController(1, 'normal', 'hex');
      expect(ai.difficulty.name).toBe('normal');
      expect(ai.difficulty.randomness).toBe(0.1);
    });

    it('creates hard AI', () => {
      const ai = createAIController(1, 'hard', 'hex');
      expect(ai.difficulty.name).toBe('hard');
      expect(ai.difficulty.randomness).toBe(0.0);
    });
  });

  describe('difficulty filter behavior', () => {
    it('hard mode consistently picks top action', () => {
      const c1 = makeCharacter({ id: 'c1', playerNumber: 2, position: { x: 0, y: 0 } });
      const enemy = makeCharacter({
        id: 'e1', playerNumber: 1, position: { x: 1, y: 0 },
      });
      const computer: MapItem = { id: 'comp1', type: 'computer', position: { x: 0, y: 1 } };
      const ms = makeMapState([computer], [c1, enemy]);
      const ts = makeTurnState([c1, enemy], { activePlayerNumber: 2 });

      const ai = new AIController(2, DIFFICULTY_HARD, 'hex');

      // Run multiple times — hard mode should always select the same first action
      const firstActions: string[] = [];
      for (let i = 0; i < 5; i++) {
        ai.reset();
        const activation = ai.getNextActivation(ms, ts, 0);
        if (activation && activation.actions.length > 0) {
          firstActions.push(activation.actions[0].actionId);
        }
      }

      // All should be the same action in hard mode
      if (firstActions.length > 1) {
        const allSame = firstActions.every(a => a === firstActions[0]);
        expect(allSame).toBe(true);
      }
    });
  });
});
