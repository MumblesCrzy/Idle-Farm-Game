/**
 * Honey-Based Canning Recipes Data
 * 
 * Special canning recipes that require honey from the bee system.
 * These recipes unlock as players collect honey and provide premium profits.
 * Organized into 5 tiers from simple to endgame recipes.
 */

import type { HoneyRecipe } from '../types/bees';

/**
 * Honey-based canning recipes
 * Organized by tier from simple honey additions to complex premium recipes
 */
export const HONEY_RECIPES: Omit<HoneyRecipe, 'unlocked' | 'timesCompleted'>[] = [
  
  // ===== TIER 1: SIMPLE HONEY ADD-ONS =====
  // Early honey recipes that add a sweet twist to basic vegetables
  
  {
    id: 'sweet_pickled_cucumbers',
    name: 'Sweet Pickled Cucumbers',
    description: 'Crispy pickles with a delightful honey sweetness.',
    tier: 'tier1',
    ingredients: [
      { veggieName: 'Cucumbers', quantity: 5 },
      { honeyType: 'regular', quantity: 1 }
    ],
    honeyRequirement: {
      regularHoney: 1
    },
    baseProcessingTime: 60,
    processingTime: 60,
    baseSalePrice: 65, // Higher than regular pickled cucumbers ($42)
    salePrice: 65,
    honeyCollectedRequired: 5, // Unlock after collecting 5 honey total
    experienceRequired: 10000,
  },
  
  {
    id: 'honey_glazed_carrots',
    name: 'Honey-Glazed Carrots',
    description: 'Sweet glazed carrots with rich honey coating.',
    tier: 'tier1',
    ingredients: [
      { veggieName: 'Carrots', quantity: 4 },
      { honeyType: 'regular', quantity: 1 }
    ],
    honeyRequirement: {
      regularHoney: 1
    },
    baseProcessingTime: 55,
    processingTime: 55,
    baseSalePrice: 55,
    salePrice: 55,
    honeyCollectedRequired: 5,
    experienceRequired: 10000,
  },
  
  {
    id: 'honey_radish_medley',
    name: 'Honey Radish Medley',
    description: 'Tender radishes preserved in honey brine.',
    tier: 'tier1',
    ingredients: [
      { veggieName: 'Radish', quantity: 6 },
      { honeyType: 'regular', quantity: 1 }
    ],
    honeyRequirement: {
      regularHoney: 1
    },
    baseProcessingTime: 50,
    processingTime: 50,
    baseSalePrice: 35,
    salePrice: 35,
    honeyCollectedRequired: 3,
    experienceRequired: 8000,
  },
  
  // ===== TIER 2: HONEY MIX RECIPES =====
  // Multiple vegetables enhanced with honey
  
  {
    id: 'honey_garden_mix',
    name: 'Honey Garden Mix',
    description: 'Classic garden blend elevated with honey sweetness.',
    tier: 'tier2',
    ingredients: [
      { veggieName: 'Radish', quantity: 2 },
      { veggieName: 'Lettuce', quantity: 2 },
      { veggieName: 'Green Beans', quantity: 3 },
      { honeyType: 'regular', quantity: 1 }
    ],
    honeyRequirement: {
      regularHoney: 1
    },
    baseProcessingTime: 75,
    processingTime: 75,
    baseSalePrice: 48, // ~30% higher than Garden Mix ($25)
    salePrice: 48,
    honeyCollectedRequired: 15,
    experienceRequired: 15000,
  },
  
  {
    id: 'spiced_honey_zucchini',
    name: 'Spiced Honey Zucchini',
    description: 'Zucchini and peppers in sweet honey marinade.',
    tier: 'tier2',
    ingredients: [
      { veggieName: 'Zucchini', quantity: 3 },
      { veggieName: 'Peppers', quantity: 2 },
      { honeyType: 'regular', quantity: 1 }
    ],
    honeyRequirement: {
      regularHoney: 1
    },
    baseProcessingTime: 80,
    processingTime: 80,
    baseSalePrice: 70,
    salePrice: 70,
    honeyCollectedRequired: 15,
    experienceRequired: 18000,
  },
  
  {
    id: 'sweet_summer_blend',
    name: 'Sweet Summer Blend',
    description: 'Summer vegetables kissed with golden honey.',
    tier: 'tier2',
    ingredients: [
      { veggieName: 'Cucumbers', quantity: 2 },
      { veggieName: 'Tomatoes', quantity: 2 },
      { veggieName: 'Green Beans', quantity: 2 },
      { honeyType: 'regular', quantity: 1 }
    ],
    honeyRequirement: {
      regularHoney: 1
    },
    baseProcessingTime: 85,
    processingTime: 85,
    baseSalePrice: 75,
    salePrice: 75,
    honeyCollectedRequired: 20,
    experienceRequired: 20000,
  },
  
  // ===== TIER 3: SAVORY HONEY PRESERVES =====
  // Complex combinations with honey creating gourmet preserves
  
  {
    id: 'amber_harvest_preserve',
    name: 'Amber Harvest Preserve',
    description: 'Rich root vegetables preserved in amber honey glaze.',
    tier: 'tier3',
    ingredients: [
      { veggieName: 'Onions', quantity: 3 },
      { veggieName: 'Carrots', quantity: 3 },
      { honeyType: 'regular', quantity: 2 }
    ],
    honeyRequirement: {
      regularHoney: 2
    },
    baseProcessingTime: 100,
    processingTime: 100,
    baseSalePrice: 120,
    salePrice: 120,
    honeyCollectedRequired: 30,
    experienceRequired: 28000,
  },
  
  {
    id: 'honey_pepper_relish',
    name: 'Honey Pepper Relish',
    description: 'Spicy peppers and tomatoes balanced with sweet honey.',
    tier: 'tier3',
    ingredients: [
      { veggieName: 'Peppers', quantity: 4 },
      { veggieName: 'Tomatoes', quantity: 3 },
      { honeyType: 'regular', quantity: 2 }
    ],
    honeyRequirement: {
      regularHoney: 2
    },
    baseProcessingTime: 95,
    processingTime: 95,
    baseSalePrice: 130,
    salePrice: 130,
    honeyCollectedRequired: 30,
    experienceRequired: 28000,
  },
  
  {
    id: 'golden_root_medley',
    name: 'Golden Root Medley',
    description: 'Earthy roots enhanced with golden honey essence.',
    tier: 'tier3',
    ingredients: [
      { veggieName: 'Carrots', quantity: 2 },
      { veggieName: 'Radish', quantity: 3 },
      { veggieName: 'Onions', quantity: 2 },
      { honeyType: 'regular', quantity: 2 }
    ],
    honeyRequirement: {
      regularHoney: 2
    },
    baseProcessingTime: 105,
    processingTime: 105,
    baseSalePrice: 125,
    salePrice: 125,
    honeyCollectedRequired: 35,
    experienceRequired: 30000,
  },
  
  // ===== TIER 4: SHOWCASE HONEY RECIPES =====
  // Premium multi-vegetable recipes featuring honey prominently
  
  {
    id: 'golden_veggie_medley',
    name: 'Golden Veggie Medley',
    description: 'A stunning display of premium vegetables glazed in honey.',
    tier: 'tier4',
    ingredients: [
      { veggieName: 'Broccoli', quantity: 2 },
      { veggieName: 'Peppers', quantity: 2 },
      { veggieName: 'Tomatoes', quantity: 2 },
      { veggieName: 'Onions', quantity: 2 },
      { honeyType: 'regular', quantity: 3 }
    ],
    honeyRequirement: {
      regularHoney: 3
    },
    baseProcessingTime: 130,
    processingTime: 130,
    baseSalePrice: 185,
    salePrice: 185,
    honeyCollectedRequired: 50,
    experienceRequired: 40000,
  },
  
  {
    id: 'royal_root_reserve',
    name: 'Royal Root Reserve',
    description: 'A royal combination of root vegetables in honey preserve.',
    tier: 'tier4',
    ingredients: [
      { veggieName: 'Radish', quantity: 3 },
      { veggieName: 'Carrots', quantity: 3 },
      { veggieName: 'Onions', quantity: 3 },
      { honeyType: 'regular', quantity: 3 }
    ],
    honeyRequirement: {
      regularHoney: 3
    },
    baseProcessingTime: 125,
    processingTime: 125,
    baseSalePrice: 175,
    salePrice: 175,
    honeyCollectedRequired: 50,
    experienceRequired: 40000,
  },
  
  {
    id: 'honey_harvest_supreme',
    name: 'Honey Harvest Supreme',
    description: 'Six varieties of vegetables in perfect honey harmony.',
    tier: 'tier4',
    ingredients: [
      { veggieName: 'Lettuce', quantity: 2 },
      { veggieName: 'Green Beans', quantity: 2 },
      { veggieName: 'Cucumbers', quantity: 2 },
      { veggieName: 'Tomatoes', quantity: 2 },
      { veggieName: 'Broccoli', quantity: 2 },
      { honeyType: 'regular', quantity: 3 }
    ],
    honeyRequirement: {
      regularHoney: 3
    },
    baseProcessingTime: 140,
    processingTime: 140,
    baseSalePrice: 195,
    salePrice: 195,
    honeyCollectedRequired: 60,
    experienceRequired: 45000,
  },
  
  // ===== TIER 5: ULTIMATE HONEY RECIPE =====
  // The pinnacle of honey-based canning
  
  {
    id: 'beekeepers_pride',
    name: "Beekeeper's Pride",
    description: 'The ultimate honey recipe: all vegetables bathed in double honey glaze.',
    tier: 'tier5',
    ingredients: [
      { veggieName: 'Radish', quantity: 2 },
      { veggieName: 'Lettuce', quantity: 2 },
      { veggieName: 'Green Beans', quantity: 2 },
      { veggieName: 'Zucchini', quantity: 2 },
      { veggieName: 'Cucumbers', quantity: 2 },
      { veggieName: 'Tomatoes', quantity: 2 },
      { veggieName: 'Peppers', quantity: 2 },
      { veggieName: 'Carrots', quantity: 2 },
      { veggieName: 'Broccoli', quantity: 2 },
      { veggieName: 'Onions', quantity: 2 },
      { honeyType: 'regular', quantity: 5 }
    ],
    honeyRequirement: {
      regularHoney: 5
    },
    baseProcessingTime: 240, // 4 minutes
    processingTime: 240,
    baseSalePrice: 500, // Extremely valuable endgame recipe
    salePrice: 500,
    honeyCollectedRequired: 100,
    experienceRequired: 80000,
  },
  
  // ===== SPECIAL: GOLDEN HONEY RECIPES =====
  // Ultra-premium recipes requiring rare Golden Honey
  
  {
    id: 'golden_honey_elixir',
    name: 'Golden Honey Elixir',
    description: 'A precious preserve made with rare Golden Honey.',
    tier: 'tier4',
    ingredients: [
      { veggieName: 'Carrots', quantity: 3 },
      { veggieName: 'Tomatoes', quantity: 3 },
      { honeyType: 'golden', quantity: 1 }
    ],
    honeyRequirement: {
      goldenHoney: 1
    },
    baseProcessingTime: 90,
    processingTime: 90,
    baseSalePrice: 200,
    salePrice: 200,
    honeyCollectedRequired: 40,
    experienceRequired: 35000,
  },
  
  {
    id: 'canners_cocoa_honey',
    name: "Canner's Cocoa (Honey Edition)",
    description: 'Rich cocoa infused with sweet honey - a masterful creation that grants bonus experience.',
    tier: 'tier5',
    ingredients: [
      { honeyType: 'regular', quantity: 3 },
      { honeyType: 'golden', quantity: 1 }
    ],
    honeyRequirement: {
      regularHoney: 3,
      goldenHoney: 1
    },
    baseProcessingTime: 120,
    processingTime: 120,
    baseSalePrice: 250, // Very high value
    salePrice: 250,
    honeyCollectedRequired: 75,
    experienceRequired: 60000,
  },
  
  {
    id: 'golden_garden_treasure',
    name: 'Golden Garden Treasure',
    description: 'The finest vegetables preserved in pure Golden Honey.',
    tier: 'tier5',
    ingredients: [
      { veggieName: 'Broccoli', quantity: 3 },
      { veggieName: 'Peppers', quantity: 3 },
      { veggieName: 'Carrots', quantity: 3 },
      { honeyType: 'golden', quantity: 2 }
    ],
    honeyRequirement: {
      goldenHoney: 2
    },
    baseProcessingTime: 150,
    processingTime: 150,
    baseSalePrice: 350,
    salePrice: 350,
    honeyCollectedRequired: 80,
    experienceRequired: 70000,
  },
];

