import {
  shouldShow,
  muteCategory,
  unmuteCategory,
  DEFAULT_ADVISOR_CONFIG,
  AdvisorConfig,
} from '../advisorConfig';

describe('advisorConfig', () => {
  describe('DEFAULT_ADVISOR_CONFIG', () => {
    it('is enabled by default', () => {
      expect(DEFAULT_ADVISOR_CONFIG.enabled).toBe(true);
    });

    it('has no muted categories', () => {
      expect(DEFAULT_ADVISOR_CONFIG.mutedCategories.size).toBe(0);
    });

    it('shows all severities', () => {
      expect(DEFAULT_ADVISOR_CONFIG.minSeverity).toBe('info');
    });
  });

  describe('shouldShow', () => {
    it('shows all entries with default config', () => {
      expect(shouldShow({ category: 'movement', severity: 'info' }, DEFAULT_ADVISOR_CONFIG)).toBe(true);
      expect(shouldShow({ category: 'combat', severity: 'warning' }, DEFAULT_ADVISOR_CONFIG)).toBe(true);
      expect(shouldShow({ category: 'alert', severity: 'error' }, DEFAULT_ADVISOR_CONFIG)).toBe(true);
    });

    it('hides entries when disabled', () => {
      const config: AdvisorConfig = { ...DEFAULT_ADVISOR_CONFIG, enabled: false };
      expect(shouldShow({ category: 'movement', severity: 'error' }, config)).toBe(false);
    });

    it('hides entries for muted categories', () => {
      const config = muteCategory(DEFAULT_ADVISOR_CONFIG, 'movement');
      expect(shouldShow({ category: 'movement', severity: 'warning' }, config)).toBe(false);
      expect(shouldShow({ category: 'combat', severity: 'warning' }, config)).toBe(true);
    });

    it('hides entries below severity threshold', () => {
      const config: AdvisorConfig = { ...DEFAULT_ADVISOR_CONFIG, minSeverity: 'warning' };
      expect(shouldShow({ category: 'movement', severity: 'info' }, config)).toBe(false);
      expect(shouldShow({ category: 'movement', severity: 'warning' }, config)).toBe(true);
      expect(shouldShow({ category: 'movement', severity: 'error' }, config)).toBe(true);
    });

    it('only shows errors when minSeverity is error', () => {
      const config: AdvisorConfig = { ...DEFAULT_ADVISOR_CONFIG, minSeverity: 'error' };
      expect(shouldShow({ category: 'movement', severity: 'info' }, config)).toBe(false);
      expect(shouldShow({ category: 'movement', severity: 'warning' }, config)).toBe(false);
      expect(shouldShow({ category: 'movement', severity: 'error' }, config)).toBe(true);
    });
  });

  describe('muteCategory', () => {
    it('adds a category to muted set', () => {
      const config = muteCategory(DEFAULT_ADVISOR_CONFIG, 'movement');
      expect(config.mutedCategories.has('movement')).toBe(true);
      expect(config.mutedCategories.size).toBe(1);
    });

    it('does not mutate original config', () => {
      muteCategory(DEFAULT_ADVISOR_CONFIG, 'movement');
      expect(DEFAULT_ADVISOR_CONFIG.mutedCategories.size).toBe(0);
    });

    it('can mute multiple categories', () => {
      let config = muteCategory(DEFAULT_ADVISOR_CONFIG, 'movement');
      config = muteCategory(config, 'combat');
      expect(config.mutedCategories.has('movement')).toBe(true);
      expect(config.mutedCategories.has('combat')).toBe(true);
      expect(config.mutedCategories.size).toBe(2);
    });
  });

  describe('unmuteCategory', () => {
    it('removes a category from muted set', () => {
      const muted = muteCategory(DEFAULT_ADVISOR_CONFIG, 'movement');
      const unmuted = unmuteCategory(muted, 'movement');
      expect(unmuted.mutedCategories.has('movement')).toBe(false);
      expect(unmuted.mutedCategories.size).toBe(0);
    });

    it('does not error on unmuting non-muted category', () => {
      const config = unmuteCategory(DEFAULT_ADVISOR_CONFIG, 'movement');
      expect(config.mutedCategories.size).toBe(0);
    });
  });
});
