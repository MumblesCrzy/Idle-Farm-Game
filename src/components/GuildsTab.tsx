/**
 * Guilds Tab Component
 * 
 * Main tab for the guild system where players:
 * - View available guilds before commitment
 * - Sample tier 1 upgrades from multiple guilds
 * - Commit to a single guild
 * - Access guild-specific upgrades post-commitment
 *
 * Every state fits a 1600x1000 window, and nothing changes size as the player clicks around:
 * guild cards are one size, the picked guild shows in a panel of fixed height, and Guild
 * Tokens, Guild Status and the Legacy sit in the sidebar.
 */

import { memo, useCallback, useId, useState, type CSSProperties, type FC, type ReactNode } from 'react';
import BaseTab from './BaseTab';
import LockedFeatureCard from './LockedFeatureCard';
import InlineIcon from './InlineIcon';
import { CANNING_BATCH_CANNING, CANNING_CANNER, CANNING_QUICK_HANDS, GUILD_ENGINEERS, GUILD_GROWERS, GUILD_MERCHANTS, GUILD_PRESERVERS, ICON_BEE, ICON_BLESSED_CROP, ICON_CANNING, ICON_GROWING, ICON_GUILDS, ICON_GUILD_TOKEN, ICON_HARVEST, ICON_HONEY, ICON_IDEA, ICON_MONEY, ICON_SCROLL, ICON_UPGRADE, ICON_WARNING, RIBBON_BLUE, RIBBON_FIRST, UPGRADE_AUTO_HARVESTER, UPGRADE_FERTILIZER, UPGRADE_HEIRLOOM_SEEDS } from '../config/assetPaths';
import type { GuildType, GuildState, Guild, GuildUpgrade } from '../types/guilds';
import { GUILDS, GUILDS_UNLOCK_TIER, GUILD_TOKEN_SOURCES, MAX_SAMPLED_UPGRADES_PER_GUILD, getSamplingUpgrades } from '../data/guildData';
import LegacyPanel from './LegacyPanel';
import LegacyDialog from './LegacyDialog';
import { LEGACY_FARM_TIER, canEndLegacy, legacyNumeral, type LegacyResetSummary } from '../utils/legacy';
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
  getCannerRewardDivisor,
  getHoneyGlazeBonus,
  getPreserversTimeMultiplier,
  getPreserversValueBonus,
  getPressureCannerJars,
  getPrizeJarChance,
  getRecipeMasteryBonus,
  getGuildUpgradeCost,
  getKeptLevel,
  getUpgradeLevel,
} from '../utils/guildCalculations';
import { useFocusTrap } from '../hooks/useFocusTrap';
import styles from './GuildsTab.module.css';