/**
 * Create initial honey recipes with starting state
 */
export function createInitialHoneyRecipes(): HoneyRecipe[] {
  return HONEY_RECIPES.map(recipe => ({
    ...recipe,
    unlocked: false,
    timesCompleted: 0,
  }));
}

/**
 * Get honey recipe by ID
 */
export function getHoneyRecipeById(id: string): HoneyRecipe | undefined {
  const recipe = HONEY_RECIPES.find(r => r.id === id);
  if (!recipe) return undefined;
  
  return {
    ...recipe,
    unlocked: false,
    timesCompleted: 0,
  };
}

/**
 * Get honey recipes by tier
 */
export function getHoneyRecipesByTier(tier: HoneyRecipe['tier']): HoneyRecipe[] {
  return HONEY_RECIPES
    .filter(r => r.tier === tier)
    .map(recipe => ({
      ...recipe,
      unlocked: false,
      timesCompleted: 0,
    }));
}

/**
 * Check if player has collected enough honey to unlock a recipe
 */
export function canUnlockHoneyRecipe(
  recipe: HoneyRecipe,
  totalHoneyCollected: number,
  experience: number
): boolean {
  return (
    totalHoneyCollected >= recipe.honeyCollectedRequired &&
    experience >= recipe.experienceRequired
  );
}

