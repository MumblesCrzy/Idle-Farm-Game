/**
 * Feature Flags System
 * 
 * A localStorage-based feature flag system for:
 * - A/B testing
 * - Gradual rollouts
 * - Emergency kill switches
 * - Seasonal event toggles
 * - Development features
 * 
 * Usage:
 *   import { featureFlags } from './utils/featureFlags';
 *   if (featureFlags.isEnabled('newFeature')) { ... }
 */

// Define all available feature flags with their defaults and metadata
export interface FeatureFlagDefinition {
  /** Human-readable name */
  name: string;
  /** Default value when flag is not explicitly set */
  defaultValue: boolean;
  /** Human-readable description */
  description: string;
  /** Category for organization */
  category: 'event' | 'feature' | 'debug' | 'experimental';
  /** Whether this flag can be changed by users (vs admin-only) */
  userConfigurable: boolean;
  /** Whether this flag is only for development */
  devOnly?: boolean;
}

// All available feature flags
export const FEATURE_FLAG_DEFINITIONS: Record<string, FeatureFlagDefinition> = {
  // Events
  christmasEvent: {
    name: 'Christmas Event',
    defaultValue: true,
    description: 'Enable Christmas Tree Shop event (Nov 1 - Dec 25)',
    category: 'event',
    userConfigurable: false,
  },
  
  // Features
  beeSystem: {
    name: 'Bee System',
    defaultValue: true,
    description: 'Enable the bee/apiary system',
    category: 'feature',
    userConfigurable: false,
  },
  canningSystem: {
    name: 'Canning System',
    defaultValue: true,
    description: 'Enable the canning/preserving system',
    category: 'feature',
    userConfigurable: false,
  },
  achievementSystem: {
    name: 'Achievements',
    defaultValue: true,
    description: 'Enable achievements and notifications',
    category: 'feature',
    userConfigurable: true,
  },
  eventLog: {
    name: 'Event Log',
    defaultValue: true,
    description: 'Enable event log tracking',
    category: 'feature',
    userConfigurable: true,
  },
  archieCharacter: {
    name: 'Archie Character',
    defaultValue: true,
    description: 'Enable Archie the dog bonus character',
    category: 'feature',
    userConfigurable: true,
  },
  
  // Debug/Development
  debugMode: {
    name: 'Debug Mode',
    defaultValue: false,
    description: 'Show debug information and dev tools',
    category: 'debug',
    userConfigurable: false,
    devOnly: true,
  },
  enableDevTools: {
    name: 'Dev Tools',
    defaultValue: false,
    description: 'Enable developer tools and feature flags panel',
    category: 'debug',
    userConfigurable: false,
    devOnly: true,
  },
  showDevPanel: {
    name: 'Dev Panel',
    defaultValue: true,
    description: 'Show the floating dev panel button',
    category: 'debug',
    userConfigurable: true,
    devOnly: true,
  },
  performanceMonitoring: {
    name: 'Performance Monitoring',
    defaultValue: false,
    description: 'Enable performance monitoring and logging',
    category: 'debug',
    userConfigurable: false,
    devOnly: true,
  },
  verboseLogging: {
    name: 'Verbose Logging',
    defaultValue: false,
    description: 'Enable verbose console logging',
    category: 'debug',
    userConfigurable: false,
    devOnly: true,
  },
  
  // Experimental
  newUILayout: {
    name: 'New UI Layout',
    defaultValue: false,
    description: 'Test new UI layout (experimental)',
    category: 'experimental',
    userConfigurable: false,
  },
  offlineProgressV2: {
    name: 'Offline Progress V2',
    defaultValue: false,
    description: 'Use improved offline progress calculation',
    category: 'experimental',
    userConfigurable: false,
  },
  autoSaveInterval: {
    name: 'Auto Save',
    defaultValue: true,
    description: 'Enable automatic saving every 30 seconds',
    category: 'feature',
    userConfigurable: true,
  },
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAG_DEFINITIONS;

const STORAGE_KEY = 'farm_idle_feature_flags';

/**
 * Feature Flags Manager
 * Handles reading, writing, and checking feature flags
 */
class FeatureFlagsManager {
  private flags: Map<string, boolean> = new Map();
  private listeners: Set<(flags: Map<string, boolean>) => void> = new Set();
  private initialized = false;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load flags from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed === 'object' && parsed !== null) {
          Object.entries(parsed).forEach(([key, value]) => {
            if (typeof value === 'boolean') {
              this.flags.set(key, value);
            }
          });
        }
      }
      this.initialized = true;
    } catch (error) {
      console.warn('FeatureFlags: Failed to load from localStorage', error);
      this.initialized = true;
    }
  }

  /**
   * Save flags to localStorage
   */
  private saveToStorage(): void {
    try {
      const obj: Record<string, boolean> = {};
      this.flags.forEach((value, key) => {
        obj[key] = value;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (error) {
      console.warn('FeatureFlags: Failed to save to localStorage', error);
    }
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flag: FeatureFlagKey): boolean {
    // If explicitly set, use that value
    if (this.flags.has(flag)) {
      return this.flags.get(flag)!;
    }
    
    // Otherwise use the default
    const definition = FEATURE_FLAG_DEFINITIONS[flag];
    return definition?.defaultValue ?? false;
  }

  /**
   * Set a feature flag value
   */
  setFlag(flag: FeatureFlagKey, enabled: boolean): void {
    this.flags.set(flag, enabled);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Toggle a feature flag
   */
  toggleFlag(flag: FeatureFlagKey): boolean {
    const newValue = !this.isEnabled(flag);
    this.setFlag(flag, newValue);
    return newValue;
  }

  /**
   * Reset a flag to its default value
   */
  resetFlag(flag: FeatureFlagKey): void {
    this.flags.delete(flag);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Reset all flags to defaults
   */
  resetAllFlags(): void {
    this.flags.clear();
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Get all flags with their current values
   */
  getAllFlags(): Record<FeatureFlagKey, boolean> {
    const result: Partial<Record<FeatureFlagKey, boolean>> = {};
    
    Object.keys(FEATURE_FLAG_DEFINITIONS).forEach((key) => {
      result[key as FeatureFlagKey] = this.isEnabled(key as FeatureFlagKey);
    });
    
    return result as Record<FeatureFlagKey, boolean>;
  }

  /**
   * Get flags by category
   */
  getFlagsByCategory(category: FeatureFlagDefinition['category']): Array<{
    key: FeatureFlagKey;
    enabled: boolean;
    definition: FeatureFlagDefinition;
  }> {
    return Object.entries(FEATURE_FLAG_DEFINITIONS)
      .filter(([, def]) => def.category === category)
      .map(([key, def]) => ({
        key: key as FeatureFlagKey,
        enabled: this.isEnabled(key as FeatureFlagKey),
        definition: def,
      }));
  }

  /**
   * Get user-configurable flags only
   */
  getUserConfigurableFlags(): Array<{
    key: FeatureFlagKey;
    enabled: boolean;
    definition: FeatureFlagDefinition;
  }> {
    return Object.entries(FEATURE_FLAG_DEFINITIONS)
      .filter(([, def]) => def.userConfigurable)
      .map(([key, def]) => ({
        key: key as FeatureFlagKey,
        enabled: this.isEnabled(key as FeatureFlagKey),
        definition: def,
      }));
  }

  /**
   * Subscribe to flag changes
   */
  subscribe(listener: (flags: Map<string, boolean>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      listener(new Map(this.flags));
    });
  }

  /**
   * Check if manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Set multiple flags at once (useful for bulk operations)
   */
  setMultipleFlags(flags: Partial<Record<FeatureFlagKey, boolean>>): void {
    Object.entries(flags).forEach(([key, value]) => {
      if (value !== undefined) {
        this.flags.set(key, value);
      }
    });
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Export flags as JSON string (for debugging/sharing)
   */
  exportFlags(): string {
    return JSON.stringify(this.getAllFlags(), null, 2);
  }

  /**
   * Import flags from JSON string
   */
  importFlags(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed === 'object' && parsed !== null) {
        Object.entries(parsed).forEach(([key, value]) => {
          if (key in FEATURE_FLAG_DEFINITIONS && typeof value === 'boolean') {
            this.flags.set(key, value);
          }
        });
        this.saveToStorage();
        this.notifyListeners();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagsManager();

// Expose to window for debugging in browser console
if (typeof window !== 'undefined') {
  (window as unknown as { featureFlags: FeatureFlagsManager }).featureFlags = featureFlags;
}
