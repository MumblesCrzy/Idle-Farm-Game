/**
 * Fruit Configuration Data
 * 
 * Fruits are a premium crop type unlocked via the Growers Guild.
 * They have higher experience requirements than vegetables and
 * scale exponentially in both requirements and rewards.
 */

export interface FruitConfig {
  name: string;
  growthRate: number;
  salePrice: number;
  unlocked: boolean;
  unlockIndex: number; // Used for calculateFruitExpRequirement
  fertilizerMaxLevel: number;
  
  // Initial upgrade costs
  initialFertilizerCost: number;
  initialHarvesterCost: number;
  initialBetterSeedsCost: number;
  initialHarvesterSpeedCost: number;
  initialAdditionalPlotCost: number;
  
  // Auto-purchaser costs [fertilizer, betterSeeds, harvesterSpeed, additionalPlot]
  autoPurchaserCosts: [number, number, number, number];
}

/**
 * Calculates the experience required to unlock a fruit
 * Fruits require significantly more experience than vegetables
 * Starting at 50,000 and scaling by 2.2x per fruit
 * @param index - The fruit index (0-based)
 * @returns The experience required to unlock
 */
export const calculateFruitExpRequirement = (index: number): number => {
  if (index === 0) return 50000; // First fruit requires 50k exp
  return Math.floor(50000 * Math.pow(2.2, index));
};

/**
 * Complete fruit configuration array
 * 11 fruits with exponentially scaling requirements
 */
export const FRUIT_CONFIGS: FruitConfig[] = [
  {
    name: 'Strawberry',
    growthRate: 1.8,
    salePrice: 15,
    unlocked: false,
    unlockIndex: 0,
    fertilizerMaxLevel: 99,
    initialFertilizerCost: 500,
    initialHarvesterCost: 1000,
    initialBetterSeedsCost: 500,
    initialHarvesterSpeedCost: 2000,
    initialAdditionalPlotCost: 1500,
    autoPurchaserCosts: [400, 500, 1500, 1200]
  },
  {
    name: 'Blueberry',
    growthRate: 1.5,
    salePrice: 25,
    unlocked: false,
    unlockIndex: 1,
    fertilizerMaxLevel: 99,
    initialFertilizerCost: 1000,
    initialHarvesterCost: 2500,
    initialBetterSeedsCost: 1000,
    initialHarvesterSpeedCost: 5000,
    initialAdditionalPlotCost: 3500,
    autoPurchaserCosts: [800, 1000, 3000, 2800]
  },
  {
    name: 'Raspberry',
    growthRate: 1.4,
    salePrice: 40,
    unlocked: false,
    unlockIndex: 2,
    fertilizerMaxLevel: 99,
    initialFertilizerCost: 2000,
    initialHarvesterCost: 6000,
    initialBetterSeedsCost: 2000,
    initialHarvesterSpeedCost: 12000,
    initialAdditionalPlotCost: 8000,
    autoPurchaserCosts: [1600, 2000, 6000, 6400]
  },
  {
    name: 'Blackberry',
    growthRate: 1.3,
    salePrice: 65,
    unlocked: false,
    unlockIndex: 3,
    fertilizerMaxLevel: 99,
    initialFertilizerCost: 4000,
    initialHarvesterCost: 15000,
    initialBetterSeedsCost: 4000,
    initialHarvesterSpeedCost: 30000,
    initialAdditionalPlotCost: 18000,
    autoPurchaserCosts: [3200, 4000, 12000, 14400]
  },
  {
    name: 'Apple',
    growthRate: 1.1,
    salePrice: 100,
    unlocked: false,
    unlockIndex: 4,
    fertilizerMaxLevel: 99,
    initialFertilizerCost: 8000,
    initialHarvesterCost: 35000,
    initialBetterSeedsCost: 8000,
    initialHarvesterSpeedCost: 70000,
    initialAdditionalPlotCost: 40000,
    autoPurchaserCosts: [6400, 8000, 24000, 32000]
  },
  {
    name: 'Pear',
    growthRate: 1.0,
    salePrice: 150,
    unlocked: false,
    unlockIndex: 5,
    fertilizerMaxLevel: 99,
    initialFertilizerCost: 16000,
    initialHarvesterCost: 80000,
    initialBetterSeedsCost: 16000,
    initialHarvesterSpeedCost: 160000,
    initialAdditionalPlotCost: 90000,
    autoPurchaserCosts: [12800, 16000, 48000, 72000]
  },
  {
    name: 'Peach',
    growthRate: 0.9,
    salePrice: 225,
    unlocked: false,
    unlockIndex: 6,
    fertilizerMaxLevel: 99,
    initialFertilizerCost: 32000,
    initialHarvesterCost: 180000,
    initialBetterSeedsCost: 32000,
    initialHarvesterSpeedCost: 360000,
    initialAdditionalPlotCost: 200000,
    autoPurchaserCosts: [25600, 32000, 96000, 160000]
  },
  {
    name: 'Plum',
    growthRate: 0.85,
    salePrice: 350,
    unlocked: false,
    unlockIndex: 7,
    fertilizerMaxLevel: 99,
    initialFertilizerCost: 64000,
    initialHarvesterCost: 400000,
    initialBetterSeedsCost: 64000,
    initialHarvesterSpeedCost: 800000,
    initialAdditionalPlotCost: 450000,
    autoPurchaserCosts: [51200, 64000, 192000, 360000]
  },
  {
    name: 'Cherry',
    growthRate: 0.8,
    salePrice: 550,
    unlocked: false,
    unlockIndex: 8,
    fertilizerMaxLevel: 99,
    initialFertilizerCost: 128000,
    initialHarvesterCost: 900000,
    initialBetterSeedsCost: 128000,
    initialHarvesterSpeedCost: 1800000,
    initialAdditionalPlotCost: 1000000,
    autoPurchaserCosts: [102400, 128000, 384000, 800000]
  },
  {
    name: 'Watermelon',
    growthRate: 0.75,
    salePrice: 850,
    unlocked: false,
    unlockIndex: 9,
    fertilizerMaxLevel: 99,
    initialFertilizerCost: 256000,
    initialHarvesterCost: 2000000,
    initialBetterSeedsCost: 256000,
    initialHarvesterSpeedCost: 4000000,
    initialAdditionalPlotCost: 2200000,
    autoPurchaserCosts: [204800, 256000, 768000, 1760000]
  }
];

/**
 * Total number of fruits available
 */
export const TOTAL_FRUITS = FRUIT_CONFIGS.length;
