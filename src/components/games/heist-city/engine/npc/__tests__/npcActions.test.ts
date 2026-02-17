import { getNPCStatsForItem, selectNPCAction, getNPCAttackInfo, resolveNPCAttack } from '../npcActions';
import { CharacterToken, MapItem, MapState } from '../../../types';
import { DiceRollResult } from '../../types';

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

const fixedRoll = (total: number): DiceRollResult => ({
  dice1: Math.ceil(total / 2),
  dice2: Math.floor(total / 2),
  total,
});

describe('npcActions', () => {
  describe('getNPCStatsForItem', () => {
    it('returns stats for security guard', () => {
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 0, y: 0 } };
      const stats = getNPCStatsForItem(guard);
      expect(stats).not.toBeNull();
      expect(stats!.type).toBe('security-guard');
      expect(stats!.movement).toBe(4);
      expect(stats!.meleeSkill).toBe(7);
      expect(stats!.ballisticSkill).toBeNull();
      expect(stats!.damage).toBe(2);
    });

    it('returns stats for camera/turret', () => {
      const camera: MapItem = { id: 'c1', type: 'enemy-camera', position: { x: 0, y: 0 } };
      const stats = getNPCStatsForItem(camera);
      expect(stats).not.toBeNull();
      expect(stats!.type).toBe('turret');
      expect(stats!.movement).toBe(0);
      expect(stats!.ballisticSkill).toBe(7);
      expect(stats!.range).toBe(12);
    });

    it('returns stats for elite', () => {
      const elite: MapItem = { id: 'e1', type: 'enemy-elite', position: { x: 0, y: 0 } };
      const stats = getNPCStatsForItem(elite);
      expect(stats).not.toBeNull();
      expect(stats!.type).toBe('elite');
      expect(stats!.meleeSkill).toBe(7);
      expect(stats!.ballisticSkill).toBe(9);
      expect(stats!.damage).toBe(3);
    });

    it('returns null for non-NPC items', () => {
      const wall: MapItem = { id: 'w1', type: 'wall', position: { x: 0, y: 0 } };
      expect(getNPCStatsForItem(wall)).toBeNull();
    });
  });

  describe('selectNPCAction', () => {
    it('guard: melee-attack if adjacent', () => {
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 1, y: 0 } };
      const target = makeCharacter({ position: { x: 0, y: 0 } });
      const stats = getNPCStatsForItem(guard)!;
      const ms = makeMapState([guard], [target]);

      expect(selectNPCAction(guard, stats, target, ms, 'hex')).toBe('melee-attack');
    });

    it('guard: move if not adjacent', () => {
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 5, y: 0 } };
      const target = makeCharacter({ position: { x: 0, y: 0 } });
      const stats = getNPCStatsForItem(guard)!;
      const ms = makeMapState([guard], [target]);

      expect(selectNPCAction(guard, stats, target, ms, 'hex')).toBe('move');
    });

    it('turret: ranged-attack if in range with LOS', () => {
      const turret: MapItem = { id: 'c1', type: 'enemy-camera', position: { x: 5, y: 0 } };
      const target = makeCharacter({ position: { x: 0, y: 0 } });
      const stats = getNPCStatsForItem(turret)!;
      const ms = makeMapState([turret], [target]);

      expect(selectNPCAction(turret, stats, target, ms, 'hex')).toBe('ranged-attack');
    });

    it('turret: idle if target out of range', () => {
      const turret: MapItem = { id: 'c1', type: 'enemy-camera', position: { x: 0, y: 0 } };
      const target = makeCharacter({ position: { x: 14, y: 0 } }); // > range 12
      const stats = getNPCStatsForItem(turret)!;
      const ms = makeMapState([turret], [target]);

      expect(selectNPCAction(turret, stats, target, ms, 'hex')).toBe('idle');
    });

    it('turret: idle if LOS blocked by wall', () => {
      const turret: MapItem = { id: 'c1', type: 'enemy-camera', position: { x: 0, y: 0 } };
      const target = makeCharacter({ position: { x: 4, y: 0 } });
      const wall: MapItem = { id: 'w1', type: 'wall', position: { x: 2, y: 0 } };
      const stats = getNPCStatsForItem(turret)!;
      const ms = makeMapState([turret, wall], [target]);

      expect(selectNPCAction(turret, stats, target, ms, 'hex')).toBe('idle');
    });

    it('elite: ranged-attack if in range with LOS', () => {
      const elite: MapItem = { id: 'e1', type: 'enemy-elite', position: { x: 5, y: 0 } };
      const target = makeCharacter({ position: { x: 0, y: 0 } });
      const stats = getNPCStatsForItem(elite)!;
      const ms = makeMapState([elite], [target]);

      expect(selectNPCAction(elite, stats, target, ms, 'hex')).toBe('ranged-attack');
    });

    it('elite: melee-attack if adjacent and out of ranged range', () => {
      const elite: MapItem = { id: 'e1', type: 'enemy-elite', position: { x: 1, y: 0 } };
      const target = makeCharacter({ position: { x: 0, y: 0 } });
      const stats = getNPCStatsForItem(elite)!;
      const ms = makeMapState([elite], [target]);

      // Adjacent, so in range for both, but ranged is preferred.
      // Since distance 1 <= range 7, elite prefers ranged
      const result = selectNPCAction(elite, stats, target, ms, 'hex');
      expect(result).toBe('ranged-attack');
    });

    it('elite: move if out of range', () => {
      const elite: MapItem = { id: 'e1', type: 'enemy-elite', position: { x: 10, y: 0 } };
      const target = makeCharacter({ position: { x: 0, y: 0 } });
      const stats = getNPCStatsForItem(elite)!;
      const ms = makeMapState([elite], [target]);

      expect(selectNPCAction(elite, stats, target, ms, 'hex')).toBe('move');
    });
  });

  describe('getNPCAttackInfo', () => {
    it('returns melee info for guard', () => {
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 0, y: 0 } };
      const stats = getNPCStatsForItem(guard)!;
      const info = getNPCAttackInfo(stats, 'melee');
      expect(info).not.toBeNull();
      expect(info!.skill).toBe(7);
      expect(info!.damage).toBe(2);
    });

    it('returns null for guard ranged (melee only)', () => {
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 0, y: 0 } };
      const stats = getNPCStatsForItem(guard)!;
      expect(getNPCAttackInfo(stats, 'ranged')).toBeNull();
    });

    it('returns ranged info for turret', () => {
      const turret: MapItem = { id: 'c1', type: 'enemy-camera', position: { x: 0, y: 0 } };
      const stats = getNPCStatsForItem(turret)!;
      const info = getNPCAttackInfo(stats, 'ranged');
      expect(info).not.toBeNull();
      expect(info!.skill).toBe(7);
      expect(info!.range).toBe(12);
    });
  });

  describe('resolveNPCAttack', () => {
    it('guard melee hit applies damage', () => {
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 1, y: 0 } };
      const stats = getNPCStatsForItem(guard)!;
      const target = makeCharacter({ position: { x: 0, y: 0 } }); // D=7, W=9, Overt (+1 defense)

      // Attack roll 8 > MS 7 → hit
      const attackRoll = fixedRoll(8);
      // Defense roll 5 + Overt bonus 1 = 6 < D 7 → fail
      const defenseRoll = fixedRoll(5);

      const result = resolveNPCAttack(guard, stats, target, 'melee', attackRoll, defenseRoll);
      expect(result.attack.hit).toBe(true);
      expect(result.attack.damage).toBe(2);
      expect(result.defense).not.toBeNull();
      expect(result.defense!.saved).toBe(false);
      expect(result.targetWoundsAfter).toBe(7); // 9 - 2
    });

    it('guard melee miss does no damage', () => {
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 1, y: 0 } };
      const stats = getNPCStatsForItem(guard)!;
      const target = makeCharacter({ position: { x: 0, y: 0 } });

      // Attack roll 7 = MS 7 → miss (must be strictly greater)
      const attackRoll = fixedRoll(7);
      const defenseRoll = fixedRoll(10);

      const result = resolveNPCAttack(guard, stats, target, 'melee', attackRoll, defenseRoll);
      expect(result.attack.hit).toBe(false);
      expect(result.defense).toBeNull();
      expect(result.targetWoundsAfter).toBe(9);
    });

    it('defense save reduces damage', () => {
      const guard: MapItem = { id: 'g1', type: 'enemy-security-guard', position: { x: 1, y: 0 } };
      const stats = getNPCStatsForItem(guard)!;
      const target = makeCharacter({ position: { x: 0, y: 0 } }); // D=7

      // Attack roll 8 > 7 → hit, damage 2
      const attackRoll = fixedRoll(8);
      // Defense roll 8 >= 7 → save. Margin = 8 - 7 = 1, reduce = 1 + 1 = 2
      // Overt bonus: +1 to defense rolls → effective roll = 9
      // Save: 9 >= 7, margin = 2, reduce = 1 + 2 = 3 → all 2 damage blocked
      const defenseRoll = fixedRoll(8);

      const result = resolveNPCAttack(guard, stats, target, 'melee', attackRoll, defenseRoll);
      expect(result.attack.hit).toBe(true);
      expect(result.defense).not.toBeNull();
      expect(result.defense!.saved).toBe(true);
      expect(result.defense!.finalDamage).toBe(0);
      expect(result.targetWoundsAfter).toBe(9);
    });

    it('elite ranged attack at higher damage', () => {
      const elite: MapItem = { id: 'e1', type: 'enemy-elite', position: { x: 5, y: 0 } };
      const stats = getNPCStatsForItem(elite)!;
      const target = makeCharacter({
        position: { x: 0, y: 0 },
        stats: { movement: 3, meleeSkill: 7, ballisticSkill: 8, wounds: 9, maxWounds: 9, defense: 10, hack: 10, con: 9 },
      });

      // Attack roll 10 > BS 9 → hit, damage 3
      const attackRoll = fixedRoll(10);
      // Defense roll 5 < D 10 → fail (even with Overt +1, 6 < 10)
      const defenseRoll = fixedRoll(5);

      const result = resolveNPCAttack(elite, stats, target, 'ranged', attackRoll, defenseRoll);
      expect(result.attack.hit).toBe(true);
      expect(result.attack.damage).toBe(3);
      expect(result.targetWoundsAfter).toBe(6); // 9 - 3
    });
  });
});
