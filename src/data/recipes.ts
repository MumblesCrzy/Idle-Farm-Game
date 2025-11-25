import type { RecipeConfig } from '../types/canning';

// Initial recipe definitions for the Canning system
// Recipes are organized by complexity and unlock progression
// Prices are designed to be more profitable than selling raw ingredients

export const INITIAL_RECIPES: RecipeConfig[] = [
  // ===== SIMPLE RECIPES (Single Vegetable) =====
  // These unlock first and teach the canning system
  
  {
    id: 'canned_radish',
    name: 'Canned Radish',
    description: 'Simple preserved radish. A great way to get started with canning.',
    ingredients: [{ veggieName: 'Radish', quantity: 3 }],
    baseProcessingTime: 30, // 30 seconds
    baseSalePrice: 5, // Raw: 3 × $1 = $3, Canned: $5 (66% profit)
    experienceRequired: 5000, // Unlocks with growing experience to introduce canning
    category: 'simple'
  },
  
  {
    id: 'canned_lettuce',
    name: 'Canned Lettuce',
    description: 'Preserved lettuce hearts in brine.',
    ingredients: [{ veggieName: 'Lettuce', quantity: 3 }],
    baseProcessingTime: 35,
    baseSalePrice: 10, // Raw: 3 × $2 = $6, Canned: $10 (66% profit)
    experienceRequired: 500, // Requires canning experience
    category: 'simple'
  },
  
  {
    id: 'canned_green_beans',
    name: 'Canned Green Beans',
    description: 'Classic canned green beans, tender and flavorful.',
    ingredients: [{ veggieName: 'Green Beans', quantity: 4 }],
    baseProcessingTime: 40,
    baseSalePrice: 20, // Raw: 4 × $3 = $12, Canned: $20 (66% profit)
    experienceRequired: 1500, // Requires canning experience
    category: 'simple'
  },
  
  {
    id: 'canned_zucchini',
    name: 'Canned Zucchini',
    description: 'Sliced zucchini preserved in natural juices.',
    ingredients: [{ veggieName: 'Zucchini', quantity: 4 }],
    baseProcessingTime: 45,
    baseSalePrice: 27, // Raw: 4 × $4 = $16, Canned: $27 (68% profit)
    experienceRequired: 3000, // Requires canning experience
    category: 'simple'
  },
  
  {
    id: 'pickled_cucumbers',
    name: 'Pickled Cucumbers',
    description: 'Crispy cucumber pickles with herbs and spices.',
    ingredients: [{ veggieName: 'Cucumbers', quantity: 5 }],
    baseProcessingTime: 50,
    baseSalePrice: 42, // Raw: 5 × $5 = $25, Canned: $42 (68% profit)
    experienceRequired: 5000, // Requires canning experience
    category: 'simple'
  },
  
  // ===== INTERMEDIATE RECIPES (2-3 Ingredients) =====
  // These require multiple vegetables and offer better profits
  
  {
    id: 'garden_mix',
    name: 'Garden Mix',
    description: 'A colorful blend of radish, lettuce, and green beans.',
    ingredients: [
      { veggieName: 'Radish', quantity: 2 },
      { veggieName: 'Lettuce', quantity: 2 },
      { veggieName: 'Green Beans', quantity: 2 }
    ],
    baseProcessingTime: 60,
    baseSalePrice: 25, // Raw: 2+4+6 = $12, Canned: $25 (108% profit)
    experienceRequired: 8000, // Requires canning experience
    category: 'complex'
  },
  
  {
    id: 'summer_medley',
    name: 'Summer Medley',
    description: 'A vibrant mix of summer vegetables.',
    ingredients: [
      { veggieName: 'Zucchini', quantity: 2 },
      { veggieName: 'Cucumbers', quantity: 2 },
      { veggieName: 'Green Beans', quantity: 3 }
    ],
    baseProcessingTime: 75,
    baseSalePrice: 48, // Raw: 8+10+9 = $27, Canned: $48 (78% profit)
    experienceRequired: 12000, // Requires canning experience
    category: 'complex'
  },
  
  {
    id: 'italian_style',
    name: 'Italian Style Vegetables',
    description: 'Tomatoes, peppers, and herbs in rich sauce.',
    ingredients: [
      { veggieName: 'Tomatoes', quantity: 4 },
      { veggieName: 'Peppers', quantity: 2 },
      { veggieName: 'Zucchini', quantity: 1 }
    ],
    baseProcessingTime: 90,
    baseSalePrice: 65, // Raw: 24+14+4 = $42, Canned: $65 (55% profit)
    experienceRequired: 18000, // Requires canning experience
    category: 'complex'
  },
  
  {
    id: 'root_vegetable_mix',
    name: 'Root Vegetable Mix',
    description: 'Hearty combination of carrots, onions, and radish.',
    ingredients: [
      { veggieName: 'Carrots', quantity: 3 },
      { veggieName: 'Onions', quantity: 2 },
      { veggieName: 'Radish', quantity: 4 }
    ],
    baseProcessingTime: 85,
    baseSalePrice: 72, // Raw: 24+20+4 = $48, Canned: $72 (50% profit)
    experienceRequired: 25000, // Requires canning experience
    category: 'complex'
  },
  
  // ===== GOURMET RECIPES (3+ Ingredients) =====
  // These are late-game recipes with high requirements but excellent profits
  
  {
    id: 'farmers_pride',
    name: "Farmer's Pride",
    description: 'The ultimate vegetable medley featuring the best of the garden.',
    ingredients: [
      { veggieName: 'Tomatoes', quantity: 3 },
      { veggieName: 'Peppers', quantity: 2 },
      { veggieName: 'Carrots', quantity: 2 },
      { veggieName: 'Broccoli', quantity: 2 }
    ],
    baseProcessingTime: 120,
    baseSalePrice: 125, // Raw: 18+14+16+18 = $66, Canned: $125 (89% profit)
    experienceRequired: 35000, // Requires canning experience
    category: 'gourmet'
  },
  
  {
    id: 'harvest_festival',
    name: 'Harvest Festival',
    description: 'A celebration of the harvest with seven different vegetables.',
    ingredients: [
      { veggieName: 'Radish', quantity: 1 },
      { veggieName: 'Lettuce', quantity: 1 },
      { veggieName: 'Green Beans', quantity: 2 },
      { veggieName: 'Zucchini', quantity: 2 },
      { veggieName: 'Cucumbers', quantity: 1 },
      { veggieName: 'Tomatoes', quantity: 2 },
      { veggieName: 'Peppers', quantity: 1 }
    ],
    baseProcessingTime: 150,
    baseSalePrice: 95, // Raw: 1+2+6+8+5+12+7 = $41, Canned: $95 (132% profit)
    experienceRequired: 50000, // Requires canning experience
    category: 'gourmet'
  },
  
  {
    id: 'master_chef_special',
    name: "Master Chef's Special",
    description: 'The pinnacle of canning artistry using all ten vegetables.',
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
      { veggieName: 'Onions', quantity: 2 }
    ],
    baseProcessingTime: 300, // 5 minutes - a real commitment
    baseSalePrice: 350, // Raw: 2+4+6+8+10+12+14+16+18+20 = $110, Canned: $350 (218% profit)
    experienceRequired: 80000, // Requires canning experience
    category: 'gourmet'
  },
  
  // ===== SPECIALTY RECIPES =====
  // These unlock based on specific achievements or late-game progression
  
  {
    id: 'salsa_verde',
    name: 'Salsa Verde',
    description: 'Spicy green salsa with peppers, tomatoes, and onions.',
    ingredients: [
      { veggieName: 'Peppers', quantity: 4 },
      { veggieName: 'Tomatoes', quantity: 2 },
      { veggieName: 'Onions', quantity: 1 }
    ],
    baseProcessingTime: 75,
    baseSalePrice: 85, // Raw: 28+12+10 = $50, Canned: $85 (70% profit)
    experienceRequired: 40000, // Requires canning experience
    category: 'gourmet'
  },
  
  {
    id: 'rainbow_jar',
    name: 'Rainbow Jar',
    description: 'A beautiful display of colorful vegetables in perfect harmony.',
    ingredients: [
      { veggieName: 'Carrots', quantity: 3 },
      { veggieName: 'Broccoli', quantity: 3 },
      { veggieName: 'Peppers', quantity: 2 }
    ],
    baseProcessingTime: 100,
    baseSalePrice: 110, // Raw: 24+27+14 = $65, Canned: $110 (69% profit)
    experienceRequired: 60000, // Requires canning experience
    category: 'gourmet'
  },
  
  // ===== HONEY RECIPES =====
  // Special recipes that require honey from the bee system
  // Organized by tier from simple to ultimate recipes
  
  // TIER 1: SIMPLE HONEY ADD-ONS
  {
    id: 'honey_radish_medley',
    name: 'Honey Radish Medley',
    description: 'Tender radishes preserved in honey brine.',
    ingredients: [{ veggieName: 'Radish', quantity: 6 }],
    honeyRequirement: { regular: 1, golden: 0 },
    tier: 'tier1',
    baseProcessingTime: 50,
    baseSalePrice: 35,
    honeyCollectedRequired: 3,
    experienceRequired: 8000,
    category: 'simple'
  },
  {
    id: 'sweet_pickled_cucumbers',
    name: 'Sweet Pickled Cucumbers',
    description: 'Crispy pickles with a delightful honey sweetness.',
    ingredients: [{ veggieName: 'Cucumbers', quantity: 5 }],
    honeyRequirement: { regular: 1, golden: 0 },
    tier: 'tier1',
    baseProcessingTime: 60,
    baseSalePrice: 65,
    honeyCollectedRequired: 5,
    experienceRequired: 10000,
    category: 'simple'
  },
  {
    id: 'honey_glazed_carrots',
    name: 'Honey-Glazed Carrots',
    description: 'Sweet glazed carrots with rich honey coating.',
    ingredients: [{ veggieName: 'Carrots', quantity: 4 }],
    honeyRequirement: { regular: 1, golden: 0 },
    tier: 'tier1',
    baseProcessingTime: 55,
    baseSalePrice: 55,
    honeyCollectedRequired: 5,
    experienceRequired: 10000,
    category: 'simple'
  },
  
  // TIER 2: HONEY MIX RECIPES
  {
    id: 'honey_garden_mix',
    name: 'Honey Garden Mix',
    description: 'Classic garden blend elevated with honey sweetness.',
    ingredients: [
      { veggieName: 'Radish', quantity: 2 },
      { veggieName: 'Lettuce', quantity: 2 },
      { veggieName: 'Green Beans', quantity: 3 }
    ],
    honeyRequirement: { regular: 1, golden: 0 },
    tier: 'tier2',
    baseProcessingTime: 75,
    baseSalePrice: 48,
    honeyCollectedRequired: 15,
    experienceRequired: 15000,
    category: 'complex'
  },
  {
    id: 'spiced_honey_zucchini',
    name: 'Spiced Honey Zucchini',
    description: 'Zucchini and peppers in sweet honey marinade.',
    ingredients: [
      { veggieName: 'Zucchini', quantity: 3 },
      { veggieName: 'Peppers', quantity: 2 }
    ],
    honeyRequirement: { regular: 1, golden: 0 },
    tier: 'tier2',
    baseProcessingTime: 80,
    baseSalePrice: 70,
    honeyCollectedRequired: 15,
    experienceRequired: 18000,
    category: 'complex'
  },
  {
    id: 'sweet_summer_blend',
    name: 'Sweet Summer Blend',
    description: 'Summer vegetables kissed with golden honey.',
    ingredients: [
      { veggieName: 'Cucumbers', quantity: 2 },
      { veggieName: 'Tomatoes', quantity: 2 },
      { veggieName: 'Green Beans', quantity: 2 }
    ],
    honeyRequirement: { regular: 1, golden: 0 },
    tier: 'tier2',
    baseProcessingTime: 85,
    baseSalePrice: 75,
    honeyCollectedRequired: 20,
    experienceRequired: 20000,
    category: 'complex'
  },
  
  // TIER 3: SAVORY HONEY PRESERVES
  {
    id: 'amber_harvest_preserve',
    name: 'Amber Harvest Preserve',
    description: 'Rich root vegetables preserved in amber honey glaze.',
    ingredients: [
      { veggieName: 'Onions', quantity: 3 },
      { veggieName: 'Carrots', quantity: 3 }
    ],
    honeyRequirement: { regular: 2, golden: 0 },
    tier: 'tier3',
    baseProcessingTime: 100,
    baseSalePrice: 120,
    honeyCollectedRequired: 30,
    experienceRequired: 28000,
    category: 'complex'
  },
  {
    id: 'honey_pepper_relish',
    name: 'Honey Pepper Relish',
    description: 'Spicy peppers and tomatoes balanced with sweet honey.',
    ingredients: [
      { veggieName: 'Peppers', quantity: 4 },
      { veggieName: 'Tomatoes', quantity: 3 }
    ],
    honeyRequirement: { regular: 2, golden: 0 },
    tier: 'tier3',
    baseProcessingTime: 95,
    baseSalePrice: 130,
    honeyCollectedRequired: 30,
    experienceRequired: 28000,
    category: 'complex'
  },
  {
    id: 'golden_root_medley',
    name: 'Golden Root Medley',
    description: 'Earthy roots enhanced with golden honey essence.',
    ingredients: [
      { veggieName: 'Carrots', quantity: 2 },
      { veggieName: 'Radish', quantity: 3 },
      { veggieName: 'Onions', quantity: 2 }
    ],
    honeyRequirement: { regular: 2, golden: 0 },
    tier: 'tier3',
    baseProcessingTime: 105,
    baseSalePrice: 125,
    honeyCollectedRequired: 35,
    experienceRequired: 30000,
    category: 'gourmet'
  },
  
  // TIER 4: SHOWCASE HONEY RECIPES
  {
    id: 'golden_veggie_medley',
    name: 'Golden Veggie Medley',
    description: 'A stunning display of premium vegetables glazed in honey.',
    ingredients: [
      { veggieName: 'Broccoli', quantity: 2 },
      { veggieName: 'Peppers', quantity: 2 },
      { veggieName: 'Tomatoes', quantity: 2 },
      { veggieName: 'Onions', quantity: 2 }
    ],
    honeyRequirement: { regular: 3, golden: 0 },
    tier: 'tier4',
    baseProcessingTime: 130,
    baseSalePrice: 185,
    honeyCollectedRequired: 50,
    experienceRequired: 40000,
    category: 'gourmet'
  },
  {
    id: 'royal_root_reserve',
    name: 'Royal Root Reserve',
    description: 'A royal combination of root vegetables in honey preserve.',
    ingredients: [
      { veggieName: 'Radish', quantity: 3 },
      { veggieName: 'Carrots', quantity: 3 },
      { veggieName: 'Onions', quantity: 3 }
    ],
    honeyRequirement: { regular: 3, golden: 0 },
    tier: 'tier4',
    baseProcessingTime: 125,
    baseSalePrice: 175,
    honeyCollectedRequired: 50,
    experienceRequired: 40000,
    category: 'gourmet'
  },
  {
    id: 'honey_harvest_supreme',
    name: 'Honey Harvest Supreme',
    description: 'Six varieties of vegetables in perfect honey harmony.',
    ingredients: [
      { veggieName: 'Lettuce', quantity: 2 },
      { veggieName: 'Green Beans', quantity: 2 },
      { veggieName: 'Cucumbers', quantity: 2 },
      { veggieName: 'Tomatoes', quantity: 2 },
      { veggieName: 'Broccoli', quantity: 2 }
    ],
    honeyRequirement: { regular: 3, golden: 0 },
    tier: 'tier4',
    baseProcessingTime: 140,
    baseSalePrice: 195,
    honeyCollectedRequired: 60,
    experienceRequired: 45000,
    category: 'gourmet'
  },
  {
    id: 'golden_honey_elixir',
    name: 'Golden Honey Elixir',
    description: 'A precious preserve made with rare Golden Honey.',
    ingredients: [
      { veggieName: 'Carrots', quantity: 3 },
      { veggieName: 'Tomatoes', quantity: 3 }
    ],
    honeyRequirement: { regular: 0, golden: 1 },
    tier: 'tier4',
    baseProcessingTime: 90,
    baseSalePrice: 200,
    honeyCollectedRequired: 40,
    experienceRequired: 35000,
    category: 'gourmet'
  },
  
  // TIER 5: ULTIMATE HONEY RECIPES
  {
    id: 'beekeepers_pride',
    name: "Beekeeper's Pride",
    description: 'The ultimate honey recipe: all vegetables bathed in double honey glaze.',
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
      { veggieName: 'Onions', quantity: 2 }
    ],
    honeyRequirement: { regular: 5, golden: 0 },
    tier: 'tier5',
    baseProcessingTime: 240,
    baseSalePrice: 500,
    honeyCollectedRequired: 100,
    experienceRequired: 80000,
    category: 'gourmet'
  },
  {
    id: 'canners_cocoa_honey',
    name: "Canner's Cocoa (Honey Edition)",
    description: 'Rich cocoa infused with sweet honey - a masterful creation that grants bonus experience.',
    ingredients: [],
    honeyRequirement: { regular: 3, golden: 1 },
    tier: 'tier5',
    baseProcessingTime: 120,
    baseSalePrice: 250,
    honeyCollectedRequired: 75,
    experienceRequired: 60000,
    category: 'gourmet'
  },
  {
    id: 'golden_garden_treasure',
    name: 'Golden Garden Treasure',
    description: 'The finest vegetables preserved in pure Golden Honey.',
    ingredients: [
      { veggieName: 'Broccoli', quantity: 3 },
      { veggieName: 'Peppers', quantity: 3 },
      { veggieName: 'Carrots', quantity: 3 }
    ],
    honeyRequirement: { regular: 0, golden: 2 },
    tier: 'tier5',
    baseProcessingTime: 150,
    baseSalePrice: 350,
    honeyCollectedRequired: 80,
    experienceRequired: 70000,
    category: 'gourmet'
  }
];

