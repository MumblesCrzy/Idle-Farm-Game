/**
 * Veggie Configuration Data
 * 
 * Centralized configuration for all vegetables in the game.
 * This data-driven approach makes it easy to add new vegetables
 * and reduces code duplication in App.tsx initialization.
 */

export interface VeggieConfig {
  name: string;
  growthRate: number;
  salePrice: number;
  unlocked: boolean;
  unlockIndex: number; // Used for calculateExpRequirement
  fertilizerMaxLevel: number;
  
  // Initial upgrade costs
  initialFertilizerCost: number | 'calculated'; // 'calculated' means use calculateInitialCost
  initialHarvesterCost: number | 'calculated';
  initialBetterSeedsCost: number | 'calculated';
  initialHarvesterSpeedCost: number;
  initialAdditionalPlotCost: number;
  
  // Auto-purchaser costs [fertilizer, betterSeeds, harvesterSpeed, additionalPlot]
  autoPurchaserCosts: [number, number, number, number];
}

/**
 * Complete veggie configuration array
 * Order matters: index 0 = Radish (first veggie), index 1 = Lettuce, etc.
 */
export const VEGGIE_CONFIGS: VeggieConfig[] = [
  {
    name: 'Radish',
    growthRate: 2.5,
    salePrice: 1,
    unlocked: true,
    unlockIndex: 0,
    fertilizerMaxLevel: 97,
    initialFertilizerCost: 'calculated',
    initialHarvesterCost: 'calculated',
    initialBetterSeedsCost: 'calculated',
    initialHarvesterSpeedCost: 'calculated' as any,
    initialAdditionalPlotCost: 'calculated' as any,
    autoPurchaserCosts: [8, 10, 30 * 5, 38]
  },
  {
    name: 'Lettuce',
    growthRate: 1.4286,
    salePrice: 2,
    unlocked: false,
    unlockIndex: 1,
    fertilizerMaxLevel: 99,
    initialFertilizerCost: 20,
    initialHarvesterCost: 30,
    initialBetterSeedsCost: 20,
    initialHarvesterSpeedCost: 100,
    initialAdditionalPlotCost: 80,
    autoPurchaserCosts: [21, 28, 84 * 5, 113]
  },
  {
    name: 'Green Beans',
    growthRate: 1.4286,
    salePrice: 3,
    unlocked: false,
    unlockIndex: 2,
    fertilizerMaxLevel: 98,
    initialFertilizerCost: 30,
    initialHarvesterCost: 60,
    initialBetterSeedsCost: 30,
    initialHarvesterSpeedCost: 200,
    initialAdditionalPlotCost: 120,
    autoPurchaserCosts: [29, 38, 117 * 5, 168]
  },
  {
    name: 'Zucchini',
    growthRate: 1.4286,
    salePrice: 4,
    unlocked: false,
    unlockIndex: 3,
    fertilizerMaxLevel: 98,
    initialFertilizerCost: 40,
    initialHarvesterCost: 120,
    initialBetterSeedsCost: 40,
    initialHarvesterSpeedCost: 400,
    initialAdditionalPlotCost: 160,
    autoPurchaserCosts: [41, 54, 164 * 5, 252]
  },
  {
    name: 'Cucumbers',
    growthRate: 1.25,
    salePrice: 5,
    unlocked: false,
    unlockIndex: 4,
    fertilizerMaxLevel: 99,
    initialFertilizerCost: 50,
    initialHarvesterCost: 240,
    initialBetterSeedsCost: 50,
    initialHarvesterSpeedCost: 800,
    initialAdditionalPlotCost: 240,
    autoPurchaserCosts: [57, 76, 230 * 5, 380]
  },
  {
    name: 'Tomatoes',
    growthRate: 1.0526,
    salePrice: 6,
    unlocked: false,
    unlockIndex: 5,
    fertilizerMaxLevel: 99,
    initialFertilizerCost: 60,
    initialHarvesterCost: 480,
    initialBetterSeedsCost: 60,
    initialHarvesterSpeedCost: 1600,
    initialAdditionalPlotCost: 480,
    autoPurchaserCosts: [80, 106, 323 * 5, 569]
  },
  {
    name: 'Peppers',
    growthRate: 1,
    salePrice: 7,
    unlocked: false,
    unlockIndex: 6,
    fertilizerMaxLevel: 99,
    initialFertilizerCost: 70,
    initialHarvesterCost: 960,
    initialBetterSeedsCost: 70,
    initialHarvesterSpeedCost: 3200,
    initialAdditionalPlotCost: 960,
    autoPurchaserCosts: [113, 150, 452 * 5, 854]
  },
  {
    name: 'Carrots',
    growthRate: 1.1111,
    salePrice: 8,
    unlocked: false,
    unlockIndex: 7,
    fertilizerMaxLevel: 99,
    initialFertilizerCost: 80,
    initialHarvesterCost: 1920,
    initialBetterSeedsCost: 80,
    initialHarvesterSpeedCost: 6400,
    initialAdditionalPlotCost: 1920,
    autoPurchaserCosts: [158, 210, 632 * 5, 1281]
  },
  {
    name: 'Broccoli',
    growthRate: 1,
    salePrice: 9,
    unlocked: false,
    unlockIndex: 8,
    fertilizerMaxLevel: 99,
    initialFertilizerCost: 90,
    initialHarvesterCost: 3840,
    initialBetterSeedsCost: 90,
    initialHarvesterSpeedCost: 12800,
    initialAdditionalPlotCost: 3840,
    autoPurchaserCosts: [221, 294, 885 * 5, 1922]
  },
  {
    name: 'Onions',
    growthRate: 0.7692,
    salePrice: 10,
    unlocked: false,
    unlockIndex: 9,
    fertilizerMaxLevel: 99,
    initialFertilizerCost: 100,
    initialHarvesterCost: 7680,
    initialBetterSeedsCost: 100,
    initialHarvesterSpeedCost: 25600,
    initialAdditionalPlotCost: 7680,
    autoPurchaserCosts: [309, 412, 1239 * 5, 2883]
  }
];
