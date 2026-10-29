import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { calculateOfflineProgress, type AwaySales, type OfflineProgressResult } from '../utils/offlineProgress';
import { saveGameStateWithCanning, type ExtendedGameState } from '../utils/saveSystem';
import { devTelemetry } from '../utils/devTelemetry';
import { awardGears, awardGuildTokens, withoutHotTip } from '../utils/guildCalculations';
import type { Veggie, WeatherType } from '../types/game';
import type { GuildState } from '../types/guilds';
import type { UseChristmasEventReturn } from './useChristmasEvent';
import type { UsePumpkinEventReturn } from './usePumpkinEvent';
import { useLatestRef } from './useLatestRef';
import { LAST_ACTIVE_KEY } from '../config/gameConstants';

/** localStorage key holding the moment the tab was last hidden */
export { LAST_ACTIVE_KEY };

/** Shorter gaps are ignored, so quick tab switches don't trigger a catch-up */
const MIN_CATCH_UP_MS = 1000;

// When the tab was last active. Storage can be refused outright, as for the game in itch.io's
// frame in a private window; then there is no hidden-tab catch-up, but the game still runs.
const readLastActive = (): string | null => {
  try {
    return localStorage.getItem(LAST_ACTIVE_KEY);
  } catch {
    return null;
  }
};
const markActive = (): void => {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  } catch {
    // Storage refused: see readLastActive
  }
};

/**
 * Current game values the catch-up simulates from
 */
export interface OfflineGameState {
  veggies: Veggie[];
  day: number;
  totalDaysElapsed: number;
  season: string;
  currentWeather: WeatherType;
  greenhouseOwned: boolean;
  irrigationOwned: boolean;
  almanacLevel: number;
  farmTier: number;
  knowledge: number;
  guildState: GuildState;
  /** The Merchant farm upgrade, which sells during time away with Futures */
  autoSellOwned?: boolean;
  /** Crop yield bonus from bee hives */
  beeYieldBonus?: number;
  /** Achievement bonuses such as Frost Fertilizer and Harvest Moon */
  permanentBonuses?: string[];
  christmasEvent: UseChristmasEventReturn;
  pumpkinEvent?: UsePumpkinEventReturn;
}

/**
 * Dependencies for the offline progress hook
 */
export interface UseOfflineProgressDeps {
  /** The save as loaded at startup, or null for a new game */
  loaded: ExtendedGameState | null;
  /** Current game values; read at startup and again whenever the tab comes back */
  state: OfflineGameState;
  /** No catch-up while the game is paused */
  isPaused: boolean;
  setVeggies: Dispatch<SetStateAction<Veggie[]>>;
  setExperience: Dispatch<SetStateAction<number>>;
  setKnowledge: Dispatch<SetStateAction<number>>;
  setMoney: Dispatch<SetStateAction<number>>;
  setDay: Dispatch<SetStateAction<number>>;
  setTotalDaysElapsed: Dispatch<SetStateAction<number>>;
  setGuildState: Dispatch<SetStateAction<GuildState>>;
  /** Reports what the Merchant sold while the player was away, for the event log */
  onAwaySales?: (sales: AwaySales) => void;
}

/**
 * Simulates time away and applies the result to game state.
 * Returns null when there was nothing to apply.
 */
