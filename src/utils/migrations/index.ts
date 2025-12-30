/**
 * Migration System
 * 
 * A version-based migration framework for save data.
 * 
 * Features:
 * - Version-based migrations with automatic detection
 * - Rollback support for migrations that define a rollback function
 * - Detailed logging for debugging and user transparency
 * - Snapshot support for data recovery
 * - Progress callbacks for UI integration
 * 
 * Usage:
 * ```typescript
 * import { runMigrations, needsMigration, getCurrentVersion } from './migrations';
 * 
 * // Check if migration is needed
 * if (needsMigration(loadedData)) {
 *   const result = runMigrations(loadedData, { verbose: true });
 *   if (result.success) {
 *     saveData(result.data);
 *   }
 * }
 * ```
 */

// Types
export type {
  MigrationResult,
  MigrationRunResult,
  MigrationConfig,
  MigrationLog,
  MigrationLogEntry,
  SaveMetadata,
  VersionedSaveData,
  MigrationDefinition,
  MigrationFunction,
  DeepPartial
} from './types';

export { hasVersionMetadata, isLegacySaveData } from './types';

// Registry
export {
  CURRENT_SAVE_VERSION,
  MIGRATIONS,
  getMigrationsToRun,
  getMigrationsToRollback,
  hasMigration,
  getMigration
} from './registry';

// Runner
export {
  detectVersion,
  wrapWithMetadata,
  unwrapData,
  updateMetadata,
  runMigrations,
  rollbackMigrations,
  getMigrationLog,
  logMigration,
  clearMigrationLog,
  getMigrationSummary,
  needsMigration,
  getCurrentVersion
} from './runner';
