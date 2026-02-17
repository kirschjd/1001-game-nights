/**
 * Advisor Log — Advisory Entry Types and Factory
 *
 * Defines the AdvisorEntry type and a factory function for creating entries
 * with auto-generated IDs and timestamps.
 */

import { AdvisorSeverity, RuleCategory } from './advisorConfig';

let advisorIdCounter = 0;

/** A single advisory entry produced by the rules advisor */
export interface AdvisorEntry {
  id: string;
  timestamp: number;
  category: RuleCategory;
  severity: AdvisorSeverity;
  message: string;
  characterId?: string;
  characterName?: string;
  actionId?: string;
  details?: Record<string, unknown>;
}

/**
 * Create an AdvisorEntry with auto-generated ID and timestamp.
 */
export function createAdvisorEntry(
  category: RuleCategory,
  severity: AdvisorSeverity,
  message: string,
  details?: Partial<Pick<AdvisorEntry, 'characterId' | 'characterName' | 'actionId' | 'details'>>
): AdvisorEntry {
  return {
    id: `advisor-${++advisorIdCounter}`,
    timestamp: Date.now(),
    category,
    severity,
    message,
    ...details,
  };
}
