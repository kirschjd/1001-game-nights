import { CharacterRole } from '../types';

/**
 * Role-specific abilities for each character type
 */
export const ROLE_ABILITIES: Record<CharacterRole, string[]> = {
  Face: ['Fast Talk', 'Face Off'],
  Muscle: ['Push', 'All Eyes on Me'],
  Ninja: ['Ninja Vanish', 'Ghost Hand'],
  Brain: ['Experimental Gadget', 'All According to Plan'],
  Spook: ['CQC Technique'],
};

/**
 * Get abilities for a specific role
 */
export function getRoleAbilities(role: CharacterRole): string[] {
  return ROLE_ABILITIES[role] || [];
}
