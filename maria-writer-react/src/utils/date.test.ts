import { describe, it, expect } from 'vitest';
import {
  normalizeDDMMYYYY,
  normalizeDDMMYYYYHHMMSS,
  parseDDMMYYYYHHMMSS,
  formatDDMMYYYYHHMMSSFromDate,
  calculateAge,
  getDisplayAge,
} from './date';

describe('date utils', () => {
  it('normalizeDDMMYYYY normalizes dd/mm/yyyy and yyyy-mm-dd', () => {
    expect(normalizeDDMMYYYY('1/2/2000')).toBe('01/02/2000');
    expect(normalizeDDMMYYYY('2000-02-01')).toBe('01/02/2000');
  });

  it('normalizeDDMMYYYY rejects invalid calendar dates', () => {
    expect(normalizeDDMMYYYY('31/02/2000')).toBeNull();
    expect(normalizeDDMMYYYY('99/99/2000')).toBeNull();
  });

  it('normalizeDDMMYYYYHHMMSS normalizes date-only to midnight', () => {
    expect(normalizeDDMMYYYYHHMMSS('01/02/2000')).toBe('01/02/2000 00:00:00');
    expect(normalizeDDMMYYYYHHMMSS('2000-02-01')).toBe('01/02/2000 00:00:00');
  });

  it('normalizeDDMMYYYYHHMMSS supports partial and full time', () => {
    expect(normalizeDDMMYYYYHHMMSS('01/02/2000 5')).toBe('01/02/2000 05:00:00');
    expect(normalizeDDMMYYYYHHMMSS('01/02/2000 5:6')).toBe('01/02/2000 05:06:00');
    expect(normalizeDDMMYYYYHHMMSS('01/02/2000 5:6:7')).toBe('01/02/2000 05:06:07');
  });

  it('normalizeDDMMYYYYHHMMSS supports ISO-like date-time strings', () => {
    expect(normalizeDDMMYYYYHHMMSS('2020-03-04T05:06:07')).toBe('04/03/2020 05:06:07');
    expect(normalizeDDMMYYYYHHMMSS('2020/03/04 05:06')).toBe('04/03/2020 05:06:00');
  });

  it('parse/format roundtrips for normalized strings', () => {
    const dt = parseDDMMYYYYHHMMSS('04/03/2020 05:06:07');
    expect(dt).toBeTruthy();
    expect(formatDDMMYYYYHHMMSSFromDate(dt!)).toBe('04/03/2020 05:06:07');
  });

  describe('calculateAge', () => {
    it('calculates age correctly for past date', () => {
      const referenceDate = new Date(2026, 0, 3); // January 3, 2026
      const age = calculateAge('15/06/2000 10:30:00', referenceDate);
      expect(age).toBe(25);
    });

    it('calculates age correctly when birthday has not occurred this year', () => {
      const referenceDate = new Date(2026, 0, 3); // January 3, 2026
      const age = calculateAge('15/06/2000 10:30:00', referenceDate);
      expect(age).toBe(25); // Birthday is June 15, hasn't occurred yet in 2026
    });

    it('calculates age correctly when birthday has occurred this year', () => {
      const referenceDate = new Date(2026, 6, 20); // July 20, 2026
      const age = calculateAge('15/06/2000 10:30:00', referenceDate);
      expect(age).toBe(26); // Birthday June 15 has passed
    });

    it('returns 0 for current year birth', () => {
      const referenceDate = new Date(2026, 6, 20); // July 20, 2026
      const age = calculateAge('15/01/2026 10:30:00', referenceDate);
      expect(age).toBe(0);
    });

    it('works with date-only format', () => {
      const referenceDate = new Date(2026, 0, 3);
      const age = calculateAge('15/06/2000', referenceDate);
      expect(age).toBe(25);
    });

    it('returns null for invalid date', () => {
      const referenceDate = new Date(2026, 0, 3);
      expect(calculateAge('invalid', referenceDate)).toBeNull();
      expect(calculateAge('', referenceDate)).toBeNull();
    });
  });

  describe('getDisplayAge', () => {
    it('returns stored age when available', () => {
      const age = getDisplayAge('30', '15/06/1995 00:00:00');
      expect(age).toBe(30);
    });

    it('calculates age from dob when stored age is not available', () => {
      const age = getDisplayAge('', '15/06/2000 00:00:00');
      expect(age).toBeGreaterThanOrEqual(23); // Will be at least 23 depending on current date
    });

    it('calculates age from dob when stored age is undefined', () => {
      const age = getDisplayAge(undefined, '15/06/2000 00:00:00');
      expect(age).toBeGreaterThanOrEqual(23);
    });

    it('uses story current date when provided', () => {
      const age = getDisplayAge('', '15/06/2000 00:00:00', '01/01/2025 00:00:00');
      expect(age).toBe(24); // From June 2000 to January 2025
    });

    it('calculates age correctly with story date after birthday', () => {
      const age = getDisplayAge('', '15/06/2000 00:00:00', '01/12/2025 00:00:00');
      expect(age).toBe(25); // Birthday passed in 2025
    });

    it('returns null when neither age nor dob is available', () => {
      expect(getDisplayAge('', '')).toBeNull();
      expect(getDisplayAge(undefined, undefined)).toBeNull();
      expect(getDisplayAge('', undefined)).toBeNull();
    });

    it('returns null for invalid stored age', () => {
      const age = getDisplayAge('abc', undefined);
      expect(age).toBeNull();
    });

    it('prefers stored age over calculated age', () => {
      // Even if DOB would calculate to 25, stored age of 30 takes precedence
      const age = getDisplayAge('30', '15/06/2000 00:00:00');
      expect(age).toBe(30);
    });

    it('falls back to today when story date is invalid', () => {
      const age = getDisplayAge('', '15/06/2000 00:00:00', 'invalid-date');
      expect(age).toBeGreaterThanOrEqual(23); // Uses current date
    });
  });
});
