import { CharacterRole } from '../../types';
import { CHARACTER_DATA } from './characterStats';

/**
 * Dynamically build role abilities from CHARACTER_DATA
 * Excludes abilities with actionCost of 0 (passive/pre-game abilities)
 */
function buildRoleAbilities(): Record<CharacterRole, string[]> {
  const abilities: Record<string, string[]> = {};

  for (const [role, data] of Object.entries(CHARACTER_DATA)) {
    abilities[role] = data.abilities
      .filter((ability) => ability.actionCost > 0)
      .map((ability) => ability.name);
  }

  return abilities as Record<CharacterRole, string[]>;
}

export const ROLE_ABILITIES = buildRoleAbilities();

/**
 * Get abilities for a specific role
 */
export function getRoleAbilities(role: CharacterRole): string[] {
  return ROLE_ABILITIES[role] || [];
}
