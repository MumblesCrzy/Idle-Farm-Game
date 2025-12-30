/**
 * Migration System Types
 * 
 * This module defines the type system for the save data migration framework.
 * It supports versioned migrations with rollback capability and detailed logging.
 */

/**
 * Result of a single migration operation
 */
export interface MigrationResult {
  /** Whether the migration succeeded */
  success: boolean;
  /** The version this migration updates to */
  version: number;
  /** Human-readable description of what was migrated */
  description: string;
  /** Any warnings generated during migration */
  warnings: string[];
  /** Error message if migration failed */
  error?: string;
  /** Time taken to run migration in milliseconds */
  duration: number;
  /** Snapshot of data before migration (for rollback) */
  snapshot?: string;
}

/**
 * Aggregate result of running all migrations
 */
export interface MigrationRunResult {
  /** Whether all migrations succeeded */
  success: boolean;
  /** Starting version before migrations */
  fromVersion: number;
  /** Final version after migrations */
  toVersion: number;
  /** Individual results for each migration run */
  migrations: MigrationResult[];
  /** Total time for all migrations in milliseconds */
  totalDuration: number;
  /** The migrated data (or original if failed) */
  data: unknown;
}

/**
 * A single migration function
 * @param data - The data to migrate (from previous version)
 * @returns The migrated data (or throws on failure)
 */
export type MigrationFunction<T = unknown> = (data: T) => T;

/**
 * Definition of a single migration
 */
export interface MigrationDefinition {
  /** Version number this migration upgrades TO */
  version: number;
  /** Human-readable description of the migration */
  description: string;
  /** The migration function */
  migrate: MigrationFunction;
  /** Optional rollback function (reverses the migration) */
  rollback?: MigrationFunction;
  /** Whether this migration is considered breaking (requires user confirmation) */
  breaking?: boolean;
}

/**
 * Configuration for the migration runner
 */
export interface MigrationConfig {
  /** Enable detailed logging */
  verbose?: boolean;
  /** Create snapshots before each migration for rollback */
  enableSnapshots?: boolean;
  /** Maximum number of migrations to run in one pass */
  maxMigrations?: number;
  /** Callback for migration progress */
  onProgress?: (result: MigrationResult) => void;
  /** Callback for migration warnings */
  onWarning?: (warning: string, version: number) => void;
}

/**
 * Metadata stored with save data for migration tracking
 */
export interface SaveMetadata {
  /** Current save data version */
  version: number;
  /** ISO timestamp of last save */
  lastSaved: string;
  /** ISO timestamp of last migration */
  lastMigrated?: string;
  /** Array of applied migration versions */
  appliedMigrations: number[];
  /** Game version that created this save */
  gameVersion?: string;
}

/**
 * Extended game state with migration metadata
 */
export interface VersionedSaveData<T = unknown> {
  /** The actual game state data */
  data: T;
  /** Migration metadata */
  _meta: SaveMetadata;
}

/**
 * Log entry for migration history
 */
export interface MigrationLogEntry {
  /** ISO timestamp of migration */
  timestamp: string;
  /** Version before migration */
  fromVersion: number;
  /** Version after migration */
  toVersion: number;
  /** Whether migration succeeded */
  success: boolean;
  /** Description of what was migrated */
  description: string;
  /** Any error message */
  error?: string;
  /** Duration in milliseconds */
  duration: number;
}

/**
 * Persistent migration log stored in localStorage
 */
export interface MigrationLog {
  /** Array of migration log entries */
  entries: MigrationLogEntry[];
  /** Maximum entries to keep */
  maxEntries: number;
}

/**
 * Helper type for partial state updates during migration
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Type guard to check if data has version metadata
 */
export function hasVersionMetadata(data: unknown): data is VersionedSaveData {
  return (
    typeof data === 'object' &&
    data !== null &&
    '_meta' in data &&
    typeof (data as VersionedSaveData)._meta === 'object' &&
    typeof (data as VersionedSaveData)._meta.version === 'number'
  );
}

/**
 * Type guard to check if data is a valid ExtendedGameState (legacy format)
 */
export function isLegacySaveData(data: unknown): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    'veggies' in data &&
    'money' in data &&
    !('_meta' in data)
  );
}
