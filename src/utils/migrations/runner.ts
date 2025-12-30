/**
 * Migration Runner
 * 
 * Core migration execution engine with rollback support and detailed logging.
 * Handles version detection, migration execution, and error recovery.
 */

import type {
  MigrationResult,
  MigrationRunResult,
  MigrationConfig,
  MigrationLog,
  MigrationLogEntry,
  VersionedSaveData
} from './types';
import { hasVersionMetadata, isLegacySaveData } from './types';
import { MIGRATIONS, CURRENT_SAVE_VERSION, getMigrationsToRun, getMigrationsToRollback } from './registry';
import type { MigrationDefinition } from './types';

/** LocalStorage key for migration log */
const MIGRATION_LOG_KEY = 'farmIdleMigrationLog';

/** Maximum entries to keep in migration log */
const MAX_LOG_ENTRIES = 50;

/**
 * Default migration configuration
 */
const DEFAULT_CONFIG: MigrationConfig = {
  verbose: false,
  enableSnapshots: true,
  maxMigrations: 100,
  onProgress: undefined,
  onWarning: undefined
};

/**
 * Detects the version of save data
 * Returns 0 for legacy data without version metadata
 */
export function detectVersion(data: unknown): number {
  if (hasVersionMetadata(data)) {
    return data._meta.version;
  }
  
  // Check for _saveVersion (used by saveSystem)
  if (typeof data === 'object' && data !== null && '_saveVersion' in data) {
    const saveVersion = (data as Record<string, unknown>)._saveVersion;
    if (typeof saveVersion === 'number') {
      return saveVersion;
    }
  }
  
  // Legacy format detection
  if (isLegacySaveData(data)) {
    const legacy = data as Record<string, unknown>;
    
    // Check for version indicators in legacy format
    if ('canningVersion' in legacy && typeof legacy.canningVersion === 'number') {
      // Old canning version system - map to new versions
      // canningVersion 3 roughly maps to version 3
      return Math.min(legacy.canningVersion as number, 3);
    }
    
    // Check for presence of specific features to estimate version
    if ('beeState' in legacy) return 1;
    if ('canningAutoPurchasers' in legacy) return 2;
    if ('canningState' in legacy) {
      const canningState = legacy.canningState as Record<string, unknown>;
      if (canningState.upgrades && Array.isArray(canningState.upgrades)) {
        const hasCannerUpgrade = (canningState.upgrades as Array<{id: string}>).some(u => u.id === 'canner');
        if (hasCannerUpgrade) return 3;
      }
    }
    
    return 0; // Completely legacy format
  }
  
  return 0;
}

/**
 * Wraps data in versioned format with metadata
 */
export function wrapWithMetadata<T>(data: T, version: number): VersionedSaveData<T> {
  return {
    data,
    _meta: {
      version,
      lastSaved: new Date().toISOString(),
      lastMigrated: new Date().toISOString(),
      appliedMigrations: MIGRATIONS.filter(m => m.version <= version).map(m => m.version),
      gameVersion: '0.9.0' // TODO: Import from package.json
    }
  };
}

/**
 * Unwraps versioned data to get the actual game state
 */
export function unwrapData<T>(data: VersionedSaveData<T> | T): T {
  if (hasVersionMetadata(data)) {
    return data.data as T;
  }
  return data as T;
}

/**
 * Updates metadata after saving
 */
export function updateMetadata(versionedData: VersionedSaveData): VersionedSaveData {
  return {
    ...versionedData,
    _meta: {
      ...versionedData._meta,
      lastSaved: new Date().toISOString()
    }
  };
}

/**
 * Runs a single migration with timing and error handling
 */
function runSingleMigration(
  migration: MigrationDefinition,
  data: unknown,
  config: MigrationConfig
): MigrationResult {
  const startTime = performance.now();
  const warnings: string[] = [];
  let snapshot: string | undefined;
  
  // Create snapshot if enabled
  if (config.enableSnapshots) {
    try {
      snapshot = JSON.stringify(data);
    } catch {
      warnings.push('Failed to create snapshot - data may not be serializable');
    }
  }
  
  try {
    if (config.verbose) {
      console.log(`🔄 Running migration v${migration.version}: ${migration.description}`);
    }
    
    migration.migrate(data);
    const duration = performance.now() - startTime;
    
    if (config.verbose) {
      console.log(`✅ Migration v${migration.version} completed in ${duration.toFixed(2)}ms`);
    }
    
    return {
      success: true,
      version: migration.version,
      description: migration.description,
      warnings,
      duration,
      snapshot
    };
  } catch (error) {
    const duration = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (config.verbose) {
      console.error(`❌ Migration v${migration.version} failed: ${errorMessage}`);
    }
    
    return {
      success: false,
      version: migration.version,
      description: migration.description,
      warnings,
      error: errorMessage,
      duration,
      snapshot
    };
  }
}

