import React, { memo, useState } from 'react';
import BaseTab from './BaseTab';
import BeeBoxDisplay from './BeeBoxDisplay';
import BeeBoxPurchase from './BeeBoxPurchase';
import BeeUpgradesPanel from './BeeUpgradesPanel';
import type { BeeContextValue } from '../types/bees';
import { ICON_BEE, ICON_HONEY, ICON_GOLDEN_HONEY } from '../config/assetPaths';
import styles from './BeesTab.module.css';

interface BeesTabProps {
  beeContext: BeeContextValue | null;
  farmTier: number;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const BeesTab: React.FC<BeesTabProps> = memo(({
  beeContext,
  farmTier,
  formatNumber
}) => {
  // Check if bees are unlocked (Tier 3+)
  const isUnlocked = farmTier >= 3;

  // If not unlocked, show unlock message
  if (!isUnlocked) {
    const mainContent = (
      <div className={styles.unlockMessage}>
        <div className={styles.unlockCard}>
          <h2 className={styles.unlockTitle}>
            <img src={ICON_BEE} alt="Bee" style={{ width: '24px', height: '24px', verticalAlign: 'middle' }} /> Bee System Locked <img src={ICON_BEE} alt="Bee" style={{ width: '24px', height: '24px', verticalAlign: 'middle' }} />
          </h2>
          <p className={styles.unlockDescription}>
            The Bee System becomes available when you reach <strong>Farm Tier 3</strong>.
          </p>
          <p className={styles.unlockDetails}>
            <strong>Current Tier:</strong> {farmTier}
          </p>
          <p className={styles.unlockDetails}>
            <strong>Required Tier:</strong> 3
          </p>
          <div className={styles.unlockFeatures}>
            <h3>What Bees Offer:</h3>
            <ul>
              <li><img src={ICON_HONEY} alt="Honey" style={{ width: '16px', height: '16px', verticalAlign: 'middle' }} /> Produce Honey every 6 months (182 seconds)</li>
              <li>📈 Boost crop yields (+0.5% per bee box)</li>
              <li>🥫 Unlock unique honey-based canning recipes</li>
              <li><img src={ICON_GOLDEN_HONEY} alt="Golden Honey" style={{ width: '16px', height: '16px', verticalAlign: 'middle' }} /> Chance to produce rare Golden Honey</li>
              <li>🤖 Automate with the Beekeeper Assistant</li>
            </ul>
          </div>
          <p className={styles.unlockHint}>
            Keep farming and expanding to unlock this feature!
          </p>
        </div>
      </div>
    );

    return (
      <BaseTab
        isUnlocked={true} // Show the unlock message
        mainContent={mainContent}
      />
    );
  }

  // If unlocked but context not loaded yet
  if (!beeContext) {
    const loadingContent = <div>Loading bee system...</div>;
    return (
      <BaseTab
        isUnlocked={true}
        isLoading={true}
        loadingMessage="Loading bee system..."
        mainContent={loadingContent}
      />
    );
  }

  // Calculate display values
  const totalBeeBoxes = beeContext.boxes.length;
  const readyToHarvest = beeContext.boxes.filter(box => box.harvestReady).length;
  const yieldBonus = beeContext.calculateYieldBonus();
  const yieldBonusPercent = (yieldBonus * 100).toFixed(1);

  // Calculate upgrade bonuses for display
  const busyBeesUpgrade = beeContext.upgrades.find(u => u.id === 'busy_bees');
  const productionSpeedBonus = busyBeesUpgrade ? busyBeesUpgrade.level * 0.01 : 0;
  
  const royalJellyUpgrade = beeContext.upgrades.find(u => u.id === 'royal_jelly');
  const queensBlessingUpgrade = beeContext.upgrades.find(u => u.id === 'queens_blessing');
  let goldenHoneyChance = 0;
  if (royalJellyUpgrade?.purchased) {
    goldenHoneyChance = 0.05; // 5% base
  }
  if (queensBlessingUpgrade?.purchased) {
    goldenHoneyChance *= 2; // 2x multiplier
  }

  // Get honey production multiplier from context
  const honeyProductionMultiplier = beeContext.calculateHoneyProductionMultiplier();

  // Calculate production stats (1 second = 1 day in game)
  const baseProductionTime = 182; // seconds (6 months = 182 days)
  const actualProductionTime = baseProductionTime / (1 + productionSpeedBonus);
  const honeyPerHarvest = Math.round(15 * honeyProductionMultiplier);
  const daysPerHarvest = Math.ceil(actualProductionTime); // days
  const honeyPerYear = ((365 / actualProductionTime) * honeyPerHarvest).toFixed(1);

  // Main bee content
  const mainContent = (
    <div className={styles.container}>
      {/* Stats Overview */}
      <div className={styles.statsOverview}>
        {/* Regular Honey */}
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <img src={ICON_HONEY} alt="Honey" style={{ width: '32px', height: '32px' }} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Honey</div>
            <div className={styles.statValue}>
              {formatNumber(beeContext.regularHoney, 1)}
            </div>
            <div className={styles.statSubtext}>
              {formatNumber(beeContext.totalHoneyCollected, 1)} total collected
            </div>
          </div>
        </div>

        {/* Golden Honey */}
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <img src={ICON_GOLDEN_HONEY} alt="Golden Honey" style={{ width: '32px', height: '32px' }} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Golden Honey</div>
            <div className={styles.statValue}>
              {formatNumber(beeContext.goldenHoney, 1)}
            </div>
            <div className={styles.statSubtext}>
              {goldenHoneyChance > 0 
                ? `${(goldenHoneyChance * 100).toFixed(0)}% chance per harvest`
                : 'Unlock upgrades for Golden Honey'
              }
            </div>
          </div>
        </div>

        {/* Production Stats */}
        <div className={styles.statCard}>
          <div className={styles.statIcon}>⚡</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Production</div>
            <div className={styles.statValue}>
              {honeyPerHarvest} lbs / {daysPerHarvest} days
            </div>
            <div className={styles.statSubtext}>
              {honeyPerYear} lbs/year per box
            </div>
          </div>
        </div>

        {/* Crop Yield Bonus */}
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🌾</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Crop Yield Bonus</div>
            <div className={styles.statValue}>
              +{yieldBonusPercent}%
            </div>
            <div className={styles.statSubtext}>
              From {totalBeeBoxes} bee {totalBeeBoxes === 1 ? 'box' : 'boxes'}
            </div>
          </div>
        </div>
      </div>

      {/* Bee Boxes Grid */}
      {beeContext.boxes.length > 0 ? (
        <div className={styles.beeBoxesGrid}>
          {beeContext.boxes.map((box) => (
            <BeeBoxDisplay
              key={box.id}
              box={box}
              productionSpeedBonus={productionSpeedBonus}
            />
          ))}
          
          {/* Purchase Card - appears in grid if not at max capacity */}
          {beeContext.boxes.length < beeContext.maxBoxes && (
            <BeeBoxPurchase
              currentBoxes={beeContext.boxes.length}
              maxBoxes={beeContext.maxBoxes}
              regularHoney={beeContext.regularHoney}
              onPurchase={beeContext.addBeeBox}
              formatNumber={formatNumber}
            />
          )}
        </div>
      ) : (
        <div className={styles.beeBoxesGrid}>
          {/* Purchase Card - shows when no boxes exist */}
          <BeeBoxPurchase
            currentBoxes={beeContext.boxes.length}
            maxBoxes={beeContext.maxBoxes}
            regularHoney={beeContext.regularHoney}
            onPurchase={beeContext.addBeeBox}
            formatNumber={formatNumber}
          />
        </div>
      )}

      {/* Harvest All Button */}
      {readyToHarvest > 0 && (
        <div className={styles.harvestAllSection}>
          <button
            className={styles.harvestAllButton}
            onClick={() => beeContext.harvestAllHoney()}
          >
            <span className={styles.harvestAllIcon}>
              <img src={ICON_HONEY} alt="Honey" style={{ width: '20px', height: '20px', verticalAlign: 'middle' }} />
            </span>
            Harvest All ({readyToHarvest})
          </button>
        </div>
      )}
    </div>
  );

  // Sidebar content - Tabbed upgrade panels
  const [activeUpgradeTab, setActiveUpgradeTab] = useState<'honey' | 'golden'>('honey');
  const regularHoneyUpgrades = beeContext.upgrades.filter(u => u.costCurrency === 'regularHoney');
  const goldenHoneyUpgrades = beeContext.upgrades.filter(u => u.costCurrency === 'goldenHoney');
  
  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '700px' }}>
      {/* Tab Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setActiveUpgradeTab('honey')}
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '8px',
            background: activeUpgradeTab === 'honey' 
              ? 'linear-gradient(135deg, #ffb84d 0%, #f39c12 100%)'
              : 'rgba(255, 255, 255, 0.3)',
            color: activeUpgradeTab === 'honey' ? 'white' : '#666',
            fontWeight: 'bold',
            cursor: 'pointer',
            border: activeUpgradeTab === 'honey' ? '2px solid #d68910' : '2px solid transparent',
            boxShadow: activeUpgradeTab === 'honey' ? '0 2px 8px rgba(243, 156, 18, 0.3)' : 'none',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.95rem'
          }}
        >
          <span>🍯</span> Honey
        </button>
        <button
          onClick={() => setActiveUpgradeTab('golden')}
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '8px',
            background: activeUpgradeTab === 'golden' 
              ? 'linear-gradient(135deg, #ffd700 0%, #ffaa00 100%)'
              : 'rgba(255, 255, 255, 0.3)',
            color: activeUpgradeTab === 'golden' ? 'white' : '#666',
            fontWeight: 'bold',
            cursor: 'pointer',
            border: activeUpgradeTab === 'golden' ? '2px solid #e6a800' : '2px solid transparent',
            boxShadow: activeUpgradeTab === 'golden' ? '0 2px 8px rgba(255, 170, 0, 0.3)' : 'none',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.95rem'
          }}
        >
          <span>✨</span> Golden
        </button>
      </div>

      {/* Active Panel */}
      <div style={{ 
        flex: 1,
        background: activeUpgradeTab === 'honey'
          ? 'linear-gradient(135deg, #ffb84d 0%, #f39c12 100%)'
          : 'linear-gradient(135deg, #ffd700 0%, #ffaa00 100%)',
        border: activeUpgradeTab === 'honey' ? '2px solid #d68910' : '2px solid #e6a800',
        borderRadius: '8px',
        padding: '1rem',
        boxShadow: activeUpgradeTab === 'honey'
          ? '0 4px 12px rgba(243, 156, 18, 0.3)'
          : '0 4px 12px rgba(255, 170, 0, 0.3)',
        overflow: 'auto',
        maxHeight: '700px'
      }}>
        {activeUpgradeTab === 'honey' ? (
          <BeeUpgradesPanel
            upgrades={regularHoneyUpgrades}
            regularHoney={beeContext.regularHoney}
            goldenHoney={beeContext.goldenHoney}
            onPurchaseUpgrade={beeContext.purchaseUpgrade}
            formatNumber={formatNumber}
            assistant={beeContext.beekeeperAssistant}
            currentBoxes={totalBeeBoxes}
            unlockBoxesRequired={4}
            onUnlockAssistant={beeContext.unlockBeekeeperAssistant}
            onUpgradeAssistant={beeContext.upgradeBeekeeperAssistant}
            onToggleAssistant={beeContext.toggleBeekeeperAssistant}
            showAssistant={true}
          />
        ) : (
          <BeeUpgradesPanel
            upgrades={goldenHoneyUpgrades}
            regularHoney={beeContext.regularHoney}
            goldenHoney={beeContext.goldenHoney}
            onPurchaseUpgrade={beeContext.purchaseUpgrade}
            formatNumber={formatNumber}
            assistant={beeContext.beekeeperAssistant}
            currentBoxes={totalBeeBoxes}
            unlockBoxesRequired={4}
            onUnlockAssistant={beeContext.unlockBeekeeperAssistant}
            onUpgradeAssistant={beeContext.upgradeBeekeeperAssistant}
            onToggleAssistant={beeContext.toggleBeekeeperAssistant}
            showAssistant={false}
          />
        )}
      </div>
    </div>
  );

  // Custom sidebar styling for bee tab - removed since we're using inline styles now
  const sidebarStyle = {
    padding: '0',
    background: 'transparent',
    border: 'none',
    boxShadow: 'none'
  };

  return (
    <BaseTab
      isUnlocked={isUnlocked}
      mainContent={mainContent}
      sidebarContent={sidebarContent}
      sidebarStyle={sidebarStyle}
    />
  );
});

BeesTab.displayName = 'BeesTab';

export default BeesTab;
