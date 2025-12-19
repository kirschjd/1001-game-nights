import { EquipmentItem, StatBonus, CharacterStats } from '../types';
import equipmentData from './equipment.json';

/**
 * Get all available equipment items
 */
export function getAllEquipment(): EquipmentItem[] {
  return equipmentData.items as EquipmentItem[];
}

/**
 * Get equipment item by ID
 */
export function getEquipmentById(id: string): EquipmentItem | undefined {
  return equipmentData.items.find((item: any) => item.id === id) as EquipmentItem | undefined;
}

/**
 * Get equipment items by IDs
 */
export function getEquipmentByIds(ids: string[]): EquipmentItem[] {
  return ids
    .map(id => getEquipmentById(id))
    .filter((item): item is EquipmentItem => item !== undefined);
}

/**
 * Calculate total stat bonuses from a list of equipment IDs
 * Returns the combined StatBonus from all equipped items
 */
export function getEquipmentStatBonuses(equipmentIds: string[]): StatBonus {
  const equipment = getEquipmentByIds(equipmentIds);
  const totalBonus: StatBonus = {};

  for (const item of equipment) {
    if (item.StatBonus) {
      if (item.StatBonus.movement) {
        totalBonus.movement = (totalBonus.movement || 0) + item.StatBonus.movement;
      }
      if (item.StatBonus.meleeSkill) {
        totalBonus.meleeSkill = (totalBonus.meleeSkill || 0) + item.StatBonus.meleeSkill;
      }
      if (item.StatBonus.ballisticSkill) {
        totalBonus.ballisticSkill = (totalBonus.ballisticSkill || 0) + item.StatBonus.ballisticSkill;
      }
      if (item.StatBonus.maxWounds) {
        totalBonus.maxWounds = (totalBonus.maxWounds || 0) + item.StatBonus.maxWounds;
      }
      if (item.StatBonus.defense) {
        totalBonus.defense = (totalBonus.defense || 0) + item.StatBonus.defense;
      }
      if (item.StatBonus.hack) {
        totalBonus.hack = (totalBonus.hack || 0) + item.StatBonus.hack;
      }
      if (item.StatBonus.con) {
        totalBonus.con = (totalBonus.con || 0) + item.StatBonus.con;
      }
      if (item.StatBonus.inventorySlots) {
        totalBonus.inventorySlots = (totalBonus.inventorySlots || 0) + item.StatBonus.inventorySlots;
      }
    }
  }

  return totalBonus;
}

/**
 * Calculate effective stats by applying equipment bonuses to base stats
 * The returned stats reflect the character's stats WITH equipment bonuses applied
 */
export function getEffectiveStats(baseStats: CharacterStats, equipmentIds: string[]): CharacterStats {
  const bonuses = getEquipmentStatBonuses(equipmentIds);

  return {
    movement: baseStats.movement + (bonuses.movement || 0),
    meleeSkill: baseStats.meleeSkill + (bonuses.meleeSkill || 0),
    ballisticSkill: baseStats.ballisticSkill + (bonuses.ballisticSkill || 0),
    wounds: baseStats.wounds, // Current wounds not affected by equipment
    maxWounds: baseStats.maxWounds + (bonuses.maxWounds || 0),
    defense: baseStats.defense + (bonuses.defense || 0),
    hack: baseStats.hack + (bonuses.hack || 0),
    con: baseStats.con + (bonuses.con || 0),
  };
}
