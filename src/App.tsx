import { useEffect, useRef, useState, createContext, useContext, useMemo, useCallback, lazy, Suspense, type FC, type ReactNode } from 'react';
import ArchieIcon from './components/ArchieIcon';
import AdvancedStashDisplay from './components/AdvancedStashDisplay';
import InfoOverlay from './components/InfoOverlay';
import SettingsOverlay from './components/SettingsOverlay';
import EventLogOverlay from './components/EventLogOverlay';
import FeatureFlagsPanel from './components/FeatureFlagsPanel';
import { useFeatureFlag } from './context/FeatureFlagsContext';

// Tab components - loaded eagerly to avoid per-tab loading delays
import GrowingTab from './components/GrowingTab';
import GlobalUpgradesPanel from './components/GlobalUpgradesPanel';
import CanningTab from './components/CanningTab';
import BeesTab from './components/BeesTab';
import TreeFarmTab from './components/TreeFarmTab';
import WorkshopTab from './components/WorkshopTab';
import ShopfrontTab from './components/ShopfrontTab';
import GuildsTab from './components/GuildsTab';
import WisdomTab from './components/WisdomTab';

import StatsDisplay from './components/StatsDisplay';
import HeaderBar from './components/HeaderBar';
import SaveLoadSystem from './components/SaveLoadSystem';
import Toast from './components/Toast';
import HarvestTutorial from './components/HarvestTutorial';
import { LifespanIntro, ShopExplanation } from './components/LifespanTutorial';
import ErrorBoundary from './components/ErrorBoundary';
import { useEventLog } from './context/EventLogContext';
import { ICON_BEE, ICON_GUILDS, ICON_WISDOM } from './config/assetPaths';

// Guild system imports
import { DEFAULT_GUILD_STATE } from './types/guilds';
import type { GuildState, GuildType } from './types/guilds';
import { GUILDS_UNLOCK_TIER, GUILDS } from './data/guildData';
import { applyGuildPriceBonuses } from './utils/guildCalculations';

// Module-level bee context reference for dev tools
let globalBeeContext: BeeContextValue | null = null;

type OverlayErrorProps = { title: string; onClose?: () => void };
const OverlayError = ({ title, onClose }: OverlayErrorProps) => (
  <div className={styles.overlayError}>
    <h4 className={styles.overlayErrorTitle}>{title} unavailable</h4>
    <p className={styles.overlayErrorText}>Something went wrong loading this section.</p>
    {onClose && (
      <button onClick={onClose} className={styles.overlayErrorButton}>
        Dismiss
      </button>
    )}
  </div>
);

type SectionErrorProps = { title: string };
const SectionError = ({ title }: SectionErrorProps) => (
  <div className={styles.sectionError}>
    <h3 className={styles.overlayErrorTitle}>{title} encountered an error</h3>
    <p className={styles.overlayErrorText}>Try reloading the page to continue.</p>
    <button onClick={() => window.location.reload()} className={styles.overlayErrorButton}>
      Reload
    </button>
  </div>
);

import AchievementDisplay from './components/AchievementDisplay';
import AchievementNotification from './components/AchievementNotification';
// DevTools is lazy-loaded since it's only used in development
const DevTools = lazy(() => import('./components/DevTools'));
import { PerformanceWrapper } from './components/PerformanceWrapper';
import { useArchie } from './context/ArchieContext';
import { BeeProvider, useBees } from './context/BeeContext';
import { useCanningSystem } from './hooks/useCanningSystem';
import { useWeatherSystem } from './hooks/useWeatherSystem';
import { useSeasonSystem } from './hooks/useSeasonSystem';
import { useAchievements } from './hooks/useAchievements';
import { useAutoPurchase } from './hooks/useAutoPurchase';
import { useGameState } from './hooks/useGameState';
import { useLatestRef } from './hooks/useLatestRef';
import { usePurchaseHandlers } from './hooks/usePurchaseHandlers';
import { useFarmManagement } from './hooks/useFarmManagement';
import { useHarvestAndSell } from './hooks/useHarvestAndSell';
import { useDayLoop } from './hooks/useDayLoop';
import { useOfflineProgress } from './hooks/useOfflineProgress';
import { useWeatherRandomization } from './hooks/useWeatherRandomization';
import { useAutoSave } from './hooks/useAutoSave';
import { useGameTick } from './hooks/useGameClock';
import { useDeferredEffects } from './hooks/useDeferredEffects';
import { useEventLog as useEventLogSystem } from './hooks/useEventLog';
import { useChristmasEvent, type UseChristmasEventReturn } from './hooks/useChristmasEvent';
import { loadGameStateWithCanning, startNewGame, getMaxLifetimeDaysForPlayer, type ExtendedGameState, type PrestigeState, type WisdomUpgrades } from './utils/saveSystem';
import { devTelemetry } from './utils/devTelemetry';
import type { Veggie, GameState, EventCategory, EventPriority } from './types/game';
import type { BeeState, BeeContextValue } from './types/bees';
import type { EventUpgrade } from './types/christmasEvent';
import type { AchievementOrMilestone } from './types/achievements';
import { BEE_CONSTANTS, GROWTH_COMPLETE_THRESHOLD } from './config/gameConstants';
import { ALL_IMAGES, ICON_GROWING, ICON_CANNING, ICON_AUTOMATION, ICON_HARVEST, ICON_MONEY, ICON_MERCHANT, SEASON_SPRING, SEASON_SUMMER, SEASON_FALL, SEASON_WINTER, ICON_TREE_SHOP, ICON_TREE_WORKSHOP, ICON_TREE_STOREFRONT, TREE_DECORATED, DECORATION_WREATH } from './config/assetPaths';
import styles from './components/App.module.css';
import {
  formatNumber,
  getVeggieGrowthBonus,
  calculateExpRequirement,
  createAllCrops
} from './utils/gameCalculations';
import {
  processVeggieGrowth,
  processAutoHarvest,
  processVeggieUnlocks
} from './utils/gameLoopProcessors';
import {
  buildHarvestEvent,
  buildAutoPurchaseEvent,
  buildMerchantSaleEvent,
  buildAchievementEvent,
  buildCanningStartEvent,
  buildCanningCompleteEvent,
  buildTreeSoldEvent,
  buildTreeHarvestedEvent,
  buildItemCraftedEvent,
  buildUpgradePurchasedEvent,
  buildMilestoneClaimedEvent
} from './utils/eventLogUtils';

const initialVeggies: Veggie[] = createAllCrops();

/**
 * Check if the Christmas Tree Shop tab should be visible
 * Only show from November 1st to December 31st
 */
function isChristmasTabVisible(): boolean {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed (0 = January, 10 = November, 11 = December)
  return month === 10 || month === 11; // November or December
}

const GameContext = createContext<GameState | undefined>(undefined);

// Removed unused saveGameState function

const GameProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Get event log callback interface from context
  const eventLogCallbacks = useEventLog();
  
  // Load the save once. (Imports reload the page, so a fresh parse is never needed.)
  const [loaded] = useState(() => loadGameStateWithCanning());
  
  // Initialize core game state with custom hook
  const gameState = useGameState({
    loadedState: loaded,
    initialVeggies
  });

  // Destructure game state for easier access
  const {
    veggies,
    setVeggies,
    money,
    setMoney,
    experience,
    setExperience,
    knowledge,
    setKnowledge,
    day,
    setDay,
    totalDaysElapsed,
    setTotalDaysElapsed,
    totalHarvests,
    setTotalHarvests,
    activeVeggie,
    setActiveVeggie,
    farmTier,
    setFarmTier,
    maxPlots,
    setMaxPlots,
    farmCost,
    setFarmCost,
    FARM_BASE_COST,
    highestUnlockedVeggie,
    setHighestUnlockedVeggie,
    irrigationOwned,
    setIrrigationOwned,
    greenhouseOwned,
    setGreenhouseOwned,
    heirloomOwned,
    setHeirloomOwned,
    autoSellOwned,
    setAutoSellOwned,
    almanacLevel,
    setAlmanacLevel,
    almanacCost,
    setAlmanacCost,
    permanentBonuses,
    setPermanentBonuses,
    totalPlotsUsed,
    heirloomMoneyCost,
    heirloomKnowledgeCost
  } = gameState;

  // Local flag: whether offline processing discovered a lifetime end (capped)
  const [offlinePrestigePending, setOfflinePrestigePending] = useState(false);

  // Wisdom earned this lifetime — set when lifetime ends so the player can
  // spend it in the Wisdom Shop *before* clicking "Start Next Lifetime".
  const [wisdomEarnedThisLifetime, setWisdomEarnedThisLifetime] = useState(0);

  // Ref to track whether wisdom has been deposited this lifetime.
  // Prevents the wisdom-calculation useEffect from running twice (e.g. when
  // an offline handler sets offlinePrestigePending before the effect fires).
  const wisdomDepositedRef = useRef(false);

  // Pause state — freezes all game loops when true (persisted so offline progress is skipped)
  const [isPaused, setIsPaused] = useState(() => !!loaded?.isPaused);

  // Bee yield bonus tracking (from bee boxes and Meadow Magic upgrades)
  const [beeYieldBonus, setBeeYieldBonus] = useState(0); // Decimal format (e.g., 0.05 = 5%)

  // Guild system state (moved to GameProvider for growth calculations)
  const [guildState, setGuildState] = useState<GuildState>(() => {
    return loaded?.guildState || DEFAULT_GUILD_STATE;
  });

  // Prestige system state - tracks lifetime stats for Wisdom calculation
  const [prestigeState, setPrestigeState] = useState<PrestigeState>(() => {
    return loaded?.prestigeState || {
      wisdom: 0,
      lifetimeCount: 1,
      wisdomUpgrades: {},
      totalMoneyEarned: 0,
      totalKnowledgeGained: 0,
      maxFarmTierReached: loaded?.farmTier || 1,
      achievementsUnlocked: {}
    };
  });

  // Wisdom's Potential: standard 1% bonus per unspent wisdom after first prestige
  const wisdomPotentialMultiplier = useMemo(() => {
    if (prestigeState.lifetimeCount >= 2) {
      return 1 + (prestigeState.wisdom * 0.01);
    }
    return 1;
  }, [prestigeState.lifetimeCount, prestigeState.wisdom]);

  // Helper to track money earned this lifetime (also applies Wisdom's Potential bonus)
  const trackMoneyEarned = useCallback((amount: number) => {
    if (amount > 0) {
      const bonus = wisdomPotentialMultiplier > 1 ? Math.floor(amount * (wisdomPotentialMultiplier - 1)) : 0;
      if (bonus > 0) {
        setMoney(m => m + bonus);
      }
      setPrestigeState(prev => ({
        ...prev,
        totalMoneyEarned: (prev.totalMoneyEarned || 0) + amount + bonus
      }));
    }
  }, [setMoney, wisdomPotentialMultiplier]);

  // Scholarly Roots multiplier: +5% knowledge per level
  const knowledgeBoostMultiplier = useMemo(() => {
    const level = prestigeState.wisdomUpgrades?.knowledgeBoost || 0;
    return level > 0 ? 1 + (level * 0.05) : 1;
  }, [prestigeState.wisdomUpgrades?.knowledgeBoost]);

  // Helper to track knowledge gained this lifetime (applies Wisdom's Potential + Scholarly Roots bonuses)
  const trackKnowledgeGained = useCallback((amount: number) => {
    if (amount > 0) {
      // Scholarly Roots bonus (flat % increase)
      const scholarlyBonus = knowledgeBoostMultiplier > 1 ? Math.floor(amount * (knowledgeBoostMultiplier - 1)) : 0;
      // Wisdom's Potential bonus (stacks additively on the boosted total)
      const boostedAmount = amount + scholarlyBonus;
      const potentialBonus = wisdomPotentialMultiplier > 1 ? Math.floor(boostedAmount * (wisdomPotentialMultiplier - 1)) : 0;
      const totalBonus = scholarlyBonus + potentialBonus;
      if (totalBonus > 0) {
        setKnowledge(k => k + totalBonus);
      }
      setPrestigeState(prev => ({
        ...prev,
        totalKnowledgeGained: (prev.totalKnowledgeGained || 0) + amount + totalBonus
      }));
    }
  }, [knowledgeBoostMultiplier, wisdomPotentialMultiplier, setKnowledge]);

  // Helper to track max farm tier reached (both per-lifetime and all-time)
  const trackFarmTierReached = useCallback((tier: number) => {
    setPrestigeState(prev => ({
      ...prev,
      maxFarmTierReached: Math.max(prev.maxFarmTierReached || 1, tier),
      highestFarmTierEver: Math.max(prev.highestFarmTierEver || 1, tier)
    }));
  }, []);

  // Upgrade cost calculation (must match WisdomTab's calculation)
  const getWisdomUpgradeCost = useCallback((upgradeId: keyof WisdomUpgrades, currentLevel: number): number => {
    const upgradeConfigs: Record<keyof WisdomUpgrades, { baseCost: number; costScaling: number }> = {
      extendedLifespan: { baseCost: 10, costScaling: 1.5 },
      startingGold: { baseCost: 5, costScaling: 1.3 },
      startingKnowledge: { baseCost: 5, costScaling: 1.3 },
      startingExperience: { baseCost: 8, costScaling: 1.4 },
      permanentGuildBenefits: { baseCost: 25, costScaling: 2.0 },
      startingFarmTier: { baseCost: 100, costScaling: 2.0 },
      knowledgeBoost: { baseCost: 15, costScaling: 1.5 },
      plotEfficiency: { baseCost: 20, costScaling: 1.6 },
    };
    const config = upgradeConfigs[upgradeId];
    return Math.floor(config.baseCost * Math.pow(config.costScaling, currentLevel));
  }, []);

  // Handler to purchase a wisdom upgrade
  const handlePurchaseWisdomUpgrade = useCallback((upgradeId: keyof WisdomUpgrades) => {
    const currentLevel = prestigeState.wisdomUpgrades[upgradeId] || 0;
    const cost = getWisdomUpgradeCost(upgradeId, currentLevel);
    
    if (prestigeState.wisdom >= cost) {
      devTelemetry.emit('shop_purchase', {
        upgradeId,
        levelBefore: currentLevel,
        levelAfter: currentLevel + 1,
        cost
      });
      setPrestigeState(prev => ({
        ...prev,
        wisdom: prev.wisdom - cost,
        wisdomUpgrades: {
          ...prev.wisdomUpgrades,
          [upgradeId]: (prev.wisdomUpgrades[upgradeId] || 0) + 1
        }
      }));
    }
  }, [prestigeState.wisdom, prestigeState.wisdomUpgrades, getWisdomUpgradeCost]);

  // Initialize Christmas Tree Shop event
  const [initialChristmasState] = useState(() => {
    try {
      return loaded?.christmasEventState || undefined;
    } catch (error) {
      console.error('Error loading Christmas event state:', error);
      return undefined;
    }
  });

  const christmasEvent: UseChristmasEventReturn = useChristmasEvent({
    initialState: initialChristmasState,
    farmTier,
    onTreeSold: (treeType, quantity, cheerEarned) => {
      eventLogCallbacks.onTreeSold(treeType, quantity, cheerEarned);
    },
    onTreeHarvested: (treeType, quality) => {
      eventLogCallbacks.onTreeHarvested(treeType, quality);
    },
    onItemCrafted: (itemName, quantity) => {
      eventLogCallbacks.onItemCrafted(itemName, quantity);
    },
    onUpgradePurchased: (upgradeName, cost) => {
      eventLogCallbacks.onUpgradePurchased(upgradeName, cost);
    },
    onMilestoneClaimed: (milestoneName) => {
      eventLogCallbacks.onMilestoneClaimed(milestoneName);
    },
  });

  // Upgrade purchases: per-crop upgrades, auto-purchasers and global upgrades
  const {
    handleBuyFertilizer,
    handleBuyHarvester,
    handleBuyHarvesterSpeed,
    handleBuyBetterSeeds,
    handleBuyAdditionalPlot,
    handleBuyAutoPurchaser,
    handleBuyIrrigation,
    handleBuyGreenhouse,
    handleBuyHeirloom,
    handleBuyAutoSell,
    handleBuyAlmanac,
    irrigationCost,
    irrigationKnCost
  } = usePurchaseHandlers({
    veggies,
    setVeggies,
    money,
    setMoney,
    knowledge,
    setKnowledge,
    heirloomOwned,
    setHeirloomOwned,
    irrigationOwned,
    setIrrigationOwned,
    greenhouseOwned,
    setGreenhouseOwned,
    autoSellOwned,
    setAutoSellOwned,
    setAlmanacLevel,
    almanacCost,
    setAlmanacCost,
    totalPlotsUsed,
    maxPlots,
    heirloomMoneyCost,
    heirloomKnowledgeCost,
    onMilestone: eventLogCallbacks.onAchievementUnlock
  });

  // Weather system hook
  const { currentWeather, setCurrentWeather } = useWeatherSystem('Clear');
  
  // Season system hook
  const { season } = useSeasonSystem(day);
  

  // Initialize highestUnlockedVeggie for existing players who don't have it in their save data
  useEffect(() => {
    if (loaded && loaded.highestUnlockedVeggie === undefined && loaded.veggies) {
      // Find the highest index of unlocked veggies from the loaded save data
      const currentHighest = loaded.veggies.reduce((highest: number, veggie: Veggie, index: number) => {
        return veggie.unlocked && index > highest ? index : highest;
      }, 0);
      setHighestUnlockedVeggie(currentHighest);
    }
  }, [loaded, setHighestUnlockedVeggie]); // Runs once: loaded and the setter never change    
 
  // Crop growth, first in each game step
  useGameTick(() => {
    // Skip all processing while game is paused
    if (isPausedRef.current) return;
    // Skip all processing if lifetime has ended (prestige pending)
    if (offlinePrestigePendingRef.current) return;

    setVeggies((prev) => {
      const { veggies: newVeggies } = processVeggieGrowth(
        prev,
        season,
        currentWeather,
        greenhouseOwned,
        irrigationOwned,
        guildStateRef.current
      );
      return newVeggies;
    });
  }, { order: 10 });

  // Latest-value refs to avoid large dependency arrays and restart of loops
  // Only keep refs that are actually used in game loops
  const knowledgeRef = useLatestRef(knowledge);
  const dayRef = useLatestRef(day);
  const almanacLevelRef = useLatestRef(almanacLevel);
  const maxPlotsRef = useLatestRef(maxPlots);
  const farmTierRef = useLatestRef(farmTier);
  const beeYieldBonusRef = useLatestRef(beeYieldBonus);
  const seasonRef = useLatestRef(season);
  const permanentBonusesRef = useLatestRef(permanentBonuses);
  const christmasEventRef = useLatestRef(christmasEvent);
  const experienceRef = useLatestRef(experience);
  const autoSellOwnedRef = useLatestRef(autoSellOwned);
  const guildStateRef = useLatestRef(guildState);
  const trackKnowledgeGainedRef = useLatestRef(trackKnowledgeGained);
  const offlinePrestigePendingRef = useLatestRef(offlinePrestigePending);
  const isPausedRef = useLatestRef(isPaused);
  // Lifetime max days - recalculated only when extendedLifespan level changes
  const extendedLifespanLevel = prestigeState.wisdomUpgrades.extendedLifespan || 0;
  const lifetimeMaxDaysRef = useRef(getMaxLifetimeDaysForPlayer(prestigeState));
  useEffect(() => {
    lifetimeMaxDaysRef.current = getMaxLifetimeDaysForPlayer(prestigeState);
  }, [extendedLifespanLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Progress for time away: once at startup, and whenever a hidden tab comes back
  useOfflineProgress({
    loaded,
    state: {
      veggies,
      day,
      totalDaysElapsed,
      season,
      currentWeather,
      greenhouseOwned,
      irrigationOwned,
      almanacLevel,
      farmTier,
      knowledge,
      guildState,
      christmasEvent
    },
    isPaused,
    lifetimeEnded: offlinePrestigePending,
    lifetimeMaxDays: getMaxLifetimeDaysForPlayer(prestigeState),
    trackKnowledgeGained,
    setVeggies,
    setExperience,
    setKnowledge,
    setDay,
    setTotalDaysElapsed,
    setOfflinePrestigePending
  });

  // Reliable lifetime-end detection: fires whenever totalDaysElapsed changes.
  // The day-loop updater clamps totalDaysElapsed to the max, but setting the
  // prestige flag via a closure variable inside setState is unreliable under
  // React 18 batching.  This useEffect runs after the committed state,
  // guaranteeing the check sees the real value.
  //
  // When the lifetime ends we also deposit the earned wisdom immediately so
  // the player can spend it in the Wisdom Shop before clicking
  // "Start Next Lifetime".
  useEffect(() => {
    if (wisdomDepositedRef.current) return; // wisdom already deposited this lifetime
    const maxDays = lifetimeMaxDaysRef.current;
    if (totalDaysElapsed < maxDays) return;

    // ── Final stash sale: sell ALL veggies before computing wisdom ──
    // Worked out from current state first, so the money and the wisdom always
    // include it. A total read back out of a setState updater can still be 0,
    // because React may run the updater later.
    let stashSaleTotal = 0;
    const soldByName = new Map<string, number>();
    for (const v of veggies) {
      if (v.stash > 0) {
        for (let i = 0; i < v.stash; i++) {
          stashSaleTotal += applyGuildPriceBonuses(v.salePrice, guildState, true);
        }
        soldByName.set(v.name, v.stash);
      }
    }
    if (soldByName.size > 0) {
      setVeggies(prev => prev.map(v => {
        const sold = soldByName.get(v.name);
        return sold ? { ...v, stash: Math.max(0, v.stash - sold) } : v;
      }));
    }

    // Wisdom's Potential bonus also applies to the stash earnings
    const potentialBonus = wisdomPotentialMultiplier > 1
      ? Math.floor(stashSaleTotal * (wisdomPotentialMultiplier - 1))
      : 0;
    const stashContribution = stashSaleTotal + potentialBonus;
    if (stashContribution > 0) {
      setMoney(m => m + stashContribution);
    }

    // Calculate and deposit wisdom now so the shop works immediately,
    // counting the stash money that hasn't reached prestigeState yet.
    const moneyFactor = ((prestigeState.totalMoneyEarned || 0) + stashContribution) / 10_000;
    const knowledgeFactor = (prestigeState.totalKnowledgeGained || 0) / 500;
    const tierFactor = prestigeState.maxFarmTierReached || 1;
    const wisdomBonus = Math.floor(Math.sqrt(prestigeState.wisdom || 0));
    const earned = Math.floor((moneyFactor + knowledgeFactor) * tierFactor) + wisdomBonus;

    setPrestigeState(prev => ({
      ...prev,
      totalMoneyEarned: (prev.totalMoneyEarned || 0) + stashContribution,
      wisdom: prev.wisdom + earned,
    }));
    setWisdomEarnedThisLifetime(earned);
    wisdomDepositedRef.current = true;
    setOfflinePrestigePending(true);
  }, [totalDaysElapsed, offlinePrestigePending, guildState, wisdomPotentialMultiplier, veggies, prestigeState, setVeggies, setMoney]);
  
  // Runs work recorded by state updaters once their result is committed
  const scheduleAfterCommit = useDeferredEffects();

  // Auto-harvest, after growth in each game step. The harvest is worked out inside
  // the updater, because it must see this step's growth; logging, experience,
  // knowledge and the unlock record are applied after the commit.
  useGameTick(() => {
    // Skip all processing while game is paused
    if (isPausedRef.current) return;
    // Skip all game processing if lifetime has ended (prestige pending)
    if (offlinePrestigePendingRef.current) return;

    const tick = {};
    setVeggies((prev) => {
      const {
        veggies: newVeggies,
        experienceGain: totalExperienceGain,
        knowledgeGain: totalKnowledgeGain,
        needsUpdate,
        harvestedVeggies
      } = processAutoHarvest(
        prev,
        almanacLevelRef.current,
        farmTierRef.current,
        knowledgeRef.current,
        beeYieldBonusRef.current,
        seasonRef.current,
        permanentBonusesRef.current
      );

      if (!needsUpdate) {
        scheduleAfterCommit(tick, undefined);
        return newVeggies;
      }

      // Handle unlocks after all harvests are processed using projected experience
      const projectedExperience = experienceRef.current + totalExperienceGain;
      const { veggies: unlockedVeggies, highestUnlockedIndex } = processVeggieUnlocks(
        newVeggies,
        projectedExperience,
        maxPlotsRef.current
      );
      const awardGains = totalExperienceGain > 0 && dayRef.current >= 1 && dayRef.current <= 365;

      scheduleAfterCommit(tick, () => {
        harvestedVeggies.forEach(({ veggie, amount, expGain, knGain }) => {
          logHarvest(veggie.name, amount, expGain, knGain, true);
        });
        if (awardGains) {
          setKnowledge((k: number) => k + totalKnowledgeGain);
          setExperience((exp: number) => exp + totalExperienceGain);
          // Track knowledge gained for lifetime stats (prestige system)
          if (totalKnowledgeGain > 0) {
            trackKnowledgeGainedRef.current(totalKnowledgeGain);
          }
        }
        setHighestUnlockedVeggie(current => Math.max(current, highestUnlockedIndex));
      });

      return unlockedVeggies;
    });
  }, { order: 20 });

  // Harvesting, selling, the ritual harvest, and the per-crop sell and auto-harvest toggles
  const {
    handleHarvest,
    handleRitualHarvestAll,
    handleToggleSell,
    handleToggleAutoHarvester,
    handleSell,
    logHarvest
  } = useHarvestAndSell({
    veggies,
    setVeggies,
    experience,
    setExperience,
    knowledge,
    setKnowledge,
    setMoney,
    season,
    day,
    almanacLevel,
    farmTier,
    maxPlots,
    setHighestUnlockedVeggie,
    setTotalHarvests,
    permanentBonuses,
    beeYieldBonus,
    activeVeggie,
    eventLogCallbacks,
    guildState,
    setGuildState,
    trackKnowledgeGained,
    trackMoneyEarned
  });

  // Initialize auto-purchase system
  const { globalAutoPurchaseTimer, setGlobalAutoPurchaseTimer } = useAutoPurchase({
    veggies,
    setVeggies,
    money,
    knowledge,
    maxPlots,
    handlers: {
      handleBuyFertilizer,
      handleBuyBetterSeeds,
      handleBuyHarvesterSpeed,
      handleBuyAdditionalPlot
    },
    initialTimer: loaded?.globalAutoPurchaseTimer ?? 0,
    onPurchaseCallback: eventLogCallbacks.onAutoPurchase
  });

  // Farm tier upgrades and full game reset
  // A new game replaces the save and reloads, so nothing from the old game carries over
  const resetGame = useCallback(() => startNewGame(), []);

  const { handleBuyLargerFarm } = useFarmManagement({
    experience,
    money,
    farmTier,
    knowledge,
    maxPlots,
    farmCost,
    FARM_BASE_COST,
    setActiveVeggie,
    setVeggies,
    setMoney,
    setExperience,
    setKnowledge,
    setDay,
    setGreenhouseOwned,
    setAlmanacLevel,
    setAlmanacCost,
    setAutoSellOwned,
    setHeirloomOwned,
    setMaxPlots,
    setFarmTier,
    setIrrigationOwned,
    setGlobalAutoPurchaseTimer,
    setFarmCost,
    eventLogCallbacks,
    prestigeStartingExpBonus: (prestigeState.wisdomUpgrades.startingExperience || 0) * 50,
    plotEfficiencyLevel: prestigeState.wisdomUpgrades.plotEfficiency || 0,
    onFarmTierReached: trackFarmTierReached
  });

  // Handler to start the next lifetime (prestige)
  // Note: Tab switching and event logging happen via separate handlers passed from component
  // Declared after the weather and auto-purchase hooks, so its dependency list can name their setters
  const handleStartNextLifetime = useCallback((onComplete?: () => void) => {
    // Wisdom was already deposited into prestigeState.wisdom when the
    // lifetime ended (in the lifetime-end useEffect).  Use the stored
    // amount for telemetry and then clear it.
    const earnedWisdom = wisdomEarnedThisLifetime;

    // ── Telemetry: lifetime_complete + wisdom_awarded ──
    devTelemetry.emit('lifetime_complete', {
      lifetimeCount: prestigeState.lifetimeCount,
      wisdomGained: earnedWisdom,
      totalMoneyEarned: prestigeState.totalMoneyEarned || 0,
      totalKnowledgeGained: prestigeState.totalKnowledgeGained || 0,
      maxFarmTierReached: prestigeState.maxFarmTierReached || 1,
      durationDays: totalDaysElapsed
    });
    devTelemetry.emit('wisdom_awarded', {
      amount: earnedWisdom,
      formulaComponents: {
        moneyFactor: (prestigeState.totalMoneyEarned || 0) / 10_000,
        knowledgeFactor: (prestigeState.totalKnowledgeGained || 0) / 500,
        tierFactor: prestigeState.maxFarmTierReached || 1,
        wisdomBonus: Math.floor(Math.sqrt((prestigeState.wisdom - earnedWisdom) || 0))
      }
    });
    
    // Get starting bonuses from upgrades
    const startingGoldLevel = prestigeState.wisdomUpgrades.startingGold || 0;
    const startingKnowledgeLevel = prestigeState.wisdomUpgrades.startingKnowledge || 0;
    const startingExperienceLevel = prestigeState.wisdomUpgrades.startingExperience || 0;
    const startingFarmTierLevel = prestigeState.wisdomUpgrades.startingFarmTier || 0;
    
    const bonusGold = startingGoldLevel * 500;
    const bonusKnowledge = startingKnowledgeLevel * 25;
    const bonusExperience = startingExperienceLevel * 50;
    
    // Compute starting farm tier (1 = base, +1 per level of Ancestral Farmstead)
    const startTier = 1 + startingFarmTierLevel;
    const startMaxPlots = startTier * 4;
    const startFarmCost = Math.ceil(FARM_BASE_COST * Math.pow(1.85, startTier - 1));
    // Starting experience: enough to unlock crops for that tier + prestige exp bonus
    const tierExperience = startTier > 1 ? calculateExpRequirement(startTier - 1) : 0;
    
    // Update prestige state for new lifetime
    // Note: wisdom is NOT added here — it was already deposited when the
    // lifetime ended so the player could shop before clicking this button.
    setPrestigeState(prev => ({
      ...prev,
      lifetimeCount: prev.lifetimeCount + 1,
      totalMoneyEarned: 0,
      totalKnowledgeGained: 0,
      maxFarmTierReached: startTier,
    }));
    setWisdomEarnedThisLifetime(0);
    wisdomDepositedRef.current = false;
    
    // ── Resources ──
    setMoney(100 + bonusGold);
    setKnowledge(bonusKnowledge);
    setExperience(tierExperience + bonusExperience);
    
    // ── Farm ──
    setFarmTier(startTier);
    setFarmCost(startFarmCost);
    setMaxPlots(startMaxPlots);
    setHighestUnlockedVeggie(0);
    
    // Reset crops to initial state (vegetables and fruits)
    const resetVeggies = createAllCrops();
    setActiveVeggie(0);
    setVeggies(resetVeggies);
    
    // ── Time ──
    setDay(1);
    setTotalDaysElapsed(0);
    
    // ── Statistics ──
    setTotalHarvests(0);
    
    // ── Knowledge upgrades ──
    setIrrigationOwned(false);
    setGreenhouseOwned(false);
    setHeirloomOwned(false);
    setAutoSellOwned(false);
    setAlmanacLevel(0);
    setAlmanacCost(10);
    
    // ── Weather ──
    setCurrentWeather('Clear');
    
    // ── Auto-purchase ──
    setGlobalAutoPurchaseTimer(0);
    
    // ── Guilds (commitment + currencies reset, upgrades reset) ──
    setGuildState(DEFAULT_GUILD_STATE);
    
    // ── Bees (boxes, upgrades, honey/wax reset) ──
    if (globalBeeContext?.resetBeeSystem) {
      globalBeeContext.resetBeeSystem();
    }
    
    // Note: Canning reset is handled by the onComplete callback from App
    // because the canning system lives in the App component scope.
    // Note: Seasonal events (Christmas) PERSIST across lifetimes per design.
    
    // Clear prestige pending flag
    setOfflinePrestigePending(false);
    
    // Callback for additional cleanup (tab switching, canning reset, logging)
    if (onComplete) onComplete();
  }, [wisdomEarnedThisLifetime, prestigeState.lifetimeCount, prestigeState.totalMoneyEarned, prestigeState.totalKnowledgeGained, prestigeState.maxFarmTierReached, prestigeState.wisdom, prestigeState.wisdomUpgrades.startingGold, prestigeState.wisdomUpgrades.startingKnowledge, prestigeState.wisdomUpgrades.startingExperience, prestigeState.wisdomUpgrades.startingFarmTier, totalDaysElapsed, FARM_BASE_COST, setMoney, setKnowledge, setExperience, setFarmTier, setFarmCost, setMaxPlots, setHighestUnlockedVeggie, setActiveVeggie, setVeggies, setDay, setTotalDaysElapsed, setTotalHarvests, setIrrigationOwned, setGreenhouseOwned, setHeirloomOwned, setAutoSellOwned, setAlmanacLevel, setAlmanacCost, setCurrentWeather, setGlobalAutoPurchaseTimer]);

  // Day counter, merchant auto-sell, auto-purchase timer and Christmas daily ticks
  useDayLoop({
    setDay,
    setTotalDaysElapsed,
    setGlobalAutoPurchaseTimer,
    autoSellOwnedRef,
    christmasEventRef,
    isPausedRef,
    offlinePrestigePendingRef,
    lifetimeMaxDaysRef,
    handleSell
  });

  // Context value. Memoized so App re-renders only when something in it changes.
  // The field list and the dependency list are the same names; the hooks lint rule
  // checks that nothing read here is missing from the dependencies.
  const gameContextValue = useMemo<GameState>(() => ({
    veggies, setVeggies, money, setMoney, experience, setExperience, knowledge, setKnowledge,
    activeVeggie, day, setDay, totalDaysElapsed, setTotalDaysElapsed, totalHarvests,
    setTotalHarvests, globalAutoPurchaseTimer, setGlobalAutoPurchaseTimer, setActiveVeggie,
    handleHarvest, handleToggleSell, handleToggleAutoHarvester, handleSell, handleRitualHarvestAll,
    handleBuyFertilizer, handleBuyHarvester, handleBuyBetterSeeds, greenhouseOwned,
    setGreenhouseOwned, handleBuyGreenhouse, handleBuyHarvesterSpeed, resetGame, heirloomOwned,
    setHeirloomOwned, handleBuyHeirloom, autoSellOwned, setAutoSellOwned, handleBuyAutoSell,
    almanacLevel, setAlmanacLevel, almanacCost, setAlmanacCost, handleBuyAlmanac,
    handleBuyAdditionalPlot, maxPlots, setMaxPlots, farmCost, setFarmCost, handleBuyLargerFarm,
    farmTier, setFarmTier, irrigationOwned, setIrrigationOwned, irrigationCost, irrigationKnCost,
    handleBuyIrrigation, currentWeather, setCurrentWeather, highestUnlockedVeggie,
    setHighestUnlockedVeggie, handleBuyAutoPurchaser, heirloomMoneyCost, heirloomKnowledgeCost,
    christmasEvent, permanentBonuses, setPermanentBonuses, beeYieldBonus, setBeeYieldBonus,
    guildState, setGuildState, trackMoneyEarned, trackKnowledgeGained, trackFarmTierReached,
    prestigeState, setPrestigeState, handlePurchaseWisdomUpgrade, handleStartNextLifetime,
    offlinePrestigePending, setOfflinePrestigePending, wisdomEarnedThisLifetime, isPaused,
    setIsPaused
  }), [
    veggies, setVeggies, money, setMoney, experience, setExperience, knowledge, setKnowledge,
    activeVeggie, day, setDay, totalDaysElapsed, setTotalDaysElapsed, totalHarvests,
    setTotalHarvests, globalAutoPurchaseTimer, setGlobalAutoPurchaseTimer, setActiveVeggie,
    handleHarvest, handleToggleSell, handleToggleAutoHarvester, handleSell, handleRitualHarvestAll,
    handleBuyFertilizer, handleBuyHarvester, handleBuyBetterSeeds, greenhouseOwned,
    setGreenhouseOwned, handleBuyGreenhouse, handleBuyHarvesterSpeed, resetGame, heirloomOwned,
    setHeirloomOwned, handleBuyHeirloom, autoSellOwned, setAutoSellOwned, handleBuyAutoSell,
    almanacLevel, setAlmanacLevel, almanacCost, setAlmanacCost, handleBuyAlmanac,
    handleBuyAdditionalPlot, maxPlots, setMaxPlots, farmCost, setFarmCost, handleBuyLargerFarm,
    farmTier, setFarmTier, irrigationOwned, setIrrigationOwned, irrigationCost, irrigationKnCost,
    handleBuyIrrigation, currentWeather, setCurrentWeather, highestUnlockedVeggie,
    setHighestUnlockedVeggie, handleBuyAutoPurchaser, heirloomMoneyCost, heirloomKnowledgeCost,
    christmasEvent, permanentBonuses, setPermanentBonuses, beeYieldBonus, setBeeYieldBonus,
    guildState, setGuildState, trackMoneyEarned, trackKnowledgeGained, trackFarmTierReached,
    prestigeState, setPrestigeState, handlePurchaseWisdomUpgrade, handleStartNextLifetime,
    offlinePrestigePending, setOfflinePrestigePending, wisdomEarnedThisLifetime, isPaused,
    setIsPaused
  ]);

  return (
    <GameContext.Provider value={gameContextValue}>
      {children}
    </GameContext.Provider>
  );
};

function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
}

