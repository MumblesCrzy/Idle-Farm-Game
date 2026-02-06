import { useEffect, useRef, useState, createContext, useContext, useMemo, useCallback, lazy, Suspense, type FC, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import ArchieIcon from './components/ArchieIcon';
import AdvancedStashDisplay from './components/AdvancedStashDisplay';
import InfoOverlay from './components/InfoOverlay';
import SettingsOverlay from './components/SettingsOverlay';
import EventLogOverlay from './components/EventLogOverlay';
import FeatureFlagsPanel from './components/FeatureFlagsPanel';
import { useFeatureFlag } from './context/FeatureFlagsContext';

// Tab components - loaded eagerly to avoid per-tab loading delays
import GrowingTab from './components/GrowingTab';
import CanningTab from './components/CanningTab';
import BeesTab from './components/BeesTab';
import TreeFarmTab from './components/TreeFarmTab';
import WorkshopTab from './components/WorkshopTab';
import ShopfrontTab from './components/ShopfrontTab';
import GuildsTab from './components/GuildsTab';

import StatsDisplay from './components/StatsDisplay';
import HeaderBar from './components/HeaderBar';
import SaveLoadSystem from './components/SaveLoadSystem';
import Toast from './components/Toast';
import HarvestTutorial from './components/HarvestTutorial';
import ErrorBoundary from './components/ErrorBoundary';
import { useEventLog } from './context/EventLogContext';
import { useGameFlags } from './context/GameFlagsContext';
import { ICON_BEE, ICON_GUILDS } from './config/assetPaths';

// Guild system imports
import { DEFAULT_GUILD_STATE } from './types/guilds';
import type { GuildState, GuildType } from './types/guilds';
import { GUILDS_UNLOCK_TIER, GUILDS } from './data/guildData';
import { applyGuildPriceBonuses, getUpgradeLevel, isCommittedTo } from './utils/guildCalculations';

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
import { useGameLoop, useRobustInterval } from './hooks/useGameLoop';
import { useEventLog as useEventLogSystem } from './hooks/useEventLog';
import { useChristmasEvent, type UseChristmasEventReturn } from './hooks/useChristmasEvent';
import { loadGameStateWithCanning, saveGameStateWithCanning } from './utils/saveSystem';
import { calculateOfflineProgress, formatOfflineTime } from './utils/offlineProgress';
import type { Veggie, GameState, EventCategory, EventPriority, WeatherType } from './types/game';
import type { BeeState, BeeContextValue } from './types/bees';
import type { EventUpgrade } from './types/christmasEvent';
import type { AchievementOrMilestone } from './types/achievements';
import {
  RAIN_CHANCES,
  DROUGHT_CHANCES,
  STORM_CHANCES,
  IRRIGATION_COST,
  IRRIGATION_KN_COST,
  MERCHANT_DAYS,
  MERCHANT_COST,
  MERCHANT_KN_COST,
  GREENHOUSE_COST_PER_PLOT,
  GREENHOUSE_KN_COST_PER_PLOT,
  HEIRLOOM_COST_PER_VEGGIE,
  HEIRLOOM_KN_PER_VEGGIE,
  veggieSeasonBonuses,
  GAME_STORAGE_KEY,
  RAIN_DURATION_DAYS,
  DROUGHT_DURATION_DAYS,
  STORM_DURATION_DAYS,
  HEATWAVE_DURATION_DAYS,
  GROWTH_COMPLETE_THRESHOLD
} from './config/gameConstants';
import { ALL_IMAGES, ICON_GROWING, ICON_CANNING, ICON_AUTOMATION, ICON_HARVEST, ICON_MONEY, ICON_MERCHANT, WEATHER_RAIN, WEATHER_SNOW, WEATHER_CLEAR, WEATHER_DROUGHT, WEATHER_HEATWAVE, WEATHER_STORM, SEASON_SPRING, SEASON_SUMMER, SEASON_FALL, SEASON_WINTER, ICON_TREE_SHOP, ICON_TREE_WORKSHOP, ICON_TREE_STOREFRONT, TREE_DECORATED, DECORATION_WREATH } from './config/assetPaths';
import styles from './components/App.module.css';
import {
  formatNumber,
  getVeggieGrowthBonus,
  calculateExpRequirement,
  calculateInitialCost,
  calculateUpgradeCost,
  createAutoPurchaserConfigs,
  createInitialVeggies,
  createInitialFruits
} from './utils/gameCalculations';
import {
  processVeggieGrowth,
  processAutoHarvest,
  processVeggieUnlocks
} from './utils/gameLoopProcessors';
import { calculateHarvestRewards } from './utils/harvestCalculations';
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

const initialVeggies: Veggie[] = [...createInitialVeggies(), ...createInitialFruits()];

/**
 * Check if the Christmas Tree Shop tab should be visible
 * Only show from November 1st to December 31st
 */
function isChristmasTabVisible(): boolean {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed (0 = January, 10 = November, 11 = December)
  return month === 10 || month === 11; // November or December
}

// Small helper to keep the latest value in a ref without large dependency arrays
const useLatestRef = <T,>(value: T) => {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
};

const createAutoPurchaseHandler = (
  autoPurchaseId: string,
  veggies: Veggie[],
  setVeggies: Dispatch<SetStateAction<Veggie[]>>,
  money: number,
  setMoney: Dispatch<SetStateAction<number>>,
  knowledge: number,
  setKnowledge: Dispatch<SetStateAction<number>>,
  maxPlots?: number
) => {
  return (index: number) => {
    const veggie = veggies[index];
    const autoPurchaser = veggie.autoPurchasers.find(ap => ap.id === autoPurchaseId);
    
    if (!autoPurchaser) return;

    const currency = autoPurchaser.currencyType === 'money' ? money : knowledge;
    const canAfford = !autoPurchaser.owned && currency >= autoPurchaser.cost;

    if (canAfford) {
      // Purchase the auto-purchaser
      if (autoPurchaser.currencyType === 'money') {
        setMoney((m: number) => Math.max(0, m - autoPurchaser.cost));
      } else {
        setKnowledge((k: number) => Math.max(0, k - autoPurchaser.cost));
      }
      setVeggies((prev) => {
        const updated = [...prev];
        const v2 = { ...updated[index] };
        const apIndex = v2.autoPurchasers.findIndex(ap => ap.id === autoPurchaseId);
        if (apIndex >= 0) {
          v2.autoPurchasers[apIndex] = {
            ...v2.autoPurchasers[apIndex],
            owned: true,
            active: true,
            timer: 0
          };
        }
        updated[index] = v2;
        return updated;
      });
    } else if (autoPurchaser.owned) {
      // Toggle activation - but prevent Surveyor from being turned on at max plots
      if (autoPurchaseId === 'surveyor' && !autoPurchaser.active && maxPlots !== undefined) {
        const totalPlotsUsed = veggies.filter(v => v.unlocked).length + veggies.reduce((sum, v) => sum + (v.additionalPlotLevel || 0), 0);
        if (totalPlotsUsed >= maxPlots) {
          return; // Don't allow turning Surveyor on when at max plots
        }
      }
      
      setVeggies((prev) => {
        const updated = [...prev];
        const v2 = { ...updated[index] };
        const apIndex = v2.autoPurchasers.findIndex(ap => ap.id === autoPurchaseId);
        if (apIndex >= 0) {
          v2.autoPurchasers[apIndex] = {
            ...v2.autoPurchasers[apIndex],
            active: !v2.autoPurchasers[apIndex].active
          };
        }
        updated[index] = v2;
        return updated;
      });
    }
  };
};

const GameContext = createContext<GameState | undefined>(undefined);

// Removed unused saveGameState function

const GameProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Get event log callback interface and game flags from context
  const eventLogCallbacks = useEventLog();
  const { setJustReset, setBlockAchievementChecks } = useGameFlags();
  
  // Load game state fresh each time - this ensures imports work correctly
  const getLoadedState = () => {
    const result = loadGameStateWithCanning();
    return result;
  };
  const loaded = getLoadedState();
  
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

  // Bee yield bonus tracking (from bee boxes and Meadow Magic upgrades)
  const [beeYieldBonus, setBeeYieldBonus] = useState(0); // Decimal format (e.g., 0.05 = 5%)

  // Guild system state (moved to GameProvider for growth calculations)
  const [guildState, setGuildState] = useState<GuildState>(() => {
    const loaded = getLoadedState();
    return loaded?.guildState || DEFAULT_GUILD_STATE;
  });

  // Initialize Christmas Tree Shop event
  const [initialChristmasState] = useState(() => {
    try {
      const loaded = getLoadedState();
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

  // Irrigation upgrade handler
  const irrigationCost = IRRIGATION_COST;
  const irrigationKnCost = IRRIGATION_KN_COST;
  const handleBuyIrrigation = useCallback(() => {
    if (!irrigationOwned && money >= irrigationCost && knowledge >= irrigationKnCost) {
      setMoney((m: number) => m - irrigationCost);
      setKnowledge((k: number) => k - irrigationKnCost);
      setIrrigationOwned(true);
      
      // Log irrigation purchase milestone
      eventLogCallbacks.onAchievementUnlock({
        name: 'Irrigation System',
        description: 'Installed irrigation system (Drought no longer affects crops)',
        reward: null,
        category: 'milestone'
      });
    }
  }, [irrigationOwned, money, irrigationCost, knowledge, irrigationKnCost]);
  
  // Farm purchase/reset logic
  const handleBuyLargerFarm = useCallback(() => {
    // Calculate new maxPlots (capped at twice the current max)
    const experienceBonus = Math.floor(experience / 100);
    const uncappedMaxPlots = maxPlots + experienceBonus;
    const newMaxPlots = Math.min(uncappedMaxPlots, maxPlots * 2);
    // Calculate money to keep
    const moneyKept = money - farmCost;
    // Calculate knowledge to keep (third of current)
    const knowledgeKept = knowledge;
    // Calculate new farm tier
    const newFarmTier = farmTier + 1;
    // Calculate starting experience based on farm tier to unlock appropriate vegetables
    // Tier 1: Radish (0 exp), Tier 2: + Lettuce (95 exp), Tier 3: + Green Beans (180 exp), etc.
    const startingExperience = newFarmTier > 1 ? calculateExpRequirement(newFarmTier - 1) : 0;
    
    // Reset veggies with fresh auto-purchaser configs
    const resetVeggies = createInitialVeggies().map(v => ({
      ...v,
      autoPurchasers: createAutoPurchaserConfigs(
        v.autoPurchasers[0].cost,
        v.autoPurchasers[1].cost,
        v.autoPurchasers[2].cost,
        v.autoPurchasers[3].cost
      )
    }));
    
    // Save current state of irrigation
    // Static knowledge multiplier bonus per farm tier is applied globally in knowledge gain
    // Reset game state, but keep moneyKept, newMaxPlots, and newFarmTier
    // Set activeVeggie to 0 FIRST to prevent rendering issues
    setActiveVeggie(0);
    setVeggies(resetVeggies);
    setMoney(moneyKept > 0 ? moneyKept : 0);
    setExperience(startingExperience);
    setKnowledge(knowledgeKept);
    setDay(1);
    setGreenhouseOwned(false);
    setAlmanacLevel(0);
    setAlmanacCost(10);
    setAutoSellOwned(false);
    setHeirloomOwned(false);
    setMaxPlots(newMaxPlots);
    setFarmTier(newFarmTier);
    setIrrigationOwned(false); // Preserve irrigation state
    setGlobalAutoPurchaseTimer(0); // Reset auto-purchaser timer
    setFarmCost(Math.ceil(FARM_BASE_COST * Math.pow(1.85, newFarmTier - 1))); // Increase cost for next farm, exponential scaling
    
    // Log farm tier upgrade milestone
    eventLogCallbacks.onAchievementUnlock({
      name: `Farm Tier ${newFarmTier}`,
      description: `Upgraded to Farm Tier ${newFarmTier} with ${newMaxPlots} max plots`,
      reward: null,
      category: 'milestone'
    });
    
    // Note: Canning state is preserved - auto-save will handle saving all state including canning
    // No manual save call needed here, the auto-save system will pick up these changes
  }, [experience, money, farmTier, knowledge, maxPlots, farmCost]);
  // Removed duplicate loaded declaration and invalid farmTier type usage
  // Farmer's Almanac purchase handler
  const handleBuyAlmanac = useCallback(() => {
    if (money >= almanacCost) {
      setMoney((m: number) => Math.max(0, m - almanacCost));
      setAlmanacLevel((lvl: number) => lvl + 1);
      setAlmanacCost((cost: number) => Math.ceil(cost * 1.15 + 5));
    }
  }, [money, almanacCost]);
  // Auto Sell upgrade purchase handler
  const handleBuyAutoSell = useCallback(() => {
    if (!autoSellOwned && money >= MERCHANT_COST && knowledge >= MERCHANT_KN_COST) {
      setMoney((m: number) => m - MERCHANT_COST);
      setKnowledge((k: number) => k - MERCHANT_KN_COST);
      setAutoSellOwned(true);
      
      // Log auto-sell purchase milestone
      eventLogCallbacks.onAchievementUnlock({
        name: 'Merchant Partnership',
        description: 'Unlocked auto-sell (Merchant buys stashed veggies every 7 days)',
        reward: null,
        category: 'milestone'
      });
    }
  }, [autoSellOwned, money, knowledge]);
  // Reset game handler
  const resetGame = () => {
  // Block achievement checks during reset to prevent re-unlocking
  setBlockAchievementChecks(true);
  
  // Remove all data from localStorage first
  localStorage.removeItem(GAME_STORAGE_KEY);
  
  // Create fresh veggies using the factory function
  const resetVeggies = createInitialVeggies();
  
  setFarmTier(1);
  setDay(1);
  setTotalDaysElapsed(0);
  setTotalHarvests(0);
  setMaxPlots(4);
  setMoney(0);
  setExperience(0);
  setKnowledge(0);
  setActiveVeggie(0);
  setVeggies(resetVeggies);
  setAlmanacLevel(0);
  setAlmanacCost(10);
  setIrrigationOwned(false);
  setAutoSellOwned(false);
  setGreenhouseOwned(false);
  setHeirloomOwned(false);
  setCurrentWeather('Clear');
  setFarmCost(FARM_BASE_COST);
  setHighestUnlockedVeggie(0); // Reset highest unlocked veggie for complete reset
  
  // Reset achievements FIRST, before resetting bee system
  // This prevents achievements from being re-unlocked when bee state changes
  eventLogCallbacks.resetAchievements();
  
  // Reset bee system (this will trigger beeState update and achievement check)
  if (globalBeeContext?.resetBeeSystem) {
    globalBeeContext.resetBeeSystem();
  }
  
  // Clear event log
  eventLogCallbacks.clearEventLog();
  
  // Reset Christmas event
  if (christmasEvent?.resetEvent) {
    christmasEvent.resetEvent();
  }
  
  // Wait for state updates to propagate, then re-enable features
  // The auto-save system will save the reset state once justReset becomes false
  setTimeout(() => {
    // Re-enable achievement checks and auto-save after state updates propagate
    setBlockAchievementChecks(false);
    setJustReset(false);
    
    // Trigger a state change to ensure auto-save runs with reset values
    // This dummy state change forces the save effect to run
    setMoney(prev => prev);
  }, 100);
  
  // Prevent auto-save from running until state updates propagate
  setJustReset(true);
  };

  
  // Auto Harvester Speed upgrade purchase
  const handleBuyHarvesterSpeed = useCallback((index: number) => {
    const v = veggies[index];
    if (v.harvesterOwned && money >= v.harvesterSpeedCost!) {
      setMoney((m: number) => Math.max(0, m - v.harvesterSpeedCost!));
      setVeggies((prev) => {
        const updated = [...prev];
        const v2 = { ...updated[index] };
        v2.harvesterSpeedLevel = (v2.harvesterSpeedLevel ?? 0) + 1;
        v2.harvesterSpeedCost = calculateUpgradeCost('harvesterSpeed', v2.harvesterSpeedLevel, calculateInitialCost('harvesterSpeed', index));
        updated[index] = v2;
        return updated;
      });
    }
  }, [veggies, money]);
  
  // Prestige: Better Seeds upgrade purchase
  const handleBuyBetterSeeds = useCallback((index: number) => {
    const v = veggies[index];
    if (knowledge >= v.betterSeedsCost) {
      const cost = v.betterSeedsCost;
      setKnowledge((k: number) => Math.max(0, k - cost));
      setVeggies((prev) => {
        const updated = [...prev];
        const v2 = { ...updated[index] };
        v2.betterSeedsLevel += 1;
        const multiplier = heirloomOwned ? 1.5 : 1.25;
        v2.salePrice = +(v2.salePrice * multiplier).toFixed(2);
        v2.betterSeedsCost = calculateUpgradeCost('betterSeeds', v2.betterSeedsLevel, calculateInitialCost('betterSeeds', index));
        updated[index] = v2;
        return updated;
      });
    }
  }, [veggies, knowledge, heirloomOwned]);
  // Heirloom Seeds purchase handler
  const handleBuyHeirloom = useCallback(() => {
    if (!heirloomOwned && money >= heirloomMoneyCost && knowledge >= heirloomKnowledgeCost) {
      setMoney((m: number) => m - heirloomMoneyCost);
      setKnowledge((k: number) => k - heirloomKnowledgeCost);
      setHeirloomOwned(true);
      
      // Log heirloom purchase milestone
      eventLogCallbacks.onAchievementUnlock({
        name: 'Heirloom Seeds Unlocked',
        description: 'Unlocked Heirloom Seeds (Better Seeds now 1.5x more effective)',
        reward: null,
        category: 'milestone'
      });
      
      // Retroactively update all vegetable prices to reflect the heirloom bonus
      setVeggies((prev) => {
        const baseVeggies = createInitialVeggies();
        return prev.map((v, index) => {
          if (v.betterSeedsLevel > 0) {
            // Recalculate the sale price with the heirloom multiplier
            // First, calculate the base price (original price before any Better Seeds)
            const baseSalePrice = baseVeggies[index].salePrice;
            // Then apply the heirloom multiplier (1.5x per level instead of 1.25x)
            const newSalePrice = +(baseSalePrice * Math.pow(1.5, v.betterSeedsLevel)).toFixed(2);
            return { ...v, salePrice: newSalePrice };
          }
          return v;
        });
      });
    }
  }, [heirloomOwned, money, heirloomMoneyCost, knowledge, heirloomKnowledgeCost]);

  // Weather system hook
  const { currentWeather, setCurrentWeather } = useWeatherSystem('Clear');
  
  // Season system hook
  const { season } = useSeasonSystem(day);
  
  // Store current game state in a ref so offline progress can access latest values
  const gameStateRef = useRef({
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
    christmasEvent
  });
  
  // Update ref when state changes
  useEffect(() => {
    gameStateRef.current = {
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
      christmasEvent
    };
  }, [veggies, day, totalDaysElapsed, season, currentWeather, greenhouseOwned, irrigationOwned, almanacLevel, farmTier, knowledge, christmasEvent]);
  
  // Offline Progress System - tracks when player leaves/returns to the tab
  useEffect(() => {
    const LAST_ACTIVE_KEY = 'farmIdleLastActive';
    let hasProcessedOffline = false;
    
    // When tab becomes visible, check for offline time and simulate progress
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became visible
        const lastActiveTime = localStorage.getItem(LAST_ACTIVE_KEY);
        
        // Reset the flag so we can process offline progress again
        hasProcessedOffline = false;
        
        if (lastActiveTime && !hasProcessedOffline) {
          const now = Date.now();
          const timeElapsed = now - parseInt(lastActiveTime, 10);
          
          // Only process if player was gone for more than 1 second
          if (timeElapsed > 1000) {
            // Get current state from ref
            const state = gameStateRef.current;
            
            // Calculate offline progress
            const offlineResult = calculateOfflineProgress(timeElapsed, {
              veggies: state.veggies,
              day: state.day,
              totalDaysElapsed: state.totalDaysElapsed,
              dayLength: 1000, // 1 second per day
              season: state.season,
              currentWeather: state.currentWeather,
              greenhouseOwned: state.greenhouseOwned,
              irrigationOwned: state.irrigationOwned,
              almanacLevel: state.almanacLevel,
              farmTier: state.farmTier,
              knowledge: state.knowledge,
              canningProcesses: [],
              canningUpgrades: {},
                autoCanning: { enabled: false },
                beeState: globalBeeContext ? {
                  unlocked: globalBeeContext.unlocked,
                  boxes: globalBeeContext.boxes,
                  upgrades: globalBeeContext.upgrades,
                  beekeeperAssistant: globalBeeContext.beekeeperAssistant,
                  regularHoney: globalBeeContext.regularHoney,
                  goldenHoney: globalBeeContext.goldenHoney,
                  totalHoneyCollected: globalBeeContext.totalHoneyCollected,
                  totalGoldenHoneyCollected: globalBeeContext.totalGoldenHoneyCollected,
                } : undefined
            });
            
            // Apply the offline progress to game state
            if (offlineResult.timeElapsed >= 1000) {
              setVeggies(offlineResult.veggies);
              setExperience((prev: number) => prev + offlineResult.experienceGain);
              setKnowledge((prev: number) => prev + offlineResult.knowledgeGain);
              setDay(offlineResult.day);
              setTotalDaysElapsed(offlineResult.totalDaysElapsed);
              
              // Get current Christmas event state from ref
              const currentChristmasEvent = gameStateRef.current.christmasEvent;
              
              // Process Christmas tree growth if event is active
              if (currentChristmasEvent.isEventActive && offlineResult.christmasTreeGrowthTicks > 0) {
                for (let i = 0; i < offlineResult.christmasTreeGrowthTicks; i++) {
                  currentChristmasEvent.processTreeGrowth();
                }
              }
              
              // Process Christmas passive income (Golden Bell)
              if (currentChristmasEvent.isEventActive && currentChristmasEvent.passiveCheerPerSecond > 0) {
                currentChristmasEvent.updatePassiveIncome(offlineResult.timeElapsed);
              }
              
              // Process Elves' Bench automation
              if (currentChristmasEvent.isEventActive && offlineResult.christmasTreeGrowthTicks > 0) {
                const elvesBenchOwned = currentChristmasEvent.eventState.upgrades.find((u: EventUpgrade) => u.id === 'elves_bench')?.owned ?? false;
                if (elvesBenchOwned) {
                  for (let i = 0; i < offlineResult.christmasTreeGrowthTicks; i++) {
                    currentChristmasEvent.processDailyElvesCrafting();
                  }
                }
              }

              // Process bee system offline production
              if (offlineResult.beeProgress && globalBeeContext?.applyOfflineProgress) {
                globalBeeContext.applyOfflineProgress(offlineResult.beeProgress);
              }
              
              // Show a welcome back message
              const timeAwayStr = formatOfflineTime(offlineResult.timeElapsed);
              console.log(`Welcome back! You were away for ${timeAwayStr}`);
              
              // Log offline progress details
              if (offlineResult.experienceGain > 0 || offlineResult.knowledgeGain > 0) {
                console.log(`Offline progress: +${offlineResult.experienceGain.toFixed(1)} XP, +${offlineResult.knowledgeGain.toFixed(1)} Knowledge`);
              }
              
              if (currentChristmasEvent.isEventActive && offlineResult.christmasTreeGrowthTicks > 0) {
                console.log(`Christmas trees grew ${offlineResult.christmasTreeGrowthTicks} times`);
              }
              
              hasProcessedOffline = true;
            }
          }
        }
        
        // Update last active time
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      } else {
        // Tab became hidden - save the current time
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      }
    };
    
    // Check on initial mount (in case user is returning after closing tab)
    const lastActiveTime = localStorage.getItem(LAST_ACTIVE_KEY);
    if (lastActiveTime) {
      const now = Date.now();
      const timeElapsed = now - parseInt(lastActiveTime, 10);
      
      if (timeElapsed > 1000) {
        // Get current state from ref
        const state = gameStateRef.current;
        
        const offlineResult = calculateOfflineProgress(timeElapsed, {
          veggies: state.veggies,
          day: state.day,
          totalDaysElapsed: state.totalDaysElapsed,
          dayLength: 1000,
          season: state.season,
          currentWeather: state.currentWeather,
          greenhouseOwned: state.greenhouseOwned,
          irrigationOwned: state.irrigationOwned,
          almanacLevel: state.almanacLevel,
          farmTier: state.farmTier,
          knowledge: state.knowledge,
          canningProcesses: [],
          canningUpgrades: {},
            autoCanning: { enabled: false },
            beeState: globalBeeContext ? {
              unlocked: globalBeeContext.unlocked,
              boxes: globalBeeContext.boxes,
              upgrades: globalBeeContext.upgrades,
              beekeeperAssistant: globalBeeContext.beekeeperAssistant,
              regularHoney: globalBeeContext.regularHoney,
              goldenHoney: globalBeeContext.goldenHoney,
              totalHoneyCollected: globalBeeContext.totalHoneyCollected,
              totalGoldenHoneyCollected: globalBeeContext.totalGoldenHoneyCollected,
            } : undefined
        });
        
        if (offlineResult.timeElapsed >= 1000) {
          setVeggies(offlineResult.veggies);
          setExperience((prev: number) => prev + offlineResult.experienceGain);
          setKnowledge((prev: number) => prev + offlineResult.knowledgeGain);
          setDay(offlineResult.day);
          setTotalDaysElapsed(offlineResult.totalDaysElapsed);
          
          // Get current Christmas event state from ref
          const currentChristmasEvent = state.christmasEvent;
          
          // Process Christmas tree growth if event is active
          if (currentChristmasEvent.isEventActive && offlineResult.christmasTreeGrowthTicks > 0) {
            for (let i = 0; i < offlineResult.christmasTreeGrowthTicks; i++) {
              currentChristmasEvent.processTreeGrowth();
            }
          }
          
          // Process Christmas passive income (Golden Bell)
          if (currentChristmasEvent.isEventActive && currentChristmasEvent.passiveCheerPerSecond > 0) {
            currentChristmasEvent.updatePassiveIncome(offlineResult.timeElapsed);
          }
          
          // Process Elves' Bench automation
          if (currentChristmasEvent.isEventActive && offlineResult.christmasTreeGrowthTicks > 0) {
            const elvesBenchOwned = currentChristmasEvent.eventState.upgrades.find((u: EventUpgrade) => u.id === 'elves_bench')?.owned ?? false;
            if (elvesBenchOwned) {
              for (let i = 0; i < offlineResult.christmasTreeGrowthTicks; i++) {
                currentChristmasEvent.processDailyElvesCrafting();
              }
            }
          }

          // Process bee system offline production
          if (offlineResult.beeProgress && globalBeeContext?.applyOfflineProgress) {
            globalBeeContext.applyOfflineProgress(offlineResult.beeProgress);
          }
          
          const timeAwayStr = formatOfflineTime(offlineResult.timeElapsed);
          console.log(`Welcome back! You were away for ${timeAwayStr}`);
          
          if (offlineResult.experienceGain > 0 || offlineResult.knowledgeGain > 0) {
            console.log(`Offline progress: +${offlineResult.experienceGain.toFixed(1)} XP, +${offlineResult.knowledgeGain.toFixed(1)} Knowledge`);
          }
          
          if (christmasEvent.isEventActive && offlineResult.christmasTreeGrowthTicks > 0) {
            console.log(`Christmas trees grew ${offlineResult.christmasTreeGrowthTicks} times`);
          }
        }
      }
    }
    
    // Set current time
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also update time periodically while tab is active (every 10 seconds)
    const updateInterval = setInterval(() => {
      if (!document.hidden) {
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      }
    }, 10000);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(updateInterval);
    };
  }, []); // Run only once on mount
  
  // Initialize highestUnlockedVeggie for existing players who don't have it in their save data
  useEffect(() => {
    if (loaded && loaded.highestUnlockedVeggie === undefined && loaded.veggies) {
      // Find the highest index of unlocked veggies from the loaded save data
      const currentHighest = loaded.veggies.reduce((highest: number, veggie: Veggie, index: number) => {
        return veggie.unlocked && index > highest ? index : highest;
      }, 0);
      setHighestUnlockedVeggie(currentHighest);
    }
  }, []); // Run only once on mount with empty dependency array since loaded is stable    
 
  // Growth timer for all unlocked veggies - using requestAnimationFrame for Chrome compatibility
  // Performance monitoring ref to detect excessive rerenders
  const growthLoopCountRef = useRef(0);
  const lastGrowthLoopResetRef = useRef(Date.now());
  
  useGameLoop(() => {
    // Monitor for excessive loop executions (possible memory leak)
    growthLoopCountRef.current++;
    const now = Date.now();
    if (now - lastGrowthLoopResetRef.current > 60000) { // Every minute
      if (growthLoopCountRef.current > 100) {
        console.warn('⚠️ Growth loop executed', growthLoopCountRef.current, 'times in last minute (expected ~60)');
      }
      growthLoopCountRef.current = 0;
      lastGrowthLoopResetRef.current = now;
    }
    
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
  }, 1000, [season, currentWeather, greenhouseOwned, irrigationOwned]);

  // Greenhouse upgrade purchase handler
  const handleBuyGreenhouse = useCallback(() => {
    const greenhouseCost = GREENHOUSE_COST_PER_PLOT * maxPlots;
    const greenhouseKnCost = GREENHOUSE_KN_COST_PER_PLOT * maxPlots;
    if (!greenhouseOwned && money >= greenhouseCost && knowledge >= greenhouseKnCost) {
      setMoney((m: number) => m - greenhouseCost);
      setKnowledge((k: number) => k - greenhouseKnCost);
      setGreenhouseOwned(true);
      
      // Log greenhouse purchase milestone
      eventLogCallbacks.onAchievementUnlock({
        name: 'Greenhouse Purchased',
        description: `Built a greenhouse for ${maxPlots} plots (All plots grow year-round)`,
        reward: null,
        category: 'milestone'
      });
    }
  }, [greenhouseOwned, money, maxPlots, knowledge]);

  // Latest-value refs to avoid large dependency arrays and restart of loops
  // Only keep refs that are actually used in game loops
  const knowledgeRef = useLatestRef(knowledge);
  const dayRef = useLatestRef(day);
  const almanacLevelRef = useLatestRef(almanacLevel);
  const maxPlotsRef = useLatestRef(maxPlots);
  const farmTierRef = useLatestRef(farmTier);
  const highestUnlockedVeggieRef = useLatestRef(highestUnlockedVeggie);
  const beeYieldBonusRef = useLatestRef(beeYieldBonus);
  const seasonRef = useLatestRef(season);
  const permanentBonusesRef = useLatestRef(permanentBonuses);
  const christmasEventRef = useLatestRef(christmasEvent);
  const experienceRef = useLatestRef(experience);
  const autoSellOwnedRef = useLatestRef(autoSellOwned);
  const guildStateRef = useLatestRef(guildState);
  
  useGameLoop(() => {
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

      // Log auto-harvests if there are any (deferred to avoid render-time setState)
      if (harvestedVeggies.length > 0) {
        harvestedVeggies.forEach(({ veggie, amount, expGain, knGain }) => {
          logHarvest(veggie.name, amount, expGain, knGain, true);
        });
      }

      // Update experience and knowledge for all harvests
      if (totalExperienceGain > 0 && dayRef.current >= 1 && dayRef.current <= 365) {
        setTimeout(() => {
          setKnowledge((k: number) => k + totalKnowledgeGain);
          setExperience((exp: number) => exp + totalExperienceGain);
        }, 0);
      }

      // Handle unlocks after all harvests are processed using projected experience
      if (needsUpdate) {
        const projectedExperience = experienceRef.current + totalExperienceGain;
        const { veggies: unlockedVeggies, highestUnlockedIndex } = processVeggieUnlocks(
          newVeggies,
          projectedExperience,
          maxPlotsRef.current
        );
        
        // Update highest unlocked veggie if there were any unlocks
        if (highestUnlockedIndex > highestUnlockedVeggieRef.current) {
          setHighestUnlockedVeggie(highestUnlockedIndex);
        }
        
        return unlockedVeggies;
      }

      return newVeggies;
    });
  }, 1000, []); // Empty deps - refs prevent loop restart

  // Unified harvest logic for both auto and manual harvest
  const harvestVeggie = useCallback((index: number, isAutoHarvest: boolean = false, onHarvestCallback?: (veggieName: string, amount: number, expGain: number, knGain: number, isAuto: boolean) => void) => {
    try {
      // Calculate harvest amount before the state update
      const v = veggies[index];
      if (!v || v.growth < 100) return; // Early exit if not ready to harvest or invalid index
    
    // Use centralized harvest calculations with guild bonuses (use ref for latest state)
    const { harvestAmount, experienceGain, knowledgeGain: totalKnowledgeGain, blessedCropTriggered } = calculateHarvestRewards(
      v.additionalPlotLevel || 0,
      season,
      permanentBonuses,
      beeYieldBonus,
      almanacLevel,
      farmTier,
      knowledge,
      isAutoHarvest,
      guildStateRef.current
    );
    
    const newExperience = experience + experienceGain;
    
    // Award guild currency on harvest:
    // - Manual harvests always earn 1 currency
    // - Blessed crop (Soilbound Pact) triggers earn 1 currency (even on auto-harvest)
    const earnCurrency = !isAutoHarvest || blessedCropTriggered;
    if (earnCurrency && farmTier >= 5) { // Only after guilds unlock at tier 5
      const currentGuildState = guildStateRef.current;
      if (currentGuildState.committedGuild !== null) {
        // After commitment: award guild-specific currency (sigils for Growers)
        setGuildState(prev => ({
          ...prev,
          guildCurrencies: {
            ...prev.guildCurrencies,
            [currentGuildState.committedGuild!]: prev.guildCurrencies[currentGuildState.committedGuild!] + 1
          }
        }));
      } else {
        // Before commitment: award generic guild tokens
        setGuildState(prev => ({
          ...prev,
          guildTokens: prev.guildTokens + 1
        }));
      }
    }
    
    setVeggies((prev) => {
      const updated = [...prev];
      const veggie = { ...updated[index] };
      veggie.salePrice = updated[index].salePrice;
      
      // Perform the harvest
      veggie.stash += harvestAmount;
      veggie.growth = 0;
      
      // Reset harvester timer if this is an auto harvest
      if (isAutoHarvest) {
        veggie.harvesterTimer = 0;
      }
      
      updated[index] = veggie;

      // Unlock all eligible veggies after harvest using the NEW experience value
      let totalPlotsUsed = updated.filter(vg => vg.unlocked).length + updated.reduce((sum, vg) => sum + (vg.additionalPlotLevel || 0), 0);
      const unlockOrder = updated
        .map((vg, idx) => ({ ...vg, idx }))
        .filter(vg => !vg.unlocked && newExperience >= vg.experienceToUnlock)
        .sort((a, b) => a.experienceToUnlock - b.experienceToUnlock);     
      
      for (let i = 0; i < unlockOrder.length && totalPlotsUsed < maxPlots; i++) {
        updated[unlockOrder[i].idx].unlocked = true;
        totalPlotsUsed++;
        // Update highest unlocked veggie if this is higher
        if (unlockOrder[i].idx > highestUnlockedVeggie) {
          setHighestUnlockedVeggie(unlockOrder[i].idx);
        }
      }
      return updated;
    });
    
    // Update knowledge and experience (we know harvest succeeded since we checked growth >= 100)
    if (day >= 1 && day <= 365) {
      setKnowledge((k: number) => k + totalKnowledgeGain);
      setExperience((exp: number) => exp + experienceGain);
    }
    
    // Increment total harvests counter
    setTotalHarvests((prev: number) => prev + 1);
    
    // Call harvest callback if provided
    if (onHarvestCallback) {
      onHarvestCallback(v.name, harvestAmount, experienceGain, totalKnowledgeGain, isAutoHarvest);
    }
    } catch (error) {
      console.error('❌ Error in harvestVeggie:', error);
      // Don't rethrow - prevent cascade failures
    }
  }, [veggies, season, permanentBonuses, beeYieldBonus, almanacLevel, knowledge, experience, farmTier, maxPlots, highestUnlockedVeggie, day]);

  // Safe harvest logger to avoid setState during render
  const logHarvest = useCallback(
    (name: string, amount: number, expGain: number, knGain: number, isAuto: boolean) => {
      setTimeout(() => {
        eventLogCallbacks.onHarvest(name, amount, expGain, knGain, isAuto);
      }, 0);
    },
    [eventLogCallbacks]
  );

  // Manual harvest button uses unified logic
  const handleHarvest = useCallback(() => {
    harvestVeggie(activeVeggie, false, logHarvest);
  }, [harvestVeggie, activeVeggie, logHarvest]);

  // Ritual harvest: spend sigils to harvest all ready crops
  const handleRitualHarvestAll = useCallback(() => {
    const currentGuildState = guildStateRef.current;
    if (!currentGuildState || !isCommittedTo(currentGuildState, 'growers')) return;
    if (getUpgradeLevel(currentGuildState, 'growers_ritual_circles') <= 0) return;

    const ritualCost = 5;
    const currentSigils = currentGuildState.guildCurrencies['growers'] ?? 0;
    const readyIndices = veggies
      .map((v, index) => (v.growth >= GROWTH_COMPLETE_THRESHOLD ? index : -1))
      .filter(index => index >= 0);

    if (currentSigils < ritualCost || readyIndices.length === 0) return;

    setGuildState(prev => {
      const prevSigils = prev.guildCurrencies['growers'] ?? 0;
      if (prevSigils < ritualCost) return prev;
      return {
        ...prev,
        guildCurrencies: {
          ...prev.guildCurrencies,
          growers: prevSigils - ritualCost
        }
      };
    });

    readyIndices.forEach(index => {
      harvestVeggie(index, false, logHarvest);
    });
  }, [veggies, harvestVeggie, logHarvest]);

  // Toggle sell enabled for a specific veggie
  const handleToggleSell = useCallback((index: number) => {
    setVeggies((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], sellEnabled: !updated[index].sellEnabled };
      return updated;
    });
  }, []);

  // Toggle auto-harvester enabled for a specific veggie
  const handleToggleAutoHarvester = useCallback((index: number) => {
    setVeggies((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], autoHarvesterEnabled: !updated[index].autoHarvesterEnabled };
      return updated;
    });
  }, []);

  // Fertilizer upgrade purchase
  // Additional Plot upgrade purchase
  const handleBuyAdditionalPlot = useCallback((index: number) => {
    const v = veggies[index];
    // Block purchase if maxPlots reached
    if (totalPlotsUsed >= maxPlots) return;
    if (money >= v.additionalPlotCost) {
      setMoney((m: number) => Math.max(0, m - v.additionalPlotCost));
      setVeggies((prev) => {
        const updated = [...prev];
        const v2 = { ...updated[index] };
        v2.additionalPlotLevel += 1;
        v2.additionalPlotCost = calculateUpgradeCost('additionalPlot', v2.additionalPlotLevel, calculateInitialCost('additionalPlot', index));
        updated[index] = v2;
        return updated;
      });
    }
  }, [veggies, totalPlotsUsed, maxPlots, money]);
  const handleBuyFertilizer = useCallback((index: number) => {
    const v = veggies[index];
    if (money >= v.fertilizerCost) {
      setMoney((m: number) => Math.max(0, m - v.fertilizerCost));
      setVeggies((prev) => {
        const updated = [...prev];
        const v2 = { ...updated[index] };
        v2.fertilizerLevel += 1;
        v2.fertilizerCost = calculateUpgradeCost('fertilizer', v2.fertilizerLevel, calculateInitialCost('fertilizer', index));
        updated[index] = v2;
        return updated;
      });
    }
  }, [veggies, money]);

  // Generic auto-purchase handler using the new system
  const handleBuyAutoPurchaser = useCallback((autoPurchaseId: string) => {
    return createAutoPurchaseHandler(autoPurchaseId, veggies, setVeggies, money, setMoney, knowledge, setKnowledge, maxPlots);
  }, [veggies, money, knowledge, maxPlots]);

  // Harvester upgrade purchase
  const handleBuyHarvester = useCallback((index: number) => {
    const v = veggies[index];
    if (!v.harvesterOwned && money >= v.harvesterCost) {
      setMoney((m: number) => Math.max(0, m - v.harvesterCost));
      setVeggies((prev) => {
        const updated = [...prev];
        const v2 = { ...updated[index] };
        v2.harvesterOwned = true;
        updated[index] = v2;
        return updated;
      });
    }
  }, [veggies, money]);

  // Sell handler - memoized to prevent useEffect re-runs
  const handleSell = useCallback((isAutoSell: boolean = false) => {
    let total = 0;
    const soldVeggies: Array<{ name: string; quantity: number; earnings: number }> = [];
    
    setVeggies((prev) => {
      total = prev.reduce((sum, v) => {
        // Only include vegetables that are enabled for selling
        if (v.sellEnabled && v.stash > 0) {
          // Apply guild price bonuses to each item individually (for Quality Grading)
          let veggieEarnings = 0;
          for (let i = 0; i < v.stash; i++) {
            // Pass true to apply quality grading bonus chance per item
            veggieEarnings += applyGuildPriceBonuses(v.salePrice, guildState, true);
          }
          soldVeggies.push({
            name: v.name,
            quantity: v.stash,
            earnings: veggieEarnings
          });
          return sum + veggieEarnings;
        }
        return sum;
      }, 0);
      return prev.map((v) => ({
        ...v,
        // Only clear stash for vegetables that are enabled for selling
        stash: v.sellEnabled ? 0 : v.stash
      }));
    });
    setMoney((m: number) => m + total);
    
    // Log the sale if something was sold
    if (total > 0) {
      eventLogCallbacks.onMerchantSale(total, soldVeggies, isAutoSell);
    }
  }, [setVeggies, setMoney, guildState]);

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

  // Day counter timer with auto-sell and auto-purchase logic - using robust interval for better background tab support
  const handleSellRef = useRef(handleSell);

  useEffect(() => {
    handleSellRef.current = handleSell;
  }, [handleSell]);
  
  useRobustInterval(() => {
    setTotalDaysElapsed((total: number) => total + 1);
    setDay((d: number) => {
      const newDay = (d % 365) + 1; // Day cycles from 1-365, not 0-364
      
      // Auto-sell logic for merchant (every MERCHANT_DAYS)
      if (autoSellOwnedRef.current && newDay % MERCHANT_DAYS === 0) {
        // Trigger auto-sell using the existing handleSell function
        setTimeout(() => {
          handleSellRef.current(true); // true = auto-sell
        }, 100); // Small delay to ensure state is updated
      }
      
      // Increment auto-purchase timer each day
      setGlobalAutoPurchaseTimer((prevTimer: number) => prevTimer + 1);
      
      return newDay;
    });
    
    // Process Christmas tree growth each day
    if (christmasEventRef.current?.isEventActive) {
      christmasEventRef.current.processTreeGrowth();
      christmasEventRef.current.updatePassiveIncome(1000); // 1000ms = 1 second
    }
  }, 1000, []); // Empty deps - refs prevent loop restart

  // Elves' Bench automation loop - runs every second
  // Use useRobustInterval for better background tab performance
  useRobustInterval(() => {
    if (christmasEventRef.current?.isEventActive) {
      const elvesBenchOwned = christmasEventRef.current.eventState.upgrades.find((u: EventUpgrade) => u.id === 'elves_bench')?.owned ?? false;
      if (elvesBenchOwned) {
        christmasEventRef.current.processDailyElvesCrafting();
      }
    }
  }, 1000, []); // Empty deps - refs prevent loop restart



  return (
    <GameContext.Provider value={{ veggies, setVeggies, money, setMoney, experience, setExperience, knowledge, setKnowledge, activeVeggie, day, setDay, totalDaysElapsed, setTotalDaysElapsed, totalHarvests, setTotalHarvests, globalAutoPurchaseTimer, setGlobalAutoPurchaseTimer, setActiveVeggie, handleHarvest, handleToggleSell, handleToggleAutoHarvester, handleSell, handleRitualHarvestAll, handleBuyFertilizer, handleBuyHarvester, handleBuyBetterSeeds, greenhouseOwned, setGreenhouseOwned, handleBuyGreenhouse, handleBuyHarvesterSpeed, resetGame, heirloomOwned, setHeirloomOwned, handleBuyHeirloom, autoSellOwned, setAutoSellOwned, handleBuyAutoSell, almanacLevel, setAlmanacLevel, almanacCost, setAlmanacCost, handleBuyAlmanac, handleBuyAdditionalPlot, maxPlots, setMaxPlots, farmCost, setFarmCost, handleBuyLargerFarm, farmTier, setFarmTier, irrigationOwned, setIrrigationOwned, irrigationCost, irrigationKnCost, handleBuyIrrigation, currentWeather, setCurrentWeather, highestUnlockedVeggie, setHighestUnlockedVeggie, handleBuyAutoPurchaser, heirloomMoneyCost, heirloomKnowledgeCost, christmasEvent, permanentBonuses, setPermanentBonuses, beeYieldBonus, setBeeYieldBonus, guildState, setGuildState }}>
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
  
  // Get event log callback interface from context and game flags
  const eventLogCallbacks = useEventLog();
  const { justReset, blockAchievementChecks } = useGameFlags();
  
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
  const [activeTab, setActiveTab] = useState<'growing' | 'canning' | 'bees' | 'christmas' | 'guilds'>('growing');
  const [christmasSubTab, setChristmasSubTab] = useState<'farm' | 'workshop' | 'shopfront'>('farm');
  
  // Guild UI state (guild data state is in GameProvider context)
  const [guildIntroShown, setGuildIntroShown] = useState(
    () => loadedGameState?.guildIntroShown || false
  );
  
  // Handler to dismiss guild intro overlay
  const handleDismissGuildIntro = useCallback(() => {
    setGuildIntroShown(true);
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

  const { resetGame, veggies, setVeggies, money, setMoney, experience, setExperience, knowledge, setKnowledge, activeVeggie, day, setDay, totalDaysElapsed, totalHarvests, globalAutoPurchaseTimer, setActiveVeggie, handleHarvest, handleToggleSell, handleToggleAutoHarvester, handleSell, handleRitualHarvestAll, handleBuyFertilizer, handleBuyHarvester, handleBuyBetterSeeds, greenhouseOwned, handleBuyGreenhouse, handleBuyHarvesterSpeed, heirloomOwned, handleBuyHeirloom, autoSellOwned, handleBuyAutoSell, almanacLevel, almanacCost, handleBuyAlmanac, handleBuyAdditionalPlot, maxPlots, farmCost, handleBuyLargerFarm, farmTier, irrigationOwned, irrigationCost, irrigationKnCost, handleBuyIrrigation, currentWeather, setCurrentWeather, highestUnlockedVeggie, handleBuyAutoPurchaser, heirloomMoneyCost, heirloomKnowledgeCost, christmasEvent, permanentBonuses, setPermanentBonuses, beeYieldBonus, setBeeYieldBonus, guildState, setGuildState } = useGame();

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
  }, [day]);

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
  }, [money, knowledge, guildState]);

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
      if (moneyReward > 0) setMoney(prev => prev + moneyReward);
      if (knowledgeReward > 0) setKnowledge(prev => prev + knowledgeReward);
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
      
      // Call the event log callback
      eventLogCallbacks.onAchievementUnlock(achievement);
    }
  );

  // Get unlocked achievement IDs for systems that need to check achievement-locked content
  const unlockedAchievementIds = useMemo(() => 
    achievements.filter(a => a.unlocked).map(a => a.id),
    [achievements]
  );

  // Initialize canning system
  const {
    canningState,
    startCanning,
    completeCanning: _completeCanning, // Used internally by useCanningSystem for auto-collection
    purchaseUpgrade,
    canMakeRecipe,
    toggleAutoCanning
  } = useCanningSystem(
    // experience parameter removed - unused
    veggies, 
    setVeggies, 
    heirloomOwned, 
    money, 
    setMoney, 
    knowledge, 
    setKnowledge, 
    initialCanningState, 
    uiPreferences.canningRecipeSort, 
    farmTier,
    regularHoney,
    goldenHoney,
    totalHoneyCollected,
    setRegularHoney,
    setGoldenHoney,
    unlockedAchievementIds,
    guildState
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
    (window as any).globalCanningStartCallback = (recipeName: string, ingredients: string, processingTime: number, isAuto: boolean) => {
      const opts = buildCanningStartEvent(recipeName, ingredients, processingTime, isAuto, {
        automation: ICON_AUTOMATION,
        canning: ICON_CANNING
      });
      addEvent('canning', isAuto ? `Auto-canning started: ${recipeName}` : `Started canning: ${recipeName}`, opts);
    };
    
    (window as any).globalCanningCompleteCallback = (recipeName: string, moneyEarned: number, knowledgeEarned: number, itemsProduced: number, isAuto: boolean) => {
      const opts = buildCanningCompleteEvent(recipeName, moneyEarned, knowledgeEarned, itemsProduced, isAuto);
      addEvent('canning', isAuto ? `Auto-canning completed: ${recipeName}` : `Completed canning: ${recipeName}`, opts);
    };
    
    return () => {
      (window as any).globalCanningStartCallback = null;
      (window as any).globalCanningCompleteCallback = null;
    };
  }, [eventLogCallbacks, addEvent]);

  // Detect if we just loaded imported data (prevent immediate auto-save)
  useEffect(() => {
    // If experience is significantly high, we likely just imported data
    if (experience > 10000) {
      justImportedRef.current = true;
      // Reset the flag after a short delay to allow normal auto-saving later
      setTimeout(() => {
        justImportedRef.current = false;
      }, 5000);
    }
  }, [experience]);

  // Throttled save system - save at most once every 30 seconds
  const saveTimeoutRef = useRef<number | null>(null);
  const lastSaveTimeRef = useRef<number>(Date.now());
  const pendingSaveRef = useRef<boolean>(false);
  const justImportedRef = useRef<boolean>(false);

  const performSave = useCallback(() => {
    // Don't auto-save if we just imported data or just reset the game
    if (justImportedRef.current) {
      justImportedRef.current = false;
      return;
    }
    if (justReset) {
      return;
    }

    if (canningState) {
      const gameState = {
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
        guildState
      };
      saveGameStateWithCanning(gameState);
      lastSaveTimeRef.current = Date.now();
      pendingSaveRef.current = false;
    }
  }, [justReset, canningState, veggies, money, experience, knowledge, activeVeggie, day, totalDaysElapsed, totalHarvests, globalAutoPurchaseTimer, greenhouseOwned, heirloomOwned, autoSellOwned, almanacLevel, almanacCost, maxPlots, farmTier, farmCost, irrigationOwned, currentWeather, highestUnlockedVeggie, uiPreferences, achievements, totalUnlocked, lastUnlockedId, eventLog, christmasEvent, beeState, harvestTutorialShown, guildIntroShown, guildState]);

  // Check achievements periodically
  useEffect(() => {
    if (blockAchievementChecks) {
      return;
    }

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
      canningState
    });
  }, [blockAchievementChecks, veggies, canningState, christmasEvent, checkAchievements, money, experience, knowledge, farmTier, totalHarvests, beeState]);

  // Debounced save effect - only trigger save if state has actually changed
  // and enough time has passed
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // If it's been more than 30 seconds since last save, save immediately
    if (timeSinceLastSave >= 30000) {
      performSave();
    } else {
      // Otherwise, schedule a save for 30 seconds from last save
      const timeUntilNextSave = 30000 - timeSinceLastSave;
      saveTimeoutRef.current = setTimeout(() => {
        performSave();
      }, timeUntilNextSave);
    }
  }, [performSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Force save on page unload (refresh/close)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Force immediate save if there are pending changes
      if (pendingSaveRef.current || Date.now() - lastSaveTimeRef.current >= 30000) {
        // Get the current performSave function and call it
        const currentPerformSave = performSave;
        currentPerformSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // Remove performSave dependency

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
  
  // Weather event logic: Rain and Drought, based on seasonal chance
  const rainDaysRef = useRef(0);
  const droughtDaysRef = useRef(0);
  const stormDaysRef = useRef(0);
  const heatwaveDaysRef = useRef(0);
  const previousWeatherRef = useRef(currentWeather);
  const lastDayProcessedRef = useRef(day);
  const previousSeasonRef = useRef(season);
  const previousVeggieGrowthRef = useRef<Map<string, number>>(new Map());

  const logWeatherChange = useCallback(
    (
      weatherType: WeatherType | string,
      message: string,
      details: string,
      icon: string,
      previousWeather?: WeatherType | string,
      priority: EventPriority = 'normal'
    ) => {
      eventLog.addEvent('weather', message, {
        priority,
        details,
        icon,
        metadata: {
          weatherType: weatherType as WeatherType,
          previousWeather: previousWeather as WeatherType | undefined,
        },
      });
    },
    [eventLog]
  );
  
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
  }, [veggies, season, currentWeather, greenhouseOwned, irrigationOwned, eventLog, harvestTutorialShown, activeTab]);
  
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
  
  useEffect(() => {
    // Only process weather changes once per day
    if (lastDayProcessedRef.current === day) {
      return;
    }
    lastDayProcessedRef.current = day;
    
    const rainChance = RAIN_CHANCES[season] ?? 0.2;
    const droughtChance = DROUGHT_CHANCES[season] ?? 0.03;
    const stormChance = STORM_CHANCES[season] ?? 0.03;
    const heatwaveChance = 0.01; // Example: 1% chance per day
    
    const prevWeather = previousWeatherRef.current;
    
    // Only roll for events if weather is clear
    if (currentWeather === 'Clear') {
      const roll = Math.random();
      if (roll < rainChance) {
        if(season === 'Winter') {
          setCurrentWeather('Snow');
          logWeatherChange(
            'Snow',
            'Snow begins to fall',
            'All vegetables stop growing unless you have a Greenhouse',
            WEATHER_SNOW,
            prevWeather,
            'important'
          );
        } else {
          setCurrentWeather('Rain');
          logWeatherChange(
            'Rain',
            'Rain begins to fall',
            'All vegetables receive +20% growth bonus',
            WEATHER_RAIN,
            prevWeather,
            'important'
          );
        }
        rainDaysRef.current = 1;
        droughtDaysRef.current = 0;
        stormDaysRef.current = 0;
        heatwaveDaysRef.current = 0;
      } else if (roll < rainChance + droughtChance) {
        setCurrentWeather('Drought');
        logWeatherChange(
          'Drought',
          'Drought has begun',
          irrigationOwned 
            ? 'Irrigation system protecting crops from drought' 
            : '-50% growth penalty. Consider purchasing Irrigation',
          WEATHER_DROUGHT,
          prevWeather,
          'critical'
        );
        droughtDaysRef.current = 1;
        rainDaysRef.current = 0;
        stormDaysRef.current = 0;
        heatwaveDaysRef.current = 0;
      } else if (roll < rainChance + droughtChance + stormChance) {
        setCurrentWeather('Storm');
        logWeatherChange(
          'Storm',
          'Severe storm approaching',
          'All vegetables receive +10% growth bonus',
          WEATHER_STORM,
          prevWeather,
          'important'
        );
        stormDaysRef.current = 1;
        rainDaysRef.current = 0;
        droughtDaysRef.current = 0;
        heatwaveDaysRef.current = 0;
      } else if (roll < rainChance + droughtChance + stormChance + heatwaveChance) {
        setCurrentWeather('Heatwave');
        logWeatherChange(
          'Heatwave',
          'Heatwave has begun',
          season === 'Summer' 
            ? '-30% growth penalty in Summer'
            : season === 'Winter'
            ? '+20% growth bonus in Winter'
            : '+20% bonus to summer vegetables',
          WEATHER_HEATWAVE,
          prevWeather,
          'critical'
        );
        heatwaveDaysRef.current = 1;
        rainDaysRef.current = 0;
        droughtDaysRef.current = 0;
        stormDaysRef.current = 0;
      } else {
        rainDaysRef.current = 0;
        droughtDaysRef.current = 0;
        stormDaysRef.current = 0;
        heatwaveDaysRef.current = 0;
      }
    }
    // If it's rain, after N days revert to clear
    if (currentWeather === 'Rain' || currentWeather === 'Snow') {
      rainDaysRef.current++;
      if (rainDaysRef.current > RAIN_DURATION_DAYS) {
        const weatherThatCleared = currentWeather; // Capture before state change
        setCurrentWeather('Clear');
        logWeatherChange(
          'Clear',
          `${weatherThatCleared === 'Snow' ? 'Snow' : 'Rain'} has cleared`,
          'Weather returns to normal',
          WEATHER_CLEAR,
          weatherThatCleared,
          'normal'
        );
        rainDaysRef.current = 0;
      }
    }
    // If it's drought, add knowledge and revert after N days
    if (currentWeather === 'Drought') {
      setKnowledge((k: number) => k + 1);
      droughtDaysRef.current++;
      if (droughtDaysRef.current > DROUGHT_DURATION_DAYS) {
        setCurrentWeather('Clear');
        logWeatherChange(
          'Clear',
          'Drought has ended',
          'Weather returns to normal',
          WEATHER_CLEAR,
          'Drought',
          'normal'
        );
        droughtDaysRef.current = 0;
      }
    }
    // If it's storm, after N days revert to clear
    if (currentWeather === 'Storm') {
      stormDaysRef.current++;
      if (stormDaysRef.current > STORM_DURATION_DAYS) {
        setCurrentWeather('Clear');
        logWeatherChange(
          'Clear',
          'Storm has passed',
          'Weather returns to normal',
          WEATHER_CLEAR,
          'Storm',
          'normal'
        );
        stormDaysRef.current = 0;
      }
    }
    // If it's heatwave, after N days revert to clear
    if (currentWeather === 'Heatwave') {
      heatwaveDaysRef.current++;
      if (heatwaveDaysRef.current > HEATWAVE_DURATION_DAYS) {
        // If heatwave was in summer, trigger drought next
        if (season === 'Summer') {
          setCurrentWeather('Drought');
          logWeatherChange(
            'Drought',
            'Heatwave causes drought',
            'The intense heat has dried out the soil',
            WEATHER_HEATWAVE,
            'Heatwave',
            'critical'
          );
          droughtDaysRef.current = 1;
          rainDaysRef.current = 0;
          stormDaysRef.current = 0;
          heatwaveDaysRef.current = 0;
        } else {
          setCurrentWeather('Clear');
          logWeatherChange(
            'Clear',
            'Heatwave has ended',
            'Weather returns to normal',
            WEATHER_CLEAR,
            'Heatwave',
            'normal'
          );
          heatwaveDaysRef.current = 0;
        }
      }
    }
    
    // Update previous weather ref at the end
    previousWeatherRef.current = currentWeather;
  }, [day, season, eventLog, irrigationOwned, setCurrentWeather, setKnowledge, logWeatherChange]);
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
      veggies={veggies}
      money={money}
      experience={experience}
      knowledge={knowledge}
      activeVeggie={activeVeggie}
      day={day}
      globalAutoPurchaseTimer={globalAutoPurchaseTimer}
      greenhouseOwned={greenhouseOwned}
      heirloomOwned={heirloomOwned}
      autoSellOwned={autoSellOwned}
      almanacLevel={almanacLevel}
      almanacCost={almanacCost}
      maxPlots={maxPlots}
      farmTier={farmTier}
      irrigationOwned={irrigationOwned}
      currentWeather={currentWeather}
      canningState={canningState}
      beeState={beeState}
      christmasEventState={christmasEvent?.eventState}
      permanentBonuses={permanentBonuses}
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
                onClick={() => farmTier >= 4 ? setActiveTab('bees') : null}
                disabled={farmTier < 4}
                className={
                  farmTier < 4
                    ? styles.tabButtonBeesLocked
                    : activeTab === 'bees'
                      ? styles.tabButtonBeesActive
                      : styles.tabButtonBees
                }
                title={farmTier >= 4 ? 'Bee System' : `Bees unlock at Farm Tier 4`}
              >
                <div className={styles.tabButtonContent}>
                  <img src={ICON_BEE} alt="" aria-hidden="true" className={farmTier >= 4 ? styles.tabIcon : styles.tabIconFaded} />
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
                day={day}
                globalAutoPurchaseTimer={globalAutoPurchaseTimer}
                autoSellOwned={autoSellOwned}
                season={season}
                currentWeather={currentWeather}
                greenhouseOwned={greenhouseOwned}
                irrigationOwned={irrigationOwned}
                heirloomOwned={heirloomOwned}
                almanacLevel={almanacLevel}
                almanacCost={almanacCost}
                irrigationCost={irrigationCost}
                irrigationKnCost={irrigationKnCost}
                heirloomMoneyCost={heirloomMoneyCost}
                heirloomKnowledgeCost={heirloomKnowledgeCost}
                highestUnlockedVeggie={highestUnlockedVeggie}
                farmTier={farmTier}
                beeYieldBonus={beeYieldBonus}
                MERCHANT_DAYS={MERCHANT_DAYS}
                MERCHANT_COST={MERCHANT_COST}
                MERCHANT_KN_COST={MERCHANT_KN_COST}
                GREENHOUSE_COST_PER_PLOT={GREENHOUSE_COST_PER_PLOT}
                GREENHOUSE_KN_COST_PER_PLOT={GREENHOUSE_KN_COST_PER_PLOT}
                HEIRLOOM_COST_PER_VEGGIE={HEIRLOOM_COST_PER_VEGGIE}
                HEIRLOOM_KN_PER_VEGGIE={HEIRLOOM_KN_PER_VEGGIE}
                initialVeggies={initialVeggies}
                veggieSeasonBonuses={veggieSeasonBonuses}
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
                handleBuyAlmanac={handleBuyAlmanac}
                handleBuyIrrigation={handleBuyIrrigation}
                handleBuyAutoSell={handleBuyAutoSell}
                handleBuyGreenhouse={handleBuyGreenhouse}
                handleBuyHeirloom={handleBuyHeirloom}
                formatNumber={formatNumber}
                guildState={guildState}
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
              passiveCheerPerSecond={christmasEvent.eventState.passiveCheerPerSecond}
              formatNumber={formatNumber}
              purchaseUpgrade={christmasEvent.purchaseUpgrade}
            />
            </div>
          )}
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
        GREENHOUSE_COST_PER_PLOT={GREENHOUSE_COST_PER_PLOT}
        GREENHOUSE_KN_COST_PER_PLOT={GREENHOUSE_KN_COST_PER_PLOT}
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

    {/* DevTools - Only visible when feature flag enabled, lazy loaded */}
    {devToolsEnabled && (
      <ErrorBoundary fallback={<OverlayError title="DevTools" />}>
        <Suspense fallback={null}>
          <DevTools
          onAddMoney={(amount) => setMoney(prev => prev + amount)}
          onAddExperience={(amount) => setExperience(prev => prev + amount)}
          onAddKnowledge={(amount) => setKnowledge(prev => prev + amount)}
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
              materials.pinecones += 100;
              materials.berries += 100;
              materials.ribbons += 100;
              materials.woodPlanks += 100;
              materials.metalWire += 100;
              materials.glassBeads += 100;
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
        // eslint-disable-next-line no-console
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
