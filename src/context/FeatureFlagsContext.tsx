/**
 * Feature Flags Context
 * 
 * React context for feature flags with automatic re-rendering on flag changes.
 * 
 * Usage:
 *   const { isEnabled, setFlag } = useFeatureFlags();
 *   if (isEnabled('newFeature')) { ... }
 */

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { 
  featureFlags, 
  type FeatureFlagKey, 
  type FeatureFlagDefinition,
  FEATURE_FLAG_DEFINITIONS 
} from '../utils/featureFlags';

interface FeatureFlagsContextType {
  /** Check if a feature flag is enabled */
  isEnabled: (flag: FeatureFlagKey) => boolean;
  /** Set a feature flag value */
  setFlag: (flag: FeatureFlagKey, enabled: boolean) => void;
  /** Toggle a feature flag */
  toggleFlag: (flag: FeatureFlagKey) => boolean;
  /** Reset a flag to its default */
  resetFlag: (flag: FeatureFlagKey) => void;
  /** Reset all flags to defaults */
  resetAllFlags: () => void;
  /** Get all flags */
  getAllFlags: () => Record<FeatureFlagKey, boolean>;
  /** Get user-configurable flags */
  getUserConfigurableFlags: () => Array<{
    key: FeatureFlagKey;
    enabled: boolean;
    definition: FeatureFlagDefinition;
  }>;
  /** Get flags by category */
  getFlagsByCategory: (category: 'event' | 'feature' | 'debug' | 'experimental') => Array<{
    key: FeatureFlagKey;
    enabled: boolean;
    definition: FeatureFlagDefinition;
  }>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | null>(null);

/**
 * Hook to access feature flags
 */
export function useFeatureFlags(): FeatureFlagsContextType {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  }
  return context;
}

/**
 * Hook to check a single feature flag (optimized for single flag checks)
 */
export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(flag);
}

interface FeatureFlagsProviderProps {
  children: ReactNode;
}

/**
 * Provider component for feature flags
 */
export function FeatureFlagsProvider({ children }: FeatureFlagsProviderProps) {
  // Force re-render when flags change
  const [, setUpdateCounter] = useState(0);

  useEffect(() => {
    // Subscribe to flag changes
    const unsubscribe = featureFlags.subscribe(() => {
      setUpdateCounter((c) => c + 1);
    });
    return unsubscribe;
  }, []);

  const isEnabled = useCallback((flag: FeatureFlagKey) => {
    return featureFlags.isEnabled(flag);
  }, []);

  const setFlag = useCallback((flag: FeatureFlagKey, enabled: boolean) => {
    featureFlags.setFlag(flag, enabled);
  }, []);

  const toggleFlag = useCallback((flag: FeatureFlagKey) => {
    return featureFlags.toggleFlag(flag);
  }, []);

  const resetFlag = useCallback((flag: FeatureFlagKey) => {
    featureFlags.resetFlag(flag);
  }, []);

  const resetAllFlags = useCallback(() => {
    featureFlags.resetAllFlags();
  }, []);

  const getAllFlags = useCallback(() => {
    return featureFlags.getAllFlags();
  }, []);

  const getUserConfigurableFlags = useCallback(() => {
    return featureFlags.getUserConfigurableFlags();
  }, []);

  const getFlagsByCategory = useCallback((category: 'event' | 'feature' | 'debug' | 'experimental') => {
    return featureFlags.getFlagsByCategory(category);
  }, []);

  const value: FeatureFlagsContextType = {
    isEnabled,
    setFlag,
    toggleFlag,
    resetFlag,
    resetAllFlags,
    getAllFlags,
    getUserConfigurableFlags,
    getFlagsByCategory,
  };

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/**
 * Higher-order component to inject feature flag check
 */
export function withFeatureFlag<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  flag: FeatureFlagKey,
  fallback: React.ReactNode = null
): React.FC<P> {
  return function WithFeatureFlagComponent(props: P) {
    const { isEnabled } = useFeatureFlags();
    
    if (!isEnabled(flag)) {
      return <>{fallback}</>;
    }
    
    return <WrappedComponent {...props} />;
  };
}

/**
 * Component that only renders children if feature flag is enabled
 */
export function FeatureGate({ 
  flag, 
  children, 
  fallback = null 
}: { 
  flag: FeatureFlagKey; 
  children: ReactNode; 
  fallback?: ReactNode;
}): React.ReactElement {
  const { isEnabled } = useFeatureFlags();
  return <>{isEnabled(flag) ? children : fallback}</>;
}

// Export the definitions for use in UI
export { FEATURE_FLAG_DEFINITIONS };
export type { FeatureFlagKey, FeatureFlagDefinition };