/**
 * Runs all needed migrations to bring data to current version
 */
export function runMigrations(
  data: unknown,
  config: Partial<MigrationConfig> = {}
): MigrationRunResult {
  const fullConfig: MigrationConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = performance.now();
  const results: MigrationResult[] = [];
  
  // Detect current version
  const fromVersion = detectVersion(data);
  const toVersion = CURRENT_SAVE_VERSION;
  
  if (fromVersion >= toVersion) {
    // Already up to date
    return {
      success: true,
      fromVersion,
      toVersion: fromVersion,
      migrations: [],
      totalDuration: 0,
      data
    };
  }
  
  // Get migrations to run
  const migrationsToRun = getMigrationsToRun(fromVersion, toVersion);
  
  if (migrationsToRun.length === 0) {
    return {
      success: true,
      fromVersion,
      toVersion: fromVersion,
      migrations: [],
      totalDuration: 0,
      data
    };
  }
  
  // Limit number of migrations
  const limitedMigrations = migrationsToRun.slice(0, fullConfig.maxMigrations);
  
  if (fullConfig.verbose) {
    console.log(`📦 Starting migration from v${fromVersion} to v${toVersion}`);
    console.log(`   Running ${limitedMigrations.length} migration(s)`);
  }
  
  // Extract raw data if wrapped
  let currentData = hasVersionMetadata(data) ? (data as VersionedSaveData).data : data;
  let lastSuccessfulVersion = fromVersion;
  
  // Run each migration in sequence
  for (const migration of limitedMigrations) {
    const result = runSingleMigration(migration, currentData, fullConfig);
    results.push(result);
    
    // Report progress
    if (fullConfig.onProgress) {
      fullConfig.onProgress(result);
    }
    
    // Report warnings
    if (fullConfig.onWarning && result.warnings.length > 0) {
      result.warnings.forEach(w => fullConfig.onWarning?.(w, migration.version));
    }
    
    if (!result.success) {
      // Migration failed - return with partial progress
      const totalDuration = performance.now() - startTime;
      
      // Log the failure
      logMigration({
        timestamp: new Date().toISOString(),
        fromVersion,
        toVersion: lastSuccessfulVersion,
        success: false,
        description: `Failed at v${migration.version}: ${result.error}`,
        duration: totalDuration
      });
      
      return {
        success: false,
        fromVersion,
        toVersion: lastSuccessfulVersion,
        migrations: results,
        totalDuration,
        data: currentData
      };
    }
    
    // Update current data with migration result
    currentData = migration.migrate(currentData);
    lastSuccessfulVersion = migration.version;
  }
  
  const totalDuration = performance.now() - startTime;
  
  // Log successful migration
  logMigration({
    timestamp: new Date().toISOString(),
    fromVersion,
    toVersion: lastSuccessfulVersion,
    success: true,
    description: `Migrated through ${results.length} version(s)`,
    duration: totalDuration
  });
  
  if (fullConfig.verbose) {
    console.log(`✅ Migration complete: v${fromVersion} → v${lastSuccessfulVersion} in ${totalDuration.toFixed(2)}ms`);
  }
  
  return {
    success: true,
    fromVersion,
    toVersion: lastSuccessfulVersion,
    migrations: results,
    totalDuration,
    data: currentData
  };
}

/**
 * Attempts to rollback migrations
 */
