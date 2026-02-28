import { describe, it, expect } from 'vitest';
import { getBreakingMigrationWarning } from './versionCompatibility';

describe('versionCompatibility', () => {
  it('returns warning for explicitly flagged breaking transition', () => {
    const warning = getBreakingMigrationWarning('2.1.0', '2.2.0');
    expect(warning).toBeTruthy();
  });

  it('is directional (reverse transition is not automatically breaking)', () => {
    const warning = getBreakingMigrationWarning('2.2.0', '2.1.0');
    expect(warning).toBeNull();
  });

  it('returns null for same-version load', () => {
    const warning = getBreakingMigrationWarning('2.2.0', '2.2.0');
    expect(warning).toBeNull();
  });

  it('returns null for unflagged transition', () => {
    const warning = getBreakingMigrationWarning('2.0.0', '2.2.0');
    expect(warning).toBeNull();
  });

  it('returns null when versions are missing', () => {
    expect(getBreakingMigrationWarning(null, '2.2.0')).toBeNull();
    expect(getBreakingMigrationWarning('2.1.0', null)).toBeNull();
  });
});
