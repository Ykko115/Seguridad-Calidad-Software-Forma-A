import { formatDate } from '../dateUtils';

describe('dateUtils', () => {
  describe('formatDate', () => {
    test('returns N/A for null', () => {
      expect(formatDate(null)).toBe('N/A');
    });

    test('returns N/A for undefined', () => {
      expect(formatDate(undefined)).toBe('N/A');
    });

    test('returns N/A for empty string', () => {
      expect(formatDate('')).toBe('N/A');
    });

    test('formats a valid date with hour and minute', () => {
      const result = formatDate('2025-06-15T14:30:00');
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2025/);
      expect(result).toMatch(/14/);
      expect(result).toMatch(/30/);
    });
  });
});