interface GuildsTabProps {
  /**
   * Whether the Guilds tab is showing. App keeps hidden tabs mounted, so dialogs
   * only take focus and answer Escape while this is true. Defaults to true.
   */
  isActive?: boolean;
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
  /** Ends the Legacy with the unlock to keep; members see the End Legacy button when given */
  onEndLegacy?: (pickedUnlock: string | null) => void;
  /** What the End Legacy dialog shows under "Back to the start" */
  legacyReset?: LegacyResetSummary;
  /** Number formatting function */
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

/** A guild's colors as CSS variables, for its card, its panel and its member page */
const guildColorVars = (guild: Guild): CSSProperties => ({
  '--guild-primary': guild.colors.primary,
  '--guild-secondary': guild.colors.secondary,
  '--guild-accent': guild.colors.accent,
  '--guild-background': guild.colors.background,
  '--guild-border': guild.colors.border
} as CSSProperties);

/**
 * Guild Selection Card - shown before commitment. Every card has the same size and content,
 * picked or not; the picked guild's details show in the panel below the cards.
 */
interface GuildCardProps {
  guild: Guild;
  isSelected: boolean;
  sampledCount: number;
  maxSamples: number;
  onSelect: (guildId: GuildType) => void;
}

const GuildCard: FC<GuildCardProps> = memo(({ guild, isSelected, sampledCount, maxSamples, onSelect }) => (
  <button
    type="button"
    className={`${styles.guildCard} ${isSelected ? styles.guildCardSelected : ''}`}
    style={guildColorVars(guild)}
    onClick={() => onSelect(guild.id)}
    aria-pressed={isSelected}
  >
    <img src={guild.emblem} alt="" className={styles.guildEmblemImage} />
    <span className={styles.guildName}>{guild.displayName}</span>
    <span className={styles.guildCardStatus}>
      {sampledCount > 0 ? `Sampled ${sampledCount} of ${maxSamples}` : 'Nothing sampled yet'}
    </span>
    <span className={styles.guildCardJoin}>{guild.joinable ? 'Open to join' : 'Joining opens later'}</span>
  </button>
));

GuildCard.displayName = 'GuildCard';

/**
 * The picked guild in full, in a panel of fixed height below the cards: its benefits and
 * trade-offs, its starter upgrades and the commit button. With no guild picked yet, it
 * explains the choice.
 */
interface GuildDetailPanelProps {
  guild: Guild | undefined;
  guildState: GuildState;
  money: number;
  knowledge: number;
  experience: number;
  onPurchaseUpgrade: (upgradeId: string) => void;
  onCommit: () => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const GuildDetailPanel: FC<GuildDetailPanelProps> = ({
  guild,
  guildState,
  money,
  knowledge,
  experience,
  onPurchaseUpgrade,
  onCommit,
  formatNumber
}) => {
  const titleId = useId();

  if (!guild) {
    return (
      <section className={`${styles.detailPanel} ${styles.detailPanelEmpty}`} aria-labelledby={titleId}>
        <img src={ICON_GUILDS} alt="" className={styles.detailEmptyIcon} />
        <h3 id={titleId} className={styles.detailEmptyTitle}>Pick a guild to see what it offers</h3>
        <ul className={styles.detailEmptyList}>
          <li>Each guild shows its benefits, its trade-offs and two starter upgrades.</li>
          <li>Starter upgrades cost Guild Tokens and work at half strength until you join.</li>
          <li>Sample at least one of a guild's starter upgrades before you join it.</li>
          <li>Joining is for good, until you end a Legacy at Farm Tier {LEGACY_FARM_TIER}.</li>
        </ul>
      </section>
    );
  }

  const sampled = guildState.sampledUpgrades[guild.id] ?? [];
  const canCommit = sampled.length > 0;

  // What the sampled upgrades do now, at half strength
  const growthBonus = guild.id === 'growers' ? getGrowersGrowthBonus(guildState) : 0;
  const priceBonus = guild.id === 'growers' ? getGrowersPriceBonus(guildState) : 0;
  const jarBonus = guild.id === 'preservers' ? getPreserversValueBonus(guildState) : 0;
  const timeCut = guild.id === 'preservers' ? 1 - getPreserversTimeMultiplier(guildState) : 0;
  const hasAnyBonus = growthBonus > 0 || priceBonus > 0 || jarBonus > 0 || timeCut > 0;

  return (
    <section className={styles.detailPanel} style={guildColorVars(guild)} aria-labelledby={titleId}>
      <div className={styles.detailHeader}>
        <img src={guild.emblem} alt="" className={styles.detailEmblem} />
        <div className={styles.detailTitleArea}>
          <h3 id={titleId} className={styles.detailTitle}>{guild.displayName}</h3>
          <p className={styles.detailPhilosophy}>{guild.philosophy}</p>
          <div className={styles.guildFocuses}>
            {guild.focuses.map(focus => (
              <span key={focus} className={styles.guildFocus}>{focus}</span>
            ))}
          </div>
        </div>
        <div className={styles.detailAction}>
          {guild.joinable ? (
            <button
              type="button"
              className={styles.commitButton}
              onClick={onCommit}
              disabled={!canCommit}
              title={canCommit ? `Commit to ${guild.displayName}` : 'Sample at least one upgrade before committing'}
            >
              Commit to Guild
            </button>
          ) : (
            <span className={styles.comingLater}>Joining opens in a later update</span>
          )}
        </div>
      </div>

      <div className={styles.detailBody}>
        <div className={styles.detailColumn}>
          <h4 className={styles.detailCaption}><InlineIcon src={ICON_UPGRADE} size={16} gap={6} />Benefits</h4>
          <ul className={styles.detailList}>
            {guild.passiveBonuses.map(bonus => (
              <li key={bonus.id}>{bonus.description}</li>
            ))}
          </ul>
          <h4 className={styles.detailCaption}><InlineIcon src={ICON_WARNING} size={16} gap={6} />Trade-offs</h4>
          <ul className={`${styles.detailList} ${styles.detailTradeoffs}`}>
            {guild.tradeOffs.map(tradeoff => (
              <li key={tradeoff.id}>{tradeoff.description}</li>
            ))}
          </ul>
        </div>

        <div className={styles.detailColumn}>
          <h4 className={styles.detailCaption}>
            <InlineIcon src={ICON_GUILD_TOKEN} size={16} gap={6} />Starter upgrades
            <span className={styles.sampleCount}>Sampled {sampled.length} of {MAX_SAMPLED_UPGRADES_PER_GUILD}</span>
          </h4>
          <p className={styles.softCapText}>
            <InlineIcon src={ICON_IDEA} size={14} gap={6} />They work at <strong>50% effectiveness</strong> until you join this guild.
          </p>
          <div className={styles.samplingUpgrades}>
            {getSamplingUpgrades(guild.id).map(upgrade => {
              const currentLevel = getUpgradeLevel(guildState, upgrade.id);
              const canSample = sampled.includes(upgrade.id) || sampled.length < MAX_SAMPLED_UPGRADES_PER_GUILD;
              return (
                <GuildUpgradeRow
                  key={upgrade.id}
                  upgrade={upgrade}
                  currentLevel={currentLevel}
                  owned={currentLevel > 0}
                  keptLevel={getKeptLevel(guildState, upgrade.id)}
                  money={money}
                  knowledge={knowledge}
                  experience={experience}
                  guildCurrency={guildState.guildCurrencies[guild.id] ?? 0}
                  guildCurrencyIcon={guild.currency.icon}
                  guildTokens={guildState.guildTokens}
                  guildColors={guild.colors}
                  onPurchase={onPurchaseUpgrade}
                  canPurchase={canSample}
                  formatNumber={formatNumber}
                />
              );
            })}
          </div>
          {/* Always holds its line, so the panel stays still when the first sample is bought */}
          <div className={styles.samplingEffects}>
            <span className={styles.samplingEffectsTitle}>Current Effects (at 50%):</span>
            {!hasAnyBonus && <span className={styles.samplingNone}>none yet</span>}
            {growthBonus > 0 && (
              <span className={styles.samplingEffect}><InlineIcon src={ICON_GROWING} size={14} gap={3} />+{formatNumber(growthBonus * 100, 1)}% Growth</span>
            )}
            {priceBonus > 0 && (
              <span className={styles.samplingEffect}><InlineIcon src={ICON_MONEY} size={14} gap={3} />+{formatNumber(priceBonus * 100, 1)}% Value</span>
            )}
            {jarBonus > 0 && (
              <span className={styles.samplingEffect}><InlineIcon src={ICON_CANNING} size={14} gap={3} />+{formatNumber(jarBonus * 100, 1)}% Jar Value</span>
            )}
            {timeCut > 0 && (
              <span className={styles.samplingEffect}><InlineIcon src={CANNING_QUICK_HANDS} size={14} gap={3} />-{formatNumber(timeCut * 100, 1)}% Canning Time</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};


/** An upgrade's effect text for a whole effect: percentages show effect x 100, numbers as they are */
const effectText = (upgrade: GuildUpgrade, effect: number): string =>
  upgrade.effectTemplate.replace('{value}', String(upgrade.effectDisplay === 'number' ? effect : Math.round(effect * 100)));

/**
 * Guild Upgrade Row Component
 */
interface GuildUpgradeRowProps {
  upgrade: GuildUpgrade;
  currentLevel: number;
  /** Whether a one-time upgrade is owned, bought or kept from a Legacy */
  owned: boolean;
  /** Levels kept from earlier Legacies, shown beside the level */
  keptLevel?: number;
  money: number;
  knowledge: number;
  experience: number;
  /** The guild's own currency on hand (Sigils, Wax Seals) */
  guildCurrency: number;
  /** That currency's icon */
  guildCurrencyIcon: string;
  guildTokens: number;
  guildColors: Guild['colors'];
  onPurchase: (upgradeId: string) => void;
  canPurchase: boolean;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const GuildUpgradeRow: FC<GuildUpgradeRowProps> = memo(({
  upgrade,
  currentLevel,
  owned,
  keptLevel = 0,
  money,
  knowledge,
  experience,
  guildCurrency,
  guildCurrencyIcon,
  guildTokens,
  guildColors,
  onPurchase,
  canPurchase,
  formatNumber
}) => {
  const cost = getGuildUpgradeCost(upgrade, currentLevel);
  const nextEffect = upgrade.effectPerLevel * (currentLevel + 1);
  const currentEffect = upgrade.effectPerLevel * currentLevel;
  
  const getCurrency = () => {
    switch (upgrade.currencyType) {
      case 'money': return money;
      case 'knowledge': return knowledge;
      case 'experience': return experience;
      case 'sigils':
      case 'guildCurrency': return guildCurrency;
      case 'guildTokens': return guildTokens;
      default: return 0;
    }
  };
  
  const formatCost = () => {
    switch (upgrade.currencyType) {
      case 'money': return `$${formatNumber(cost)}`;
      case 'knowledge': return `${formatNumber(cost)} Kn`;
      case 'sigils':
      case 'guildCurrency': return <>{formatNumber(cost)} <InlineIcon src={guildCurrencyIcon} size={14} /></>;
      case 'guildTokens': return <>{formatNumber(cost)} <InlineIcon src={ICON_GUILD_TOKEN} size={14} /></>;
      default: return formatNumber(cost);
    }
  };
  
  const canAfford = getCurrency() >= cost;
  const isMaxed = upgrade.isOneTime ? owned : currentLevel >= upgrade.maxLevel;

  // The description lives in the tooltip, which keeps every row the same height
  const tooltipText = `${upgrade.description}\n\nCurrent: ${
    currentLevel === 0 ? 'Not purchased' : effectText(upgrade, currentEffect)
  }${!isMaxed ? `\nNext Level: ${effectText(upgrade, nextEffect)}` : '\nMax level reached!'}`;

  return (
    <div
      className={styles.upgradeRow}
      style={{ borderLeftColor: guildColors.accent }}
      title={tooltipText}
    >
      <div className={styles.upgradeInfo}>
        <h4 className={styles.upgradeName}>{upgrade.name}</h4>
        <div className={styles.upgradeEffect}>
          {/* A one-time upgrade not owned yet says what it gives */}
          {upgrade.isOneTime && !owned && (
            <span className={styles.nextEffect}>{effectText(upgrade, upgrade.effectPerLevel)}</span>
          )}
          {currentLevel > 0 && (
            <span className={styles.currentEffect}>
              Now: {effectText(upgrade, currentEffect)}
            </span>
          )}
          {!isMaxed && !upgrade.isOneTime && (upgrade.maxLevel > 1 || currentLevel === 0) && (
            <span className={styles.nextEffect}>
              {currentLevel > 0 ? ' → ' : ''}Next: {effectText(upgrade, nextEffect)}
            </span>
          )}
          {isMaxed && (
            <span className={styles.maxedEffect}>✓ {upgrade.isOneTime ? (keptLevel > 0 ? 'Kept from Legacy' : 'Owned') : 'Max level'}</span>
          )}
        </div>
      </div>
      <div className={styles.upgradeActions}>
        {!upgrade.isOneTime && (
          <div className={styles.upgradeLevel}>
            Lv. {currentLevel}/{upgrade.maxLevel}
            {keptLevel > 0 && <span className={styles.legacyMark}>{keptLevel} from Legacy</span>}
          </div>
        )}
        <button
          className={`${styles.upgradeBuyButton} ${!canAfford || isMaxed ? styles.upgradeBuyButtonDisabled : ''}`}
          onClick={() => onPurchase(upgrade.id)}
          disabled={!canAfford || isMaxed || !canPurchase}
          style={{
            backgroundColor: canAfford && !isMaxed && canPurchase ? guildColors.primary : undefined
          }}
        >
          {isMaxed
            ? (upgrade.isOneTime ? (keptLevel > 0 ? 'Kept' : 'Owned') : 'MAX')
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
  
  // The committed guild's own currency
  const currencyAmount = guildState.guildCurrencies[guild.id] ?? 0;
  
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

  // Preservers effects
  const isPreservers = guild.id === 'preservers';
  const jarValueBonus = isPreservers ? getPreserversValueBonus(guildState) : 0;
  const canningTimeCut = isPreservers ? 1 - getPreserversTimeMultiplier(guildState) : 0;
  const jarsPerBatch = isPreservers ? getPressureCannerJars(guildState) : 1;
  const honeyGlaze = isPreservers ? getHoneyGlazeBonus(guildState) : 0;
  const masteryTop = isPreservers ? getRecipeMasteryBonus(guildState, Number.MAX_SAFE_INTEGER) : 0;
  const prizeChance = isPreservers ? getPrizeJarChance(guildState) : 0;
  const cannerDivisor = isPreservers ? getCannerRewardDivisor(guildState) : 10;
  const hasEffects = growthBonus > 0 || priceBonus > 0 || manualHarvestBonus > 0 || jarValueBonus > 0 || canningTimeCut > 0;

  return (
    <div className={styles.committedPanel} style={guildColorVars(guild)}>
      <div className={styles.committedHeader}>
        <div
          className={styles.committedEmblem}
          style={{ backgroundColor: guild.colors.primary }}
        >
          <img src={guild.emblem} alt="" className={styles.committedEmblemImage} />
        </div>
        <div className={styles.committedTitleArea}>
          <h2 className={styles.committedTitle}>{guild.displayName}</h2>
          <p className={styles.committedPhilosophy}>{guild.philosophy}</p>
        </div>
        <div className={styles.committedCurrency} title={`${guild.currency.name} - ${guild.currency.earnedFrom}`}>
          <InlineIcon src={guild.currency.icon} size={24} className={styles.currencyIcon} />
          <span className={styles.currencyAmount}>{formatNumber(currencyAmount)}</span>
          <span className={styles.currencyLabel}>{guild.currency.name}</span>
        </div>
      </div>

      {/* Active effects beside the trade-offs, in one band above the upgrades */}
      <div className={styles.effectsBar}>
        <div className={styles.bonusesSection}>
          <h3 className={styles.sectionTitle}><InlineIcon src={ICON_UPGRADE} size={18} gap={6} />Active Effects</h3>
          <div className={styles.bonusesList}>
            {growthBonus > 0 && (
              <div className={styles.bonusItem} title="From Fertile Soil and Advanced Fertilizer Research upgrades">
                <InlineIcon src={ICON_GROWING} size={18} className={styles.bonusIcon} />
                <span className={styles.bonusText}>Growth: <span className={styles.bonusValue}>+{formatNumber(growthBonus * 100, 1)}%</span></span>
              </div>
            )}
            {priceBonus > 0 && (
              <div className={styles.bonusItem} title="From Green Thumb and Selective Breeding upgrades">
                <InlineIcon src={ICON_MONEY} size={18} className={styles.bonusIcon} />
                <span className={styles.bonusText}>Value: <span className={styles.bonusValue}>+{formatNumber(priceBonus * 100, 1)}%</span></span>
              </div>
            )}
            {hasWhispers && (
              <div className={styles.bonusItem} title="Ancient knowledge grants 10× multiplier to all crop sales">
                <InlineIcon src={UPGRADE_HEIRLOOM_SEEDS} size={18} className={styles.bonusIcon} />
                <span className={styles.bonusText}>Whispers: <span className={styles.bonusValue}>10× Price</span></span>
              </div>
            )}
            {manualHarvestBonus > 0 && (
              <div className={styles.bonusItem} title="Growers commitment bonus - manual harvests are rewarded">
                <InlineIcon src={ICON_HARVEST} size={18} className={styles.bonusIcon} />
                <span className={styles.bonusText}>Manual: <span className={styles.bonusValue}>+{manualHarvestBonus}</span></span>
              </div>
            )}
            {blessedCropChance > 0 && (
              <div className={styles.bonusItem} title="From Soilbound Pact - chance for double yield on harvest">
                <InlineIcon src={ICON_BLESSED_CROP} size={18} className={styles.bonusIcon} />
                <span className={styles.bonusText}>Blessed: <span className={styles.bonusValue}>{formatNumber(blessedCropChance * 100, 0)}%</span></span>
              </div>
            )}
            {qualityGradingChance > 0 && (
              <div className={styles.bonusItem} title="From Quality Grading - chance for each crop to sell for +50% value">
                <InlineIcon src={RIBBON_BLUE} size={18} className={styles.bonusIcon} />
                <span className={styles.bonusText}>Quality: <span className={styles.bonusValue}>{formatNumber(qualityGradingChance * 100, 0)}%</span></span>
              </div>
            )}
            {fertilizerMult > 1 && (
              <div className={styles.bonusItem} title="From Verdant Glyphs - boosts all fertilizer upgrades">
                <InlineIcon src={UPGRADE_FERTILIZER} size={18} className={styles.bonusIcon} />
                <span className={styles.bonusText}>Fertilizer: <span className={styles.bonusValue}>+{formatNumber((fertilizerMult - 1) * 100, 0)}%</span></span>
              </div>
            )}
            {beePollinationBonus > 0 && (
              <div className={styles.bonusItem} title="Growers commitment bonus - enhanced bee productivity">
                <InlineIcon src={ICON_BEE} size={18} className={styles.bonusIcon} />
                <span className={styles.bonusText}>Bees: <span className={styles.bonusValue}>+{formatNumber(beePollinationBonus * 100, 0)}%</span></span>
              </div>
            )}
            {jarValueBonus > 0 && (
              <div className={styles.bonusItem} title="From Master Preserver, Tight Lids and Cellar Aging">
                <InlineIcon src={ICON_CANNING} size={18} className={styles.bonusIcon} />
                <span className={styles.bonusText}>Jar value: <span className={styles.bonusValue}>+{formatNumber(jarValueBonus * 100, 0)}%</span></span>
              </div>
            )}
            {canningTimeCut > 0 && (
              <div className={styles.bonusItem} title="From Rolling Boil and Copper Kettles">
                <InlineIcon src={CANNING_QUICK_HANDS} size={18} className={styles.bonusIcon} />
                <span className={styles.bonusText}>Canning time: <span className={styles.bonusValue}>-{formatNumber(canningTimeCut * 100, 1)}%</span></span>
              </div>
            )}
            {jarsPerBatch > 1 && (
              <div className={styles.bonusItem} title="From the Pressure Canner - every batch makes this many jars">
                <InlineIcon src={CANNING_BATCH_CANNING} size={18} className={styles.bonusIcon} />
                <span className={styles.bonusText}>Jars per batch: <span className={styles.bonusValue}>{jarsPerBatch}</span></span>
              </div>
            )}
            {honeyGlaze > 0 && (
              <div className={styles.bonusItem} title="From Honey Glaze - honey recipes sell for more">
                <InlineIcon src={ICON_HONEY} size={18} className={styles.bonusIcon} />
                <span className={styles.bonusText}>Honey recipes: <span className={styles.bonusValue}>+{formatNumber(honeyGlaze * 100, 0)}%</span></span>
              </div>
            )}
            {masteryTop > 0 && (
              <div className={styles.bonusItem} title="From the Family Cookbook - recipes made 25, 100 and 500 times sell for +10%, +25% and +50%">
                <InlineIcon src={RIBBON_FIRST} size={18} className={styles.bonusIcon} />
                <span className={styles.bonusText}>Recipe Mastery: <span className={styles.bonusValue}>up to +{formatNumber(masteryTop * 100, 0)}%</span></span>
              </div>
            )}
            {prizeChance > 0 && (
              <div className={styles.bonusItem} title="From Seal of Quality - a Prize Jar sells for double, and pays an extra Wax Seal on batches you start">
                <InlineIcon src={RIBBON_BLUE} size={18} className={styles.bonusIcon} />
                <span className={styles.bonusText}>Prize Jars: <span className={styles.bonusValue}>{formatNumber(prizeChance * 100, 0)}%</span></span>
              </div>
            )}
            {isPreservers && cannerDivisor < 10 && (
              <div className={styles.bonusItem} title="From Trusted Apprentice - Canner batches give half the knowledge and canning experience">
                <InlineIcon src={CANNING_CANNER} size={18} className={styles.bonusIcon} />
                <span className={styles.bonusText}>Canner rewards: <span className={styles.bonusValue}>1/{cannerDivisor}</span></span>
              </div>
            )}
            {!hasEffects && (
              <div className={styles.bonusItem}>
                <InlineIcon src={ICON_SCROLL} size={18} className={styles.bonusIcon} />
                <span className={styles.bonusText}>Purchase upgrades to unlock</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.tradeoffsSection}>
          <h3 className={styles.sectionTitle}><InlineIcon src={ICON_WARNING} size={18} gap={6} />Trade-offs</h3>
          <div className={styles.tradeoffsList}>
            {harvesterSpeedMult < 1 && (
              <div className={styles.tradeoffItem} title="Growers prefer the personal touch - automation is less effective">
                <InlineIcon src={UPGRADE_AUTO_HARVESTER} size={18} className={styles.tradeoffIcon} />
                <span className={styles.tradeoffText}>Harvester: <span className={styles.penaltyValue}>-{formatNumber((1 - harvesterSpeedMult) * 100, 0)}%</span></span>
              </div>
            )}
            {canningProfitMult < 1 && (
              <div className={styles.tradeoffItem} title="Raw produce is valued higher than processed goods by Growers">
                <InlineIcon src={ICON_CANNING} size={18} className={styles.tradeoffIcon} />
                <span className={styles.tradeoffText}>Canning: <span className={styles.penaltyValue}>-{formatNumber((1 - canningProfitMult) * 100, 0)}%</span></span>
              </div>
            )}
            {/* Static trade-offs when there are no computed penalties */}
            {harvesterSpeedMult === 1 && canningProfitMult === 1 && guild.tradeOffs.map(tradeoff => (
              <div key={tradeoff.id} className={styles.tradeoffItem}>
                <InlineIcon src={ICON_WARNING} size={18} className={styles.tradeoffIcon} />
                <span className={styles.tradeoffText}>{tradeoff.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Every upgrade, two to a row */}
      <div className={styles.upgradesSection}>
        <h3 className={styles.sectionTitle}>Guild Upgrades</h3>
        <div className={styles.upgradesGrid}>
          {allUpgrades.map(upgrade => (
            <GuildUpgradeRow
              key={upgrade.id}
              upgrade={upgrade}
              currentLevel={getUpgradeLevel(guildState, upgrade.id)}
              owned={getUpgradeLevel(guildState, upgrade.id) > 0}
              keptLevel={getKeptLevel(guildState, upgrade.id)}
              money={money}
              knowledge={knowledge}
              experience={experience}
              guildCurrency={currencyAmount}
              guildCurrencyIcon={guild.currency.icon}
              guildTokens={guildState.guildTokens}
              guildColors={guild.colors}
              onPurchase={onPurchaseUpgrade}
              canPurchase={true}
              formatNumber={formatNumber}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

CommittedGuildPanel.displayName = 'CommittedGuildPanel';

/**
 * Modal shell for the guild dialogs: Escape and backdrop clicks close it,
 * and Tab keeps focus inside it
 */
interface GuildDialogProps {
  /** Take focus and answer Escape; false while the tab is hidden */
  active: boolean;
  overlayClassName: string;
  dialogClassName: string;
  /** id of the heading that names the dialog */
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
}

const GuildDialog: FC<GuildDialogProps> = ({
  active,
  overlayClassName,
  dialogClassName,
  labelledBy,
  onClose,
  children
}) => {
  const { containerRef, handleTabKey } = useFocusTrap(active, onClose);

  return (
    <div className={overlayClassName} onClick={onClose}>
      <div
        ref={containerRef}
        className={dialogClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleTabKey}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * Main GuildsTab Component
 */
const GuildsTab: FC<GuildsTabProps> = memo(({
  isActive = true,
  farmTier,
  guildState,
  money,
  knowledge,
  experience,
  introShown,
  onDismissIntro,
  onCommitToGuild,
  onPurchaseUpgrade,
  onEndLegacy,
  legacyReset,
  formatNumber
}) => {
  const [selectedGuild, setSelectedGuild] = useState<GuildType | null>(null);
  const [showCommitConfirm, setShowCommitConfirm] = useState(false);
  const [showIntroOverlay, setShowIntroOverlay] = useState(!introShown);
  const [showLegacyDialog, setShowLegacyDialog] = useState(false);
  const introTitleId = useId();
  const confirmTitleId = useId();

  // Stable handlers keep the memoized guild cards from re-rendering on every tick
  const openCommitConfirm = useCallback(() => setShowCommitConfirm(true), []);
  const closeCommitConfirm = useCallback(() => setShowCommitConfirm(false), []);
  const openLegacyDialog = useCallback(() => setShowLegacyDialog(true), []);
  const closeLegacyDialog = useCallback(() => setShowLegacyDialog(false), []);

  // Handler to dismiss intro overlay
  const handleDismissIntro = useCallback(() => {
    setShowIntroOverlay(false);
    onDismissIntro();
  }, [onDismissIntro]);

  const isUnlocked = farmTier >= GUILDS_UNLOCK_TIER;
  const isCommitted = guildState.status === 'committed' && guildState.committedGuild !== null;
  // The Legacy box shows once a Legacy has ended
  const legacy = (guildState.legacy?.count ?? 0) > 0 ? guildState.legacy : undefined;

  // Unlock message for locked state
  if (!isUnlocked) {
    // A player carrying a Legacy sees it first, with a short note on when the guilds open
    const mainContent = legacy ? (
      <div className={styles.legacyLockedLayout}>
        <LegacyPanel legacy={legacy} guildsUnlocked={false} />
        <section className={styles.lockedNote} aria-labelledby="guilds-locked-heading">
          <h2 id="guilds-locked-heading" className={styles.lockedNoteTitle}>
            <InlineIcon src={ICON_GUILDS} size={22} gap={8} />Guilds unlock at Farm Tier {GUILDS_UNLOCK_TIER}
          </h2>
          <p className={styles.lockedNoteText}>
            You are at Farm Tier {farmTier}. Your Legacy works meanwhile; choose a guild again when you get there, the same one or another.
          </p>
          <ul className={styles.lockedNoteGuilds}>
            <li><InlineIcon src={GUILD_GROWERS} size={18} gap={6} />Growers</li>
            <li><InlineIcon src={GUILD_PRESERVERS} size={18} gap={6} />Preservers</li>
            <li><InlineIcon src={GUILD_ENGINEERS} size={18} gap={6} />Engineers, later</li>
            <li><InlineIcon src={GUILD_MERCHANTS} size={18} gap={6} />Merchants, later</li>
          </ul>
        </section>
      </div>
    ) : (
      <LockedFeatureCard
        theme="dark"
        icon={<InlineIcon src={ICON_GUILDS} size={24} />}
        featureName="Guilds System"
        currentTier={farmTier}
        requiredTier={GUILDS_UNLOCK_TIER}
        featuresTitle="What Guilds Offer:"
        hint="Keep expanding your farm to unlock this feature!"
      >
        <li><InlineIcon src={GUILD_GROWERS} size={18} gap={6} /><strong>Growers Guild:</strong> Enhanced crop growth and manual harvest bonuses</li>
        <li><InlineIcon src={GUILD_PRESERVERS} size={18} gap={6} /><strong>Preservers Guild:</strong> Superior canning and preservation abilities</li>
        <li><InlineIcon src={GUILD_ENGINEERS} size={18} gap={6} /><strong>Engineers Guild:</strong> Advanced automation and efficiency</li>
        <li><InlineIcon src={GUILD_MERCHANTS} size={18} gap={6} /><strong>Merchants Guild:</strong> Better trading and profit margins</li>
      </LockedFeatureCard>
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
    
    // Sidebar: the member's status, the way out, and the Legacy so far, in the guild's colors
    const sidebarContent = (
      <div
        className={`${styles.sidebar} ${styles.sidebarBox}`}
        style={{ background: committedGuild.colors.background, borderColor: committedGuild.colors.border }}
      >
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
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Legacy:</span>
            <span className={styles.statusValue}>{legacyNumeral((guildState.legacy?.count ?? 0) + 1)}</span>
          </div>
        </div>
        {onEndLegacy && legacyReset && (
          <button
            type="button"
            className={styles.legacyButton}
            onClick={openLegacyDialog}
            disabled={!canEndLegacy(guildState, farmTier)}
            title={canEndLegacy(guildState, farmTier)
              ? 'Start the farm over and keep half your guild levels, one unlock and your special achievements'
              : `Available at Farm Tier ${LEGACY_FARM_TIER}`}
          >
            <InlineIcon src={ICON_SCROLL} size={18} gap={8} />End Legacy…
          </button>
        )}
        {legacy && <LegacyPanel legacy={legacy} guildsUnlocked compact />}
      </div>
    );

    // The guild's panel and the sidebar side by side, always the same height
    const mainContent = (
      <>
        <div className={styles.guildsLayout}>
          <CommittedGuildPanel
            guild={committedGuild}
            guildState={guildState}
            money={money}
            knowledge={knowledge}
            experience={experience}
            onPurchaseUpgrade={onPurchaseUpgrade}
            formatNumber={formatNumber}
          />
          {sidebarContent}
        </div>
        {showLegacyDialog && legacyReset && onEndLegacy && (
          <LegacyDialog
            active={isActive}
            guildState={guildState}
            reset={legacyReset}
            onClose={closeLegacyDialog}
            onConfirm={onEndLegacy}
            formatNumber={formatNumber}
          />
        )}
      </>
    );

    return (
      <BaseTab
        isUnlocked={true}
        mainContent={mainContent}
      />
    );
  }

  // Uncommitted state - show guild selection
  const selectedGuildData = selectedGuild ? GUILDS.find(g => g.id === selectedGuild) : undefined;

  // Sidebar: Guild Tokens and how to earn them, then the Legacy so far
  const sidebarContent = (
    <div className={`${styles.sidebar} ${styles.sidebarBox}`}>
      <h3 className={styles.sidebarTitle}>Guild Tokens</h3>
      <div className={styles.tokenBalance}>
        <InlineIcon src={ICON_GUILD_TOKEN} size={28} gap={8} />
        {formatNumber(guildState.guildTokens)}
      </div>
      <p className={styles.sidebarNote}>
        Spend them on starter upgrades, up to {MAX_SAMPLED_UPGRADES_PER_GUILD} from each guild. Unspent tokens stay behind when you join.
      </p>
      <h4 className={styles.sidebarCaption}>Earn them</h4>
      <ul className={styles.tokenSources}>
        {Object.entries(GUILD_TOKEN_SOURCES).map(([source, { tokens, every, label }]) => (
          <li key={source}>{`+${tokens} per ${every > 1 ? `${every} ` : ''}${label}`}</li>
        ))}
      </ul>
      {legacy && <LegacyPanel legacy={legacy} guildsUnlocked compact />}
    </div>
  );

  // The cards and the picked guild's panel beside the sidebar, always the same height
  const mainContent = (
    <div className={styles.guildsLayout}>
      <div className={styles.selectionContainer}>
        {/* First-time intro overlay */}
        {showIntroOverlay && (
          <GuildDialog
            active={isActive}
            overlayClassName={styles.introOverlay}
            dialogClassName={styles.introDialog}
            labelledBy={introTitleId}
            onClose={handleDismissIntro}
          >
            <h2 id={introTitleId} className={styles.introTitle}>Choose Your Path</h2>
            <p className={styles.introDescription}>
              Sample upgrades from different guilds, then commit to one for exclusive benefits.
            </p>
            <div className={styles.introTokens}>
              <p className={styles.introTokensTitle}>Earn <InlineIcon src={ICON_GUILD_TOKEN} size={16} /> Guild Tokens to sample upgrades:</p>
              <ul className={styles.introTokenList}>
                {Object.entries(GUILD_TOKEN_SOURCES).map(([source, { tokens, every, label }]) => (
                  <li key={source}>{`+${tokens} per ${every > 1 ? `${every} ` : ''}${label}`}</li>
                ))}
              </ul>
            </div>
            <p className={styles.introWarning}>
              <strong><InlineIcon src={ICON_WARNING} size={16} gap={4} />Warning:</strong> Once committed, you cannot change guilds or access other guild upgrades!
            </p>
            <button type="button" className={styles.introButton} onClick={handleDismissIntro}>
              I Understand
            </button>
          </GuildDialog>
        )}

        {/* Four cards of one size; picking one fills the panel below */}
        <div className={styles.guildGrid}>
          {GUILDS.map(guild => (
            <GuildCard
              key={guild.id}
              guild={guild}
              isSelected={selectedGuild === guild.id}
              sampledCount={guildState.sampledUpgrades[guild.id]?.length ?? 0}
              maxSamples={MAX_SAMPLED_UPGRADES_PER_GUILD}
              onSelect={setSelectedGuild}
            />
          ))}
        </div>

        <GuildDetailPanel
          guild={selectedGuildData}
          guildState={guildState}
          money={money}
          knowledge={knowledge}
          experience={experience}
          onPurchaseUpgrade={onPurchaseUpgrade}
          onCommit={openCommitConfirm}
          formatNumber={formatNumber}
        />

        {/* Commitment Confirmation Dialog */}
        {showCommitConfirm && selectedGuildData && (
          <GuildDialog
            active={isActive}
            overlayClassName={styles.confirmOverlay}
            dialogClassName={styles.confirmDialog}
            labelledBy={confirmTitleId}
            onClose={closeCommitConfirm}
          >
            <h3 id={confirmTitleId}>Commit to {selectedGuildData.displayName}?</h3>
            <p className={styles.confirmWarning}>
              <InlineIcon src={ICON_WARNING} size={16} gap={4} />This action is <strong>permanent</strong>! You will:
            </p>
            <ul className={styles.confirmList}>
              <li>Gain access to exclusive guild upgrades</li>
              <li>Receive guild-specific passive bonuses</li>
              <li>Lose access to other guild upgrades</li>
              <li>Accept guild trade-offs and penalties</li>
              <li>Leave behind any unspent Guild Tokens</li>
            </ul>
            <div className={styles.confirmButtons}>
              <button
                type="button"
                className={styles.confirmCancel}
                onClick={closeCommitConfirm}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmCommit}
                style={{
                  backgroundColor: selectedGuildData.colors.primary
                }}
                onClick={() => {
                  onCommitToGuild(selectedGuildData.id);
                  setShowCommitConfirm(false);
                }}
              >
                Commit Forever
              </button>
            </div>
          </GuildDialog>
        )}
      </div>
      {sidebarContent}
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