function applyCatchUp(
  timeElapsed: number,
  deps: UseOfflineProgressDeps,
  weather: WeatherType
): OfflineProgressResult | null {
  const { state } = deps;

  const result = calculateOfflineProgress(timeElapsed, {
    veggies: state.veggies,
    day: state.day,
    totalDaysElapsed: state.totalDaysElapsed,
    dayLength: 1000, // 1 second per day
    season: state.season,
    currentWeather: weather,
    greenhouseOwned: state.greenhouseOwned,
    irrigationOwned: state.irrigationOwned,
    almanacLevel: state.almanacLevel,
    farmTier: state.farmTier,
    knowledge: state.knowledge,
    // Offline canning isn't simulated yet; these inputs only feed unused outputs
    canningProcesses: [],
    canningUpgrades: {},
    autoCanning: { enabled: false },
    // A Hot Tip pays only in live play
    guildState: withoutHotTip(state.guildState),
    autoSellOwned: state.autoSellOwned,
    beeYieldBonus: state.beeYieldBonus,
    permanentBonuses: state.permanentBonuses,
    christmasEvent: state.christmasEvent
  });

  if (result.timeElapsed < MIN_CATCH_UP_MS) return null;

  deps.setVeggies(result.veggies);
  deps.setExperience((prev: number) => prev + result.experienceGain);
  deps.setKnowledge((prev: number) => prev + result.knowledgeGain);
  deps.setDay(result.day);
  deps.setTotalDaysElapsed(result.totalDaysElapsed);
  if (result.awaySales.money > 0) {
    deps.setMoney((prev: number) => prev + result.awaySales.money);
    deps.onAwaySales?.(result.awaySales);
  }
  if (result.autoHarvests > 0) {
    deps.setGuildState(prev => awardGears(
      awardGuildTokens(prev, 'autoHarvests', result.autoHarvests, state.farmTier),
      { autoHarvests: result.autoHarvests }
    ));
  }

  // Christmas event catch-up: trees grow, the Elves' Bench crafts, the Golden Bell pays out
  const event = state.christmasEvent;
  if (event.isEventActive) {
    if (result.christmasTreeGrowthTicks > 0) {
      event.processTreeGrowth(result.christmasTreeGrowthTicks);
    }
    if (result.christmasElvesCraftingTicks > 0 &&
        event.eventState.upgrades.some(u => u.id === 'elves_bench' && u.owned)) {
      event.processDailyElvesCrafting(result.christmasElvesCraftingTicks);
    }
    if (event.passiveCheerPerSecond > 0) {
      event.updatePassiveIncome(result.timeElapsed);
    }
  }

  // Pumpkin Rush catch-up: pumpkins grow, the fair counts down, the crew works, the Hayride pays out
  const pumpkins = state.pumpkinEvent;
  if (pumpkins?.isEventActive) {
    const ticks = Math.floor(result.timeElapsed / 1000);
    if (ticks > 0) {
      pumpkins.processPumpkinGrowth(ticks);
      pumpkins.processScarecrowCrew(ticks);
    }
    pumpkins.updatePassiveIncome(result.timeElapsed);
  }

  devTelemetry.emit('offline_catchup', {
    offlineMsRequested: timeElapsed,
    offlineMsApplied: result.timeElapsed
  });

  return result;
}

/**
 * Applies progress for time the player was away.
 *
 * - **Startup:** time since the save was written (lastSavedAt), applied once
 *   when the game loads. Skipped if the game was saved while paused.
 * - **Hidden tab:** every game loop pauses while the tab is hidden, so the
 *   hidden time is simulated once when the player returns. Skipped while paused.
 *
 * The two never overlap: the hidden-tab clock starts at page load, after the
 * startup catch-up.
 *
 * @param deps - Current game values, setters, and the loaded save
 */
export function useOfflineProgress(deps: UseOfflineProgressDeps): void {
  // Handlers below are registered once; they read the latest values here
  const latest = useLatestRef(deps);

  // Startup catch-up, once on mount
  useEffect(() => {
    const current = latest.current;
    const { loaded } = current;
    if (!loaded || loaded.isPaused) return;

    const offlineMs = loaded.lastSavedAt ? Math.max(0, Date.now() - loaded.lastSavedAt) : 0;
    if (offlineMs <= MIN_CATCH_UP_MS) return;

    try {
      // Weather isn't restored into state on load, so use the saved weather here
      const weather = (loaded.currentWeather as WeatherType) || current.state.currentWeather || 'Clear';
      const result = applyCatchUp(offlineMs, current, weather);
      if (!result) return;

      // Persist right away, so a crash or reload before the next autosave
      // can't apply the same time again
      saveGameStateWithCanning({
        ...loaded,
        veggies: result.veggies,
        money: (loaded.money || 0) + result.awaySales.money,
        experience: (loaded.experience || 0) + result.experienceGain,
        knowledge: (loaded.knowledge || 0) + result.knowledgeGain,
        day: result.day,
        totalDaysElapsed: result.totalDaysElapsed
      });
    } catch (error) {
      console.error('Error applying offline progress:', error);
    }
  }, [latest]);

  // Hidden-tab catch-up
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        markActive();
        return;
      }

      const lastActiveTime = readLastActive();
      markActive();
      if (!lastActiveTime) return;

      const timeElapsed = Date.now() - parseInt(lastActiveTime, 10);
      if (timeElapsed <= MIN_CATCH_UP_MS) return;

      const current = latest.current;
      if (current.isPaused) return;

      try {
        applyCatchUp(timeElapsed, current, current.state.currentWeather);
      } catch (error) {
        console.error('Error applying offline progress:', error);
      }
    };

    // Start the hidden-time clock from page load
    markActive();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [latest]);
}

export default useOfflineProgress;