/**
 * Check if player has enough honey to craft a recipe
 */
export function canCraftHoneyRecipe(
  recipe: HoneyRecipe,
  regularHoney: number,
  goldenHoney: number
): boolean {
  const needsRegular = recipe.honeyRequirement.regularHoney || 0;
  const needsGolden = recipe.honeyRequirement.goldenHoney || 0;
  
  return regularHoney >= needsRegular && goldenHoney >= needsGolden;
}

/**
 * Calculate total value of all ingredients for a recipe
 * Used for profit margin calculations
 */
export function calculateHoneyRecipeIngredientValue(
  recipe: HoneyRecipe,
  veggiePrices: Record<string, number>
): number {
  let totalValue = 0;
  
  for (const ingredient of recipe.ingredients) {
    if (ingredient.veggieName) {
      const price = veggiePrices[ingredient.veggieName] || 0;
      totalValue += price * ingredient.quantity;
    }
  }
  
  // Note: Honey value not included as it's a special resource
  return totalValue;
}

/**
 * Get recipe summary for UI display
 */
export interface HoneyRecipeSummary {
  id: string;
  name: string;
  description: string;
  tier: string;
  regularHoneyNeeded: number;
  goldenHoneyNeeded: number;
  processingTime: number;
  salePrice: number;
  isUnlocked: boolean;
  canCraft: boolean;
  unlockProgress: number; // 0-1 percentage toward unlock
}

