import { describe, it, expect } from 'vitest';
import {
  normalizeDDMMYYYY,
  normalizeDDMMYYYYHHMMSS,
  parseDDMMYYYYHHMMSS,
  formatDDMMYYYYHHMMSSFromDate,
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
});
