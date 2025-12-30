/**
 * Tests for Feature Flags System
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { featureFlags, FEATURE_FLAG_DEFINITIONS, type FeatureFlagKey } from '../utils/featureFlags';

describe('featureFlags', () => {
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
  
  describe('FEATURE_FLAG_DEFINITIONS', () => {
    it('should have all required properties for each flag', () => {
      for (const [key, def] of Object.entries(FEATURE_FLAG_DEFINITIONS)) {
        expect(def.name).toBeDefined();
        expect(typeof def.name).toBe('string');
        expect(def.name.length).toBeGreaterThan(0);
        
        expect(typeof def.defaultValue).toBe('boolean');
        
        expect(def.description).toBeDefined();
        expect(typeof def.description).toBe('string');
        
        expect(def.category).toBeDefined();
        expect(['event', 'feature', 'debug', 'experimental']).toContain(def.category);
        
        expect(typeof def.userConfigurable).toBe('boolean');
      }
    });
    
    it('should have defined flag definitions', () => {
      expect(Object.keys(FEATURE_FLAG_DEFINITIONS).length).toBeGreaterThan(0);
    });
    
    it('should include expected flags', () => {
      expect(FEATURE_FLAG_DEFINITIONS.christmasEvent).toBeDefined();
      expect(FEATURE_FLAG_DEFINITIONS.beeSystem).toBeDefined();
      expect(FEATURE_FLAG_DEFINITIONS.canningSystem).toBeDefined();
      expect(FEATURE_FLAG_DEFINITIONS.debugMode).toBeDefined();
    });
  });
  
  describe('isEnabled', () => {
    it('should return default value when flag is not set', () => {
      const result = featureFlags.isEnabled('christmasEvent');
      expect(result).toBe(FEATURE_FLAG_DEFINITIONS.christmasEvent.defaultValue);
    });
    
    it('should return set value when flag is explicitly set', () => {
      featureFlags.setFlag('christmasEvent', false);
      expect(featureFlags.isEnabled('christmasEvent')).toBe(false);
      
      featureFlags.setFlag('christmasEvent', true);
      expect(featureFlags.isEnabled('christmasEvent')).toBe(true);
    });
  });
  
  describe('setFlag', () => {
    it('should set flag value', () => {
      featureFlags.setFlag('debugMode', true);
      expect(featureFlags.isEnabled('debugMode')).toBe(true);
    });
    
    it('should persist to localStorage', () => {
      featureFlags.setFlag('debugMode', true);
      
      const stored = localStorage.getItem('farm_idle_feature_flags');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.debugMode).toBe(true);
    });
  });
  
  describe('toggleFlag', () => {
    it('should toggle flag value', () => {
      const initial = featureFlags.isEnabled('debugMode');
      featureFlags.toggleFlag('debugMode');
      expect(featureFlags.isEnabled('debugMode')).toBe(!initial);
    });
    
    it('should return the new value', () => {
      const initial = featureFlags.isEnabled('debugMode');
      const result = featureFlags.toggleFlag('debugMode');
      expect(result).toBe(!initial);
    });
  });
  
  describe('resetFlag', () => {
    it('should reset flag to default value', () => {
      featureFlags.setFlag('christmasEvent', false);
      expect(featureFlags.isEnabled('christmasEvent')).toBe(false);
      
      featureFlags.resetFlag('christmasEvent');
      expect(featureFlags.isEnabled('christmasEvent')).toBe(FEATURE_FLAG_DEFINITIONS.christmasEvent.defaultValue);
    });
  });
  
  describe('resetAllFlags', () => {
    it('should reset all flags to defaults', () => {
      featureFlags.setFlag('christmasEvent', false);
      featureFlags.setFlag('debugMode', true);
      
      featureFlags.resetAllFlags();
      
      expect(featureFlags.isEnabled('christmasEvent')).toBe(FEATURE_FLAG_DEFINITIONS.christmasEvent.defaultValue);
      expect(featureFlags.isEnabled('debugMode')).toBe(FEATURE_FLAG_DEFINITIONS.debugMode.defaultValue);
    });
  });
  
  describe('getAllFlags', () => {
    it('should return all flags with current values', () => {
      const flags = featureFlags.getAllFlags();
      
      expect(typeof flags).toBe('object');
      expect(Object.keys(flags).length).toBe(Object.keys(FEATURE_FLAG_DEFINITIONS).length);
      
      for (const key of Object.keys(FEATURE_FLAG_DEFINITIONS)) {
        expect(flags[key as FeatureFlagKey]).toBeDefined();
      }
    });
  });
  
  describe('getFlagsByCategory', () => {
    it('should return only flags in the specified category', () => {
      const eventFlags = featureFlags.getFlagsByCategory('event');
      
      for (const flag of eventFlags) {
        expect(flag.definition.category).toBe('event');
      }
    });
    
    it('should return flag key, enabled status, and definition', () => {
      const featureflags = featureFlags.getFlagsByCategory('feature');
      
      expect(featureflags.length).toBeGreaterThan(0);
      
      for (const flag of featureflags) {
        expect(flag.key).toBeDefined();
        expect(typeof flag.enabled).toBe('boolean');
        expect(flag.definition).toBeDefined();
        expect(flag.definition.name).toBeDefined();
      }
    });
  });
  
  describe('getUserConfigurableFlags', () => {
    it('should return only user-configurable flags', () => {
      const userFlags = featureFlags.getUserConfigurableFlags();
      
      for (const flag of userFlags) {
        expect(flag.definition.userConfigurable).toBe(true);
      }
    });
  });
  
  describe('subscribe', () => {
    it('should call listener when flag changes', () => {
      const listener = vi.fn();
      const unsubscribe = featureFlags.subscribe(listener);
      
      featureFlags.setFlag('debugMode', true);
      
      expect(listener).toHaveBeenCalled();
      
      unsubscribe();
    });
    
    it('should not call listener after unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = featureFlags.subscribe(listener);
      
      unsubscribe();
      featureFlags.setFlag('debugMode', true);
      
      expect(listener).not.toHaveBeenCalled();
    });
  });
  
  describe('exportFlags', () => {
    it('should return JSON string of all flags', () => {
      const exported = featureFlags.exportFlags();
      
      expect(typeof exported).toBe('string');
      
      const parsed = JSON.parse(exported);
      expect(typeof parsed).toBe('object');
    });
  });
  
  describe('importFlags', () => {
    it('should import valid JSON', () => {
      const toImport = JSON.stringify({ christmasEvent: false });
      
      const result = featureFlags.importFlags(toImport);
      
      expect(result).toBe(true);
      expect(featureFlags.isEnabled('christmasEvent')).toBe(false);
    });
    
    it('should return false for invalid JSON', () => {
      const result = featureFlags.importFlags('invalid json');
      expect(result).toBe(false);
    });
    
    it('should ignore unknown flags', () => {
      const toImport = JSON.stringify({ unknownFlag: true, christmasEvent: false });
      
      featureFlags.importFlags(toImport);
      
      expect(featureFlags.isEnabled('christmasEvent')).toBe(false);
    });
  });
  
  describe('setMultipleFlags', () => {
    it('should set multiple flags at once', () => {
      featureFlags.setMultipleFlags({
        christmasEvent: false,
        debugMode: true,
      });
      
      expect(featureFlags.isEnabled('christmasEvent')).toBe(false);
      expect(featureFlags.isEnabled('debugMode')).toBe(true);
    });
  });
});
