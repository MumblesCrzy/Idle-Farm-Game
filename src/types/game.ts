/**
 * Core Game Type Definitions
 * 
 * Centralized type definitions for the Farm Idle Game.
 * Import these types throughout the application for consistency.
 */

import type { WeatherType } from '../config/gameConstants';

// ============================================================================
// AUTO-PURCHASE SYSTEM TYPES
// ============================================================================

export type CurrencyType = 'money' | 'knowledge';

export type AutoPurchaseType = 
  | 'fertilizer' 
  | 'betterSeeds' 
  | 'harvesterSpeed' 
  | 'additionalPlot';

export interface AutoPurchaseConfig {
  id: string;
  name: string;
  purchaseType: AutoPurchaseType;
  currencyType: CurrencyType;
  cycleDays: number; // How many days between purchases
  owned: boolean;
  active: boolean;
  cost: number;
  timer: number; // Current progress (0 to cycleDays-1)
}

// ============================================================================
// VEGETABLE TYPES
// ============================================================================

export interface Veggie {
  name: string;
  growth: number;
  growthRate: number;
  stash: number;
  unlocked: boolean;
  experience: number;
  experienceToUnlock: number;
  
  // Fertilizer upgrade
  fertilizerLevel: number;
  fertilizerCost: number;
  fertilizerMaxLevel: number;
  
  // Harvester system
  harvesterOwned: boolean;
  harvesterCost: number;
  harvesterTimer: number;
  harvesterSpeedLevel?: number;
  harvesterSpeedCost?: number;
  
  // Pricing and seeds
  salePrice: number;
  betterSeedsLevel: number;
  betterSeedsCost: number;
  
  // Plot management
  additionalPlotLevel: number;
  additionalPlotCost: number;
  
  // Auto-purchase system
  autoPurchasers: AutoPurchaseConfig[];
  
  // Sell control
  sellEnabled: boolean;
}

// ============================================================================
// SEASON & WEATHER TYPES
// ============================================================================

export type SeasonType = 'Spring' | 'Summer' | 'Fall' | 'Winter';

// Re-export WeatherType from constants for convenience
export type { WeatherType };

// ============================================================================
// GAME STATE TYPE
// ============================================================================

export interface GameState {
  // Weather & Season
  currentWeather: WeatherType;
  setCurrentWeather: React.Dispatch<React.SetStateAction<WeatherType>>;
  
  // Core Resources
  veggies: Veggie[];
  setVeggies: React.Dispatch<React.SetStateAction<Veggie[]>>;
  money: number;
  setMoney: React.Dispatch<React.SetStateAction<number>>;
  experience: number;
  setExperience: React.Dispatch<React.SetStateAction<number>>;
  knowledge: number;
  setKnowledge: React.Dispatch<React.SetStateAction<number>>;
  
  // Time & Progression
  day: number;
  setDay: React.Dispatch<React.SetStateAction<number>>;
  totalDaysElapsed: number;
  setTotalDaysElapsed: React.Dispatch<React.SetStateAction<number>>;
  
  // Auto-Purchase System
  globalAutoPurchaseTimer: number;
  setGlobalAutoPurchaseTimer: React.Dispatch<React.SetStateAction<number>>;
  
  // Active Selection
  activeVeggie: number;
  setActiveVeggie: (i: number) => void;
  
  // Core Actions
  handleHarvest: () => void;
  handleToggleSell: (index: number) => void;
  handleSell: () => void;
  
  // Veggie Upgrades
  handleBuyFertilizer: (index: number) => void;
  handleBuyHarvester: (index: number) => void;
  handleBuyHarvesterSpeed: (index: number) => void;
  handleBuyBetterSeeds: (index: number) => void;
  handleBuyAdditionalPlot: (index: number) => void;
  handleBuyAutoPurchaser: (autoPurchaseId: string) => (index: number) => void;
  
  // Global Upgrades - Irrigation
  irrigationOwned: boolean;
  setIrrigationOwned: React.Dispatch<React.SetStateAction<boolean>>;
  irrigationCost: number;
  irrigationKnCost: number;
  handleBuyIrrigation: () => void;
  
  // Global Upgrades - Greenhouse
  greenhouseOwned: boolean;
  setGreenhouseOwned: React.Dispatch<React.SetStateAction<boolean>>;
  handleBuyGreenhouse: () => void;
  
  // Global Upgrades - Heirloom Seeds
  heirloomOwned: boolean;
  setHeirloomOwned: React.Dispatch<React.SetStateAction<boolean>>;
  heirloomMoneyCost: number;
  heirloomKnowledgeCost: number;
  handleBuyHeirloom: () => void;
  
  // Global Upgrades - Auto-Sell (Merchant)
  autoSellOwned: boolean;
  setAutoSellOwned: React.Dispatch<React.SetStateAction<boolean>>;
  handleBuyAutoSell: () => void;
  
  // Global Upgrades - Almanac
  almanacLevel: number;
  setAlmanacLevel: React.Dispatch<React.SetStateAction<number>>;
  almanacCost: number;
  setAlmanacCost: React.Dispatch<React.SetStateAction<number>>;
  handleBuyAlmanac: () => void;
  
  // Farm Expansion (Prestige)
  maxPlots: number;
  setMaxPlots: React.Dispatch<React.SetStateAction<number>>;
  farmCost: number;
  setFarmCost: React.Dispatch<React.SetStateAction<number>>;
  farmTier: number;
  setFarmTier: React.Dispatch<React.SetStateAction<number>>;
  handleBuyLargerFarm: () => void;
  
  // Progression Tracking
  highestUnlockedVeggie: number;
  setHighestUnlockedVeggie: React.Dispatch<React.SetStateAction<number>>;
  
  // Game Management
  resetGame: () => void;
}

// ============================================================================
// UI & COMPONENT PROP TYPES
// ============================================================================

export interface BaseTabProps {
  label: string;
  active: boolean;
}

export type InfoCategory = 'seasons' | 'farm' | 'veggies' | 'upgrades' | 'autopurchase' | 'canning';

export type RecipeFilter = 'all' | 'available' | 'simple' | 'complex' | 'gourmet';
export type RecipeSort = 'name' | 'profit' | 'time' | 'difficulty';
