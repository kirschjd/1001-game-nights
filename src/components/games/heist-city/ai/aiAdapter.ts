/**
 * AI Adapter — Bridge between AI decisions and socket emitters
 *
 * Translates AIActivation decisions into calls to existing socket emitters.
 * Handles moving tokens, rolling dice, resolving combat, and producing log entries.
 */

import { CharacterToken, MapState, GridType } from '../types';
import { AIActivation, AIActionSlot } from './types';
import { resolveCombat, resolveHackCheck, resolveCharmCheck } from '../engine/combat';
import { applyDamage } from '../engine/combat';
import { getEquipmentById } from '../data/equipmentLoader';
import { createGridUtils } from '../data/gridUtils';
import { assignAction } from '../data/characters/actionSlots';
import { LogEntry } from '../components/GameLog';

// ============== Types ==============

/** Emitter functions the adapter needs (subset of useHeistCitySocket return) */
export interface AIEmitters {
  emitCharacterUpdate: (characterId: string, updates: Partial<CharacterToken>) => void;
  emitDiceRoll: (dice1: number, dice2: number, total: number) => void;
  emitMapStateChange: (newMapState: MapState) => void;
  emitGameInfoUpdate: (turnNumber: number, blueVP: number, redVP: number) => void;
}

/** Result of executing a single AI action */
export interface AIActionResult {
  actionId: string;
  characterId: string;
  success: boolean;
  diceRoll?: { dice1: number; dice2: number; total: number };
  damage?: number;
  stateChange?: string;
  vpAwarded?: number;
  logEntry: LogEntry;
}

/** Callback for step-by-step execution progress */
export type AIStepCallback = (result: AIActionResult) => void;

// ============== Dice Rolling ==============

/** Generate a 2d6 roll using Math.random(). Separated so it can be seeded in tests. */
export function rollDice(): { dice1: number; dice2: number; total: number } {
  const dice1 = Math.floor(Math.random() * 6) + 1;
  const dice2 = Math.floor(Math.random() * 6) + 1;
  return { dice1, dice2, total: dice1 + dice2 };
}

// ============== Log Entry Builder ==============

/** Create a log entry for an AI action */
export function buildAILogEntry(
  characterName: string,
  actionName: string,
  result: string,
  targetName?: string
): LogEntry {
  return {
    id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    type: 'ai-action',
    playerName: 'AI',
    characterName,
    actionName,
    targetName,
    result,
  };
}

