/**
 * Guilds Tab Component
 * 
 * Main tab for the guild system where players:
 * - View available guilds before commitment
 * - Sample tier 1 upgrades from multiple guilds
 * - Commit to a single guild
 * - Access guild-specific upgrades post-commitment
 */

import { memo, useState, type FC } from 'react';
import BaseTab from './BaseTab';
import type { GuildType, GuildState, Guild, GuildUpgrade } from '../types/guilds';
import { GUILDS, GUILDS_UNLOCK_TIER, MAX_SAMPLED_UPGRADES_PER_GUILD, getSamplingUpgrades } from '../data/guildData';
import { GUILD_GROWERS } from '../config/assetPaths';
import {
  getGrowersGrowthBonus,
  getGrowersPriceBonus,
  getGrowersManualHarvestBonus,
  getBlessedCropChance,
  getQualityGradingChance,
  getGrowersBeePollinationBonus,
  getGrowersHarvesterSpeedMultiplier,
  getGrowerCanningProfitMultiplier,
  getFertilizerEffectivenessMultiplier,
  hasWhispersOfSeed,
} from '../utils/guildCalculations';
import styles from './GuildsTab.module.css';

interface GuildsTabProps {
  /** Current farm tier */
  farmTier: number;
  /** Current guild state */
  guildState: GuildState;
  /** Player's current money */
  money: number;
  /** Player's current knowledge */
  knowledge: number;
  /** Player's current experience */
  experience: number;
  /** Whether the intro overlay has been shown before */
  introShown: boolean;
  /** Handler called when intro is dismissed */
  onDismissIntro: () => void;
  /** Handler to commit to a guild */
  onCommitToGuild: (guildId: GuildType) => void;
  /** Handler to purchase an upgrade */
  onPurchaseUpgrade: (upgradeId: string) => void;
  /** Number formatting function */
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

/**
 * Guild Selection Card - shown before commitment
 */
interface GuildCardProps {
  guild: Guild;
  isSelected: boolean;
  sampledCount: number;
  maxSamples: number;
  onSelect: () => void;
  onCommit: () => void;
  canCommit: boolean;
}

const GuildCard: FC<GuildCardProps> = memo(({ 
  guild, 
  isSelected, 
  sampledCount, 
  maxSamples, 
  onSelect,
  onCommit,
  canCommit 
}) => {
  return (
    <div 
      className={`${styles.guildCard} ${isSelected ? styles.guildCardSelected : ''}`}
      style={{ 
        '--guild-primary': guild.colors.primary,
        '--guild-secondary': guild.colors.secondary,
        '--guild-accent': guild.colors.accent,
        '--guild-background': guild.colors.background,
        '--guild-border': guild.colors.border
      } as React.CSSProperties}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
    >
      <div className={styles.guildEmblem}>
        {guild.id === 'growers' ? (
          <img 
            src={GUILD_GROWERS} 
            alt={`${guild.displayName} Emblem`}
            className={styles.guildEmblemImage}
          />
        ) : (
          <div 
            className={styles.guildEmblemPlaceholder}
            style={{ backgroundColor: guild.colors.primary }}
          >
            {guild.displayName.charAt(0)}
          </div>
        )}
      </div>
      <h3 className={styles.guildName}>{guild.displayName}</h3>
      <p className={styles.guildPhilosophy}>{guild.philosophy}</p>
      <div className={styles.guildFocuses}>
        {guild.focuses.map(focus => (
          <span key={focus} className={styles.guildFocus}>{focus}</span>
        ))}
      </div>
      
      {/* Sampling Progress */}
      {sampledCount > 0 && (
        <div className={styles.samplingProgress}>
          Sampled: {sampledCount}/{maxSamples} upgrades
        </div>
      )}
      
      {/* Show details when selected */}
      {isSelected && (
        <>
          {/* Key Benefits */}
          <div className={styles.cardBenefits}>
            <h4 className={styles.cardBenefitsTitle}>✨ Benefits</h4>
            <ul className={styles.cardBenefitsList}>
              {guild.passiveBonuses.slice(0, 3).map(bonus => (
                <li key={bonus.id} className={styles.cardBenefitItem}>
                  {bonus.description}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Trade-offs */}
          <div className={styles.cardTradeoffs}>
            <h4 className={styles.cardTradeoffsTitle}>⚠️ Trade-offs</h4>
            <ul className={styles.cardTradeoffsList}>
              {guild.tradeOffs.slice(0, 2).map(tradeoff => (
                <li key={tradeoff.id} className={styles.cardTradeoffItem}>
                  {tradeoff.description}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Commit button only for Growers guild (others not yet implemented) */}
          {guild.id === 'growers' && (
            <button 
              className={styles.commitButton}
              onClick={(e) => { e.stopPropagation(); onCommit(); }}
              disabled={!canCommit}
              title={canCommit ? `Commit to ${guild.displayName}` : 'Sample at least one upgrade before committing'}
            >
              Commit to Guild
            </button>
          )}
        </>
      )}
    </div>
  );
});

GuildCard.displayName = 'GuildCard';

/**
 * Guild Upgrade Row Component
 */
interface GuildUpgradeRowProps {
  upgrade: GuildUpgrade;
  currentLevel: number;
  money: number;
  knowledge: number;
  experience: number;
  sigils: number;
  guildTokens: number;
  guildColors: Guild['colors'];
  onPurchase: () => void;
  canPurchase: boolean;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const GuildUpgradeRow: FC<GuildUpgradeRowProps> = memo(({
  upgrade,
  currentLevel,
  money,
  knowledge,
  experience,
  sigils,
  guildTokens,
  guildColors,
  onPurchase,
  canPurchase,
  formatNumber
}) => {
  const cost = upgrade.baseCost * Math.pow(upgrade.costScaling, currentLevel);
  const nextEffect = upgrade.effectPerLevel * (currentLevel + 1);
  const currentEffect = upgrade.effectPerLevel * currentLevel;
  
  const getCurrency = () => {
    switch (upgrade.currencyType) {
      case 'money': return money;
      case 'knowledge': return knowledge;
      case 'experience': return experience;
      case 'sigils': return sigils;
      case 'guildTokens': return guildTokens;
      default: return 0;
    }
  };
  
  const formatCost = () => {
    switch (upgrade.currencyType) {
      case 'money': return `$${formatNumber(cost)}`;
      case 'knowledge': return `${formatNumber(cost)} Kn`;
      case 'sigils': return `${formatNumber(cost)} ✦`;
      case 'guildTokens': return `${formatNumber(cost)} 🎫`;
      default: return formatNumber(cost);
    }
  };
  
  const canAfford = getCurrency() >= cost;
  const isMaxed = upgrade.isOneTime ? upgrade.purchased : currentLevel >= upgrade.maxLevel;
  
  // Build a detailed tooltip
  const tooltipText = `${upgrade.description}\n\nCurrent: ${
    currentLevel === 0 ? 'Not purchased' : upgrade.effectTemplate.replace('{value}', String(Math.round(currentEffect * 100)))
  }${!isMaxed ? `\nNext Level: ${upgrade.effectTemplate.replace('{value}', String(Math.round(nextEffect * 100)))}` : '\nMax level reached!'}`;
  
  return (
    <div 
      className={styles.upgradeRow}
      style={{ borderLeftColor: guildColors.accent }}
      title={tooltipText}
    >
      <div className={styles.upgradeInfo}>
        <h4 className={styles.upgradeName}>{upgrade.name}</h4>
        <p className={styles.upgradeDescription}>{upgrade.description}</p>
        <div className={styles.upgradeEffect}>
          {currentLevel > 0 && (
            <span className={styles.currentEffect}>
              Now: {upgrade.effectTemplate.replace('{value}', String(Math.round(currentEffect * 100)))}
            </span>
          )}
          {!isMaxed && !upgrade.isOneTime && upgrade.maxLevel > 1 && (
            <span className={styles.nextEffect}>
              {currentLevel > 0 ? ' → ' : ''}Next: {upgrade.effectTemplate.replace('{value}', String(Math.round(nextEffect * 100)))}
            </span>
          )}
          {isMaxed && (
            <span className={styles.maxedEffect}>✓ {upgrade.isOneTime ? 'Owned' : 'Max level'}</span>
          )}
        </div>
      </div>
      <div className={styles.upgradeActions}>
        {!upgrade.isOneTime && (
          <div className={styles.upgradeLevel}>
            Lv. {currentLevel}/{upgrade.maxLevel}
          </div>
        )}
        <button
          className={`${styles.upgradeBuyButton} ${!canAfford || isMaxed ? styles.upgradeBuyButtonDisabled : ''}`}
          onClick={onPurchase}
          disabled={!canAfford || isMaxed || !canPurchase}
          style={{ 
            backgroundColor: canAfford && !isMaxed && canPurchase ? guildColors.primary : undefined 
          }}
        >
          {isMaxed 
            ? (upgrade.isOneTime ? 'Owned' : 'MAX') 
            : formatCost()
          }
        </button>
      </div>
    </div>
  );
});

GuildUpgradeRow.displayName = 'GuildUpgradeRow';

/**
 * Committed Guild Panel - shown after commitment
 */
interface CommittedGuildPanelProps {
  guild: Guild;
  guildState: GuildState;
  money: number;
  knowledge: number;
  experience: number;
  onPurchaseUpgrade: (upgradeId: string) => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const CommittedGuildPanel: FC<CommittedGuildPanelProps> = memo(({
  guild,
  guildState,
  money,
  knowledge,
  experience,
  onPurchaseUpgrade,
  formatNumber
}) => {
  // Combine tier 2 and tier 3 upgrades into one list
  const allUpgrades = guild.upgrades.filter(u => u.tier === 2 || u.tier === 3);
  
  // Get sigils for the committed guild
  const sigils = guildState.guildCurrencies[guild.id] ?? 0;
  
  // Calculate current effect values for Growers
  const growthBonus = guild.id === 'growers' ? getGrowersGrowthBonus(guildState) : 0;
  const priceBonus = guild.id === 'growers' ? getGrowersPriceBonus(guildState) : 0;
  const manualHarvestBonus = guild.id === 'growers' ? getGrowersManualHarvestBonus(guildState) : 0;
  const blessedCropChance = guild.id === 'growers' ? getBlessedCropChance(guildState) : 0;
  const qualityGradingChance = guild.id === 'growers' ? getQualityGradingChance(guildState) : 0;
  const beePollinationBonus = guild.id === 'growers' ? getGrowersBeePollinationBonus(guildState) : 0;
  const harvesterSpeedMult = guild.id === 'growers' ? getGrowersHarvesterSpeedMultiplier(guildState) : 1;
  const canningProfitMult = guild.id === 'growers' ? getGrowerCanningProfitMultiplier(guildState) : 1;
  const fertilizerMult = guild.id === 'growers' ? getFertilizerEffectivenessMultiplier(guildState) : 1;
  const hasWhispers = guild.id === 'growers' ? hasWhispersOfSeed(guildState) : false;
  
  return (
    <div 
      className={styles.committedPanel}
      style={{ 
        '--guild-primary': guild.colors.primary,
        '--guild-secondary': guild.colors.secondary,
        '--guild-accent': guild.colors.accent,
        '--guild-background': guild.colors.background,
        '--guild-border': guild.colors.border
      } as React.CSSProperties}
    >
      <div className={styles.committedHeader}>
        <div 
          className={styles.committedEmblem}
          style={{ backgroundColor: guild.colors.primary }}
        >
          {guild.displayName.charAt(0)}
        </div>
        <div className={styles.committedTitleArea}>
          <h2 className={styles.committedTitle}>{guild.displayName}</h2>
          <p className={styles.committedPhilosophy}>{guild.philosophy}</p>
        </div>
        <div className={styles.committedCurrency} title="Sigils - Earned from manual harvests and blessed crops">
          <span className={styles.currencyIcon}>✦</span>
          <span className={styles.currencyAmount}>{formatNumber(sigils)}</span>
          <span className={styles.currencyLabel}>Sigils</span>
        </div>
      </div>
      
      {/* Two-column layout for bonuses/tradeoffs and upgrades */}
      <div className={styles.committedContent}>
        {/* Left Column - Active Effects and Trade-offs */}
        <div className={styles.committedLeftColumn}>
          {/* Active Effects - Computed Values */}
          <div className={styles.bonusesSection}>
            <h3 className={styles.sectionTitle}>✨ Active Effects</h3>
            <div className={styles.bonusesList}>
              {/* Growth Bonus */}
              {growthBonus > 0 && (
                <div className={styles.bonusItem} title="From Fertile Soil and Advanced Fertilizer Research upgrades">
                  <span className={styles.bonusIcon}>🌱</span>
                  <span className={styles.bonusText}>Growth: <span className={styles.bonusValue}>+{formatNumber(growthBonus * 100, 1)}%</span></span>
                </div>
              )}
              
              {/* Price Bonus */}
              {priceBonus > 0 && (
                <div className={styles.bonusItem} title="From Green Thumb and Selective Breeding upgrades">
                  <span className={styles.bonusIcon}>💰</span>
                  <span className={styles.bonusText}>Value: <span className={styles.bonusValue}>+{formatNumber(priceBonus * 100, 1)}%</span></span>
                </div>
              )}
              
              {/* Whispers of the Seed */}
              {hasWhispers && (
                <div className={styles.bonusItem} title="Ancient knowledge grants 10× multiplier to all crop sales">
                  <span className={styles.bonusIcon}>🌟</span>
                  <span className={styles.bonusText}>Whispers: <span className={styles.bonusValue}>10× Price</span></span>
                </div>
              )}
              
              {/* Manual Harvest Bonus */}
              {manualHarvestBonus > 0 && (
                <div className={styles.bonusItem} title="Growers commitment bonus - manual harvests are rewarded">
                  <span className={styles.bonusIcon}>🤲</span>
                  <span className={styles.bonusText}>Manual: <span className={styles.bonusValue}>+{manualHarvestBonus}</span></span>
                </div>
              )}
              
              {/* Blessed Crop Chance */}
              {blessedCropChance > 0 && (
                <div className={styles.bonusItem} title="From Soilbound Pact - chance for double yield on harvest">
                  <span className={styles.bonusIcon}>✨</span>
                  <span className={styles.bonusText}>Blessed: <span className={styles.bonusValue}>{formatNumber(blessedCropChance * 100, 0)}%</span></span>
                </div>
              )}
              
              {/* Quality Grading */}
              {qualityGradingChance > 0 && (
                <div className={styles.bonusItem} title="From Quality Grading - chance for each crop to sell for +50% value">
                  <span className={styles.bonusIcon}>⭐</span>
                  <span className={styles.bonusText}>Quality: <span className={styles.bonusValue}>{formatNumber(qualityGradingChance * 100, 0)}%</span></span>
                </div>
              )}
              
              {/* Fertilizer Effectiveness */}
              {fertilizerMult > 1 && (
                <div className={styles.bonusItem} title="From Verdant Glyphs - boosts all fertilizer upgrades">
                  <span className={styles.bonusIcon}>🌿</span>
                  <span className={styles.bonusText}>Fertilizer: <span className={styles.bonusValue}>+{formatNumber((fertilizerMult - 1) * 100, 0)}%</span></span>
                </div>
              )}
              
              {/* Bee Synergy */}
              {beePollinationBonus > 0 && (
                <div className={styles.bonusItem} title="Growers commitment bonus - enhanced bee productivity">
                  <span className={styles.bonusIcon}>🐝</span>
                  <span className={styles.bonusText}>Bees: <span className={styles.bonusValue}>+{formatNumber(beePollinationBonus * 100, 0)}%</span></span>
                </div>
              )}
              
              {/* Show message if no active bonuses */}
              {growthBonus === 0 && priceBonus === 0 && manualHarvestBonus === 0 && (
                <div className={styles.bonusItem}>
                  <span className={styles.bonusIcon}>📜</span>
                  <span className={styles.bonusText}>Purchase upgrades to unlock</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Trade-offs - with computed penalties */}
          <div className={styles.tradeoffsSection}>
            <h3 className={styles.sectionTitle}>⚖️ Trade-offs</h3>
            <div className={styles.tradeoffsList}>
              {/* Harvester Speed Penalty */}
              {harvesterSpeedMult < 1 && (
                <div className={styles.tradeoffItem} title="Growers prefer the personal touch - automation is less effective">
                  <span className={styles.tradeoffIcon}>🤖</span>
                  <span className={styles.tradeoffText}>Harvester: <span className={styles.penaltyValue}>-{formatNumber((1 - harvesterSpeedMult) * 100, 0)}%</span></span>
                </div>
              )}
              
              {/* Canning Profit Penalty */}
              {canningProfitMult < 1 && (
                <div className={styles.tradeoffItem} title="Raw produce is valued higher than processed goods by Growers">
                  <span className={styles.tradeoffIcon}>🥫</span>
                  <span className={styles.tradeoffText}>Canning: <span className={styles.penaltyValue}>-{formatNumber((1 - canningProfitMult) * 100, 0)}%</span></span>
                </div>
              )}
              
              {/* Show static trade-offs if no computed penalties */}
              {harvesterSpeedMult === 1 && canningProfitMult === 1 && guild.tradeOffs.map(tradeoff => (
                <div key={tradeoff.id} className={styles.tradeoffItem}>
                  <span className={styles.tradeoffIcon}>⚠</span>
                  <span className={styles.tradeoffText}>{tradeoff.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Right Column - Upgrades */}
        <div className={styles.committedRightColumn}>
          <div className={styles.upgradesSection}>
            <h3 className={styles.sectionTitle}>Guild Upgrades</h3>
            {allUpgrades.map(upgrade => (
              <GuildUpgradeRow
                key={upgrade.id}
                upgrade={upgrade}
                currentLevel={guildState.upgradeLevels[upgrade.id] ?? 0}
                money={money}
                knowledge={knowledge}
                experience={experience}
                sigils={sigils}
                guildTokens={guildState.guildTokens}
                guildColors={guild.colors}
                onPurchase={() => onPurchaseUpgrade(upgrade.id)}
                canPurchase={true}
                formatNumber={formatNumber}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

CommittedGuildPanel.displayName = 'CommittedGuildPanel';

/**
 * Main GuildsTab Component
 */
const GuildsTab: FC<GuildsTabProps> = memo(({
  farmTier,
  guildState,
  money,
  knowledge,
  experience,
  introShown,
  onDismissIntro,
  onCommitToGuild,
  onPurchaseUpgrade,
  formatNumber
}) => {
  const [selectedGuild, setSelectedGuild] = useState<GuildType | null>(null);
  const [showCommitConfirm, setShowCommitConfirm] = useState(false);
  const [showIntroOverlay, setShowIntroOverlay] = useState(!introShown);
  
  const isUnlocked = farmTier >= GUILDS_UNLOCK_TIER;
  const isCommitted = guildState.status === 'committed' && guildState.committedGuild !== null;
  
  // Unlock message for locked state
  if (!isUnlocked) {
    const mainContent = (
      <div className={styles.unlockMessage}>
        <div className={styles.unlockCard}>
          <h2 className={styles.unlockTitle}>
            🏛️ Guilds System Locked 🏛️
          </h2>
          <p className={styles.unlockDescription}>
            The Guilds System becomes available when you reach <strong>Farm Tier {GUILDS_UNLOCK_TIER}</strong>.
          </p>
          <p className={styles.unlockDetails}>
            <strong>Current Tier:</strong> {farmTier}
          </p>
          <p className={styles.unlockDetails}>
            <strong>Required Tier:</strong> {GUILDS_UNLOCK_TIER}
          </p>
          <div className={styles.unlockFeatures}>
            <h3>What Guilds Offer:</h3>
            <ul>
              <li>🌱 <strong>Growers Guild:</strong> Enhanced crop growth and manual harvest bonuses</li>
              <li>🥫 <strong>Preservers Guild:</strong> Superior canning and preservation abilities</li>
              <li>⚙️ <strong>Engineers Guild:</strong> Advanced automation and efficiency</li>
              <li>💰 <strong>Merchants Guild:</strong> Better trading and profit margins</li>
            </ul>
          </div>
          <p className={styles.unlockHint}>
            Keep expanding your farm to unlock this feature!
          </p>
        </div>
      </div>
    );
    
    return (
      <BaseTab
        isUnlocked={true}
        mainContent={mainContent}
      />
    );
  }
  
  // Committed state - show guild panel
  if (isCommitted && guildState.committedGuild) {
    const committedGuild = GUILDS.find(g => g.id === guildState.committedGuild);
    if (!committedGuild) return null;
    
    const mainContent = (
      <CommittedGuildPanel
        guild={committedGuild}
        guildState={guildState}
        money={money}
        knowledge={knowledge}
        experience={experience}
        onPurchaseUpgrade={onPurchaseUpgrade}
        formatNumber={formatNumber}
      />
    );
    
    // Sidebar with quick info
    const sidebarContent = (
      <div className={styles.sidebar}>
        <h3 className={styles.sidebarTitle}>Guild Status</h3>
        <div className={styles.sidebarContent}>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Guild:</span>
            <span className={styles.statusValue}>{committedGuild.displayName}</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Joined:</span>
            <span className={styles.statusValue}>Day {guildState.commitmentDay}</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Upgrades:</span>
            <span className={styles.statusValue}>{guildState.purchasedUpgrades.length}</span>
          </div>
        </div>
      </div>
    );
    
    return (
      <BaseTab
        isUnlocked={true}
        mainContent={mainContent}
        sidebarContent={sidebarContent}
        sidebarStyle={{
          background: committedGuild.colors.background,
          border: `1px solid ${committedGuild.colors.border}`,
          color: '#fff'
        }}
      />
    );
  }
  
  // Handler to dismiss intro overlay
  const handleDismissIntro = () => {
    setShowIntroOverlay(false);
    onDismissIntro();
  };

  // Uncommitted state - show guild selection
  const mainContent = (
    <div className={styles.selectionContainer}>
      {/* First-time intro overlay */}
      {showIntroOverlay && (
        <div className={styles.introOverlay} onClick={handleDismissIntro}>
          <div className={styles.introDialog} onClick={e => e.stopPropagation()}>
            <h2 className={styles.introTitle}>Choose Your Path</h2>
            <p className={styles.introDescription}>
              Sample upgrades from different guilds, then commit to one for exclusive benefits.
            </p>
            <p className={styles.introWarning}>
              <strong>⚠️ Warning:</strong> Once committed, you cannot change guilds or access other guild upgrades!
            </p>
            <button className={styles.introButton} onClick={handleDismissIntro}>
              I Understand
            </button>
          </div>
        </div>
      )}
      
      <div className={styles.guildGrid}>
        {GUILDS.map(guild => (
          <GuildCard
            key={guild.id}
            guild={guild}
            isSelected={selectedGuild === guild.id}
            sampledCount={guildState.sampledUpgrades[guild.id]?.length ?? 0}
            maxSamples={MAX_SAMPLED_UPGRADES_PER_GUILD}
            onSelect={() => setSelectedGuild(guild.id)}
            onCommit={() => setShowCommitConfirm(true)}
            canCommit={(guildState.sampledUpgrades[guild.id]?.length ?? 0) > 0}
          />
        ))}
      </div>
      
      {/* Selected Guild Sampling Upgrades */}
      {selectedGuild && (
        <div className={styles.samplingSection}>
          {/* Soft Cap Warning */}
          <div className={styles.softCapWarning}>
            <span className={styles.softCapIcon}>ℹ️</span>
            <span className={styles.softCapText}>
              Sampling upgrades operate at <strong>50% effectiveness</strong> until you commit to this guild.
            </span>
          </div>
          
          {/* Current Effects Preview */}
          {(() => {
            const growthBonus = selectedGuild === 'growers' ? getGrowersGrowthBonus(guildState) : 0;
            const priceBonus = selectedGuild === 'growers' ? getGrowersPriceBonus(guildState) : 0;
            const hasAnyBonus = growthBonus > 0 || priceBonus > 0;
            
            return hasAnyBonus ? (
              <div className={styles.samplingEffects}>
                <span className={styles.samplingEffectsTitle}>Current Effects (at 50%):</span>
                {growthBonus > 0 && (
                  <span className={styles.samplingEffect}>🌱 +{formatNumber(growthBonus * 100, 1)}% Growth</span>
                )}
                {priceBonus > 0 && (
                  <span className={styles.samplingEffect}>💰 +{formatNumber(priceBonus * 100, 1)}% Value</span>
                )}
              </div>
            ) : null;
          })()}
          
          <div className={styles.samplingUpgrades}>
            {getSamplingUpgrades(selectedGuild).map(upgrade => {
              const guild = GUILDS.find(g => g.id === selectedGuild)!;
              const currentLevel = guildState.upgradeLevels[upgrade.id] ?? 0;
              const sampledCount = guildState.sampledUpgrades[selectedGuild]?.length ?? 0;
              const alreadySampled = guildState.sampledUpgrades[selectedGuild]?.includes(upgrade.id);
              const canSample = alreadySampled || sampledCount < MAX_SAMPLED_UPGRADES_PER_GUILD;
              
              return (
                <GuildUpgradeRow
                  key={upgrade.id}
                  upgrade={upgrade}
                  currentLevel={currentLevel}
                  money={money}
                  knowledge={knowledge}
                  experience={experience}
                  sigils={guildState.guildCurrencies[selectedGuild] ?? 0}
                  guildTokens={guildState.guildTokens}
                  guildColors={guild.colors}
                  onPurchase={() => onPurchaseUpgrade(upgrade.id)}
                  canPurchase={canSample}
                  formatNumber={formatNumber}
                />
              );
            })}
          </div>
        </div>
      )}
      
      {/* Commitment Confirmation Dialog */}
      {showCommitConfirm && selectedGuild && (
        <div className={styles.confirmOverlay} onClick={() => setShowCommitConfirm(false)}>
          <div className={styles.confirmDialog} onClick={e => e.stopPropagation()}>
            <h3>Commit to {GUILDS.find(g => g.id === selectedGuild)?.displayName}?</h3>
            <p className={styles.confirmWarning}>
              ⚠️ This action is <strong>permanent</strong>! You will:
            </p>
            <ul className={styles.confirmList}>
              <li>Gain access to exclusive guild upgrades</li>
              <li>Receive guild-specific passive bonuses</li>
              <li>Lose access to other guild upgrades</li>
              <li>Accept guild trade-offs and penalties</li>
            </ul>
            <div className={styles.confirmButtons}>
              <button 
                className={styles.confirmCancel}
                onClick={() => setShowCommitConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.confirmCommit}
                style={{ 
                  backgroundColor: GUILDS.find(g => g.id === selectedGuild)?.colors.primary 
                }}
                onClick={() => {
                  onCommitToGuild(selectedGuild);
                  setShowCommitConfirm(false);
                }}
              >
                Commit Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  return (
    <BaseTab
      isUnlocked={true}
      mainContent={mainContent}
    />
  );
});

GuildsTab.displayName = 'GuildsTab';

export default GuildsTab;
