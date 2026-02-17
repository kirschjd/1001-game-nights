import { findSecurityPortals, hasElitesAlreadySpawned, spawnElites } from '../eliteSpawner';
import { MapItem, MapState, CharacterToken } from '../../../types';

function makeMapState(
  items: MapItem[] = [],
  characters: CharacterToken[] = []
): MapState {
  return { items, characters, zones: [] };
}

describe('eliteSpawner', () => {
  describe('findSecurityPortals', () => {
    it('finds teleporter items', () => {
      const ms = makeMapState([
        { id: 'tp1', type: 'teleporter', position: { x: 3, y: 0 } },
        { id: 'tp2', type: 'teleporter', position: { x: 8, y: 2 } },
        { id: 'w1', type: 'wall', position: { x: 1, y: 0 } },
      ]);

      const portals = findSecurityPortals(ms);
      expect(portals).toHaveLength(2);
      expect(portals[0]).toEqual({ x: 3, y: 0 });
      expect(portals[1]).toEqual({ x: 8, y: 2 });
    });

    it('returns empty if no teleporters', () => {
      const ms = makeMapState([
        { id: 'w1', type: 'wall', position: { x: 0, y: 0 } },
      ]);
      expect(findSecurityPortals(ms)).toHaveLength(0);
    });
  });

  describe('hasElitesAlreadySpawned', () => {
    it('returns false when no elites exist', () => {
      const ms = makeMapState([
        { id: 'g1', type: 'enemy-security-guard', position: { x: 0, y: 0 } },
      ]);
      expect(hasElitesAlreadySpawned(ms)).toBe(false);
    });

    it('returns true when elites exist', () => {
      const ms = makeMapState([
        { id: 'e1', type: 'enemy-elite', position: { x: 0, y: 0 } },
      ]);
      expect(hasElitesAlreadySpawned(ms)).toBe(true);
    });
  });

  describe('spawnElites', () => {
    it('spawns elites at unoccupied portals', () => {
      const ms = makeMapState([
        { id: 'tp1', type: 'teleporter', position: { x: 3, y: 0 } },
        { id: 'tp2', type: 'teleporter', position: { x: 8, y: 2 } },
      ]);

      const elites = spawnElites(ms);
      expect(elites).toHaveLength(2);
      expect(elites[0].type).toBe('enemy-elite');
      expect(elites[0].position).toEqual({ x: 3, y: 0 });
      expect(elites[1].position).toEqual({ x: 8, y: 2 });
    });

    it('skips occupied portals', () => {
      const ms = makeMapState(
        [
          { id: 'tp1', type: 'teleporter', position: { x: 3, y: 0 } },
          { id: 'tp2', type: 'teleporter', position: { x: 8, y: 2 } },
          { id: 'g1', type: 'enemy-security-guard', position: { x: 3, y: 0 } },
        ],
        [] // no characters
      );

      const elites = spawnElites(ms);
      expect(elites).toHaveLength(1);
      expect(elites[0].position).toEqual({ x: 8, y: 2 });
    });

    it('skips portals occupied by characters', () => {
      const char: CharacterToken = {
        id: 'c1', playerId: 'p1', playerNumber: 1,
        position: { x: 3, y: 0 }, color: '#f00', name: 'Test', role: 'Ninja',
        stats: { movement: 5, meleeSkill: 7, ballisticSkill: 9, wounds: 7, maxWounds: 7, defense: 9, hack: 8, con: 8 },
        state: 'Overt', equipment: [],
      };
      const ms = makeMapState(
        [{ id: 'tp1', type: 'teleporter', position: { x: 3, y: 0 } }],
        [char]
      );

      const elites = spawnElites(ms);
      expect(elites).toHaveLength(0);
    });

    it('returns empty if elites already exist', () => {
      const ms = makeMapState([
        { id: 'tp1', type: 'teleporter', position: { x: 3, y: 0 } },
        { id: 'e1', type: 'enemy-elite', position: { x: 5, y: 0 } },
      ]);

      expect(spawnElites(ms)).toHaveLength(0);
    });

    it('returns empty if no portals', () => {
      const ms = makeMapState([
        { id: 'w1', type: 'wall', position: { x: 0, y: 0 } },
      ]);
      expect(spawnElites(ms)).toHaveLength(0);
    });
  });
});
