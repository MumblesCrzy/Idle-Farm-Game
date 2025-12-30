/**
 * Feature Flags Dev Panel
 * 
 * A floating panel for toggling feature flags during development.
 * Only visible when enableDevTools flag is enabled.
 */

import { useState, useMemo, memo } from 'react';
import { 
  useFeatureFlags, 
  FEATURE_FLAG_DEFINITIONS,
  type FeatureFlagKey,
  type FeatureFlagDefinition
} from '../context/FeatureFlagsContext';
import styles from './FeatureFlagsPanel.module.css';

// Flag icon SVG
const FlagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

// Close icon SVG
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Settings icon SVG
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

interface FlagToggleProps {
  flagKey: FeatureFlagKey;
  definition: FeatureFlagDefinition;
  enabled: boolean;
  onToggle: (key: FeatureFlagKey) => void;
}

const FlagToggle = memo(({ flagKey, definition, enabled, onToggle }: FlagToggleProps) => (
  <div className={styles.flagItem}>
    <div className={styles.flagInfo}>
      <div className={styles.flagName}>
        {definition.name}
        {definition.devOnly && <span className={styles.devBadge}>DEV</span>}
      </div>
      <div className={styles.flagDescription}>{definition.description}</div>
    </div>
    <label className={styles.toggle}>
      <input
        type="checkbox"
        className={styles.toggleInput}
        checked={enabled}
        onChange={() => onToggle(flagKey)}
        aria-label={`Toggle ${definition.name}`}
      />
      <span className={styles.toggleSlider} />
    </label>
  </div>
));
FlagToggle.displayName = 'FlagToggle';

interface CategorySectionProps {
  category: 'event' | 'feature' | 'debug' | 'experimental';
  flags: Array<{ key: FeatureFlagKey; enabled: boolean; definition: FeatureFlagDefinition }>;
  onToggle: (key: FeatureFlagKey) => void;
}

const categoryLabels: Record<'event' | 'feature' | 'debug' | 'experimental', string> = {
  event: '🎄 Events',
  feature: '✨ Features',
  debug: '🔧 Debug',
  experimental: '🧪 Experimental',
};

const CategorySection = memo(({ category, flags, onToggle }: CategorySectionProps) => {
  if (flags.length === 0) return null;
  
  return (
    <div className={styles.categorySection}>
      <div className={styles.categoryTitle}>{categoryLabels[category]}</div>
      {flags.map(({ key, enabled, definition }) => (
        <FlagToggle
          key={key}
          flagKey={key}
          definition={definition}
          enabled={enabled}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
});
CategorySection.displayName = 'CategorySection';

function FeatureFlagsPanelContent({ onClose }: { onClose: () => void }) {
  const { getAllFlags, toggleFlag, resetAllFlags } = useFeatureFlags();
  
  const flagsByCategory = useMemo(() => {
    const flags = getAllFlags();
    const categories: Record<'event' | 'feature' | 'debug' | 'experimental', Array<{
      key: FeatureFlagKey;
      enabled: boolean;
      definition: FeatureFlagDefinition;
    }>> = {
      event: [],
      feature: [],
      debug: [],
      experimental: [],
    };
    
    for (const [key, enabled] of Object.entries(flags)) {
      const definition = FEATURE_FLAG_DEFINITIONS[key as FeatureFlagKey];
      if (definition) {
        categories[definition.category].push({
          key: key as FeatureFlagKey,
          enabled,
          definition,
        });
      }
    }
    
    return categories;
  }, [getAllFlags]);
  
  const handleExport = () => {
    const flags = getAllFlags();
    const json = JSON.stringify(flags, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      alert('Feature flags copied to clipboard!');
    });
  };

  return (
    <div className={styles.featureFlagsPanel} role="dialog" aria-label="Feature Flags Panel">
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <FlagIcon />
          Feature Flags
        </div>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close panel"
        >
          <CloseIcon />
        </button>
      </div>
      
      <div className={styles.panelContent}>
        <CategorySection
          category="event"
          flags={flagsByCategory.event}
          onToggle={toggleFlag}
        />
        <CategorySection
          category="feature"
          flags={flagsByCategory.feature}
          onToggle={toggleFlag}
        />
        <CategorySection
          category="debug"
          flags={flagsByCategory.debug}
          onToggle={toggleFlag}
        />
        <CategorySection
          category="experimental"
          flags={flagsByCategory.experimental}
          onToggle={toggleFlag}
        />
      </div>
      
      <div className={styles.panelActions}>
        <button
          className={`${styles.actionButton} ${styles.resetButton}`}
          onClick={resetAllFlags}
        >
          Reset All
        </button>
        <button
          className={`${styles.actionButton} ${styles.exportButton}`}
          onClick={handleExport}
        >
          Export
        </button>
      </div>
    </div>
  );
}

/**
 * Feature Flags Panel component
 * Only renders when devTools are enabled
 */
export function FeatureFlagsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { isEnabled } = useFeatureFlags();
  
  // Only show if dev tools are enabled
  if (!isEnabled('enableDevTools')) {
    return null;
  }
  
  // Don't show trigger if panel should be hidden
  if (!isEnabled('showDevPanel')) {
    return null;
  }
  
  if (isOpen) {
    return <FeatureFlagsPanelContent onClose={() => setIsOpen(false)} />;
  }
  
  return (
    <button
      className={styles.triggerButton}
      onClick={() => setIsOpen(true)}
      aria-label="Open feature flags panel"
      title="Feature Flags"
    >
      <SettingsIcon />
    </button>
  );
}

export default memo(FeatureFlagsPanel);