/**
 * Wrapper component for BeesTab that uses the useBees hook
 */
interface BeesTabWrapperProps {
  farmTier: number;
  season: string;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const BeesTabWrapper: FC<BeesTabWrapperProps> = ({ farmTier, season, formatNumber }) => {
  const beeContext = useBees();
  
  // Store bee context globally for dev tools access
  useEffect(() => {
    globalBeeContext = beeContext;
    return () => {
      globalBeeContext = null;
    };
  }, [beeContext]);
  
  return (
    <BeesTab
      beeContext={beeContext}
      farmTier={farmTier}
      season={season}
      formatNumber={formatNumber}
    />
  );
};

function App() {
  const { soundEnabled, setSoundEnabled, archieAppearance, setArchieAppearance } = useArchie();
  
  // Feature flags for controlling feature visibility (dev mode only)
  // In production, all features are always enabled (except DevTools which is always disabled)
  const isDev = import.meta.env.DEV;
  const beeSystemFlag = useFeatureFlag('beeSystem');
  const christmasEventFlag = useFeatureFlag('christmasEvent');
  const achievementSystemFlag = useFeatureFlag('achievementSystem');
  const archieCharacterFlag = useFeatureFlag('archieCharacter');
  const devToolsFlag = useFeatureFlag('enableDevTools');
  
  // Apply flags only in dev mode; in production all features enabled (except DevTools)
  const beeSystemEnabled = isDev ? beeSystemFlag : true;
  // Christmas tab only visible Nov 1 - Dec 31 (hide completely Jan 1 - Oct 31)
  const christmasEventEnabled = (isDev ? christmasEventFlag : true) && isChristmasTabVisible();
  const achievementSystemEnabled = isDev ? achievementSystemFlag : true;
  const archieCharacterEnabled = isDev ? archieCharacterFlag : true;
  const devToolsEnabled = isDev ? devToolsFlag : false;
  
  // Get event log callback interface from context
  const eventLogCallbacks = useEventLog();
  
  // Load game state once and memoize it for all initial state values
  // This prevents multiple localStorage reads during component initialization
  const [loadedGameState] = useState(() => {
    try {
      return loadGameStateWithCanning();
    } catch (error) {
      console.error('Error loading game state:', error);
      return null;
    }
  });
  
  // ArchieIcon component adds a clickable character that
  // appears randomly on the screen and gives the player money when clicked
  
  // Initialize bee state for game (uses pre-loaded state)
  const [initialBeeState] = useState(() => loadedGameState?.beeState || undefined);
  
  // Track current bee state for auto-save
  const [beeState, setBeeState] = useState<BeeState | null>(null);
  
  // Info overlay state
  const [showInfoOverlay, setShowInfoOverlay] = useState(false);
  
  // Settings overlay state
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  
  // Advanced stash overlay state
  const [showAdvancedStash, setShowAdvancedStash] = useState(false);

  // Achievements overlay state
  const [showAchievements, setShowAchievements] = useState(false);

  // Event log overlay state
  const [showEventLog, setShowEventLog] = useState(false);
  
  // Event log enabled categories state (all enabled by default)
  const [enabledEventCategories, setEnabledEventCategories] = useState<EventCategory[]>([
    'weather',
    'growth',
    'harvest',
    'auto-purchase',
    'merchant',
    'canning',
    'milestone',
    'bees',
    'christmas'
  ]);

  // Toast state for magical register bonus
  const [magicalRegisterToast, setMagicalRegisterToast] = useState({
    visible: false,
    message: '',
  });

  // Harvest tutorial state - one-time tutorial for first harvest (uses pre-loaded state)
  const [harvestTutorialShown, setHarvestTutorialShown] = useState(
    () => loadedGameState?.harvestTutorialShown || false
  );
  const [showHarvestTutorial, setShowHarvestTutorial] = useState(false);

  // Handler to dismiss harvest tutorial
  const handleDismissHarvestTutorial = useCallback(() => {
    setShowHarvestTutorial(false);
    setHarvestTutorialShown(true);
  }, []);

  // Tab system state
  const [activeTab, setActiveTab] = useState<'growing' | 'canning' | 'bees' | 'christmas' | 'guilds' | 'wisdom'>('growing');
  const [christmasSubTab, setChristmasSubTab] = useState<'farm' | 'workshop' | 'shopfront'>('farm');
  
  // Guild UI state (guild data state is in GameProvider context)
  const [guildIntroShown, setGuildIntroShown] = useState(
    () => loadedGameState?.guildIntroShown || false
  );
  
  // Handler to dismiss guild intro overlay
  const handleDismissGuildIntro = useCallback(() => {
    setGuildIntroShown(true);
  }, []);
  
  // Lifespan/Wisdom tutorial state - tracks one-time tutorials for prestige system
  const [lifespanIntroShown, setLifespanIntroShown] = useState(
    () => loadedGameState?.lifespanIntroShown || false
  );
  const [shopExplanationShown, setShopExplanationShown] = useState(
    () => loadedGameState?.shopExplanationShown || false
  );
  const [showLifespanIntro, setShowLifespanIntro] = useState(false);
  const [showShopExplanation, setShowShopExplanation] = useState(false);
  
  // Handlers for lifespan tutorials
  const handleDismissLifespanIntro = useCallback(() => {
    setShowLifespanIntro(false);
    setLifespanIntroShown(true);
  }, []);
  
  const handleDismissShopExplanation = useCallback(() => {
    setShowShopExplanation(false);
    setShopExplanationShown(true);
  }, []);
  
  const handleShopExplanationOpenShop = useCallback(() => {
    setShowShopExplanation(false);
    setShopExplanationShown(true);
    setActiveTab('wisdom');
  }, []);
  
  // Initialize canning state (uses pre-loaded state)
  const [initialCanningState] = useState(() => loadedGameState?.canningState || undefined);

  // Load and manage UI preferences (uses pre-loaded state)
  const [uiPreferences, setUiPreferences] = useState<{
    canningRecipeFilter: 'all' | 'simple' | 'complex' | 'gourmet' | 'honey';
    canningRecipeSort: 'name' | 'profit' | 'time' | 'difficulty';
    canningCanMakeOnly: boolean;
  }>(() => {
    // Handle legacy saves that may have 'available' as the filter value
    const legacyFilter = loadedGameState?.uiPreferences?.canningRecipeFilter as string | undefined;
    const wasAvailable = legacyFilter === 'available';
    const validFilters = ['all', 'simple', 'complex', 'gourmet', 'honey'];
    const filter = (validFilters.includes(legacyFilter || '') ? legacyFilter : 'all') as 'all' | 'simple' | 'complex' | 'gourmet' | 'honey';
    
    return {
      canningRecipeFilter: filter,
      canningRecipeSort: loadedGameState?.uiPreferences?.canningRecipeSort || 'profit',
      canningCanMakeOnly: loadedGameState?.uiPreferences?.canningCanMakeOnly ?? wasAvailable
    };
  });

  // Handlers for updating UI preferences
  const setCanningRecipeFilter = useCallback((filter: 'all' | 'simple' | 'complex' | 'gourmet' | 'honey') => {
    setUiPreferences(prev => ({ ...prev, canningRecipeFilter: filter }));
  }, []);

  const setCanningRecipeSort = useCallback((sort: 'name' | 'profit' | 'time' | 'difficulty') => {
    setUiPreferences(prev => ({ ...prev, canningRecipeSort: sort }));
  }, []);

  const setCanningCanMakeOnly = useCallback((value: boolean) => {
    setUiPreferences(prev => ({ ...prev, canningCanMakeOnly: value }));
  }, []);

  // Extract honey values from bee state for canning system
  const regularHoney = beeState?.regularHoney || 0;
  const goldenHoney = beeState?.goldenHoney || 0;
  const totalHoneyCollected = beeState?.totalHoneyCollected || 0;

  // Setters for honey that update bee state
  const createBeeStateUpdater = useCallback(
    (key: 'regularHoney' | 'goldenHoney') =>
      (value: number | ((prev: number) => number)) => {
        setBeeState((prev: BeeState | null) => {
          if (!prev) return prev;
          const currentValue = typeof prev[key] === 'number' ? prev[key] : 0;
          const nextValue = typeof value === 'function' ? (value as (prev: number) => number)(currentValue) : value;
          return { ...prev, [key]: nextValue };
        });
      },
    []
  );

  const setRegularHoney = useMemo(() => createBeeStateUpdater('regularHoney'), [createBeeStateUpdater]);
  const setGoldenHoney = useMemo(() => createBeeStateUpdater('goldenHoney'), [createBeeStateUpdater]);

  const { resetGame, veggies, setVeggies, money, setMoney, experience, setExperience, knowledge, setKnowledge, activeVeggie, day, setDay, totalDaysElapsed, totalHarvests, globalAutoPurchaseTimer, setActiveVeggie, handleHarvest, handleToggleSell, handleToggleAutoHarvester, handleSell, handleRitualHarvestAll, handleBuyFertilizer, handleBuyHarvester, handleBuyBetterSeeds, greenhouseOwned, handleBuyGreenhouse, handleBuyHarvesterSpeed, heirloomOwned, handleBuyHeirloom, autoSellOwned, handleBuyAutoSell, almanacLevel, almanacCost, handleBuyAlmanac, handleBuyAdditionalPlot, maxPlots, farmCost, handleBuyLargerFarm, farmTier, irrigationOwned, irrigationCost, irrigationKnCost, handleBuyIrrigation, currentWeather, setCurrentWeather, highestUnlockedVeggie, handleBuyAutoPurchaser, heirloomMoneyCost, heirloomKnowledgeCost, christmasEvent, permanentBonuses, setPermanentBonuses, beeYieldBonus, setBeeYieldBonus, guildState, setGuildState, trackMoneyEarned, trackKnowledgeGained, prestigeState, setPrestigeState, handlePurchaseWisdomUpgrade, handleStartNextLifetime, offlinePrestigePending, wisdomEarnedThisLifetime, isPaused, setIsPaused } = useGame();

  // Force wisdom tab when lifetime has ended (prestige pending)
  useEffect(() => {
    if (offlinePrestigePending && activeTab !== 'wisdom') {
      setActiveTab('wisdom');
    }
  }, [offlinePrestigePending, activeTab]);

  // Guild system handlers (needs day from useGame)
  const handleCommitToGuild = useCallback((guildId: GuildType) => {
    setGuildState(prev => ({
      ...prev,
      committedGuild: guildId,
      status: 'committed',
      commitmentDay: day,
      // Convert guild tokens to the committed guild's currency
      guildCurrencies: {
        ...prev.guildCurrencies,
        [guildId]: prev.guildCurrencies[guildId] + prev.guildTokens
      },
      // Clear guild tokens after conversion
      guildTokens: 0
    }));
  }, [day, setGuildState]);

  const handlePurchaseGuildUpgrade = useCallback((upgradeId: string) => {
    // Find the upgrade from guild data
    let upgrade = null;
    for (const guild of GUILDS) {
      upgrade = guild.upgrades.find(u => u.id === upgradeId);
      if (upgrade) break;
    }
    
    if (!upgrade) {
      console.warn(`Guild upgrade not found: ${upgradeId}`);
      return;
    }
    
    // Calculate the cost based on current level
    const currentLevel = guildState.upgradeLevels[upgradeId] ?? 0;
    const cost = upgrade.baseCost * Math.pow(upgrade.costScaling, currentLevel);
    
    // Check if already maxed
    const isMaxed = upgrade.isOneTime 
      ? guildState.purchasedUpgrades.includes(upgradeId)
      : currentLevel >= upgrade.maxLevel;
    
    if (isMaxed) {
      return;
    }
    
    // Check if player can afford it based on currency type
    let canAfford = false;
    if (upgrade.currencyType === 'sigils') {
      // Sigils are stored in guildCurrencies for the specific guild
      const guildId = upgrade.guild;
      canAfford = guildState.guildCurrencies[guildId] >= cost;
    } else if (upgrade.currencyType === 'guildTokens') {
      // Guild tokens are used before commitment
      canAfford = guildState.guildTokens >= cost;
    } else if (upgrade.currencyType === 'money') {
      canAfford = money >= cost;
    } else if (upgrade.currencyType === 'knowledge') {
      canAfford = knowledge >= cost;
    }
    
    if (!canAfford) {
      return;
    }
    
    // Deduct the cost based on currency type
    if (upgrade.currencyType === 'sigils') {
      const guildId = upgrade.guild;
      setGuildState(prev => ({
        ...prev,
        guildCurrencies: {
          ...prev.guildCurrencies,
          [guildId]: prev.guildCurrencies[guildId] - cost
        }
      }));
    } else if (upgrade.currencyType === 'guildTokens') {
      setGuildState(prev => ({
        ...prev,
        guildTokens: prev.guildTokens - cost
      }));
    } else if (upgrade.currencyType === 'money') {
      setMoney(m => m - cost);
    } else if (upgrade.currencyType === 'knowledge') {
      setKnowledge(k => k - cost);
    }
    
    // Update guild state
    setGuildState(prev => {
      const newPurchased = [...prev.purchasedUpgrades];
      if (!newPurchased.includes(upgradeId)) {
        newPurchased.push(upgradeId);
      }
      const newLevels = { ...prev.upgradeLevels };
      newLevels[upgradeId] = (newLevels[upgradeId] ?? 0) + 1;
      
      // Track sampling for uncommitted players
      if (prev.status !== 'committed') {
        // Find which guild this upgrade belongs to (e.g., 'growers_fertile_soil' -> 'growers')
        const guildId = upgradeId.split('_')[0] as GuildType;
        const newSampled = { ...prev.sampledUpgrades };
        if (!newSampled[guildId]?.includes(upgradeId)) {
          newSampled[guildId] = [...(newSampled[guildId] ?? []), upgradeId];
        }
        return {
          ...prev,
          purchasedUpgrades: newPurchased,
          upgradeLevels: newLevels,
          sampledUpgrades: newSampled,
          status: 'sampling' as const
        };
      }
      
      return {
        ...prev,
        purchasedUpgrades: newPurchased,
        upgradeLevels: newLevels
      };
    });
  }, [guildState.upgradeLevels, guildState.purchasedUpgrades, guildState.guildCurrencies, guildState.guildTokens, setGuildState, money, knowledge, setMoney, setKnowledge]);

  // Season system hook
  const { season } = useSeasonSystem(day);

  // Initialize achievement system BEFORE canning system (uses pre-loaded state)
  // This allows canning system to check for achievement-locked recipes
  const [initialAchievementState] = useState(
    () => loadedGameState?.achievementState || undefined
  );

  const {
    achievements,
    totalUnlocked,
    lastUnlockedId,
    checkAchievements,
    clearLastUnlocked,
    resetAchievements: _resetAchievements // Available but unused in this component
  } = useAchievements(
    initialAchievementState,
    (moneyReward, knowledgeReward) => {
      if (moneyReward > 0) {
        setMoney(prev => prev + moneyReward);
        trackMoneyEarned(moneyReward);
      }
      if (knowledgeReward > 0) {
        setKnowledge(prev => prev + knowledgeReward);
        trackKnowledgeGained(knowledgeReward);
      }
    },
    (achievement) => {
      // Grant permanent bonus if this achievement provides one
      if (achievement.id === 'frost_fertilizer') {
        setPermanentBonuses(prev => {
          if (!prev.includes('frost_fertilizer')) {
            return [...prev, 'frost_fertilizer'];
          }
          return prev;
        });
      }
      
      // ── Telemetry: achievement_unlocked ──
      devTelemetry.emit('achievement_unlocked', {
        achievementId: achievement.id,
        lifetimeWhenUnlocked: prestigeState.lifetimeCount
      });

      // Persist unlock in prestige state (survives hard resets)
      setPrestigeState(prev => ({
        ...prev,
        achievementsUnlocked: {
          ...prev.achievementsUnlocked,
          [achievement.id]: {
            unlockedAt: achievement.unlockedAt || Date.now(),
            lifetimeWhenUnlocked: prev.lifetimeCount
          }
        }
      }));
      
      // Call the event log callback
      eventLogCallbacks.onAchievementUnlock(achievement);
    },
    prestigeState.achievementsUnlocked
  );

  // Get unlocked achievement IDs for systems that need to check achievement-locked content
  const unlockedAchievementIds = useMemo(() => 
    achievements.filter(a => a.unlocked).map(a => a.id),
    [achievements]
  );

  // Runs work recorded by state updaters once their result is committed
  const scheduleAfterCommit = useDeferredEffects();

  // Wrapped setters for the canning system that also track prestige stats.
  // The gain is only known inside the updater, so tracking runs after the commit.
  const setMoneyWithTracking = useCallback((value: number | ((prev: number) => number)) => {
    const key = {};
    setMoney((prev: number) => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      const gained = newValue - prev;
      scheduleAfterCommit(key, gained > 0 ? () => trackMoneyEarned(gained) : undefined);
      return newValue;
    });
  }, [setMoney, trackMoneyEarned, scheduleAfterCommit]);

