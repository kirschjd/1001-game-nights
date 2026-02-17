import {
  awardVP,
  calculateTeamVP,
  getVPOpportunities,
} from '../victoryPoints';
import { MapState, CharacterToken } from '../../types';
import { TurnState } from '../types';

function makeCharacter(overrides: Partial<CharacterToken> = {}): CharacterToken {
  return {
    id: 'char-1',
    playerId: 'p1',
    playerNumber: 1,
    position: { x: 0, y: 0 },
    color: '#ff0000',
    name: 'Test',
    role: 'Ninja',
    stats: {
      movement: 5, meleeSkill: 7, ballisticSkill: 9,
      wounds: 7, maxWounds: 7, defense: 9, hack: 8, con: 8,
    },
    state: 'Overt',
    victoryPoints: 0,
    ...overrides,
  };
}

function makeMapState(characters: CharacterToken[], items: any[] = []): MapState {
  return { items, characters, zones: [] };
}

describe('victoryPoints', () => {
  describe('awardVP', () => {
    it('creates a VP event with correct default points', () => {
      const event = awardVP('char-1', 'hack-computer', 1, 'Hacked a computer');
      expect(event.type).toBe('hack-computer');
      expect(event.points).toBe(1);
      expect(event.characterId).toBe('char-1');
    });

    it('info-drop-extract is worth 3 VP', () => {
      const event = awardVP('char-1', 'info-drop-extract', 2, 'Extracted info');
      expect(event.points).toBe(3);
    });

    it('allows custom point amount', () => {
      const event = awardVP('char-1', 'hack-computer', 1, 'Special hack', 5);
      expect(event.points).toBe(5);
    });
  });

  describe('calculateTeamVP', () => {
    it('sums VP for a team', () => {
      const mapState = makeMapState([
        makeCharacter({ id: 'a', playerNumber: 1, victoryPoints: 3 }),
        makeCharacter({ id: 'b', playerNumber: 1, victoryPoints: 2 }),
        makeCharacter({ id: 'c', playerNumber: 2, victoryPoints: 5 }),
      ]);
      expect(calculateTeamVP(mapState, 1)).toBe(5);
      expect(calculateTeamVP(mapState, 2)).toBe(5);
    });

    it('returns 0 when no VP', () => {
      const mapState = makeMapState([
        makeCharacter({ id: 'a', playerNumber: 1, victoryPoints: 0 }),
      ]);
      expect(calculateTeamVP(mapState, 1)).toBe(0);
    });
  });

  describe('getVPOpportunities', () => {
    it('finds nearby computers', () => {
      const char = makeCharacter({ position: { x: 0, y: 0 } });
      const mapState = makeMapState(
        [char],
        [{ id: 'comp-1', type: 'computer', position: { x: 1, y: 0 } }]
      );
      const turnState: TurnState = {
        turnNumber: 1,
        phase: 'player-activation',
        activePlayerNumber: 1,
        activationsRemaining: new Map(),
        npcPhaseComplete: false,
      };

      const opps = getVPOpportunities(char, mapState, turnState, 'hex');
      const hackOpps = opps.filter(o => o.type === 'hack-computer');
      expect(hackOpps.length).toBe(1);
      expect(hackOpps[0].estimatedVP).toBe(1);
    });

    it('finds nearby enemies for down VP', () => {
      const char = makeCharacter({ position: { x: 0, y: 0 } });
      const enemy = makeCharacter({
        id: 'enemy-1',
        playerNumber: 2,
        position: { x: 3, y: 0 },
        state: 'Overt',
      });
      const mapState = makeMapState([char, enemy]);
      const turnState: TurnState = {
        turnNumber: 1,
        phase: 'player-activation',
        activePlayerNumber: 1,
        activationsRemaining: new Map(),
        npcPhaseComplete: false,
      };

      const opps = getVPOpportunities(char, mapState, turnState, 'hex');
      const downOpps = opps.filter(o => o.type === 'down-enemy');
      expect(downOpps.length).toBe(1);
      expect(downOpps[0].distance).toBe(3);
    });

    it('identifies mob intel opportunities for Disguised characters', () => {
      const char = makeCharacter({ state: 'Disguised', position: { x: 0, y: 0 } });
      const mapState = makeMapState(
        [char],
        [{ id: 'guard-1', type: 'enemy-security-guard', position: { x: 1, y: 0 } }]
      );
      const turnState: TurnState = {
        turnNumber: 1,
        phase: 'player-activation',
        activePlayerNumber: 1,
        activationsRemaining: new Map(),
        npcPhaseComplete: false,
      };

      const opps = getVPOpportunities(char, mapState, turnState, 'hex');
      const intelOpps = opps.filter(o => o.type === 'mob-intel');
      expect(intelOpps.length).toBe(1);
    });

    it('does not find mob intel for non-Disguised characters', () => {
      const char = makeCharacter({ state: 'Overt', position: { x: 0, y: 0 } });
      const mapState = makeMapState(
        [char],
        [{ id: 'guard-1', type: 'enemy-security-guard', position: { x: 1, y: 0 } }]
      );
      const turnState: TurnState = {
        turnNumber: 1,
        phase: 'player-activation',
        activePlayerNumber: 1,
        activationsRemaining: new Map(),
        npcPhaseComplete: false,
      };

      const opps = getVPOpportunities(char, mapState, turnState, 'hex');
      const intelOpps = opps.filter(o => o.type === 'mob-intel');
      expect(intelOpps.length).toBe(0);
    });
  });
});
