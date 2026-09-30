import { formatDate, getStatusColor, getStatusLabel } from '../contractUtils';

describe('contractUtils', () => {
  describe('formatDate', () => {
    test('returns N/A for null', () => {
      expect(formatDate(null)).toBe('N/A');
    });

    test('returns N/A for empty string', () => {
      expect(formatDate('')).toBe('N/A');
    });

    test('returns N/A for undefined', () => {
      expect(formatDate(undefined)).toBe('N/A');
    });

    test('formats a valid date string', () => {
      const result = formatDate('2025-03-15T12:00:00');
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2025/);
    });
  });

  describe('getStatusColor', () => {
    test('returns default for null', () => {
      expect(getStatusColor(null)).toBe('default');
    });

    test('returns default for undefined', () => {
      expect(getStatusColor(undefined)).toBe('default');
    });

    test('returns error for past date', () => {
      expect(getStatusColor('2020-01-01')).toBe('error');
    });

    test('returns warning for today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(getStatusColor(today)).toBe('warning');
    });

    test('returns warning for 7 days from now', () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      expect(getStatusColor(d.toISOString().split('T')[0])).toBe('warning');
    });

    test('returns info for 8 days from now', () => {
      const d = new Date();
      d.setDate(d.getDate() + 8);
      expect(getStatusColor(d.toISOString().split('T')[0])).toBe('info');
    });

    test('returns info for 30 days from now', () => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      expect(getStatusColor(d.toISOString().split('T')[0])).toBe('info');
    });

    test('returns success for 31 days from now', () => {
      const d = new Date();
      d.setDate(d.getDate() + 31);
      expect(getStatusColor(d.toISOString().split('T')[0])).toBe('success');
    });
  });

  describe('getStatusLabel', () => {
    test('returns Sin fecha for null', () => {
      expect(getStatusLabel(null)).toBe('Sin fecha');
    });

    test('returns Sin fecha for empty string', () => {
      expect(getStatusLabel('')).toBe('Sin fecha');
    });

    test('returns Vencido for past date', () => {
      const result = getStatusLabel('2020-01-01');
      expect(result).toMatch(/Vencido/);
      expect(result).toMatch(/días/);
    });

    test('returns Vence hoy for today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(getStatusLabel(today)).toBe('Vence hoy');
    });

    test('returns Vence en N días for near future', () => {
      const d = new Date();
      d.setDate(d.getDate() + 5);
      const result = getStatusLabel(d.toISOString().split('T')[0]);
      expect(result).toBe('Vence en 5 días');
    });

    test('returns Vigente for far future date', () => {
      const d = new Date();
      d.setDate(d.getDate() + 31);
      expect(getStatusLabel(d.toISOString().split('T')[0])).toBe('Vigente');
    });
  });
});