/**
 * Get complete summary of a honey recipe for UI
 */
export function getHoneyRecipeSummary(
  recipe: HoneyRecipe,
  totalHoneyCollected: number,
  regularHoney: number,
  goldenHoney: number,
  experience: number
): HoneyRecipeSummary {
  const isUnlocked = canUnlockHoneyRecipe(recipe, totalHoneyCollected, experience);
  const canCraft = isUnlocked && canCraftHoneyRecipe(recipe, regularHoney, goldenHoney);
  
  // Calculate unlock progress (0-1)
  const honeyProgress = Math.min(1, totalHoneyCollected / recipe.honeyCollectedRequired);
  const expProgress = Math.min(1, experience / recipe.experienceRequired);
  const unlockProgress = Math.min(honeyProgress, expProgress);
  
  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    tier: recipe.tier,
    regularHoneyNeeded: recipe.honeyRequirement.regularHoney || 0,
    goldenHoneyNeeded: recipe.honeyRequirement.goldenHoney || 0,
    processingTime: recipe.processingTime,
    salePrice: recipe.salePrice,
    isUnlocked,
    canCraft,
    unlockProgress,
  };
}

/**
 * Get all honey recipes grouped by tier
 */
export function getHoneyRecipesByTierGrouped(): Record<string, HoneyRecipe[]> {
  const grouped: Record<string, HoneyRecipe[]> = {
    tier1: [],
    tier2: [],
    tier3: [],
    tier4: [],
    tier5: [],
  };
  
  for (const recipe of HONEY_RECIPES) {
    const recipeWithState = {
      ...recipe,
      unlocked: false,
      timesCompleted: 0,
    };
    grouped[recipe.tier].push(recipeWithState);
  }
  
  return grouped;
}

/**
 * Recipe tier display names
 */
export const HONEY_RECIPE_TIER_NAMES: Record<string, string> = {
  tier1: 'Simple Honey Add-Ons',
  tier2: 'Honey Mix Recipes',
  tier3: 'Savory Honey Preserves',
  tier4: 'Showcase Honey Recipes',
  tier5: 'Ultimate Honey Creations',
};

/**
 * Get display name for a tier
 */
export function getHoneyRecipeTierName(tier: string): string {
  return HONEY_RECIPE_TIER_NAMES[tier] || 'Unknown Tier';
}