export function rollbackMigrations(
  data: unknown,
  targetVersion: number,
  config: Partial<MigrationConfig> = {}
): MigrationRunResult {
  const fullConfig: MigrationConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = performance.now();
  const results: MigrationResult[] = [];
  
  const currentVersion = detectVersion(data);
  
  if (currentVersion <= targetVersion) {
    // Already at or below target version
    return {
      success: true,
      fromVersion: currentVersion,
      toVersion: currentVersion,
      migrations: [],
      totalDuration: 0,
      data
    };
  }
  
  const migrationsToRollback = getMigrationsToRollback(currentVersion, targetVersion);
  
  if (fullConfig.verbose) {
    console.log(`⏪ Starting rollback from v${currentVersion} to v${targetVersion}`);
    console.log(`   Rolling back ${migrationsToRollback.length} migration(s)`);
  }
  
  let currentData = hasVersionMetadata(data) ? (data as VersionedSaveData).data : data;
  let lastSuccessfulVersion = currentVersion;
  
  for (const migration of migrationsToRollback) {
    if (!migration.rollback) {
      // No rollback function available
      const result: MigrationResult = {
        success: false,
        version: migration.version,
        description: migration.description,
        warnings: [],
        error: 'No rollback function defined for this migration',
        duration: 0
      };
      results.push(result);
      
      return {
        success: false,
        fromVersion: currentVersion,
        toVersion: lastSuccessfulVersion,
        migrations: results,
        totalDuration: performance.now() - startTime,
        data: currentData
      };
    }
    
    try {
      currentData = migration.rollback(currentData);
      lastSuccessfulVersion = migration.version - 1;
      
      results.push({
        success: true,
        version: migration.version,
        description: `Rolled back: ${migration.description}`,
        warnings: [],
        duration: 0
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        success: false,
        version: migration.version,
        description: migration.description,
        warnings: [],
        error: errorMessage,
        duration: 0
      });
      
      return {
        success: false,
        fromVersion: currentVersion,
        toVersion: lastSuccessfulVersion,
        migrations: results,
        totalDuration: performance.now() - startTime,
        data: currentData
      };
    }
  }
  
  const totalDuration = performance.now() - startTime;
  
  // Log rollback
  logMigration({
    timestamp: new Date().toISOString(),
    fromVersion: currentVersion,
    toVersion: lastSuccessfulVersion,
    success: true,
    description: `Rolled back ${results.length} version(s)`,
    duration: totalDuration
  });
  
  return {
    success: true,
    fromVersion: currentVersion,
    toVersion: lastSuccessfulVersion,
    migrations: results,
    totalDuration,
    data: currentData
  };
}

/**
 * Gets the migration log from localStorage
 */
export function getMigrationLog(): MigrationLog {
  try {
    const raw = localStorage.getItem(MIGRATION_LOG_KEY);
    if (!raw) {
      return { entries: [], maxEntries: MAX_LOG_ENTRIES };
    }
    return JSON.parse(raw) as MigrationLog;
  } catch {
    return { entries: [], maxEntries: MAX_LOG_ENTRIES };
  }
}

/**
 * Logs a migration to persistent storage
 */
export function logMigration(entry: MigrationLogEntry): void {
  try {
    const log = getMigrationLog();
    log.entries.push(entry);
    
    // Trim old entries
    while (log.entries.length > log.maxEntries) {
      log.entries.shift();
    }
    
    localStorage.setItem(MIGRATION_LOG_KEY, JSON.stringify(log));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Clears the migration log
 */
export function clearMigrationLog(): void {
  try {
    localStorage.removeItem(MIGRATION_LOG_KEY);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Gets a human-readable summary of migration history
 */
export function getMigrationSummary(): string {
  const log = getMigrationLog();
  
  if (log.entries.length === 0) {
    return 'No migrations have been run.';
  }
  
  const successful = log.entries.filter(e => e.success).length;
  const failed = log.entries.filter(e => !e.success).length;
  const lastEntry = log.entries[log.entries.length - 1];
  
  return [
    `Migration History:`,
    `  Total migrations: ${log.entries.length}`,
    `  Successful: ${successful}`,
    `  Failed: ${failed}`,
    `  Last migration: ${lastEntry.timestamp}`,
    `  Current version: v${lastEntry.toVersion}`
  ].join('\n');
}

/**
 * Checks if data needs migration
 */
export function needsMigration(data: unknown): boolean {
  const version = detectVersion(data);
  return version < CURRENT_SAVE_VERSION;
}

/**
 * Gets the current save version constant
 */
export function getCurrentVersion(): number {
  return CURRENT_SAVE_VERSION;
}
