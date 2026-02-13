/**
 * Action Utilities for Heist City
 *
 * Generates the list of available actions for a character based on their
 * stats, role, equipment, and current state.
 */

import { CharacterToken } from '../../types';
import { getStateInfo } from './stateAbilities';
import { getRoleAbilities } from './roleAbilities';
import { getCoreActions, getDefaultMeleeAction, formatWeaponAction } from './coreActions';
import { getEquipmentByIds } from '../equipmentLoader';

/**
 * Generate available actions for a character based on their stats, role, equipment, and state
 */
export function getAvailableActions(character: CharacterToken): string[] {
  const stateInfo = getStateInfo(character.state);

  if (stateInfo.exclusiveActions) {
    if (stateInfo.additionalActions && stateInfo.additionalActions.length > 0) {
      return stateInfo.additionalActions.map(action => action.name);
    }
    return [];
  }

  const actions: string[] = [];

  actions.push(...getCoreActions(character.stats));

  const roleAbilities = getRoleAbilities(character.role);
  actions.push(...roleAbilities);

  const equipment = getEquipmentByIds(character.equipment || []);
  let hasMeleeWeapon = false;
  let hasReloadWeapon = false;

  equipment.forEach(item => {
    if (item.type === 'Ranged' || item.type === 'Thrown' || item.type === 'Melee') {
      if (item.type === 'Melee') {
        hasMeleeWeapon = true;
      }
      actions.push(formatWeaponAction(item.id, item.type, character.stats));
    }
    if (item.Special?.Reload) {
      hasReloadWeapon = true;
    }
  });

  if (!hasMeleeWeapon) {
    actions.push(getDefaultMeleeAction(character.stats));
  }

  if (hasReloadWeapon) {
    actions.push('Reload');
  }

  if (stateInfo.additionalActions) {
    stateInfo.additionalActions.forEach(action => {
      actions.push(action.name);
    });
  }

  return actions;
}
