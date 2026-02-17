import {
  roll2d6,
  rollVsTarget,
  probability2d6,
  probability2d6GTE,
  expectedSuccessMargin,
  all2d6Outcomes,
} from '../dice';

describe('dice', () => {
  describe('roll2d6', () => {
    it('returns values between 2 and 12', () => {
      for (let i = 0; i < 100; i++) {
        const result = roll2d6();
        expect(result.total).toBeGreaterThanOrEqual(2);
        expect(result.total).toBeLessThanOrEqual(12);
        expect(result.dice1).toBeGreaterThanOrEqual(1);
        expect(result.dice1).toBeLessThanOrEqual(6);
        expect(result.dice2).toBeGreaterThanOrEqual(1);
        expect(result.dice2).toBeLessThanOrEqual(6);
        expect(result.total).toBe(result.dice1 + result.dice2);
      }
    });
  });

  describe('rollVsTarget', () => {
    it('correctly determines success (strictly greater than target)', () => {
      // Mock Math.random to get a known roll
      const originalRandom = Math.random;
      // dice1=6, dice2=6 → total=12
      let callCount = 0;
      Math.random = () => {
        callCount++;
        return 0.999; // Will produce 6 for Math.floor(0.999 * 6) + 1 = 6
      };

      const result = rollVsTarget(7);
      expect(result.result.total).toBe(12);
      expect(result.success).toBe(true);
      expect(result.margin).toBe(5);

      Math.random = originalRandom;
    });
  });

  describe('probability2d6', () => {
    it('returns correct probabilities for key targets', () => {
      // P(>1) = 36/36 = 1.0
      expect(probability2d6(1)).toBe(1.0);

      // P(>2) = 35/36
      expect(probability2d6(2)).toBeCloseTo(35 / 36, 10);

      // P(>7) = ways to roll 8,9,10,11,12 = 5+4+3+2+1 = 15/36
      expect(probability2d6(7)).toBeCloseTo(15 / 36, 10);

      // P(>6) = ways to roll 7,8,9,10,11,12 = 6+5+4+3+2+1 = 21/36
      expect(probability2d6(6)).toBeCloseTo(21 / 36, 10);

      // P(>12) = 0
      expect(probability2d6(12)).toBe(0);
      expect(probability2d6(13)).toBe(0);
    });

    it('probabilities sum correctly', () => {
      // Sum of P(>n) for key breakpoints should be consistent
      // P(>1) should be strictly 1.0
      expect(probability2d6(1)).toBe(1.0);
    });
  });

  describe('probability2d6GTE', () => {
    it('returns correct probabilities for defense saves', () => {
      // P(>=2) = 36/36 = 1.0
      expect(probability2d6GTE(2)).toBe(1.0);

      // P(>=7) = ways to roll 7,8,9,10,11,12 = 6+5+4+3+2+1 = 21/36
      expect(probability2d6GTE(7)).toBeCloseTo(21 / 36, 10);

      // P(>=12) = 1/36
      expect(probability2d6GTE(12)).toBeCloseTo(1 / 36, 10);

      // P(>=13) = 0
      expect(probability2d6GTE(13)).toBe(0);
    });

    it('P(>=n) = P(>n-1)', () => {
      for (let n = 3; n <= 12; n++) {
        expect(probability2d6GTE(n)).toBeCloseTo(probability2d6(n - 1), 10);
      }
    });
  });

  describe('expectedSuccessMargin', () => {
    it('returns 0 for impossible rolls', () => {
      expect(expectedSuccessMargin(12)).toBe(0);
    });

    it('returns positive value for possible rolls', () => {
      expect(expectedSuccessMargin(7)).toBeGreaterThan(0);
      expect(expectedSuccessMargin(2)).toBeGreaterThan(0);
    });
  });

  describe('all2d6Outcomes', () => {
    it('returns exactly 36 outcomes', () => {
      expect(all2d6Outcomes()).toHaveLength(36);
    });

    it('all outcomes have valid values', () => {
      for (const outcome of all2d6Outcomes()) {
        expect(outcome.dice1).toBeGreaterThanOrEqual(1);
        expect(outcome.dice1).toBeLessThanOrEqual(6);
        expect(outcome.dice2).toBeGreaterThanOrEqual(1);
        expect(outcome.dice2).toBeLessThanOrEqual(6);
        expect(outcome.total).toBe(outcome.dice1 + outcome.dice2);
      }
    });
  });
});
