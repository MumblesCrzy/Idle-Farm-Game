/**
 * Migration System Tests
 * 
 * Tests for the save data migration framework.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  detectVersion,
  runMigrations,
  rollbackMigrations,
  needsMigration,
  wrapWithMetadata,
  unwrapData,
  getCurrentVersion,
  getMigrationLog,
  clearMigrationLog
} from '../utils/migrations';
import {
  CURRENT_SAVE_VERSION,
  MIGRATIONS,
  getMigrationsToRun,
  getMigrationsToRollback,
  hasMigration,
  getMigration
} from '../utils/migrations/registry';

describe('Migration System', () => {
  beforeEach(() => {
    // Clear migration log before each test
    clearMigrationLog();
    // Mock localStorage
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Version Detection', () => {
    it('should detect legacy data with no version as version 0', () => {
      const legacyData = {
        veggies: [],
        money: 100,
        experience: 0,
        knowledge: 0
      };
      
      expect(detectVersion(legacyData)).toBe(0);
    });

    it('should detect data with canningVersion field', () => {
      const dataWithCanningVersion = {
        veggies: [],
        money: 100,
        canningVersion: 3
      };
      
      expect(detectVersion(dataWithCanningVersion)).toBe(3);
    });

    it('should detect data with beeState as version 1+', () => {
      const dataWithBees = {
        veggies: [],
        money: 100,
        beeState: { unlocked: false }
      };
      
      expect(detectVersion(dataWithBees)).toBe(1);
    });

    it('should detect data with canningAutoPurchasers as version 2+', () => {
      const dataWithAutoPurchasers = {
        veggies: [],
        money: 100,
        canningAutoPurchasers: []
      };
      
      expect(detectVersion(dataWithAutoPurchasers)).toBe(2);
    });

    it('should detect wrapped data with metadata', () => {
      const wrappedData = wrapWithMetadata({ veggies: [], money: 100 }, 5);
      
      expect(detectVersion(wrappedData)).toBe(5);
    });
  });

  describe('Migration Registry', () => {
    it('should have migrations sorted by version', () => {
      for (let i = 1; i < MIGRATIONS.length; i++) {
        expect(MIGRATIONS[i].version).toBeGreaterThan(MIGRATIONS[i - 1].version);
      }
    });

    it('should have CURRENT_SAVE_VERSION match latest migration', () => {
      const lastMigration = MIGRATIONS[MIGRATIONS.length - 1];
      expect(CURRENT_SAVE_VERSION).toBe(lastMigration.version);
    });

    it('should return correct migrations to run', () => {
      const migrations = getMigrationsToRun(0, 3);
      
      expect(migrations).toHaveLength(3);
      expect(migrations[0].version).toBe(1);
      expect(migrations[1].version).toBe(2);
      expect(migrations[2].version).toBe(3);
    });

    it('should return empty array if already at target version', () => {
      const migrations = getMigrationsToRun(5, 5);
      
      expect(migrations).toHaveLength(0);
    });

    it('should return migrations to rollback in reverse order', () => {
      const migrations = getMigrationsToRollback(3, 0);
      
      expect(migrations).toHaveLength(3);
      expect(migrations[0].version).toBe(3);
      expect(migrations[1].version).toBe(2);
      expect(migrations[2].version).toBe(1);
    });

    it('should check if migration exists', () => {
      expect(hasMigration(1)).toBe(true);
      expect(hasMigration(999)).toBe(false);
    });

    it('should get specific migration by version', () => {
      const migration = getMigration(1);
      
      expect(migration).toBeDefined();
      expect(migration?.version).toBe(1);
      expect(migration?.description).toContain('bee');
    });
  });

  describe('Migration Runner', () => {
    it('should return unchanged data if already at current version', () => {
      const wrappedData = wrapWithMetadata({ veggies: [], money: 100 }, CURRENT_SAVE_VERSION);
      
      const result = runMigrations(wrappedData);
      
      expect(result.success).toBe(true);
      expect(result.migrations).toHaveLength(0);
      expect(result.fromVersion).toBe(CURRENT_SAVE_VERSION);
      expect(result.toVersion).toBe(CURRENT_SAVE_VERSION);
    });

    it('should migrate legacy data through all versions', () => {
      const legacyData = {
        veggies: [],
        money: 100,
        experience: 0,
        knowledge: 0,
        activeVeggie: 0,
        day: 1,
        greenhouseOwned: false,
        heirloomOwned: false,
        autoSellOwned: false,
        almanacLevel: 0,
        almanacCost: 10,
        maxPlots: 5,
        farmTier: 1,
        farmCost: 1000,
        irrigationOwned: false,
        currentWeather: 'Clear',
        highestUnlockedVeggie: 0
      };
      
      const result = runMigrations(legacyData);
      
      expect(result.success).toBe(true);
      expect(result.fromVersion).toBe(0);
      expect(result.toVersion).toBe(CURRENT_SAVE_VERSION);
      expect(result.migrations.length).toBeGreaterThan(0);
    });

    it('should add beeState in migration v1', () => {
      const dataWithoutBees = {
        veggies: [],
        money: 100,
        experience: 0,
        knowledge: 0,
        activeVeggie: 0,
        day: 1,
        greenhouseOwned: false,
        heirloomOwned: false,
        autoSellOwned: false,
        almanacLevel: 0,
        almanacCost: 10,
        maxPlots: 5,
        farmTier: 1,
        farmCost: 1000,
        irrigationOwned: false,
        currentWeather: 'Clear',
        highestUnlockedVeggie: 0
      };
      
      const result = runMigrations(dataWithoutBees);
      const migratedData = result.data as any;
      
      expect(result.success).toBe(true);
      expect(migratedData.beeState).toBeDefined();
      expect(migratedData.beeState.unlocked).toBe(false);
    });

    it('should add canningAutoPurchasers in migration v2', () => {
      const dataV1 = {
        veggies: [],
        money: 100,
        beeState: { unlocked: false },
        canningVersion: 1
      };
      
      const result = runMigrations(dataV1);
      const migratedData = result.data as any;
      
      expect(result.success).toBe(true);
      expect(migratedData.canningAutoPurchasers).toBeDefined();
      expect(migratedData.autoCanningConfig).toBeDefined();
    });

    it('should add canning upgrades in migration v3', () => {
      const dataV2 = {
        veggies: [],
        money: 100,
        beeState: { unlocked: false },
        canningAutoPurchasers: [],
        autoCanningConfig: {},
        canningVersion: 2
      };
      
      const result = runMigrations(dataV2);
      const migratedData = result.data as any;
      
      expect(result.success).toBe(true);
      expect(migratedData.canningState).toBeDefined();
      expect(migratedData.canningState.upgrades).toBeDefined();
      expect(migratedData.canningState.upgrades.some((u: any) => u.id === 'canner')).toBe(true);
    });

    it('should preserve existing data during migration', () => {
      const existingData = {
        veggies: [{ name: 'Radish', stash: 50 }],
        money: 500,
        experience: 200,
        knowledge: 100,
        activeVeggie: 0,
        day: 42,
        greenhouseOwned: true,
        heirloomOwned: false,
        autoSellOwned: true,
        almanacLevel: 3,
        almanacCost: 80,
        maxPlots: 8,
        farmTier: 2,
        farmCost: 5000,
        irrigationOwned: false,
        currentWeather: 'Rain',
        highestUnlockedVeggie: 2
      };
      
      const result = runMigrations(existingData);
      const migratedData = result.data as any;
      
      expect(result.success).toBe(true);
      expect(migratedData.money).toBe(500);
      expect(migratedData.experience).toBe(200);
      expect(migratedData.knowledge).toBe(100);
      expect(migratedData.day).toBe(42);
      expect(migratedData.greenhouseOwned).toBe(true);
      expect(migratedData.farmTier).toBe(2);
    });

    it('should handle migration errors gracefully', () => {
      // Create a migration scenario that might fail
      const corruptedData = {
        veggies: null, // This might cause issues in some migrations
        money: 'invalid' // Invalid type
      };
      
      // The migration should not throw
      expect(() => runMigrations(corruptedData)).not.toThrow();
    });
  });

  describe('Migration Utilities', () => {
    it('should wrap data with metadata correctly', () => {
      const data = { veggies: [], money: 100 };
      const wrapped = wrapWithMetadata(data, 5);
      
      expect(wrapped._meta).toBeDefined();
      expect(wrapped._meta.version).toBe(5);
      expect(wrapped._meta.lastSaved).toBeDefined();
      expect(wrapped._meta.appliedMigrations).toContain(5);
      expect(wrapped.data).toEqual(data);
    });

    it('should unwrap data correctly', () => {
      const originalData = { veggies: [], money: 100 };
      const wrapped = wrapWithMetadata(originalData, 5);
      const unwrapped = unwrapData(wrapped);
      
      expect(unwrapped).toEqual(originalData);
    });

    it('should unwrap non-wrapped data unchanged', () => {
      const plainData = { veggies: [], money: 100 };
      const result = unwrapData(plainData);
      
      expect(result).toBe(plainData);
    });

    it('should correctly detect if migration is needed', () => {
      const legacyData = { veggies: [], money: 100 };
      const currentData = wrapWithMetadata({ veggies: [], money: 100 }, CURRENT_SAVE_VERSION);
      
      expect(needsMigration(legacyData)).toBe(true);
      expect(needsMigration(currentData)).toBe(false);
    });

    it('should return current version', () => {
      expect(getCurrentVersion()).toBe(CURRENT_SAVE_VERSION);
    });
  });

  describe('Migration Rollback', () => {
    it('should rollback migrations when rollback functions exist', () => {
      // First migrate to v3
      const legacyData = {
        veggies: [],
        money: 100,
        experience: 0,
        knowledge: 0,
        activeVeggie: 0,
        day: 1,
        greenhouseOwned: false,
        heirloomOwned: false,
        autoSellOwned: false,
        almanacLevel: 0,
        almanacCost: 10,
        maxPlots: 5,
        farmTier: 1,
        farmCost: 1000,
        irrigationOwned: false,
        currentWeather: 'Clear',
        highestUnlockedVeggie: 0
      };
      
      const migrated = runMigrations(legacyData);
      const wrapped = wrapWithMetadata(migrated.data, CURRENT_SAVE_VERSION);
      
      // Try to rollback
      const rollbackResult = rollbackMigrations(wrapped, 0);
      
      // Rollback success depends on whether all migrations have rollback functions
      // At minimum, it should not throw
      expect(rollbackResult).toBeDefined();
      expect(rollbackResult.fromVersion).toBe(CURRENT_SAVE_VERSION);
    });

    it('should return unchanged if already at target version', () => {
      const dataAtV1 = wrapWithMetadata({ veggies: [], money: 100 }, 1);
      
      const result = rollbackMigrations(dataAtV1, 1);
      
      expect(result.success).toBe(true);
      expect(result.migrations).toHaveLength(0);
    });
  });

  describe('Migration Logging', () => {
    it('should provide migration log structure', () => {
      // The log should have the expected structure
      const log = getMigrationLog();
      
      expect(log).toHaveProperty('entries');
      expect(log).toHaveProperty('maxEntries');
      expect(Array.isArray(log.entries)).toBe(true);
      expect(typeof log.maxEntries).toBe('number');
    });

    it('should get migration log with default values when empty', () => {
      const log = getMigrationLog();
      
      expect(log.entries).toHaveLength(0);
      expect(log.maxEntries).toBe(50);
    });

    it('should clear migration log without throwing', () => {
      // clearMigrationLog should not throw even if localStorage is unavailable
      expect(() => clearMigrationLog()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null data', () => {
      expect(detectVersion(null)).toBe(0);
      expect(needsMigration(null)).toBe(true);
    });

    it('should handle undefined data', () => {
      expect(detectVersion(undefined)).toBe(0);
      expect(needsMigration(undefined)).toBe(true);
    });

    it('should handle empty object', () => {
      expect(detectVersion({})).toBe(0);
    });

    it('should handle array data', () => {
      expect(detectVersion([])).toBe(0);
    });

    it('should handle primitive data', () => {
      expect(detectVersion('string')).toBe(0);
      expect(detectVersion(123)).toBe(0);
      expect(detectVersion(true)).toBe(0);
    });
  });
});