  const setKnowledgeWithTracking = useCallback((value: number | ((prev: number) => number)) => {
    const key = {};
    setKnowledge((prev: number) => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      const gained = newValue - prev;
      scheduleAfterCommit(key, gained > 0 ? () => trackKnowledgeGained(gained) : undefined);
      return newValue;
    });
  }, [setKnowledge, trackKnowledgeGained, scheduleAfterCommit]);

  // Initialize canning system
  const {
    canningState,
    startCanning,
    completeCanning: _completeCanning, // Used internally by useCanningSystem for auto-collection
    purchaseUpgrade,
    canMakeRecipe,
    toggleAutoCanning,
    resetCanningState
  } = useCanningSystem(
    // experience parameter removed - unused
    veggies, 
    setVeggies, 
    heirloomOwned, 
    money, 
    setMoneyWithTracking, 
    knowledge, 
    setKnowledgeWithTracking, 
    initialCanningState, 
    uiPreferences.canningRecipeSort, 
    farmTier,
    regularHoney,
    goldenHoney,
    totalHoneyCollected,
    setRegularHoney,
    setGoldenHoney,
    unlockedAchievementIds,
    guildState,
    isPaused
  );

  // Check if canning is unlocked (requires Farm Tier 3)
  // Memoized to prevent recalculation on every render
  const canningUnlocked = useMemo(() => farmTier >= 3, [farmTier]);

  // Get the last unlocked achievement for notification
  const lastUnlockedAchievement = lastUnlockedId 
    ? achievements.find(a => a.id === lastUnlockedId) || null
    : null;

  // Initialize event log system (uses pre-loaded state)
  const [initialEventLogState] = useState(() => {
    const savedState = loadedGameState?.eventLogState;
    if (savedState) {
      // Ensure all required properties are present
      return {
        entries: savedState.entries || [],
        maxEntries: savedState.maxEntries || 100,
        unreadCount: savedState.unreadCount || 0,
        lastReadId: savedState.lastReadId
      };
    }
    return undefined;
  });

  const eventLog = useEventLogSystem({
    maxEntries: 100,
    initialState: initialEventLogState,
    farmTier,
    day,
    totalDaysElapsed
  });

  // (refs consolidated earlier)

  // Stable reference for event logging to avoid re-registering callbacks each render
  const { addEvent } = eventLog;

  // Register all event logging callbacks with the context
  useEffect(() => {
    eventLogCallbacks.registerCallbacks({
      onHarvest: (veggieName: string, amount: number, expGain: number, knGain: number, isAuto: boolean) => {
        const opts = buildHarvestEvent(veggieName, amount, expGain, knGain, isAuto, {
          automation: ICON_AUTOMATION,
          harvest: ICON_HARVEST
        });
        addEvent('harvest', `Harvested ${veggieName}`, opts);
      },
      onAutoPurchase: (veggieName: string, autoPurchaserName: string, upgradeType: string, upgradeLevel: number, cost: number, currencyType: 'money' | 'knowledge') => {
        const opts = buildAutoPurchaseEvent(veggieName, autoPurchaserName, upgradeType, upgradeLevel, cost, currencyType, ICON_AUTOMATION);
        addEvent('auto-purchase', `${autoPurchaserName} bought ${opts.metadata.upgradeType === 'fertilizer' ? 'Fertilizer' : opts.metadata.upgradeType === 'betterSeeds' ? 'Better Seeds' : opts.metadata.upgradeType === 'harvesterSpeed' ? 'Harvester Speed' : 'Additional Plot'}`, opts);
      },
      onMerchantSale: (totalMoney: number, veggiesSold: Array<{ name: string; quantity: number; earnings: number }>, isAutoSell: boolean) => {
        const opts = buildMerchantSaleEvent(totalMoney, veggiesSold, isAutoSell, {
          merchant: ICON_MERCHANT,
          money: ICON_MONEY
        });
        addEvent('merchant', isAutoSell ? 'Merchant auto-sold vegetables' : 'Sold vegetables to merchant', opts);
      },
      onAchievementUnlock: (achievement: AchievementOrMilestone) => {
        const opts = buildAchievementEvent(achievement);
        addEvent('milestone', `Achievement unlocked: ${achievement.name}`, opts);
      },
      onTreeSold: (treeType: string, quantity: number, cheerEarned: number) => {
        const opts = buildTreeSoldEvent(treeType, quantity, cheerEarned);
        addEvent('christmas', `Sold ${quantity}x ${treeType} tree${quantity > 1 ? 's' : ''}`, opts);
      },
      onTreeHarvested: (treeType: string, quality: string) => {
        const opts = buildTreeHarvestedEvent(treeType, quality);
        addEvent('christmas', `Harvested ${quality} ${treeType} tree`, opts);
      },
      onItemCrafted: (itemName: string, quantity: number) => {
        const opts = buildItemCraftedEvent(itemName, quantity);
        addEvent('christmas', `Crafted ${quantity}x ${itemName}`, opts);
      },
      onUpgradePurchased: (upgradeName: string, cost: number) => {
        const opts = buildUpgradePurchasedEvent(upgradeName, cost);
        addEvent('christmas', `Purchased upgrade: ${upgradeName}`, opts);
      },
      onMilestoneClaimed: (milestoneName: string) => {
        const opts = buildMilestoneClaimedEvent(milestoneName);
        addEvent('milestone', `Christmas milestone claimed: ${milestoneName}`, opts);
      }
    });

    // Set up canning callbacks on window (still needed for canningSystem.ts)
    window.globalCanningStartCallback = (recipeName: string, ingredients: string, processingTime: number, isAuto: boolean) => {
      const opts = buildCanningStartEvent(recipeName, ingredients, processingTime, isAuto, {
        automation: ICON_AUTOMATION,
        canning: ICON_CANNING
      });
      addEvent('canning', isAuto ? `Auto-canning started: ${recipeName}` : `Started canning: ${recipeName}`, opts);
    };
    
    window.globalCanningCompleteCallback = (recipeName: string, moneyEarned: number, knowledgeEarned: number, itemsProduced: number, isAuto: boolean) => {
      const opts = buildCanningCompleteEvent(recipeName, moneyEarned, knowledgeEarned, itemsProduced, isAuto);
      addEvent('canning', isAuto ? `Auto-canning completed: ${recipeName}` : `Completed canning: ${recipeName}`, opts);
    };
    
    return () => {
      window.globalCanningStartCallback = null;
      window.globalCanningCompleteCallback = null;
    };
  }, [eventLogCallbacks, addEvent]);

  // Everything that goes into a save. Autosave and export both use this, so an
  // exported file holds the full game, including prestige, guilds and achievements.
  const buildSaveState = useCallback((): ExtendedGameState | null => {
    if (!canningState) return null;
    return {
      veggies,
      money,
      experience,
      knowledge,
      activeVeggie,
      day,
      totalDaysElapsed,
      totalHarvests,
      globalAutoPurchaseTimer,
      greenhouseOwned,
      heirloomOwned,
      autoSellOwned,
      almanacLevel,
      almanacCost,
      maxPlots,
      farmTier,
      farmCost,
      irrigationOwned,
      currentWeather,
      highestUnlockedVeggie,
      permanentBonuses,
      canningState,
      uiPreferences,
      achievementState: {
        achievements,
        totalUnlocked,
        lastUnlockedId
      },
      eventLogState: eventLog.getState(),
      christmasEventState: christmasEvent?.eventState,
      beeState: beeState || undefined,
      harvestTutorialShown,
      guildIntroShown,
      lifespanIntroShown,
      shopExplanationShown,
      guildState,
      prestigeState,
      isPaused
    };
  }, [canningState, veggies, money, experience, knowledge, activeVeggie, day, totalDaysElapsed, totalHarvests, globalAutoPurchaseTimer, greenhouseOwned, heirloomOwned, autoSellOwned, almanacLevel, almanacCost, maxPlots, farmTier, farmCost, irrigationOwned, currentWeather, highestUnlockedVeggie, permanentBonuses, uiPreferences, achievements, totalUnlocked, lastUnlockedId, eventLog, christmasEvent, beeState, harvestTutorialShown, guildIntroShown, lifespanIntroShown, shopExplanationShown, guildState, prestigeState, isPaused]);

  // Saves at most every 30 seconds, and always on page unload
  useAutoSave({ getGameState: buildSaveState });

  // Check achievements periodically
  useEffect(() => {
    const veggiesUnlocked = veggies.filter(v => v.unlocked).length;
    const canningItemsTotal = canningState?.totalItemsCanned || 0;
    const christmasTreesSold = christmasEvent?.totalTreesSold || 0;

    checkAchievements({
      money,
      experience,
      knowledge,
      veggiesUnlocked,
      canningItemsTotal,
      farmTier,
      totalHarvests,
      christmasTreesSold,
      beeState,
      canningState,
      prestigeState
    });
  }, [veggies, canningState, christmasEvent, checkAchievements, money, experience, knowledge, farmTier, totalHarvests, beeState, prestigeState]);

  // Reset tab to growing if canning becomes locked while on canning tab
  useEffect(() => {
    if (activeTab === 'canning' && !canningUnlocked) {
      setActiveTab('growing');
    }
  }, [activeTab, canningUnlocked]);

  // Calculate totalPlotsUsed for UI
  // Memoized to prevent expensive recalculation on every render
  const totalPlotsUsed = useMemo(() => 
    veggies.filter(v => v.unlocked).length + veggies.reduce((sum, v) => sum + (v.additionalPlotLevel || 0), 0),
    [veggies]
  );
  
  // Refs for the growth-completion and season-change trackers below
  const previousSeasonRef = useRef(season);
  const previousVeggieGrowthRef = useRef<Map<string, number>>(new Map());

  // Daily weather rolls, durations and weather log entries
  useWeatherRandomization({
    day,
    season,
    currentWeather,
    setCurrentWeather,
    irrigationOwned,
    setKnowledge,
    eventLog
  });

  // Track growth completions
  useEffect(() => {
    veggies.forEach((veggie) => {
      if (!veggie.unlocked) return;
      
      const prevGrowth = previousVeggieGrowthRef.current.get(veggie.name) || 0;
      
      // Check if this veggie just completed growth (crossed 100% threshold)
      if (prevGrowth < GROWTH_COMPLETE_THRESHOLD && veggie.growth >= GROWTH_COMPLETE_THRESHOLD) {
        const growthBonus = getVeggieGrowthBonus(veggie, season, currentWeather, greenhouseOwned, irrigationOwned, guildState);
        const bonusPercent = ((growthBonus / veggie.growthRate) * 100 - 100).toFixed(0);
        
        let bonusText = '';
        if (growthBonus > veggie.growthRate) {
          bonusText = ` (+${bonusPercent}% bonus)`;
        } else if (growthBonus < veggie.growthRate) {
          bonusText = ` (${bonusPercent}% penalty)`;
        }
        
        eventLog.addEvent('growth', `${veggie.name} ready to harvest`, {
          priority: 'normal',
          details: `Growth completed${bonusText}`,
          icon: ICON_GROWING,
          metadata: {
            veggieName: veggie.name
          }
        });
        
        // Show harvest tutorial if this is the first time and we're on the growing tab
        if (!harvestTutorialShown && activeTab === 'growing') {
          setShowHarvestTutorial(true);
        }
      }
      
      // Update the tracked growth value
      previousVeggieGrowthRef.current.set(veggie.name, veggie.growth);
    });
  }, [veggies, season, currentWeather, greenhouseOwned, irrigationOwned, eventLog, harvestTutorialShown, activeTab, guildState]);
  
  // Lifespan tutorial triggers
  // Show intro at start of first lifetime (day 0-1)
  useEffect(() => {
    if (!lifespanIntroShown && prestigeState.lifetimeCount === 1 && day <= 1) {
      setShowLifespanIntro(true);
    }
  }, [lifespanIntroShown, prestigeState.lifetimeCount, day]);
  
  // Show shop explanation after first prestige (when starting lifetime 2)
  useEffect(() => {
    if (!shopExplanationShown && prestigeState.lifetimeCount > 1 && day <= 1) {
      setShowShopExplanation(true);
    }
  }, [shopExplanationShown, prestigeState.lifetimeCount, day]);
  
  // Track season changes
  useEffect(() => {
    if (previousSeasonRef.current !== season) {
      // Log season change
      const seasonEmojis: Record<string, string> = {
        'Spring': SEASON_SPRING,
        'Summer': SEASON_SUMMER,
        'Fall': SEASON_FALL,
        'Winter': SEASON_WINTER
      };
      
      const seasonDetails: Record<string, string> = {
        'Spring': 'Bonus growth for: Radish, Lettuce, Carrots, Cabbage, Onions',
        'Summer': 'Bonus growth for: Green Beans, Zucchini, Cucumbers, Tomatoes, Peppers',
        'Fall': 'Bonus growth for: Radish, Lettuce, Carrots, Broccoli, Cabbage',
        'Winter': 'No bonuses. -90% growth penalty without Greenhouse'
      };
      
      eventLog.addEvent('weather', `${season} has arrived`, {
        priority: 'important',
        details: seasonDetails[season],
        icon: seasonEmojis[season],
        metadata: {
          weatherType: currentWeather,
          previousWeather: currentWeather
        }
      });
      
      previousSeasonRef.current = season;
    }
  }, [season, currentWeather, eventLog]);
  
  const v = veggies[activeVeggie];
  const growthMultiplier = getVeggieGrowthBonus(
    v,
    season,
    currentWeather,
    greenhouseOwned,
    irrigationOwned,
    guildState
  );
  const daysToGrow = growthMultiplier > 0 ? Math.ceil(100 / growthMultiplier) : 0;

  // Track last seen timestamp to only show new bonuses
  const lastBonusTimestamp = useRef(0);

  // Watch for Magical Register bonuses and show toast only on actual sales
  useEffect(() => {
    // Type assertion needed due to TypeScript inference limitations with complex hook return types
    const bonus = (christmasEvent as UseChristmasEventReturn)?.lastMagicalRegisterBonus;
    
    // Only show toast if timestamp is new (different from last seen)
    if (bonus && bonus.amount > 0 && bonus.timestamp > lastBonusTimestamp.current) {
      setMagicalRegisterToast({
        visible: true,
        message: `✨ Holiday Tip! +${bonus.amount} Cheer`,
      });
      lastBonusTimestamp.current = bonus.timestamp;
    }
  }, [christmasEvent]);

  // Preload all images to prevent loading delays when switching tabs
  useEffect(() => {
    // Preload using both methods for maximum browser compatibility
    ALL_IMAGES.forEach(src => {
      // Method 1: Create Image object for immediate loading
      const img = new Image();
      img.src = src;
      
      // Method 2: Add preload link for better caching
      if (!document.querySelector(`link[href="${src}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
      }
    });

  }, []); // Only run once on mount

  return (
    <SaveLoadSystem
      getSaveState={buildSaveState}
      resetGame={resetGame}
    >
      {({ handleExportSave, handleImportSave, handleResetGame, loadingStates }) => (
    <BeeProvider 
      farmTier={farmTier}
      season={season}
      onYieldBonusChange={setBeeYieldBonus}
      initialState={initialBeeState}
      onStateChange={setBeeState}
      addEventLogEntry={eventLog.addEvent}
      isPaused={isPaused}
    >
    <>
    {archieCharacterEnabled && (
      <ArchieIcon 
        setMoney={setMoney} 
        money={money} 
        experience={experience} 
        totalPlotsUsed={totalPlotsUsed}
        isChristmasEventActive={christmasEvent?.isEventActive ?? false}
        christmasTreesSold={christmasEvent?.totalTreesSold ?? 0}
        earnCheer={christmasEvent?.earnCheer}
        onMoneyEarned={trackMoneyEarned}
        isPaused={isPaused}
      />
    )}
    <ErrorBoundary fallback={<SectionError title="Game content" />} onReset={() => window.location.reload()}>
    {/* Skip link for keyboard navigation */}
    <a href="#main-content" className={styles.skipLink}>
      Skip to main content
    </a>
    <div className={styles.container}>
      <div className={styles.mainContent}>
        <header role="banner">
          <HeaderBar
            setShowInfoOverlay={setShowInfoOverlay}
            setShowSettingsOverlay={setShowSettingsOverlay}
            setShowAchievements={setShowAchievements}
            setShowEventLog={setShowEventLog}
            totalAchievements={achievements.length}
            unlockedAchievements={totalUnlocked}
            unreadEventCount={Math.min(eventLog.getUnreadCountForCategories(enabledEventCategories), 100)}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused(p => !p)}
          />
        </header>

        <aside role="complementary" aria-label="Game statistics">
          <StatsDisplay
            day={day}
            totalDaysElapsed={totalDaysElapsed}
            season={season}
            currentWeather={currentWeather}
            totalPlotsUsed={totalPlotsUsed}
            maxPlots={maxPlots}
            money={money}
            knowledge={knowledge}
            veggies={veggies}
            setShowAdvancedStash={setShowAdvancedStash}
            formatNumber={formatNumber}
            experience={experience}
            farmCost={farmCost}
            farmTier={farmTier}
            handleBuyLargerFarm={handleBuyLargerFarm}
            holidayCheer={christmasEvent?.holidayCheer ?? 0}
            isChristmasEventActive={christmasEvent?.isEventActive ?? false}
            guildState={guildState}
            prestigeState={prestigeState}
            lifetimeMaxDays={getMaxLifetimeDaysForPlayer(prestigeState)}
          />
        </aside>

        {/* Tab Navigation */}
        <nav aria-label="Game sections" className={styles.tabNav}>
          <div role="tablist" aria-label="Game tabs" className={styles.tabList}>
            <button
              role="tab"
              id="tab-growing"
              aria-selected={activeTab === 'growing'}
              aria-controls="panel-growing"
              onClick={() => setActiveTab('growing')}
              className={activeTab === 'growing' ? styles.tabButtonGrowingActive : styles.tabButtonGrowing}
            >
              <img src={ICON_GROWING} alt="" aria-hidden="true" className={styles.tabIcon} />
              Growing
            </button>
            <button
              role="tab"
              id="tab-canning"
              aria-selected={activeTab === 'canning'}
              aria-controls="panel-canning"
              aria-disabled={!canningUnlocked}
              onClick={() => canningUnlocked ? setActiveTab('canning') : null}
              disabled={!canningUnlocked}
              className={
                !canningUnlocked 
                  ? styles.tabButtonCanningLocked 
                  : activeTab === 'canning' 
                    ? styles.tabButtonCanningActive 
                    : styles.tabButtonCanning
              }
              title={canningUnlocked ? 'Canning System' : `Canning unlocks at Farm Tier 3`}
            >
              <div className={styles.tabButtonContent}>
                <img src={ICON_CANNING} alt="" aria-hidden="true" className={canningUnlocked ? styles.tabIcon : styles.tabIconFaded} />
                Canning
              </div>
            </button>
            {beeSystemEnabled && (
              <button
                role="tab"
                id="tab-bees"
                aria-selected={activeTab === 'bees'}
                aria-controls="panel-bees"
                aria-disabled={farmTier < 4}
                onClick={() => farmTier >= BEE_CONSTANTS.UNLOCK_FARM_TIER ? setActiveTab('bees') : null}
                disabled={farmTier < 4}
                className={
                  farmTier < 4
                    ? styles.tabButtonBeesLocked
                    : activeTab === 'bees'
                      ? styles.tabButtonBeesActive
                      : styles.tabButtonBees
                }
                title={farmTier >= BEE_CONSTANTS.UNLOCK_FARM_TIER ? 'Bee System' : `Bees unlock at Farm Tier ${BEE_CONSTANTS.UNLOCK_FARM_TIER}`}
              >
                <div className={styles.tabButtonContent}>
                  <img src={ICON_BEE} alt="" aria-hidden="true" className={farmTier >= BEE_CONSTANTS.UNLOCK_FARM_TIER ? styles.tabIcon : styles.tabIconFaded} />
                  Bees
                </div>
                {farmTier < 4 && (
                  <div className={styles.tabUnlockHint}>
                    Req: Tier 4
                  </div>
                )}
              </button>
            )}
            {/* Guilds Tab Button */}
            <button
              role="tab"
              id="tab-guilds"
              aria-selected={activeTab === 'guilds'}
              aria-controls="panel-guilds"
              aria-disabled={farmTier < GUILDS_UNLOCK_TIER}
              onClick={() => farmTier >= GUILDS_UNLOCK_TIER ? setActiveTab('guilds') : null}
              disabled={farmTier < GUILDS_UNLOCK_TIER}
              className={
                farmTier < GUILDS_UNLOCK_TIER
                  ? styles.tabButtonGuildsLocked
                  : activeTab === 'guilds'
                    ? styles.tabButtonGuildsActive
                    : styles.tabButtonGuilds
              }
              title={farmTier >= GUILDS_UNLOCK_TIER ? 'Guild System' : `Guilds unlock at Farm Tier ${GUILDS_UNLOCK_TIER}`}
            >
              <div className={styles.tabButtonContent}>
                <img src={ICON_GUILDS} alt="" aria-hidden="true" className={farmTier >= GUILDS_UNLOCK_TIER ? styles.tabIcon : styles.tabIconFaded} />
                Guilds
              </div>
              {farmTier < GUILDS_UNLOCK_TIER && (
                <div className={styles.tabUnlockHint}>
                  Req: Tier {GUILDS_UNLOCK_TIER}
                </div>
              )}
            </button>
            {christmasEventEnabled && (
              <button
                role="tab"
                id="tab-christmas"
                aria-selected={activeTab === 'christmas'}
                aria-controls="panel-christmas"
                aria-disabled={!christmasEvent?.isEventActive}
                onClick={() => christmasEvent?.isEventActive ? setActiveTab('christmas') : null}
                disabled={!christmasEvent?.isEventActive}
                className={
                  !christmasEvent?.isEventActive
                    ? styles.tabButtonChristmasLocked
                    : activeTab === 'christmas'
                      ? styles.tabButtonChristmasActive
                      : styles.tabButtonChristmas
                }
                title={christmasEvent?.isEventActive ? 'Christmas Tree Shop (Nov 1 - Dec 25)' : 'Available November 1st - December 25th'}
              >
                <div className={styles.tabButtonContent}>
                  <img src={TREE_DECORATED} alt="" aria-hidden="true" className={christmasEvent?.isEventActive ? styles.tabIcon : styles.tabIconFaded} />
                  Tree Shop
                </div>
                {!christmasEvent?.isEventActive && (
                  <div className={styles.tabUnlockHint}>
                    Nov 1 - Dec 25
                  </div>
                )}
              </button>
            )}
            {/* Wisdom Tab Button - visible after first lifetime or when prestige pending */}
            {(offlinePrestigePending || prestigeState.lifetimeCount >= 2) && (
              <button
                role="tab"
                id="tab-wisdom"
                aria-selected={activeTab === 'wisdom'}
                aria-controls="panel-wisdom"
                onClick={() => setActiveTab('wisdom')}
                className={activeTab === 'wisdom' ? styles.tabButtonWisdomActive : styles.tabButtonWisdom}
                title="Wisdom of the Ages"
              >
                <div className={styles.tabButtonContent}>
                  <img src={ICON_WISDOM} alt="" aria-hidden="true" className={styles.tabIcon} />
                  Wisdom
                </div>
              </button>
            )}
          </div>
        </nav>

          {/* Tab Content - All tabs are always rendered, hidden via CSS when inactive */}
          <main role="main" id="main-content">
            {/* Growing Tab Content */}
            <div 
              role="tabpanel" 
              id="panel-growing" 
              aria-labelledby="tab-growing"
              className={activeTab !== 'growing' ? styles.tabPanelHidden : undefined}
            >
              <PerformanceWrapper id="GrowingTab">
                <GrowingTab
                veggies={veggies}
                activeVeggie={activeVeggie}
                totalPlotsUsed={totalPlotsUsed}
                maxPlots={maxPlots}
                money={money}
                knowledge={knowledge}
                experience={experience}
                globalAutoPurchaseTimer={globalAutoPurchaseTimer}
                heirloomOwned={heirloomOwned}
                beeYieldBonus={beeYieldBonus}
                daysToGrow={daysToGrow}
                growthMultiplier={growthMultiplier}
                setActiveVeggie={setActiveVeggie}
                handleHarvest={handleHarvest}
                handleToggleSell={handleToggleSell}
                handleToggleAutoHarvester={handleToggleAutoHarvester}
                handleSell={handleSell}
                handleRitualHarvestAll={handleRitualHarvestAll}
                handleBuyFertilizer={handleBuyFertilizer}
                handleBuyHarvester={handleBuyHarvester}
                handleBuyBetterSeeds={handleBuyBetterSeeds}
                handleBuyAdditionalPlot={handleBuyAdditionalPlot}
                handleBuyHarvesterSpeed={handleBuyHarvesterSpeed}
                handleBuyAutoPurchaser={handleBuyAutoPurchaser}
                formatNumber={formatNumber}
                guildState={guildState}
                upgradesSidebar={
                  <GlobalUpgradesPanel
                    money={money}
                    knowledge={knowledge}
                    day={day}
                    maxPlots={maxPlots}
                    highestUnlockedVeggie={highestUnlockedVeggie}
                    almanacLevel={almanacLevel}
                    almanacCost={almanacCost}
                    irrigationOwned={irrigationOwned}
                    irrigationCost={irrigationCost}
                    irrigationKnCost={irrigationKnCost}
                    autoSellOwned={autoSellOwned}
                    greenhouseOwned={greenhouseOwned}
                    heirloomOwned={heirloomOwned}
                    heirloomMoneyCost={heirloomMoneyCost}
                    heirloomKnowledgeCost={heirloomKnowledgeCost}
                    handleBuyAlmanac={handleBuyAlmanac}
                    handleBuyIrrigation={handleBuyIrrigation}
                    handleBuyAutoSell={handleBuyAutoSell}
                    handleBuyGreenhouse={handleBuyGreenhouse}
                    handleBuyHeirloom={handleBuyHeirloom}
                    formatNumber={formatNumber}
                  />
                }
              />
            </PerformanceWrapper>
            </div>


      
      {/* Canning Tab Content */}
        <div 
          role="tabpanel" 
          id="panel-canning" 
          aria-labelledby="tab-canning"
          className={activeTab !== 'canning' ? styles.tabPanelHidden : undefined}
        >
        <PerformanceWrapper id="CanningTab">
          <CanningTab
            canningState={canningState}
            canningUnlocked={canningUnlocked}
            veggies={veggies}
            money={money}
            knowledge={knowledge}
            heirloomOwned={heirloomOwned}
            regularHoney={regularHoney}
            goldenHoney={goldenHoney}
            startCanning={startCanning}
            canMakeRecipe={canMakeRecipe}
            purchaseUpgrade={purchaseUpgrade}
            toggleAutoCanning={toggleAutoCanning}
            recipeFilter={uiPreferences.canningRecipeFilter}
            recipeSort={uiPreferences.canningRecipeSort}
            canMakeOnly={uiPreferences.canningCanMakeOnly}
            onRecipeFilterChange={setCanningRecipeFilter}
            onRecipeSortChange={setCanningRecipeSort}
            onCanMakeOnlyChange={setCanningCanMakeOnly}
          />
        </PerformanceWrapper>
        </div>

      {/* Bees Tab Content */}
      {beeSystemEnabled && (
        <div 
          role="tabpanel" 
          id="panel-bees" 
          aria-labelledby="tab-bees"
          className={activeTab !== 'bees' ? styles.tabPanelHidden : undefined}
        >
        <PerformanceWrapper id="BeesTab">
          <BeesTabWrapper farmTier={farmTier} season={season} formatNumber={formatNumber} />
        </PerformanceWrapper>
        </div>
      )}

      {/* Guilds Tab Content */}
      <div 
        role="tabpanel" 
        id="panel-guilds" 
        aria-labelledby="tab-guilds"
        className={activeTab !== 'guilds' ? styles.tabPanelHidden : undefined}
      >
        <PerformanceWrapper id="GuildsTab">
          <GuildsTab
            isActive={activeTab === 'guilds'}
            farmTier={farmTier}
            guildState={guildState}
            money={money}
            knowledge={knowledge}
            experience={experience}
            introShown={guildIntroShown}
            onDismissIntro={handleDismissGuildIntro}
            onCommitToGuild={handleCommitToGuild}
            onPurchaseUpgrade={handlePurchaseGuildUpgrade}
            formatNumber={formatNumber}
          />
        </PerformanceWrapper>
      </div>

      {/* Christmas Tree Shop Tab Content */}
      {christmasEventEnabled && christmasEvent?.isEventActive && christmasEvent && (
        <div 
          role="tabpanel" 
          id="panel-christmas" 
          aria-labelledby="tab-christmas"
          className={activeTab !== 'christmas' ? styles.tabPanelHidden : undefined}
        >
        <PerformanceWrapper id="ChristmasTab">
          {/* Christmas Sub-Tab Navigation */}
          <div 
            role="tablist" 
            aria-label="Christmas sections"
            className={styles.christmasSubTabList}
          >
            <button
              role="tab"
              id="tab-christmas-farm"
              aria-selected={christmasSubTab === 'farm'}
              aria-controls="panel-christmas-farm"
              onClick={() => setChristmasSubTab('farm')}
              className={christmasSubTab === 'farm' ? styles.christmasSubTabFarmActive : styles.christmasSubTabFarm}
            >
              <img src={ICON_TREE_SHOP} alt="" aria-hidden="true" className={styles.tabIcon} />
              Tree Farm
            </button>
            <button
              role="tab"
              id="tab-christmas-workshop"
              aria-selected={christmasSubTab === 'workshop'}
              aria-controls="panel-christmas-workshop"
              onClick={() => setChristmasSubTab('workshop')}
              className={christmasSubTab === 'workshop' ? styles.christmasSubTabWorkshopActive : styles.christmasSubTabWorkshop}
            >
              <img src={ICON_TREE_WORKSHOP} alt="" aria-hidden="true" className={styles.tabIcon} />
              Workshop
            </button>
            <button
              role="tab"
              id="tab-christmas-shopfront"
              aria-selected={christmasSubTab === 'shopfront'}
              aria-controls="panel-christmas-shopfront"
              onClick={() => setChristmasSubTab('shopfront')}
              className={christmasSubTab === 'shopfront' ? styles.christmasSubTabShopfrontActive : styles.christmasSubTabShopfront}
            >
              <img src={ICON_TREE_STOREFRONT} alt="" aria-hidden="true" className={styles.tabIcon} />
              Shopfront
            </button>
            
            {/* Daily Customer Bonus - Only show if Wreath Sign upgrade is owned */}
            {christmasEvent.eventState.upgrades.find((u: EventUpgrade) => u.id === 'wreath_sign')?.owned && (
              <div
                className={
                  christmasEvent.eventState.dailyBonus.lastClaimDate !== new Date().toISOString().split('T')[0]
                    ? styles.dailyBonusAvailable
                    : styles.dailyBonusClaimed
                }
              >
                <img 
                  src={DECORATION_WREATH} 
                  alt="Daily Bonus" 
                  className={styles.dailyBonusIcon}
                />
                <span className={
                  christmasEvent.eventState.dailyBonus.lastClaimDate !== new Date().toISOString().split('T')[0]
                    ? styles.dailyBonusTextAvailable
                    : styles.dailyBonusTextClaimed
                }>
                  {christmasEvent.eventState.dailyBonus.lastClaimDate !== new Date().toISOString().split('T')[0]
                    ? 'Daily Bonus!'
                    : 'Claimed Today'}
                </span>
                {christmasEvent.eventState.dailyBonus.lastClaimDate !== new Date().toISOString().split('T')[0] && (
                  <button
                    onClick={christmasEvent.claimDailyBonus}
                    className={styles.dailyBonusClaimButton}
                  >
                    Claim
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Tree Farm Sub-Tab */}
          {christmasSubTab === 'farm' && (
            <div role="tabpanel" id="panel-christmas-farm" aria-labelledby="tab-christmas-farm">
            <TreeFarmTab
              treePlots={christmasEvent.treePlots}
              materials={christmasEvent.materials}
              treeInventory={christmasEvent.eventState.treeInventory}
              upgrades={christmasEvent.eventState.upgrades}
              holidayCheer={christmasEvent.holidayCheer}
              plantTree={christmasEvent.plantTree}
              harvestTree={christmasEvent.harvestTree}
              harvestAllTrees={christmasEvent.harvestAllTrees}
              purchaseUpgrade={christmasEvent.purchaseUpgrade}
              formatNumber={formatNumber}
            />
            </div>
          )}

          {/* Workshop Sub-Tab */}
          {christmasSubTab === 'workshop' && (
            <div role="tabpanel" id="panel-christmas-workshop" aria-labelledby="tab-christmas-workshop">
            <WorkshopTab
              materials={christmasEvent.materials}
              treeInventory={christmasEvent.eventState.treeInventory}
              craftItem={(recipeId) => christmasEvent.craftItem(recipeId, 1)}
              decorateTree={christmasEvent.decorateTree}
              addToDecorationQueue={christmasEvent.addToDecorationQueue}
              automationEnabled={christmasEvent.eventState.upgrades.find((u: EventUpgrade) => u.id === 'elves_bench')?.owned ?? false}
              formatNumber={formatNumber}
              upgrades={christmasEvent.eventState.upgrades}
              holidayCheer={christmasEvent.holidayCheer}
              purchaseUpgrade={christmasEvent.purchaseUpgrade}
              currentElvesAction={(christmasEvent as UseChristmasEventReturn)?.currentElvesAction}
            />
            </div>
          )}

          {/* Shopfront Sub-Tab */}
          {christmasSubTab === 'shopfront' && (
            <div role="tabpanel" id="panel-christmas-shopfront" aria-labelledby="tab-christmas-shopfront">
            <ShopfrontTab
              treeInventory={christmasEvent.eventState.treeInventory}
              materials={christmasEvent.materials}
              sellTrees={christmasEvent.sellTrees}
              sellGarland={christmasEvent.sellGarland}
              sellCandle={christmasEvent.sellCandle}
              sellOrnament={christmasEvent.sellOrnament}
              demandMultiplier={christmasEvent.eventState.marketDemand.demandMultiplier}
              holidayCheer={christmasEvent.holidayCheer}
              upgrades={christmasEvent.eventState.upgrades}
              formatNumber={formatNumber}
              purchaseUpgrade={christmasEvent.purchaseUpgrade}
            />
            </div>
          )}
        </PerformanceWrapper>
        </div>
      )}

      {/* Wisdom Tab Content */}
      {(offlinePrestigePending || prestigeState.lifetimeCount >= 2) && (
        <div 
          role="tabpanel" 
          id="panel-wisdom" 
          aria-labelledby="tab-wisdom"
          className={activeTab !== 'wisdom' ? styles.tabPanelHidden : undefined}
        >
          <PerformanceWrapper id="WisdomTab">
            <WisdomTab
              prestigeState={prestigeState}
              isLifetimeEnded={offlinePrestigePending}
              wisdomEarnedThisLifetime={wisdomEarnedThisLifetime}
              onPurchaseUpgrade={handlePurchaseWisdomUpgrade}
              showUpgradesOnly={!offlinePrestigePending && prestigeState.lifetimeCount >= 2}
              onStartNextLifetime={() => {
                handleStartNextLifetime(() => {
                  // Reset canning (lives in App scope, not GameProvider)
                  resetCanningState();
                  // Clear event log for fresh lifetime
                  eventLog.clearEvents();
                  setActiveTab('growing');
                  addEvent(
                    'system' as EventCategory,
                    `Started lifetime #${prestigeState.lifetimeCount + 1}!`,
                    { priority: 'normal' as EventPriority }
                  );
                });
              }}
              formatNumber={formatNumber}
            />
          </PerformanceWrapper>
        </div>
      )}
      </main>
      </div>
    </div>
    </ErrorBoundary>
    
    {/* Info Overlay */}
    <ErrorBoundary fallback={<OverlayError title="Info" onClose={() => setShowInfoOverlay(false)} />} onReset={() => setShowInfoOverlay(false)}>
      <InfoOverlay
        visible={showInfoOverlay}
        onClose={() => setShowInfoOverlay(false)}
      />
    </ErrorBoundary>
    
    {/* Settings Overlay */}
    <ErrorBoundary fallback={<OverlayError title="Settings" onClose={() => setShowSettingsOverlay(false)} />} onReset={() => setShowSettingsOverlay(false)}>
      <SettingsOverlay
        visible={showSettingsOverlay}
        onClose={() => setShowSettingsOverlay(false)}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        archieAppearance={archieAppearance}
        setArchieAppearance={setArchieAppearance}
        unlockedAchievements={achievements.filter(a => a.unlocked).map(a => a.id)}
        handleExportSave={handleExportSave}
        handleImportSave={handleImportSave}
        handleResetGame={handleResetGame}
        loadingStates={loadingStates}
      />
    </ErrorBoundary>

    {/* Advanced Stash Display Overlay */}
    <ErrorBoundary fallback={<OverlayError title="Stash" onClose={() => setShowAdvancedStash(false)} />} onReset={() => setShowAdvancedStash(false)}>
      <AdvancedStashDisplay
        visible={showAdvancedStash}
        onClose={() => setShowAdvancedStash(false)}
        veggies={veggies}
        greenhouseOwned={greenhouseOwned}
        irrigationOwned={irrigationOwned}
        day={day}
        onToggleSell={handleToggleSell}
        beeYieldBonus={beeYieldBonus}
      />
    </ErrorBoundary>

    {/* Achievements Overlay */}
    <ErrorBoundary fallback={<OverlayError title="Achievements" onClose={() => setShowAchievements(false)} />} onReset={() => setShowAchievements(false)}>
      <AchievementDisplay
        visible={showAchievements}
        onClose={() => setShowAchievements(false)}
        achievements={achievements}
        totalUnlocked={totalUnlocked}
      />
    </ErrorBoundary>

    {/* Achievement Notification */}
    {achievementSystemEnabled && (
      <ErrorBoundary fallback={<OverlayError title="Achievement notification" onClose={clearLastUnlocked} />} onReset={clearLastUnlocked}>
        <AchievementNotification
          achievement={lastUnlockedAchievement}
          onClose={clearLastUnlocked}
        />
      </ErrorBoundary>
    )}

    {/* Event Log Overlay */}
    <ErrorBoundary fallback={<OverlayError title="Event Log" onClose={() => setShowEventLog(false)} />} onReset={() => setShowEventLog(false)}>
      <EventLogOverlay
        visible={showEventLog}
        onClose={() => setShowEventLog(false)}
        entries={eventLog.entries}
        unreadCount={eventLog.getUnreadCountForCategories(enabledEventCategories)}
        onMarkAsRead={eventLog.markAllAsRead}
        onClearAll={eventLog.clearEvents}
        getFilteredEvents={eventLog.getFilteredEvents}
        getCategoryCounts={eventLog.getCategoryCounts}
        enabledCategories={enabledEventCategories}
        onEnabledCategoriesChange={setEnabledEventCategories}
      />
    </ErrorBoundary>

    {/* Harvest Tutorial Overlay */}
    <ErrorBoundary fallback={<OverlayError title="Harvest tutorial" onClose={handleDismissHarvestTutorial} />} onReset={handleDismissHarvestTutorial}>
      <HarvestTutorial
        isVisible={showHarvestTutorial}
        onDismiss={handleDismissHarvestTutorial}
      />
    </ErrorBoundary>

    {/* Lifespan / Wisdom Tutorials */}
    <ErrorBoundary fallback={<OverlayError title="Lifespan tutorial" onClose={handleDismissLifespanIntro} />} onReset={handleDismissLifespanIntro}>
      <LifespanIntro
        isVisible={showLifespanIntro}
        onDismiss={handleDismissLifespanIntro}
      />
    </ErrorBoundary>

    <ErrorBoundary fallback={<OverlayError title="Wisdom shop tutorial" onClose={handleDismissShopExplanation} />} onReset={handleDismissShopExplanation}>
      <ShopExplanation
        isVisible={showShopExplanation}
        wisdomEarned={prestigeState.wisdom}
        onOpenShop={handleShopExplanationOpenShop}
        onBeginNextLifetime={handleDismissShopExplanation}
        formatNumber={formatNumber}
      />
    </ErrorBoundary>

    {/* DevTools - Only visible when feature flag enabled, lazy loaded */}
    {devToolsEnabled && (
      <ErrorBoundary fallback={<OverlayError title="DevTools" />}>
        <Suspense fallback={null}>
          <DevTools
          onAddMoney={(amount) => {
            setMoney(prev => prev + amount);
            if (amount > 0) trackMoneyEarned(amount);
          }}
          onAddExperience={(amount) => setExperience(prev => prev + amount)}
          onAddKnowledge={(amount) => {
            setKnowledge(prev => prev + amount);
            if (amount > 0) trackKnowledgeGained(amount);
          }}
          onSkipDays={(days) => setDay(prev => prev + days)}
          onResetGame={handleResetGame}
          onResetGuild={() => setGuildState(DEFAULT_GUILD_STATE)}
          onAddHolidayCheer={christmasEvent?.earnCheer}
          onHarvestAllTrees={christmasEvent?.harvestAllTrees}
          onProcessTreeGrowth={christmasEvent?.processTreeGrowth}
          onAddTreeMaterials={() => {
            if (christmasEvent?.eventState) {
              // Add 100 of each material type
              const materials = christmasEvent.eventState.materials;
              for (const key of Object.keys(materials) as (keyof typeof materials)[]) {
                materials[key] += 100;
              }
            }
          }}
          onAddHoney={(amount) => {
            if (globalBeeContext?.devAddHoney) {
              globalBeeContext.devAddHoney(amount);
            }
          }}
          onAddGoldenHoney={(amount) => {
            if (globalBeeContext?.devAddGoldenHoney) {
              globalBeeContext.devAddGoldenHoney(amount);
            }
          }}
          onHarvestAllHoney={() => {
            if (globalBeeContext?.harvestAllHoney) {
              globalBeeContext.harvestAllHoney();
            }
          }}
          onCompleteAllBoxes={() => {
            if (globalBeeContext?.devCompleteAllBoxes) {
              globalBeeContext.devCompleteAllBoxes();
            }
          }}
          onAddBeeBox={() => {
            if (globalBeeContext?.addBeeBox) {
              globalBeeContext.addBeeBox();
            }
          }}
        />
        </Suspense>
      </ErrorBoundary>
    )}

    {/* Magical Register Bonus Toast */}
    <ErrorBoundary fallback={<OverlayError title="Toast" onClose={() => setMagicalRegisterToast({ visible: false, message: '' })} />} onReset={() => setMagicalRegisterToast({ visible: false, message: '' })}>
      <Toast
        message={magicalRegisterToast.message}
        type="success"
        visible={magicalRegisterToast.visible}
        duration={3000}
        onClose={() => setMagicalRegisterToast({ visible: false, message: '' })}
      />
    </ErrorBoundary>

    {/* Feature Flags Dev Panel */}
    <ErrorBoundary 
      fallback={null}
      onError={(error, info) => {
        console.warn('[FeatureFlagsPanel] Error caught:', error.message, '\nComponent stack:', info.componentStack);
      }}
    >
      <FeatureFlagsPanel />
    </ErrorBoundary>
    </>
    </BeeProvider>
      )}
    </SaveLoadSystem>
  );
}

export default App;
export { GameProvider, GameContext };
