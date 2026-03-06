/**
 * Wisdom Tab Component
 * 
 * Main tab for the Wisdom of the Ages prestige system where players:
 * - View their lifetime summary (money earned, knowledge gained, max tier)
 * - See their earned Wisdom and how it was calculated
 * - Purchase permanent upgrades with Wisdom
 * - Start the next lifetime
 * 
 * This tab is forced active when a lifetime ends (player cannot switch away
 * until they start their next lifetime).
 */

import { memo, useState, type FC } from 'react';
import BaseTab from './BaseTab';
import type { PrestigeState, WisdomUpgrades } from '../utils/saveSystem';
import styles from './WisdomTab.module.css';

// Wisdom upgrade definitions
interface WisdomUpgradeConfig {
  id: keyof WisdomUpgrades;
  name: string;
  description: string;
  effectDescription: (level: number) => string;
  maxLevel: number;
  baseCost: number;
  costScaling: number; // Multiplier per level
  appliesNextLifetime: boolean; // If true, can only purchase between lifetimes
}

const WISDOM_UPGRADES: WisdomUpgradeConfig[] = [
  {
    id: 'extendedLifespan',
    name: 'Extended Lifespan',
    description: 'Live longer each lifetime, giving more time to earn resources.',
    effectDescription: (level) => level === 0 ? '+5 years per level' : `+${level * 5} years (${80 + level * 5} year lifespan)`,
    maxLevel: 10,
    baseCost: 10,
    costScaling: 1.5,
    appliesNextLifetime: false,
  },
  {
    id: 'startingGold',
    name: 'Inheritance',
    description: 'Start each new lifetime with bonus gold.',
    effectDescription: (level) => level === 0 ? '+$500 per level' : `+$${level * 500} starting gold`,
    maxLevel: 20,
    baseCost: 5,
    costScaling: 1.3,
    appliesNextLifetime: true,
  },
  {
    id: 'startingKnowledge',
    name: 'Ancestral Wisdom',
    description: 'Start each new lifetime with bonus knowledge.',
    effectDescription: (level) => level === 0 ? '+25 per level' : `+${level * 25} starting knowledge`,
    maxLevel: 20,
    baseCost: 5,
    costScaling: 1.3,
    appliesNextLifetime: true,
  },
  {
    id: 'startingExperience',
    name: 'Family Legacy',
    description: 'Start each new lifetime with bonus experience, unlocking vegetables faster.',
    effectDescription: (level) => level === 0 ? '+50 per level' : `+${level * 50} starting experience`,
    maxLevel: 20,
    baseCost: 8,
    costScaling: 1.4,
    appliesNextLifetime: true,
  },
  {
    id: 'permanentGuildBenefits',
    name: 'Guild Traditions',
    description: 'Retain a portion of guild benefits when starting a new lifetime.',
    effectDescription: (level) => level === 0 ? '+10% guild retention per level' : `${level * 10}% guild benefits retained`,
    maxLevel: 5,
    baseCost: 25,
    costScaling: 2.0,
    appliesNextLifetime: true,
  },
];

function calculateUpgradeCost(upgrade: WisdomUpgradeConfig, currentLevel: number): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, currentLevel));
}

function calculateWisdomEarned(totalMoneyEarned: number, totalKnowledgeGained: number, maxFarmTierReached: number): number {
  // Formula: (money/1M) × (knowledge/1K) × maxTier
  const moneyFactor = totalMoneyEarned / 1_000_000;
  const knowledgeFactor = totalKnowledgeGained / 1_000;
  const tierFactor = maxFarmTierReached;
  
  return Math.floor(moneyFactor * knowledgeFactor * tierFactor);
}

