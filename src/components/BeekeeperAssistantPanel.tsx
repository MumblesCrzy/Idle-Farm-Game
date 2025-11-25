import React, { memo } from 'react';
import type { BeekeeperAssistant } from '../types/bees';
import styles from './BeekeeperAssistantPanel.module.css';

interface BeekeeperAssistantPanelProps {
  assistant: BeekeeperAssistant;
  currentBoxes: number;
  regularHoney: number;
  unlockBoxesRequired: number;
  onUnlock: () => boolean;
  onUpgrade: () => boolean;
  onToggle: (active: boolean) => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const BeekeeperAssistantPanel: React.FC<BeekeeperAssistantPanelProps> = memo(({
  assistant,
  currentBoxes,
  regularHoney,
  unlockBoxesRequired,
  onUnlock,
  onUpgrade,
  onToggle,
  formatNumber
}) => {
  const canUnlock = currentBoxes >= unlockBoxesRequired && regularHoney >= 50;
  const canUpgrade = assistant.unlocked && regularHoney >= assistant.upgradeCost && assistant.level < assistant.maxLevel;
  const isMaxLevel = assistant.level >= assistant.maxLevel;

  // Calculate current bonus display
  const productionBonusPercent = (assistant.productionSpeedBonus * 100).toFixed(0);
  const nextLevelBonus = assistant.unlocked && !isMaxLevel 
    ? ((0.1 + ((assistant.level + 1) * 0.05)) * 100).toFixed(0)
    : 0;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.icon}>🤖</span>
        <h3 className={styles.title}>Beekeeper Assistant</h3>
      </div>

      {/* Description */}
      {!assistant.unlocked && (
        <div className={styles.description}>
          <p>
            An automated helper that collects honey and boosts production speed!
          </p>
        </div>
      )}

      {/* Unlock Section */}
      {!assistant.unlocked && (
        <div className={styles.unlockSection}>
          <div className={styles.requirements}>
            <h4 className={styles.requirementsTitle}>Unlock Requirements:</h4>
            <div className={styles.requirement}>
              <span className={currentBoxes >= unlockBoxesRequired ? styles.met : styles.unmet}>
                {currentBoxes >= unlockBoxesRequired ? '✓' : '✗'}
              </span>
              <span>
                {currentBoxes} / {unlockBoxesRequired} Bee Boxes
              </span>
            </div>
            <div className={styles.requirement}>
              <span className={regularHoney >= 50 ? styles.met : styles.unmet}>
                {regularHoney >= 50 ? '✓' : '✗'}
              </span>
              <span>
                🍯 {formatNumber(regularHoney, 1)} / 50 Honey
              </span>
            </div>
          </div>

          <button
            className={`${styles.unlockButton} ${canUnlock ? styles.canAfford : styles.cantAfford}`}
            onClick={onUnlock}
            disabled={!canUnlock}
            title={canUnlock ? 'Unlock Beekeeper Assistant' : 'Requirements not met'}
          >
            {canUnlock ? 'Unlock Assistant (50 🍯)' : 'Locked'}
          </button>
        </div>
      )}

      {/* Unlocked Section */}
      {assistant.unlocked && (
        <div className={styles.unlockedSection}>
          {/* Status Display */}
          <div className={styles.statusSection}>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Status:</span>
              <span className={`${styles.statusValue} ${assistant.active ? styles.active : styles.inactive}`}>
                {assistant.active ? '✓ Active' : '✗ Inactive'}
              </span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Level:</span>
              <span className={styles.statusValue}>
                {assistant.level} / {assistant.maxLevel}
              </span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Production Bonus:</span>
              <span className={styles.statusValue}>
                +{productionBonusPercent}%
              </span>
            </div>
          </div>

          {/* Features */}
          <div className={styles.features}>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🍯</span>
              <span className={styles.featureText}>Auto-collects honey</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>⚡</span>
              <span className={styles.featureText}>Boosts production speed</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>⏱️</span>
              <span className={styles.featureText}>Reduces downtime</span>
            </div>
          </div>

          {/* Toggle Control */}
          <div className={styles.toggleSection}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={assistant.active}
                onChange={(e) => onToggle(e.target.checked)}
                className={styles.toggleInput}
              />
              <span className={styles.toggleSlider}></span>
              <span className={styles.toggleText}>
                {assistant.active ? 'Disable' : 'Enable'} Auto-Collection
              </span>
            </label>
          </div>

          {/* Upgrade Section */}
          {!isMaxLevel && (
            <div className={styles.upgradeSection}>
              <div className={styles.upgradeInfo}>
                <div className={styles.upgradeRow}>
                  <span className={styles.upgradeLabel}>Next Level Bonus:</span>
                  <span className={styles.upgradeValue}>+{nextLevelBonus}%</span>
                </div>
                <div className={styles.upgradeRow}>
                  <span className={styles.upgradeLabel}>Cost:</span>
                  <span className={styles.upgradeValue}>
                    🍯 {formatNumber(assistant.upgradeCost, 1)}
                  </span>
                </div>
              </div>

              <button
                className={`${styles.upgradeButton} ${canUpgrade ? styles.canAfford : styles.cantAfford}`}
                onClick={onUpgrade}
                disabled={!canUpgrade}
                title={canUpgrade ? `Upgrade to Level ${assistant.level + 1}` : 'Not enough honey'}
              >
                {canUpgrade ? `Upgrade to Level ${assistant.level + 1}` : 'Insufficient Honey'}
              </button>
            </div>
          )}

          {/* Max Level Message */}
          {isMaxLevel && (
            <div className={styles.maxLevelSection}>
              <div className={styles.maxLevelBadge}>
                ⭐ MAX LEVEL ⭐
              </div>
              <p className={styles.maxLevelText}>
                Your assistant has reached maximum efficiency!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

BeekeeperAssistantPanel.displayName = 'BeekeeperAssistantPanel';

export default BeekeeperAssistantPanel;