// Recipe categories and their general characteristics
export const RECIPE_CATEGORIES = {
  simple: {
    name: 'Simple',
    description: 'Basic single-vegetable recipes perfect for learning canning',
    color: '#4CAF50',
    processingTimeMultiplier: 1.0,
    profitMultiplier: 1.0
  },
  complex: {
    name: 'Complex',
    description: 'Multi-vegetable recipes with better profits',
    color: '#FF9800',
    processingTimeMultiplier: 1.5,
    profitMultiplier: 1.5
  },
  gourmet: {
    name: 'Gourmet',
    description: 'Premium recipes requiring multiple vegetables and expertise',
    color: '#9C27B0',
    processingTimeMultiplier: 2.0,
    profitMultiplier: 2.0
  }
} as const;

// Helper function to calculate profit margin for a recipe
export function calculateRecipeProfit(recipe: RecipeConfig, veggieData: Array<{name: string, salePrice: number}>): {
  rawValue: number;
  cannedValue: number;
  profitMargin: number;
  profitable: boolean;
} {
  const rawValue = recipe.ingredients.reduce((total, ingredient) => {
    const veggie = veggieData.find(v => v.name === ingredient.veggieName);
    return total + (veggie?.salePrice || 0) * ingredient.quantity;
  }, 0);
  
  const cannedValue = recipe.baseSalePrice;
  const profitMargin = rawValue > 0 ? ((cannedValue - rawValue) / rawValue) * 100 : 0;
  
  return {
    rawValue,
    cannedValue,
    profitMargin,
    profitable: cannedValue > rawValue
  };
}