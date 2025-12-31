/**
 * Tests for Feature Flags Context
 * 
 * Tests the React context, hooks, and components for feature flags.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, renderHook } from '@testing-library/react';
import { 
  FeatureFlagsProvider, 
  useFeatureFlags, 
  useFeatureFlag, 
  FeatureGate,
  withFeatureFlag 
} from '../context/FeatureFlagsContext';
import { featureFlags, FEATURE_FLAG_DEFINITIONS } from '../utils/featureFlags';
import type { ReactNode } from 'react';

// Wrapper component for testing hooks
const wrapper = ({ children }: { children: ReactNode }) => (
  <FeatureFlagsProvider>{children}</FeatureFlagsProvider>
);

describe('FeatureFlagsContext', () => {
  // Save original localStorage state
  let originalStorage: Record<string, string> = {};
  
  beforeEach(() => {
    // Save current localStorage
    originalStorage = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        originalStorage[key] = localStorage.getItem(key) || '';
      }
    }
    // Clear localStorage for clean tests
    localStorage.clear();
    // Reset feature flags to defaults
    featureFlags.resetAllFlags();
  });
  
  afterEach(() => {
    // Restore original localStorage
    localStorage.clear();
    for (const [key, value] of Object.entries(originalStorage)) {
      localStorage.setItem(key, value);
    }
  });

  describe('FeatureFlagsProvider', () => {
    it('should render children', () => {
      render(
        <FeatureFlagsProvider>
          <div data-testid="child">Child content</div>
        </FeatureFlagsProvider>
      );
      
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should provide context to children', () => {
      const TestComponent = () => {
        const { isEnabled } = useFeatureFlags();
        return <div data-testid="result">{isEnabled('christmasEvent') ? 'enabled' : 'disabled'}</div>;
      };

      render(
        <FeatureFlagsProvider>
          <TestComponent />
        </FeatureFlagsProvider>
      );

      expect(screen.getByTestId('result')).toBeInTheDocument();
    });
  });

  describe('useFeatureFlags hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useFeatureFlags());
      }).toThrow('useFeatureFlags must be used within FeatureFlagsProvider');
      
      consoleSpy.mockRestore();
    });

    it('should return isEnabled function', () => {
      const { result } = renderHook(() => useFeatureFlags(), { wrapper });
      
      expect(typeof result.current.isEnabled).toBe('function');
    });

    it('should check flag enabled status', () => {
      const { result } = renderHook(() => useFeatureFlags(), { wrapper });
      
      const isChristmasEnabled = result.current.isEnabled('christmasEvent');
      expect(typeof isChristmasEnabled).toBe('boolean');
      expect(isChristmasEnabled).toBe(FEATURE_FLAG_DEFINITIONS.christmasEvent.defaultValue);
    });

    it('should set flag value', () => {
      const { result } = renderHook(() => useFeatureFlags(), { wrapper });
      
      act(() => {
        result.current.setFlag('debugMode', true);
      });
      
      expect(result.current.isEnabled('debugMode')).toBe(true);
    });

    it('should toggle flag value', () => {
      const { result } = renderHook(() => useFeatureFlags(), { wrapper });
      
      const initialValue = result.current.isEnabled('debugMode');
      
      act(() => {
        result.current.toggleFlag('debugMode');
      });
      
      expect(result.current.isEnabled('debugMode')).toBe(!initialValue);
    });

    it('should reset single flag to default', () => {
      const { result } = renderHook(() => useFeatureFlags(), { wrapper });
      
      // Change flag from default
      act(() => {
        result.current.setFlag('christmasEvent', false);
      });
      expect(result.current.isEnabled('christmasEvent')).toBe(false);
      
      // Reset it
      act(() => {
        result.current.resetFlag('christmasEvent');
      });
      expect(result.current.isEnabled('christmasEvent')).toBe(FEATURE_FLAG_DEFINITIONS.christmasEvent.defaultValue);
    });

    it('should reset all flags to defaults', () => {
      const { result } = renderHook(() => useFeatureFlags(), { wrapper });
      
      // Change multiple flags
      act(() => {
        result.current.setFlag('christmasEvent', false);
        result.current.setFlag('debugMode', true);
      });
      
      // Reset all
      act(() => {
        result.current.resetAllFlags();
      });
      
      expect(result.current.isEnabled('christmasEvent')).toBe(FEATURE_FLAG_DEFINITIONS.christmasEvent.defaultValue);
      expect(result.current.isEnabled('debugMode')).toBe(FEATURE_FLAG_DEFINITIONS.debugMode.defaultValue);
    });

    it('should get all flags', () => {
      const { result } = renderHook(() => useFeatureFlags(), { wrapper });
      
      const allFlags = result.current.getAllFlags();
      
      expect(typeof allFlags).toBe('object');
      expect(Object.keys(allFlags).length).toBe(Object.keys(FEATURE_FLAG_DEFINITIONS).length);
    });

    it('should get user configurable flags', () => {
      const { result } = renderHook(() => useFeatureFlags(), { wrapper });
      
      const userFlags = result.current.getUserConfigurableFlags();
      
      expect(Array.isArray(userFlags)).toBe(true);
      for (const flag of userFlags) {
        expect(flag.definition.userConfigurable).toBe(true);
      }
    });

    it('should get flags by category', () => {
      const { result } = renderHook(() => useFeatureFlags(), { wrapper });
      
      const eventFlags = result.current.getFlagsByCategory('event');
      
      expect(Array.isArray(eventFlags)).toBe(true);
      for (const flag of eventFlags) {
        expect(flag.definition.category).toBe('event');
      }
    });
  });

  describe('useFeatureFlag hook', () => {
    it('should return boolean for flag state', () => {
      const { result } = renderHook(() => useFeatureFlag('christmasEvent'), { wrapper });
      
      expect(typeof result.current).toBe('boolean');
    });

    it('should return default value for flag', () => {
      const { result } = renderHook(() => useFeatureFlag('christmasEvent'), { wrapper });
      
      expect(result.current).toBe(FEATURE_FLAG_DEFINITIONS.christmasEvent.defaultValue);
    });

    it('should update when flag changes', () => {
      const { result } = renderHook(() => useFeatureFlag('debugMode'), { wrapper });
      
      const initialValue = result.current;
      
      act(() => {
        featureFlags.setFlag('debugMode', !initialValue);
      });
      
      expect(result.current).toBe(!initialValue);
    });
  });

  describe('FeatureGate component', () => {
    it('should render children when flag is enabled', () => {
      // Ensure flag is enabled
      featureFlags.setFlag('christmasEvent', true);
      
      render(
        <FeatureFlagsProvider>
          <FeatureGate flag="christmasEvent">
            <div data-testid="gated-content">Protected content</div>
          </FeatureGate>
        </FeatureFlagsProvider>
      );
      
      expect(screen.getByTestId('gated-content')).toBeInTheDocument();
    });

    it('should not render children when flag is disabled', () => {
      // Ensure flag is disabled
      featureFlags.setFlag('christmasEvent', false);
      
      render(
        <FeatureFlagsProvider>
          <FeatureGate flag="christmasEvent">
            <div data-testid="gated-content">Protected content</div>
          </FeatureGate>
        </FeatureFlagsProvider>
      );
      
      expect(screen.queryByTestId('gated-content')).not.toBeInTheDocument();
    });

    it('should render fallback when flag is disabled', () => {
      featureFlags.setFlag('christmasEvent', false);
      
      render(
        <FeatureFlagsProvider>
          <FeatureGate 
            flag="christmasEvent" 
            fallback={<div data-testid="fallback">Fallback content</div>}
          >
            <div data-testid="gated-content">Protected content</div>
          </FeatureGate>
        </FeatureFlagsProvider>
      );
      
      expect(screen.queryByTestId('gated-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('fallback')).toBeInTheDocument();
    });

    it('should render null by default when flag is disabled and no fallback', () => {
      featureFlags.setFlag('debugMode', false);
      
      const { container } = render(
        <FeatureFlagsProvider>
          <FeatureGate flag="debugMode">
            <div data-testid="gated-content">Protected content</div>
          </FeatureGate>
        </FeatureFlagsProvider>
      );
      
      expect(screen.queryByTestId('gated-content')).not.toBeInTheDocument();
      // Container should only have the provider wrapper, no content
      expect(container.textContent).toBe('');
    });
  });

  describe('withFeatureFlag HOC', () => {
    it('should render wrapped component when flag is enabled', () => {
      featureFlags.setFlag('christmasEvent', true);
      
      const TestComponent = () => <div data-testid="wrapped">Wrapped content</div>;
      const WrappedComponent = withFeatureFlag(TestComponent, 'christmasEvent');
      
      render(
        <FeatureFlagsProvider>
          <WrappedComponent />
        </FeatureFlagsProvider>
      );
      
      expect(screen.getByTestId('wrapped')).toBeInTheDocument();
    });

    it('should not render wrapped component when flag is disabled', () => {
      featureFlags.setFlag('christmasEvent', false);
      
      const TestComponent = () => <div data-testid="wrapped">Wrapped content</div>;
      const WrappedComponent = withFeatureFlag(TestComponent, 'christmasEvent');
      
      render(
        <FeatureFlagsProvider>
          <WrappedComponent />
        </FeatureFlagsProvider>
      );
      
      expect(screen.queryByTestId('wrapped')).not.toBeInTheDocument();
    });

    it('should render fallback when flag is disabled', () => {
      featureFlags.setFlag('christmasEvent', false);
      
      const TestComponent = () => <div data-testid="wrapped">Wrapped content</div>;
      const WrappedComponent = withFeatureFlag(
        TestComponent, 
        'christmasEvent',
        <div data-testid="hoc-fallback">HOC Fallback</div>
      );
      
      render(
        <FeatureFlagsProvider>
          <WrappedComponent />
        </FeatureFlagsProvider>
      );
      
      expect(screen.queryByTestId('wrapped')).not.toBeInTheDocument();
      expect(screen.getByTestId('hoc-fallback')).toBeInTheDocument();
    });

    it('should pass props to wrapped component', () => {
      featureFlags.setFlag('christmasEvent', true);
      
      interface TestProps {
        message: string;
      }
      const TestComponent = ({ message }: TestProps) => (
        <div data-testid="wrapped">{message}</div>
      );
      const WrappedComponent = withFeatureFlag(TestComponent, 'christmasEvent');
      
      render(
        <FeatureFlagsProvider>
          <WrappedComponent message="Hello World" />
        </FeatureFlagsProvider>
      );
      
      expect(screen.getByTestId('wrapped')).toHaveTextContent('Hello World');
    });
  });

  describe('Context re-rendering', () => {
    it('should re-render components when flags change', () => {
      const renderSpy = vi.fn();
      
      const TestComponent = () => {
        const { isEnabled } = useFeatureFlags();
        renderSpy();
        return <div data-testid="result">{isEnabled('debugMode') ? 'enabled' : 'disabled'}</div>;
      };

      render(
        <FeatureFlagsProvider>
          <TestComponent />
        </FeatureFlagsProvider>
      );

      const initialRenderCount = renderSpy.mock.calls.length;
      
      // Change flag
      act(() => {
        featureFlags.setFlag('debugMode', true);
      });
      
      // Should have re-rendered
      expect(renderSpy.mock.calls.length).toBeGreaterThan(initialRenderCount);
      expect(screen.getByTestId('result')).toHaveTextContent('enabled');
    });
  });
});
