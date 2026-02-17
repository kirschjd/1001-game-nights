/**
 * Advisor Configuration
 *
 * Types and utilities for configuring the Rules Advisor.
 * Controls severity levels, category muting, and filtering.
 */

/** Severity levels for advisor entries */
export type AdvisorSeverity = 'info' | 'warning' | 'error';

/** Rule categories that can be individually muted */
export type RuleCategory =
  | 'movement'
  | 'action-slots'
  | 'targeting'
  | 'state'
  | 'turn-order'
  | 'combat'
  | 'equipment'
  | 'vp'
  | 'alert';

/** Advisor configuration */
export interface AdvisorConfig {
  enabled: boolean;
  mutedCategories: Set<RuleCategory>;
  minSeverity: AdvisorSeverity;
}

/** Severity order for threshold comparisons */
const SEVERITY_ORDER: Record<AdvisorSeverity, number> = {
  info: 0,
  warning: 1,
  error: 2,
};

/** Default configuration: enabled, nothing muted, show all */
export const DEFAULT_ADVISOR_CONFIG: AdvisorConfig = {
  enabled: true,
  mutedCategories: new Set(),
  minSeverity: 'info',
};

/**
 * Check if an advisory entry should be shown given the current config.
 * Returns false if the category is muted or severity is below threshold.
 */
export function shouldShow(
  entry: { category: RuleCategory; severity: AdvisorSeverity },
  config: AdvisorConfig
): boolean {
  if (!config.enabled) return false;
  if (config.mutedCategories.has(entry.category)) return false;
  if (SEVERITY_ORDER[entry.severity] < SEVERITY_ORDER[config.minSeverity]) return false;
  return true;
}

/**
 * Return a new config with the given category muted.
 */
export function muteCategory(config: AdvisorConfig, category: RuleCategory): AdvisorConfig {
  const newMuted = new Set(config.mutedCategories);
  newMuted.add(category);
  return { ...config, mutedCategories: newMuted };
}

/**
 * Return a new config with the given category unmuted.
 */
export function unmuteCategory(config: AdvisorConfig, category: RuleCategory): AdvisorConfig {
  const newMuted = new Set(config.mutedCategories);
  newMuted.delete(category);
  return { ...config, mutedCategories: newMuted };
}
