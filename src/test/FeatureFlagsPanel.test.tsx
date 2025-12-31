/**
 * Tests for Feature Flags Panel Component
 * 
 * Tests the UI panel for toggling feature flags in development mode.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeatureFlagsProvider } from '../context/FeatureFlagsContext';
import FeatureFlagsPanel from '../components/FeatureFlagsPanel';
import { featureFlags, FEATURE_FLAG_DEFINITIONS } from '../utils/featureFlags';

// Mock import.meta.env.DEV
vi.mock('../components/FeatureFlagsPanel', async () => {
  const actual = await vi.importActual('../components/FeatureFlagsPanel');
  return actual;
});

describe('FeatureFlagsPanel', () => {
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
    // Enable dev tools so panel shows
    featureFlags.setFlag('enableDevTools', true);
  });
  
  afterEach(() => {
    // Restore original localStorage
    localStorage.clear();
    for (const [key, value] of Object.entries(originalStorage)) {
      localStorage.setItem(key, value);
    }
  });

  // Note: These tests run in Vitest which sets import.meta.env.DEV = true
  describe('Panel visibility', () => {
    it('should render trigger button when devTools enabled', () => {
      render(
        <FeatureFlagsProvider>
          <FeatureFlagsPanel />
        </FeatureFlagsProvider>
      );
      
      const triggerButton = screen.getByRole('button', { name: /open feature flags panel/i });
      expect(triggerButton).toBeInTheDocument();
    });

    it('should not render when devTools disabled', () => {
      featureFlags.setFlag('enableDevTools', false);
      
      render(
        <FeatureFlagsProvider>
          <FeatureFlagsPanel />
        </FeatureFlagsProvider>
      );
      
      expect(screen.queryByRole('button', { name: /open feature flags panel/i })).not.toBeInTheDocument();
    });
  });

  describe('Panel interaction', () => {
    it('should open panel when trigger button clicked', () => {
      render(
        <FeatureFlagsProvider>
          <FeatureFlagsPanel />
        </FeatureFlagsProvider>
      );
      
      const triggerButton = screen.getByRole('button', { name: /open feature flags panel/i });
      fireEvent.click(triggerButton);
      
      expect(screen.getByRole('dialog', { name: /feature flags panel/i })).toBeInTheDocument();
      expect(screen.getByText('Feature Flags')).toBeInTheDocument();
    });

    it('should close panel when close button clicked', () => {
      render(
        <FeatureFlagsProvider>
          <FeatureFlagsPanel />
        </FeatureFlagsProvider>
      );
      
      // Open panel
      const triggerButton = screen.getByRole('button', { name: /open feature flags panel/i });
      fireEvent.click(triggerButton);
      
      // Close panel
      const closeButton = screen.getByRole('button', { name: /close panel/i });
      fireEvent.click(closeButton);
      
      // Should show trigger again, not dialog
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /open feature flags panel/i })).toBeInTheDocument();
    });
  });

  describe('Flag toggles', () => {
    it('should display flag toggles in panel', () => {
      render(
        <FeatureFlagsProvider>
          <FeatureFlagsPanel />
        </FeatureFlagsProvider>
      );
      
      // Open panel
      fireEvent.click(screen.getByRole('button', { name: /open feature flags panel/i }));
      
      // Should show some flag names
      expect(screen.getByText('Christmas Event')).toBeInTheDocument();
      expect(screen.getByText('Bee System')).toBeInTheDocument();
    });

    it('should toggle flag when checkbox clicked', () => {
      render(
        <FeatureFlagsProvider>
          <FeatureFlagsPanel />
        </FeatureFlagsProvider>
      );
      
      // Open panel
      fireEvent.click(screen.getByRole('button', { name: /open feature flags panel/i }));
      
      // Find Christmas Event toggle
      const christmasToggle = screen.getByRole('checkbox', { name: /toggle christmas event/i });
      const initialValue = featureFlags.isEnabled('christmasEvent');
      
      // Toggle it
      fireEvent.click(christmasToggle);
      
      expect(featureFlags.isEnabled('christmasEvent')).toBe(!initialValue);
    });

    it('should show correct initial state for toggles', () => {
      // Set a specific flag state
      featureFlags.setFlag('debugMode', true);
      
      render(
        <FeatureFlagsProvider>
          <FeatureFlagsPanel />
        </FeatureFlagsProvider>
      );
      
      // Open panel
      fireEvent.click(screen.getByRole('button', { name: /open feature flags panel/i }));
      
      // Debug mode toggle should be checked
      const debugToggle = screen.getByRole('checkbox', { name: /toggle debug mode/i });
      expect(debugToggle).toBeChecked();
    });
  });

  describe('Category sections', () => {
    it('should display category sections', () => {
      render(
        <FeatureFlagsProvider>
          <FeatureFlagsPanel />
        </FeatureFlagsProvider>
      );
      
      // Open panel
      fireEvent.click(screen.getByRole('button', { name: /open feature flags panel/i }));
      
      // Should show category labels (with emoji prefixes to be specific)
      expect(screen.getByText('🎄 Events')).toBeInTheDocument();
      expect(screen.getByText('✨ Features')).toBeInTheDocument();
      expect(screen.getByText('🔧 Debug')).toBeInTheDocument();
      expect(screen.getByText('🧪 Experimental')).toBeInTheDocument();
    });
  });

  describe('Panel actions', () => {
    it('should have reset all button', () => {
      render(
        <FeatureFlagsProvider>
          <FeatureFlagsPanel />
        </FeatureFlagsProvider>
      );
      
      // Open panel
      fireEvent.click(screen.getByRole('button', { name: /open feature flags panel/i }));
      
      expect(screen.getByRole('button', { name: /reset all/i })).toBeInTheDocument();
    });

    it('should reset all flags when reset button clicked', () => {
      // Change some flags
      featureFlags.setFlag('christmasEvent', false);
      featureFlags.setFlag('debugMode', true);
      
      render(
        <FeatureFlagsProvider>
          <FeatureFlagsPanel />
        </FeatureFlagsProvider>
      );
      
      // Open panel
      fireEvent.click(screen.getByRole('button', { name: /open feature flags panel/i }));
      
      // Click reset all
      const resetButton = screen.getByRole('button', { name: /reset all/i });
      fireEvent.click(resetButton);
      
      // Flags should be back to defaults
      expect(featureFlags.isEnabled('christmasEvent')).toBe(FEATURE_FLAG_DEFINITIONS.christmasEvent.defaultValue);
      expect(featureFlags.isEnabled('debugMode')).toBe(FEATURE_FLAG_DEFINITIONS.debugMode.defaultValue);
    });

    it('should have export button', () => {
      render(
        <FeatureFlagsProvider>
          <FeatureFlagsPanel />
        </FeatureFlagsProvider>
      );
      
      // Open panel
      fireEvent.click(screen.getByRole('button', { name: /open feature flags panel/i }));
      
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('should copy flags to clipboard when export clicked', async () => {
      // Mock clipboard API
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });
      
      // Mock alert
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(
        <FeatureFlagsProvider>
          <FeatureFlagsPanel />
        </FeatureFlagsProvider>
      );
      
      // Open panel
      fireEvent.click(screen.getByRole('button', { name: /open feature flags panel/i }));
      
      // Click export
      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);
      
      // Should have called clipboard
      expect(writeTextMock).toHaveBeenCalled();
      
      alertMock.mockRestore();
    });
  });

  describe('DEV badge', () => {
    it('should show DEV badge for dev-only flags', () => {
      render(
        <FeatureFlagsProvider>
          <FeatureFlagsPanel />
        </FeatureFlagsProvider>
      );
      
      // Open panel
      fireEvent.click(screen.getByRole('button', { name: /open feature flags panel/i }));
      
      // Dev-only flags should have DEV badge
      // Debug Mode is marked as devOnly in definitions
      const devBadges = screen.getAllByText('DEV');
      expect(devBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on panel', () => {
      render(
        <FeatureFlagsProvider>
          <FeatureFlagsPanel />
        </FeatureFlagsProvider>
      );
      
      // Open panel
      fireEvent.click(screen.getByRole('button', { name: /open feature flags panel/i }));
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label', 'Feature Flags Panel');
    });

    it('should have proper ARIA labels on toggles', () => {
      render(
        <FeatureFlagsProvider>
          <FeatureFlagsPanel />
        </FeatureFlagsProvider>
      );
      
      // Open panel
      fireEvent.click(screen.getByRole('button', { name: /open feature flags panel/i }));
      
      // Each toggle should have an aria-label
      const toggles = screen.getAllByRole('checkbox');
      for (const toggle of toggles) {
        expect(toggle).toHaveAttribute('aria-label');
      }
    });

    it('should have accessible trigger button', () => {
      render(
        <FeatureFlagsProvider>
          <FeatureFlagsPanel />
        </FeatureFlagsProvider>
      );
      
      const triggerButton = screen.getByRole('button', { name: /open feature flags panel/i });
      expect(triggerButton).toHaveAttribute('aria-label');
      expect(triggerButton).toHaveAttribute('title', 'Feature Flags');
    });
  });
});
