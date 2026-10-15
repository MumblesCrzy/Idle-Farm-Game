import { memo, useState, type FC } from 'react';
import BaseTab from './BaseTab';
import BeeBoxDisplay from './BeeBoxDisplay';
import BeeBoxPurchase from './BeeBoxPurchase';
import BeeUpgradesPanel from './BeeUpgradesPanel';
import InlineIcon from './InlineIcon';
import LockedFeatureCard from './LockedFeatureCard';
import type { BeeContextValue } from '../types/bees';
import { ICON_BEE, ICON_HONEY, ICON_GOLDEN_HONEY, BEE_BEEKEEPER } from '../config/assetPaths';
import { BEE_CONSTANTS } from '../config/gameConstants';
import styles from './BeesTab.module.css';

/** Farm tier that unlocks the bee system, the same one BeeContext checks */
const BEES_UNLOCK_TIER = BEE_CONSTANTS.UNLOCK_FARM_TIER;

interface BeesTabProps {
  beeContext: BeeContextValue | null;
  farmTier: number;
  season: string;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const BeesTab: FC<BeesTabProps> = memo(({
  beeContext,
  farmTier,
  season,
  formatNumber
}) => {
  // Hooks must run before the early returns below so the hook order never changes
  const [activeUpgradeTab, setActiveUpgradeTab] = useState<'honey' | 'golden'>('honey');

  // Check if bees are unlocked
  const isUnlocked = farmTier >= BEES_UNLOCK_TIER;

  // If not unlocked, show unlock message
  if (!isUnlocked) {
    const mainContent = (
      <LockedFeatureCard
        theme="honey"
        icon={<InlineIcon src={ICON_BEE} alt="Bee" size={24} />}
        featureName="Bee System"
        currentTier={farmTier}
        requiredTier={BEES_UNLOCK_TIER}
        featuresTitle="What Bees Offer:"
        hint="Keep farming and expanding to unlock this feature!"
      >
        <li><InlineIcon src={ICON_HONEY} alt="Honey" /> Produce Honey every 6 months (182 seconds)</li>
        <li>📈 Boost crop yields (+0.5% per bee box)</li>
        <li>🥫 Unlock unique honey-based canning recipes</li>
        <li><InlineIcon src={ICON_GOLDEN_HONEY} alt="Golden Honey" /> Chance to produce rare Golden Honey</li>
        <li><InlineIcon src={BEE_BEEKEEPER} alt="Beekeeper Assistant" /> Automate with the Beekeeper Assistant</li>
      </LockedFeatureCard>
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
  let productionSpeedBonus = busyBeesUpgrade ? busyBeesUpgrade.level * 0.01 : 0;
  
  // Add Beekeeper Assistant bonus if active
  if (beeContext.beekeeperAssistant.active && beeContext.beekeeperAssistant.productionSpeedBonus > 0) {
    productionSpeedBonus += beeContext.beekeeperAssistant.productionSpeedBonus;
  }
  
  const royalJellyUpgrade = beeContext.upgrades.find(u => u.id === 'royal_jelly');
  const queensBlessingUpgrade = beeContext.upgrades.find(u => u.id === 'queens_blessing');
  let goldenHoneyChance = 0.01; // 1% base chance for all players
  if (royalJellyUpgrade?.purchased) {
    goldenHoneyChance += 0.01; // adds 1% more
  }
  if (queensBlessingUpgrade?.purchased) {
    goldenHoneyChance *= 2; // 2x multiplier
  }

  // Get honey production multiplier from context
  const honeyProductionMultiplier = beeContext.calculateHoneyProductionMultiplier();

  // Calculate production stats (1 second = 1 day in game)
  const baseProductionTime = 132; // seconds (reduced from 182 to account for 50-day winter pause)
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
            <img src={ICON_HONEY} alt="Honey" className={styles.statIconImage} />
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
            <img src={ICON_GOLDEN_HONEY} alt="Golden Honey" className={styles.statIconImage} />
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
              season={season}
              productionSpeedBonus={productionSpeedBonus}
            />
          ))}
          
          {/* Purchase Card - appears in grid if not at max capacity */}
          {beeContext.boxes.length < beeContext.maxBoxes && (
            <BeeBoxPurchase
              currentBoxes={beeContext.boxes.length}
              maxBoxes={beeContext.maxBoxes}
              regularHoney={beeContext.regularHoney}
              cost={beeContext.getBeeBoxPurchaseInfo().cost}
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
            cost={beeContext.getBeeBoxPurchaseInfo().cost}
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
              <InlineIcon src={ICON_HONEY} alt="Honey" size={20} />
            </span>
            Harvest All ({readyToHarvest})
          </button>
        </div>
      )}
    </div>
  );

  // Sidebar content - Tabbed upgrade panels
  const regularHoneyUpgrades = beeContext.upgrades.filter(u => u.costCurrency === 'regularHoney');
  const goldenHoneyUpgrades = beeContext.upgrades.filter(u => u.costCurrency === 'goldenHoney');
  
  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
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
            color: activeUpgradeTab === 'honey' ? 'white' : '#333',
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
          <InlineIcon src={ICON_HONEY} alt="Honey" size={18} /> Honey
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
            color: activeUpgradeTab === 'golden' ? 'white' : '#333',
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
          <InlineIcon src={ICON_GOLDEN_HONEY} alt="Golden Honey" size={18} /> Golden
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
            allUpgrades={beeContext.upgrades}
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
            allUpgrades={beeContext.upgrades}
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

  // Custom sidebar styling for bee tab
  const sidebarStyle = {
    background: 'linear-gradient(135deg, #F7C91F 0%, #AA7942 100%)',
    boxShadow: '0 2px 8px rgba(247, 201, 31, 0.3)'
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
