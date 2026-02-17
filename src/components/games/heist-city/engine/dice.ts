/**
 * Dice rolling abstraction + probability math for AI.
 *
 * Wraps 2d6 rolling so the AI can compute expected values with the
 * same interface used for real resolution.
 */

import { DiceRollResult } from './types';

/**
 * Roll 2d6 using Math.random()
 */
export function roll2d6(): DiceRollResult {
  const dice1 = Math.floor(Math.random() * 6) + 1;
  const dice2 = Math.floor(Math.random() * 6) + 1;
  return { dice1, dice2, total: dice1 + dice2 };
}

/**
 * Roll 2d6 and check against a target number (DC).
 * Success = total > target (strictly greater, per ruleset).
 * margin = total - target (positive = exceeded).
 */
export function rollVsTarget(targetNumber: number): {
  result: DiceRollResult;
  success: boolean;
  margin: number;
} {
  const result = roll2d6();
  const margin = result.total - targetNumber;
  return {
    result,
    success: result.total > targetNumber,
    margin,
  };
}

// Precomputed: count of ways to roll each total on 2d6
const ROLL_COUNTS: Record<number, number> = {
  2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6,
  8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
};

/**
 * Exact probability of rolling strictly greater than target on 2d6.
 * Used by AI for expected-value calculations.
 *
 * Examples:
 * - target 2 → P(>2) = 35/36 ≈ 0.972
 * - target 7 → P(>7) = 15/36 ≈ 0.417
 * - target 12 → P(>12) = 0/36 = 0.0
 */
export function probability2d6(target: number): number {
  if (target < 2) return 1.0;
  if (target >= 12) return 0.0;

  let waysToSucceed = 0;
  for (let total = target + 1; total <= 12; total++) {
    waysToSucceed += ROLL_COUNTS[total] || 0;
  }
  return waysToSucceed / 36;
}

/**
 * Average margin of success (total - target) when the roll succeeds.
 * Used for defense save calculations (how much you beat the DC by).
 * Returns 0 if success is impossible.
 */
export function expectedSuccessMargin(target: number): number {
  if (target >= 12) return 0;

  let totalMargin = 0;
  let totalWays = 0;
  for (let roll = target + 1; roll <= 12; roll++) {
    const ways = ROLL_COUNTS[roll] || 0;
    totalMargin += (roll - target) * ways;
    totalWays += ways;
  }
  return totalWays > 0 ? totalMargin / totalWays : 0;
}

/**
 * All 36 possible 2d6 outcomes for exhaustive expected-value computation.
 */
export function all2d6Outcomes(): DiceRollResult[] {
  const outcomes: DiceRollResult[] = [];
  for (let dice1 = 1; dice1 <= 6; dice1++) {
    for (let dice2 = 1; dice2 <= 6; dice2++) {
      outcomes.push({ dice1, dice2, total: dice1 + dice2 });
    }
  }
  return outcomes;
}

/**
 * Probability of rolling >= target on 2d6 (greater than or equal).
 * Used for defense saves where success = roll >= Defense stat.
 */
export function probability2d6GTE(target: number): number {
  if (target <= 2) return 1.0;
  if (target > 12) return 0.0;

  let waysToSucceed = 0;
  for (let total = target; total <= 12; total++) {
    waysToSucceed += ROLL_COUNTS[total] || 0;
  }
  return waysToSucceed / 36;
}
