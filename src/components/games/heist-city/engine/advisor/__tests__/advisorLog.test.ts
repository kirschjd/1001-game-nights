import { createAdvisorEntry } from '../advisorLog';

describe('advisorLog', () => {
  describe('createAdvisorEntry', () => {
    it('creates entry with auto-generated ID', () => {
      const entry = createAdvisorEntry('movement', 'warning', 'Test message');
      expect(entry.id).toMatch(/^advisor-\d+$/);
    });

    it('creates entry with timestamp', () => {
      const before = Date.now();
      const entry = createAdvisorEntry('movement', 'warning', 'Test message');
      const after = Date.now();
      expect(entry.timestamp).toBeGreaterThanOrEqual(before);
      expect(entry.timestamp).toBeLessThanOrEqual(after);
    });

    it('sets category, severity, and message', () => {
      const entry = createAdvisorEntry('combat', 'error', 'Something wrong');
      expect(entry.category).toBe('combat');
      expect(entry.severity).toBe('error');
      expect(entry.message).toBe('Something wrong');
    });

    it('includes optional character details', () => {
      const entry = createAdvisorEntry('movement', 'warning', 'Moved too far', {
        characterId: 'char-1',
        characterName: 'Ninja',
      });
      expect(entry.characterId).toBe('char-1');
      expect(entry.characterName).toBe('Ninja');
    });

    it('includes optional action and details', () => {
      const entry = createAdvisorEntry('action-slots', 'info', 'Redundant', {
        actionId: 'Ninja Vanish',
        details: { extra: true },
      });
      expect(entry.actionId).toBe('Ninja Vanish');
      expect(entry.details).toEqual({ extra: true });
    });

    it('generates unique IDs for sequential entries', () => {
      const e1 = createAdvisorEntry('movement', 'info', 'First');
      const e2 = createAdvisorEntry('movement', 'info', 'Second');
      expect(e1.id).not.toBe(e2.id);
    });
  });
});