interface WisdomTabProps {
  /** Current prestige state */
  prestigeState: PrestigeState;
  /** Whether a lifetime has ended and prestige is pending */
  isLifetimeEnded: boolean;
  /** Handler to purchase a wisdom upgrade */
  onPurchaseUpgrade: (upgradeId: keyof WisdomUpgrades) => void;
  /** Handler to start the next lifetime */
  onStartNextLifetime: () => void;
  /** Number formatting function */
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

/**
 * Upgrade Card Component
 */
interface UpgradeCardProps {
  upgrade: WisdomUpgradeConfig;
  currentLevel: number;
  wisdom: number;
  isLifetimeEnded: boolean;
  onPurchase: () => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const UpgradeCard: FC<UpgradeCardProps> = memo(({
  upgrade,
  currentLevel,
  wisdom,
  isLifetimeEnded,
  onPurchase,
  formatNumber
}) => {
  const cost = calculateUpgradeCost(upgrade, currentLevel);
  const isMaxLevel = currentLevel >= upgrade.maxLevel;
  const canAfford = wisdom >= cost;
  const canPurchase = !isMaxLevel && canAfford && (!upgrade.appliesNextLifetime || isLifetimeEnded);
  
  return (
    <div className={`${styles.upgradeCard} ${isMaxLevel ? styles.upgradeCardMaxed : ''}`}>
      <div className={styles.upgradeHeader}>
        <h4 className={styles.upgradeName}>{upgrade.name}</h4>
        <span className={styles.upgradeLevel}>
          Lv. {currentLevel}{upgrade.maxLevel ? ` / ${upgrade.maxLevel}` : ''}
        </span>
      </div>
      
      <p className={styles.upgradeDescription}>{upgrade.description}</p>
      
      <div className={styles.upgradeEffect}>
        <span className={styles.effectLabel}>Effect:</span>
        <span className={styles.effectValue}>{upgrade.effectDescription(currentLevel)}</span>
      </div>
      
      {upgrade.appliesNextLifetime && (
        <div className={styles.upgradeNote}>
          <span className={styles.noteIcon}>⏳</span>
          <span>Applies to next lifetime</span>
        </div>
      )}
      
      {!isMaxLevel ? (
        <button
          className={`${styles.purchaseButton} ${canPurchase ? styles.purchaseButtonEnabled : styles.purchaseButtonDisabled}`}
          onClick={onPurchase}
          disabled={!canPurchase}
          aria-label={`Purchase ${upgrade.name} for ${cost} Wisdom`}
        >
          <span className={styles.purchaseCost}>
            <span className={styles.wisdomIcon}>✨</span>
            {formatNumber(cost)}
          </span>
          {!canAfford && <span className={styles.purchaseStatus}>Not enough Wisdom</span>}
          {canAfford && upgrade.appliesNextLifetime && !isLifetimeEnded && (
            <span className={styles.purchaseStatus}>Available at end of lifetime</span>
          )}
          {canPurchase && <span className={styles.purchaseStatus}>Purchase</span>}
        </button>
      ) : (
        <div className={styles.maxLevelBadge}>
          <span>✓ Max Level</span>
        </div>
      )}
    </div>
  );
});

UpgradeCard.displayName = 'UpgradeCard';

/**
 * Lifetime Summary Component - shown when lifetime ends
 */
interface LifetimeSummaryProps {
  prestigeState: PrestigeState;
  wisdomEarned: number;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const LifetimeSummary: FC<LifetimeSummaryProps> = memo(({
  prestigeState,
  wisdomEarned,
  formatNumber
}) => {
  const totalMoney = prestigeState.totalMoneyEarned || 0;
  const totalKnowledge = prestigeState.totalKnowledgeGained || 0;
  const maxTier = prestigeState.maxFarmTierReached || 1;
  
  return (
    <div className={styles.lifetimeSummary}>
      <h2 className={styles.summaryTitle}>
        🌾 Lifetime {prestigeState.lifetimeCount} Complete! 🌾
      </h2>
      
      <div className={styles.summaryStats}>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Total Money Earned</span>
          <span className={styles.statValue}>${formatNumber(totalMoney)}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Total Knowledge Gained</span>
          <span className={styles.statValue}>{formatNumber(totalKnowledge)}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Max Farm Tier Reached</span>
          <span className={styles.statValue}>Tier {maxTier}</span>
        </div>
      </div>
      
      <div className={styles.wisdomCalculation}>
        <h3 className={styles.wisdomTitle}>Wisdom Earned</h3>
        <div className={styles.wisdomFormula}>
          <span className={styles.formulaLine}>
            ({formatNumber(totalMoney)} ÷ 1M) × ({formatNumber(totalKnowledge)} ÷ 1K) × {maxTier}
          </span>
        </div>
        <div className={styles.wisdomResult}>
          <span className={styles.wisdomIcon}>✨</span>
          <span className={styles.wisdomAmount}>+{formatNumber(wisdomEarned)} Wisdom</span>
        </div>
      </div>
      
      <p className={styles.summaryHint}>
        Purchase upgrades below, then start your next lifetime!
      </p>
    </div>
  );
});

LifetimeSummary.displayName = 'LifetimeSummary';

/**
 * Main Wisdom Tab Component
 */
const WisdomTab: FC<WisdomTabProps> = memo(({
  prestigeState,
  isLifetimeEnded,
  onPurchaseUpgrade,
  onStartNextLifetime,
  formatNumber
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'lifespan' | 'starting'>('all');
  
  // Calculate wisdom earned this lifetime
  const wisdomEarned = calculateWisdomEarned(
    prestigeState.totalMoneyEarned || 0,
    prestigeState.totalKnowledgeGained || 0,
    prestigeState.maxFarmTierReached || 1
  );
  
  // Total available wisdom (existing + newly earned if lifetime ended)
  const totalWisdom = isLifetimeEnded 
    ? prestigeState.wisdom + wisdomEarned 
    : prestigeState.wisdom;
  
  // Filter upgrades by category
  const filteredUpgrades = WISDOM_UPGRADES.filter(upgrade => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'lifespan') return upgrade.id === 'extendedLifespan';
    if (selectedCategory === 'starting') return upgrade.appliesNextLifetime;
    return true;
  });
  
  // Main content - upgrade shop
  const mainContent = (
    <div className={styles.container}>
      {/* Lifetime Summary - only shown when lifetime ends */}
      {isLifetimeEnded && (
        <LifetimeSummary
          prestigeState={prestigeState}
          wisdomEarned={wisdomEarned}
          formatNumber={formatNumber}
        />
      )}
      
      {/* Category Filter */}
      <div className={styles.categoryFilter}>
        <button
          className={`${styles.categoryButton} ${selectedCategory === 'all' ? styles.categoryButtonActive : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          All Upgrades
        </button>
        <button
          className={`${styles.categoryButton} ${selectedCategory === 'lifespan' ? styles.categoryButtonActive : ''}`}
          onClick={() => setSelectedCategory('lifespan')}
        >
          Lifespan
        </button>
        <button
          className={`${styles.categoryButton} ${selectedCategory === 'starting' ? styles.categoryButtonActive : ''}`}
          onClick={() => setSelectedCategory('starting')}
        >
          Starting Bonuses
        </button>
      </div>
      
      {/* Upgrades Grid */}
      <div className={styles.upgradesGrid}>
        {filteredUpgrades.map(upgrade => (
          <UpgradeCard
            key={upgrade.id}
            upgrade={upgrade}
            currentLevel={prestigeState.wisdomUpgrades?.[upgrade.id] || 0}
            wisdom={totalWisdom}
            isLifetimeEnded={isLifetimeEnded}
            onPurchase={() => onPurchaseUpgrade(upgrade.id)}
            formatNumber={formatNumber}
          />
        ))}
      </div>
    </div>
  );
  
  // Sidebar content - wisdom balance and start next lifetime button
  const sidebarContent = (
    <>
      <h2 className={styles.sidebarTitle}>Wisdom</h2>
      
      <div className={styles.wisdomBalance}>
        <span className={styles.wisdomIcon}>✨</span>
        <span className={styles.wisdomTotal}>{formatNumber(totalWisdom)}</span>
      </div>
      
      {isLifetimeEnded && wisdomEarned > 0 && (
        <div className={styles.wisdomPending}>
          <span className={styles.pendingLabel}>This lifetime:</span>
          <span className={styles.pendingAmount}>+{formatNumber(wisdomEarned)}</span>
        </div>
      )}
      
      <div className={styles.lifetimeInfo}>
        <div className={styles.lifetimeRow}>
          <span>Current Lifetime</span>
          <span>{prestigeState.lifetimeCount}</span>
        </div>
      </div>
      
      {isLifetimeEnded && (
        <button
          className={styles.startNextLifetimeButton}
          onClick={onStartNextLifetime}
          aria-label="Start next lifetime"
        >
          <span className={styles.buttonIcon}>🌱</span>
          <span className={styles.buttonText}>Start Next Lifetime</span>
        </button>
      )}
      
      {!isLifetimeEnded && (
        <div className={styles.currentLifetimeNote}>
          <p>Your current lifetime is still in progress.</p>
          <p className={styles.noteSmall}>
            Some upgrades can only be purchased at the end of a lifetime.
          </p>
        </div>
      )}
    </>
  );
  
  // Custom sidebar styling for wisdom tab
  const sidebarStyle = {
    background: 'linear-gradient(180deg, #4a148c 0%, #311b92 100%)',
    border: '1px solid #7c4dff',
    boxShadow: '0 2px 8px rgba(124, 77, 255, 0.3)',
    color: '#fff'
  };
  
  return (
    <BaseTab
      isUnlocked={true}
      isLoading={false}
      mainContent={mainContent}
      sidebarContent={sidebarContent}
      sidebarStyle={sidebarStyle}
    />
  );
});

WisdomTab.displayName = 'WisdomTab';

export default WisdomTab;

// Export types and helpers for use in other components
export { calculateWisdomEarned, calculateUpgradeCost, WISDOM_UPGRADES };
export type { WisdomUpgradeConfig };