/** Create a planning log entry */
export function buildAIPlanLogEntry(reasoning: string): LogEntry {
  return {
    id: `ai-plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    type: 'ai-plan',
    playerName: 'AI',
    reasoning,
  };
}

// ============== Action Extractors ==============

function extractBaseActionName(actionId: string): string {
  const parenIndex = actionId.indexOf(' (');
  if (parenIndex > 0) return actionId.substring(0, parenIndex);
  return actionId;
}

function isMovementAction(actionId: string): boolean {
  const base = extractBaseActionName(actionId);
  return base === 'Move' || base === 'Hustle' || base === 'Sprint';
}

function isAttackAction(actionId: string): boolean {
  return actionId.includes('(MS ') || actionId.includes('(BS ');
}

function isMeleeAttack(actionId: string): boolean {
  return actionId.includes('(MS ');
}

function isHackAction(actionId: string): boolean {
  return extractBaseActionName(actionId) === 'Hack';
}

function isCharmAction(actionId: string): boolean {
  const base = extractBaseActionName(actionId);
  return base === 'Charm' || base === 'Con';
}

// ============== Execution ==============

/**
 * Execute one character's full activation (all action slots).
 *
 * @param activation - The AI's decided activation
 * @param mapState - Current map state (read fresh each step)
 * @param gridType - Grid type for distance calculations
 * @param emitters - Socket emitter functions
 * @param onStep - Callback after each action for UI updates
 * @returns All action results
 */
export async function executeActivation(
  activation: AIActivation,
  mapState: MapState,
  gridType: GridType,
  emitters: AIEmitters,
  onStep?: AIStepCallback
): Promise<AIActionResult[]> {
  const results: AIActionResult[] = [];
  const character = mapState.characters.find(c => c.id === activation.characterId);
  if (!character) return results;

  // Build the actions array using assignAction to handle multi-slot continuation markers.
  // The actionSlot.actionId is the full formatted name (e.g. "Move (4\")", "Hustle")
  // which matches what getAvailableActions/UI expects.
  let actions: string[] = [];
  let slotIndex = 0;

  for (const actionSlot of activation.actions) {
    const result = executeAction(
      actionSlot, character, mapState, gridType, emitters
    );
    results.push(result);

    // Use assignAction to properly fill continuation markers for multi-slot actions
    actions = assignAction(actions, slotIndex, actionSlot.actionId, 3);

    // Advance slotIndex past this action and any continuation slots it created
    const filledSlots = actions.filter(a => a !== '').length;
    slotIndex = filledSlots;

    if (onStep) onStep(result);
  }

  // Populate the character's actions array so the UI shows what the AI assigned
  if (actions.length > 0) {
    emitters.emitCharacterUpdate(character.id, { actions });
  }

  return results;
}

/**
 * Execute a single action within an activation.
 */
function executeAction(
  actionSlot: AIActionSlot,
  character: CharacterToken,
  mapState: MapState,
  gridType: GridType,
  emitters: AIEmitters
): AIActionResult {
  const actionId = actionSlot.actionId;
  const baseName = extractBaseActionName(actionId);

  if (isMovementAction(actionId)) {
    return executeMove(actionSlot, character, mapState, emitters);
  }

  if (isAttackAction(actionId)) {
    return executeAttack(actionSlot, character, mapState, gridType, emitters);
  }

  if (isHackAction(actionId)) {
    return executeHack(actionSlot, character, mapState, emitters);
  }

  if (isCharmAction(actionId)) {
    return executeCharm(actionSlot, character, emitters);
  }

  // Special abilities (Go Loud, Face Off, Ninja Vanish, Wake Up, etc.)
  return executeSpecialAbility(actionSlot, character, emitters, baseName);
}

// ============== Action Executors ==============

function executeMove(
  actionSlot: AIActionSlot,
  character: CharacterToken,
  mapState: MapState,
  emitters: AIEmitters
): AIActionResult {
  // Target is a position string like "3,2" or a Position object
  const targetPos = parseTarget(actionSlot.target);
  if (targetPos && typeof targetPos === 'object' && 'x' in targetPos) {
    emitters.emitCharacterUpdate(character.id, { position: targetPos });
  }

  const logEntry = buildAILogEntry(
    character.name,
    extractBaseActionName(actionSlot.actionId),
    targetPos ? `Moved to (${typeof targetPos === 'object' && 'x' in targetPos ? `${targetPos.x},${targetPos.y}` : targetPos})` : 'Moved',
  );

  return {
    actionId: actionSlot.actionId,
    characterId: character.id,
    success: true,
    logEntry,
  };
}

function executeAttack(
  actionSlot: AIActionSlot,
  character: CharacterToken,
  mapState: MapState,
  gridType: GridType,
  emitters: AIEmitters
): AIActionResult {
  const targetId = typeof actionSlot.target === 'string' ? actionSlot.target : undefined;
  const target = targetId ? mapState.characters.find(c => c.id === targetId) : undefined;
  const attackType = isMeleeAttack(actionSlot.actionId) ? 'melee' : 'ranged';
  const weaponName = extractBaseActionName(actionSlot.actionId);
  const weaponId = weaponName === 'Fist' ? 'fist' : weaponName;

  // Roll attack and defense dice
  const attackRoll = rollDice();
  emitters.emitDiceRoll(attackRoll.dice1, attackRoll.dice2, attackRoll.total);

  if (!target) {
    const logEntry = buildAILogEntry(character.name, weaponName, 'No target found', targetId);
    return { actionId: actionSlot.actionId, characterId: character.id, success: false, diceRoll: attackRoll, logEntry };
  }

  const defenseRoll = rollDice();
  const combatResult = resolveCombat(
    character, target, weaponId, attackRoll, defenseRoll, attackType
  );

  // Apply results
  if (combatResult.attack.hit) {
    const updates: Partial<CharacterToken> = {
      stats: { ...target.stats, wounds: combatResult.targetWoundsAfter },
    };
    if (combatResult.targetStateAfter !== target.state) {
      updates.state = combatResult.targetStateAfter;
    }
    emitters.emitCharacterUpdate(target.id, updates);
  }

  const resultDesc = combatResult.attack.hit
    ? `Hit for ${combatResult.defense?.finalDamage ?? 0} damage${combatResult.targetDowned ? ' (DOWNED)' : ''}`
    : 'Missed';

  const logEntry = buildAILogEntry(character.name, weaponName, resultDesc, target.name);

  return {
    actionId: actionSlot.actionId,
    characterId: character.id,
    success: combatResult.attack.hit,
    diceRoll: attackRoll,
    damage: combatResult.defense?.finalDamage,
    stateChange: combatResult.targetStateAfter !== target.state ? combatResult.targetStateAfter : undefined,
    vpAwarded: combatResult.targetDowned ? 1 : 0,
    logEntry,
  };
}

function executeHack(
  actionSlot: AIActionSlot,
  character: CharacterToken,
  mapState: MapState,
  emitters: AIEmitters
): AIActionResult {
  const roll = rollDice();
  emitters.emitDiceRoll(roll.dice1, roll.dice2, roll.total);

  const hackResult = resolveHackCheck(character, roll);

  if (hackResult.success) {
    const currentVP = character.victoryPoints || 0;
    emitters.emitCharacterUpdate(character.id, { victoryPoints: currentVP + 1 });
  }

  const resultDesc = hackResult.success ? 'Success (+1 VP)' : 'Failed';
  const targetId = typeof actionSlot.target === 'string' ? actionSlot.target : undefined;
  const logEntry = buildAILogEntry(character.name, 'Hack', resultDesc, targetId);

  return {
    actionId: actionSlot.actionId,
    characterId: character.id,
    success: hackResult.success,
    diceRoll: roll,
    vpAwarded: hackResult.success ? 1 : 0,
    logEntry,
  };
}

function executeCharm(
  actionSlot: AIActionSlot,
  character: CharacterToken,
  emitters: AIEmitters
): AIActionResult {
  const roll = rollDice();
  emitters.emitDiceRoll(roll.dice1, roll.dice2, roll.total);

  const charmResult = resolveCharmCheck(character, roll);

  if (charmResult.success) {
    const currentVP = character.victoryPoints || 0;
    emitters.emitCharacterUpdate(character.id, { victoryPoints: currentVP + 1 });
  }

  const resultDesc = charmResult.success ? 'Success (+1 VP)' : 'Failed';
  const logEntry = buildAILogEntry(character.name, 'Charm', resultDesc);

  return {
    actionId: actionSlot.actionId,
    characterId: character.id,
    success: charmResult.success,
    diceRoll: roll,
    vpAwarded: charmResult.success ? 1 : 0,
    logEntry,
  };
}

function executeSpecialAbility(
  actionSlot: AIActionSlot,
  character: CharacterToken,
  emitters: AIEmitters,
  abilityName: string
): AIActionResult {
  // Determine state change
  let newState: string | undefined;
  switch (abilityName) {
    case 'Go Loud': newState = 'Overt'; break;
    case 'Face Off': newState = 'Disguised'; break;
    case 'Ninja Vanish': newState = 'Hidden'; break;
    case 'Wake Up': newState = 'Overt'; break;
    default: break;
  }

  if (newState) {
    const updates: Partial<CharacterToken> = { state: newState as CharacterToken['state'] };
    if (abilityName === 'Wake Up') {
      updates.stats = { ...character.stats, wounds: 4 };
    }
    emitters.emitCharacterUpdate(character.id, updates);
  }

  const logEntry = buildAILogEntry(
    character.name,
    abilityName,
    newState ? `State → ${newState}` : 'Activated',
  );

  return {
    actionId: actionSlot.actionId,
    characterId: character.id,
    success: true,
    stateChange: newState,
    logEntry,
  };
}

// ============== Helpers ==============

function parseTarget(target: string | { x: number; y: number } | undefined): { x: number; y: number } | string | undefined {
  if (!target) return undefined;
  if (typeof target === 'object') return target;
  // Try to parse "x,y" format
  const parts = target.split(',');
  if (parts.length === 2) {
    const x = parseInt(parts[0], 10);
    const y = parseInt(parts[1], 10);
    if (!isNaN(x) && !isNaN(y)) return { x, y };
  }
  return target;
}
