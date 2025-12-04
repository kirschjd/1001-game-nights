import { EquipmentItem } from '../types';
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
