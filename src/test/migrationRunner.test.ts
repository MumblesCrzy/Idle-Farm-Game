import { describe, it, expect, vi } from 'vitest';
import { runMigrations } from '../utils/migrations/runner';

type TestSave = {
  _saveVersion?: number;
  count?: number;
  v2?: boolean;
  partial?: boolean;
  shouldFail?: boolean;
};

// Two stand-in migrations: v1 counts its own runs, v2 can fail after a partial change
const { migrations } = vi.hoisted(() => ({
  migrations: [
    {
      version: 1,
      description: 'Add one to count',
      migrate: vi.fn((data: TestSave) => {
        data.count = (data.count ?? 0) + 1;
        return data;
      })
    },
    {
      version: 2,
      description: 'Mark v2, or fail after a partial change',
      migrate: vi.fn((data: TestSave) => {
        if (data.shouldFail) {
          data.partial = true;
          throw new Error('migration failed');
        }
        data.v2 = true;
        return data;
      })
    }
  ]
}));

vi.mock('../utils/migrations/registry', () => ({
  CURRENT_SAVE_VERSION: 2,
  MIGRATIONS: migrations,
  getMigrationsToRun: (from: number, to: number = 2) =>
    migrations.filter(m => m.version > from && m.version <= to),
  getMigrationsToRollback: () => []
}));

describe('runMigrations', () => {
  it('runs each migration exactly once', () => {
    const result = runMigrations({ _saveVersion: 0, count: 0 });

    expect(result.success).toBe(true);
    expect(migrations[0].migrate).toHaveBeenCalledTimes(1);
    expect(migrations[1].migrate).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ count: 1, v2: true });
  });

  it('returns the data as of the last successful migration when one fails', () => {
    const result = runMigrations({ _saveVersion: 0, count: 0, shouldFail: true }, { enableSnapshots: true });

    expect(result.success).toBe(false);
    expect(result.toVersion).toBe(1);
    expect(result.data).toMatchObject({ count: 1 });
    expect((result.data as TestSave).partial).toBeUndefined();
  });
});
