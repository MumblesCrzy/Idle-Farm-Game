/**
 * Guild System Data and Constants
 * 
 * Contains guild definitions, upgrades, and configuration.
 */

import type { Guild, GuildTokenSource, GuildType, GuildUpgrade } from '../types/guilds';
import { GUILD_GROWERS, GUILD_PRESERVERS, GUILD_ENGINEERS, GUILD_MERCHANTS, ICON_GUILDS, ICON_SIGIL, ICON_WAX_SEAL } from '../config/assetPaths';

/** Maximum number of upgrades a player can sample from each guild before committing */
export const MAX_SAMPLED_UPGRADES_PER_GUILD = 2;

/** Farm tier required to unlock the Guilds system */
export const GUILDS_UNLOCK_TIER = 5;

/** Rush Batch costs one Wax Seal per running batch, and never less than this */
export const RUSH_BATCH_MIN_COST = 5;

/** Recipe Mastery from the Family Cookbook: batches of one recipe and the value they add, highest first */
export const RECIPE_MASTERY_STAGES: ReadonlyArray<{ batches: number; bonus: number }> = [
  { batches: 500, bonus: 0.5 },
  { batches: 100, bonus: 0.25 },
  { batches: 25, bonus: 0.1 }
];

/**
 * Guild Tokens earned before committing: `tokens` for every `every` of the source.
 * The label reads after the count, as in "+1 per 5 canned goods".
 */
export const GUILD_TOKEN_SOURCES: Record<GuildTokenSource, { tokens: number; every: number; label: string }> = {
  manualHarvest: { tokens: 1, every: 1, label: 'manual harvest' },
  cannedGoods: { tokens: 1, every: 5, label: 'canned goods' },
  beeHives: { tokens: 2, every: 1, label: 'batch of honey' },
  autoHarvests: { tokens: 1, every: 10, label: 'auto harvests' }
};

/**
 * Growers Guild Upgrades
 */
export const GROWERS_UPGRADES: GuildUpgrade[] = [
  // Tier 1 - Available before commitment (sampling)
  {
    id: 'growers_fertile_soil',
    name: 'Fertile Soil',
    description: 'Enhance soil quality for faster growth',
    guild: 'growers',
    tier: 1,
    level: 0,
    maxLevel: 5,
    isOneTime: false,
    baseCost: 50,
    costScaling: 1.5,
    currencyType: 'guildTokens',
    effectPerLevel: 0.03,
    effectTemplate: '+{value}% growth speed for all crops',
    purchased: false
  },
  {
    id: 'growers_green_thumb',
    name: 'Green Thumb',
    description: 'Natural affinity increases crop value',
    guild: 'growers',
    tier: 1,
    level: 0,
    maxLevel: 5,
    isOneTime: false,
    baseCost: 30,
    costScaling: 1.5,
    currencyType: 'guildTokens',
    effectPerLevel: 0.02,
    effectTemplate: '+{value}% sale price for all crops',
    purchased: false
  },
  // Tier 2 - Post-commitment
  {
    id: 'growers_verdant_glyphs',
    name: 'Verdant Glyphs',
    description: 'Twisted fertility sigils pulse beneath every plot, amplifying all Fertilizer upgrades',
    guild: 'growers',
    tier: 2,
    level: 0,
    maxLevel: 1,
    isOneTime: true,
    baseCost: 500,
    costScaling: 1,
    currencyType: 'sigils',
    effectPerLevel: 0.25,
    effectTemplate: '+{value}% boost to all Fertilizer upgrades across all crops',
    purchased: false
  },
  {
    id: 'growers_whispers_of_seed',
    name: 'Whispers of the Seed',
    description: 'Ancient knowledge channeled through forgotten rites adds a flat multiplier to crop sale prices',
    guild: 'growers',
    tier: 2,
    level: 0,
    maxLevel: 1,
    isOneTime: true,
    baseCost: 1000, // The strongest upgrade a Legacy can keep, so it costs the most
    costScaling: 1,
    currencyType: 'sigils',
    effectPerLevel: 10,
    effectTemplate: '{value}× multiplier to all crop sale prices (scales with Better Seeds)',
    effectDisplay: 'number',
    purchased: false
  },
  {
    id: 'growers_advanced_fertilizer',
    name: 'Advanced Fertilizer Research',
    description: 'Global growth speed bonus from improved fertilizer formulas',
    guild: 'growers',
    tier: 2,
    level: 0,
    maxLevel: 10,
    isOneTime: false,
    baseCost: 100,
    costScaling: 1.8,
    currencyType: 'sigils',
    effectPerLevel: 0.02,
    effectTemplate: '+{value}% global growth speed',
    purchased: false
  },
  {
    id: 'growers_selective_breeding',
    name: 'Selective Breeding Program',
    description: 'Careful crop selection yields premium produce',
    guild: 'growers',
    tier: 2,
    level: 0,
    maxLevel: 10,
    isOneTime: false,
    baseCost: 75,
    costScaling: 1.8,
    currencyType: 'sigils',
    effectPerLevel: 0.03,
    effectTemplate: '+{value}% global crop sale price',
    purchased: false
  },
  // Tier 3 - Advanced post-commitment
  {
    id: 'growers_quality_grading',
    name: 'Quality Grading',
    description: 'Crops have a chance to be graded as high-quality for extra value',
    guild: 'growers',
    tier: 3,
    level: 0,
    maxLevel: 5,
    isOneTime: false,
    baseCost: 250,
    costScaling: 2,
    currencyType: 'sigils',
    effectPerLevel: 0.05,
    effectTemplate: '{value}% chance for high-quality crops (+50% value)',
    purchased: false
  },
  {
    id: 'growers_ritual_circles',
    name: 'Ritual Circles',
    description: 'Spend sigils to perform a ritual harvest of all ready crops',
    guild: 'growers',
    tier: 3,
    level: 0,
    maxLevel: 1,
    isOneTime: true,
    baseCost: 150,
    costScaling: 1,
    currencyType: 'sigils',
    effectPerLevel: 1,
    effectTemplate: 'Ritual Harvest: Spend 5 sigils to harvest all ready crops',
    purchased: false
  },
  {
    id: 'growers_soilbound_pact',
    name: 'Soilbound Pact',
    description: 'Rare crops may awaken and harvest themselves once per growth cycle',
    guild: 'growers',
    tier: 3,
    level: 0,
    maxLevel: 1,
    isOneTime: true,
    baseCost: 600,
    costScaling: 1,
    currencyType: 'sigils',
    effectPerLevel: 0.1,
    effectTemplate: '{value}% chance for crops to self-harvest (with manual bonus)',
    purchased: false
  },
  {
    id: 'growers_fruit_cultivation',
    name: 'Fruit Cultivation',
    description: 'Ancient knowledge of fruit trees and berry bushes, unlocking a new tier of premium crops',
    guild: 'growers',
    tier: 2,
    level: 0,
    maxLevel: 1,
    isOneTime: true,
    baseCost: 200,
    costScaling: 1,
    currencyType: 'sigils',
    effectPerLevel: 1,
    effectTemplate: 'Unlocks 10 fruit crops with premium yields',
    purchased: false
  }
];

/**
 * Preservers Guild Upgrades. The two sampling upgrades keep their old ids, so saves that
 * sampled the earlier placeholders keep their levels.
 */
export const PRESERVERS_UPGRADES: GuildUpgrade[] = [
  // Tier 1 - Available before commitment (sampling)
  {
    id: 'preservers_shelf_life',
    name: 'Tight Lids',
    description: 'Well-sealed jars keep their flavor and sell for more',
    guild: 'preservers',
    tier: 1,
    level: 0,
    maxLevel: 5,
    isOneTime: false,
    baseCost: 30,
    costScaling: 1.5,
    currencyType: 'guildTokens',
    effectPerLevel: 0.02,
    effectTemplate: '+{value}% canned goods value',
    purchased: false
  },
  {
    id: 'preservers_efficient_canning',
    name: 'Rolling Boil',
    description: 'A hotter kettle finishes every batch sooner',
    guild: 'preservers',
    tier: 1,
    level: 0,
    maxLevel: 5,
    isOneTime: false,
    baseCost: 50,
    costScaling: 1.5,
    currencyType: 'guildTokens',
    effectPerLevel: 0.03,
    effectTemplate: '-{value}% canning time',
    purchased: false
  },
  // Tier 2 - Post-commitment
  {
    id: 'preservers_cellar_recipes',
    name: 'Cellar Recipes',
    description: 'Old family recipes for pickles, jams and relishes',
    guild: 'preservers',
    tier: 2,
    level: 0,
    maxLevel: 1,
    isOneTime: true,
    baseCost: 200,
    costScaling: 1,
    currencyType: 'guildCurrency',
    effectPerLevel: 1,
    effectTemplate: 'Unlocks 10 Cellar recipes, made from vegetables',
    purchased: false
  },
  {
    id: 'preservers_cellar_aging',
    name: 'Cellar Aging',
    description: 'Jars rested in a cool cellar sell for more',
    guild: 'preservers',
    tier: 2,
    level: 0,
    maxLevel: 10,
    isOneTime: false,
    baseCost: 75,
    costScaling: 1.8,
    currencyType: 'guildCurrency',
    effectPerLevel: 0.03,
    effectTemplate: '+{value}% canned goods value',
    purchased: false
  },
  {
    id: 'preservers_copper_kettles',
    name: 'Copper Kettles',
    description: 'Even heat from copper shortens every batch',
    guild: 'preservers',
    tier: 2,
    level: 0,
    maxLevel: 10,
    isOneTime: false,
    baseCost: 100,
    costScaling: 1.8,
    currencyType: 'guildCurrency',
    effectPerLevel: 0.02,
    effectTemplate: '-{value}% canning time',
    purchased: false
  },
  {
    id: 'preservers_pressure_canner',
    name: 'Pressure Canner',
    description: 'A sealed pot cans more jars from the same ingredients',
    guild: 'preservers',
    tier: 2,
    level: 0,
    maxLevel: 5,
    isOneTime: false,
    baseCost: 200,
    costScaling: 2.2,
    currencyType: 'guildCurrency',
    effectPerLevel: 1,
    effectTemplate: 'Jars per batch: +{value}',
    effectDisplay: 'number',
    purchased: false
  },
  {
    id: 'preservers_honey_glaze',
    name: 'Honey Glaze',
    description: 'A brush of honey makes honey recipes shine',
    guild: 'preservers',
    tier: 2,
    level: 0,
    maxLevel: 5,
    isOneTime: false,
    baseCost: 120,
    costScaling: 1.8,
    currencyType: 'guildCurrency',
    effectPerLevel: 0.05,
    effectTemplate: '+{value}% value on honey recipes',
    purchased: false
  },
  {
    id: 'preservers_family_cookbook',
    name: 'Family Cookbook',
    description: 'Recipes you make often become house specialties',
    guild: 'preservers',
    tier: 2,
    level: 0,
    maxLevel: 1,
    isOneTime: true,
    baseCost: 350,
    costScaling: 1,
    currencyType: 'guildCurrency',
    effectPerLevel: 1,
    effectTemplate: 'Recipe Mastery: +10%, +25% and +50% value after 25, 100 and 500 batches of a recipe',
    purchased: false
  },
  // Tier 3 - Advanced post-commitment
  {
    id: 'preservers_seal_of_quality',
    name: 'Seal of Quality',
    description: 'Some batches come out perfect and sell as Prize Jars',
    guild: 'preservers',
    tier: 3,
    level: 0,
    maxLevel: 5,
    isOneTime: false,
    baseCost: 250,
    costScaling: 2,
    currencyType: 'guildCurrency',
    effectPerLevel: 0.05,
    effectTemplate: '{value}% chance of a Prize Jar: double money, and +1 Wax Seal on batches you start',
    purchased: false
  },
  {
    id: 'preservers_rush_batch',
    name: 'Rush Batch',
    description: 'Stoke the fire to finish every running batch at once',
    guild: 'preservers',
    tier: 3,
    level: 0,
    maxLevel: 1,
    isOneTime: true,
    baseCost: 150,
    costScaling: 1,
    currencyType: 'guildCurrency',
    effectPerLevel: 1,
    effectTemplate: 'Rush Batch: spend 1 Wax Seal per running batch, at least 5, to finish them all now',
    purchased: false
  },
  {
    id: 'preservers_trusted_apprentice',
    name: 'Trusted Apprentice',
    description: 'Teach the Canner your tricks',
    guild: 'preservers',
    tier: 3,
    level: 0,
    maxLevel: 1,
    isOneTime: true,
    baseCost: 600,
    costScaling: 1,
    currencyType: 'guildCurrency',
    effectPerLevel: 1,
    effectTemplate: 'Canner batches give half the knowledge and canning experience instead of a tenth',
    purchased: false
  },
  {
    id: 'preservers_pantry_lock',
    name: 'Pantry Lock',
    description: 'A sturdy latch keeps hungry noses out',
    guild: 'preservers',
    tier: 3,
    level: 0,
    maxLevel: 1,
    isOneTime: true,
    baseCost: 300,
    costScaling: 1,
    currencyType: 'guildCurrency',
    effectPerLevel: 1,
    effectTemplate: 'Dunkin the Glutton can no longer reach the pantry',
    purchased: false
  }
];

export const ENGINEERS_UPGRADES: GuildUpgrade[] = [
  {
    id: 'engineers_automation_boost',
    name: 'Automation Efficiency',
    description: 'Auto-harvesters work faster',
    guild: 'engineers',
    tier: 1,
    level: 0,
    maxLevel: 5,
    isOneTime: false,
    baseCost: 1000,
    costScaling: 1.5,
    currencyType: 'money',
    effectPerLevel: 0.05,
    effectTemplate: '+{value}% auto-harvester speed',
    purchased: false
  },
  {
    id: 'engineers_precision_tools',
    name: 'Precision Tools',
    description: 'Better tools yield more per harvest',
    guild: 'engineers',
    tier: 1,
    level: 0,
    maxLevel: 5,
    isOneTime: false,
    baseCost: 500,
    costScaling: 1.5,
    currencyType: 'knowledge',
    effectPerLevel: 0.02,
    effectTemplate: '+{value}% yield from automated harvests',
    purchased: false
  }
];

export const MERCHANTS_UPGRADES: GuildUpgrade[] = [
  {
    id: 'merchants_haggling',
    name: 'Haggling',
    description: 'Better prices when selling',
    guild: 'merchants',
    tier: 1,
    level: 0,
    maxLevel: 5,
    isOneTime: false,
    baseCost: 1000,
    costScaling: 1.5,
    currencyType: 'money',
    effectPerLevel: 0.04,
    effectTemplate: '+{value}% sale prices',
    purchased: false
  },
  {
    id: 'merchants_bulk_deals',
    name: 'Bulk Deals',
    description: 'Bonus money when selling large quantities',
    guild: 'merchants',
    tier: 1,
    level: 0,
    maxLevel: 5,
    isOneTime: false,
    baseCost: 500,
    costScaling: 1.5,
    currencyType: 'knowledge',
    effectPerLevel: 0.02,
    effectTemplate: '+{value}% bonus per 100 items sold at once',
    purchased: false
  }
];

/**
 * Guild Definitions
 */
export const GUILDS: Guild[] = [
  {
    id: 'growers',
    name: 'growers',
    displayName: 'Growers Guild',
    description: 'Masters of cultivation who harness the mysterious forces of growth. They prioritize raw produce value and manual harvesting.',
    philosophy: 'The earth speaks to those who listen. Through patience and ritual, we unlock the true potential of every seed.',
    focuses: ['Crop Growth', 'Raw Value', 'Manual Harvesting', 'Bee Synergy'],
    colors: {
      primary: '#2d5a27',
      secondary: '#4a7c44',
      accent: '#c9a227',
      background: '#1a3318',
      border: '#3d6b37'
    },
    emblem: GUILD_GROWERS,
    currency: { name: 'Sigils', icon: ICON_SIGIL, earnedFrom: 'Earned from manual harvests and blessed crops' },
    joinable: true,
    upgrades: GROWERS_UPGRADES,
    passiveBonuses: [
      {
        id: 'growers_manual_bonus',
        name: 'Hands of the Earth',
        description: '+1 bonus veggie and chance of Blessed Crop on manual harvest',
        type: 'yield',
        value: 1,
        target: 'manual_harvest'
      },
      {
        id: 'growers_bee_synergy',
        name: 'Pollen Harmony',
        description: '+5% bee pollination yield bonus',
        type: 'yield',
        value: 0.05,
        target: 'bees'
      },
      {
        id: 'growers_raw_value',
        name: 'Natural Purity',
        description: 'Raw produce eventually sells for more than processed goods',
        type: 'price',
        value: 0.1,
        target: 'raw_crops'
      }
    ],
    tradeOffs: [
      {
        id: 'growers_auto_penalty',
        name: 'Disrupted Harmony',
        description: 'Auto-harvester yields no manual bonus',
        type: 'automation',
        value: 0,
        target: 'auto_harvest_bonus'
      },
      {
        id: 'growers_speed_penalty',
        name: 'Patient Growth',
        description: 'Auto-harvest speed upgrades are 25% less effective',
        type: 'speed',
        value: 0.25,
        target: 'harvester_speed'
      },
      {
        id: 'growers_canning_penalty',
        name: 'Preservation Loss',
        description: 'Canning yields 15% less profit',
        type: 'price',
        value: 0.15,
        target: 'canning'
      }
    ]
  },
  {
    id: 'preservers',
    name: 'preservers',
    displayName: 'Preservers Guild',
    description: 'Artisans of preservation who transform harvests into lasting treasures. They excel at canning and storage.',
    philosophy: 'Nothing should go to waste. Through careful craft, we extend the bounty of each harvest across seasons.',
    focuses: ['Canning', 'Storage', 'Recipe Mastery', 'Shelf Life'],
    colors: {
      primary: '#8b4513',
      secondary: '#a0522d',
      accent: '#cd853f',
      background: '#3d2314',
      border: '#6b3410'
    },
    emblem: GUILD_PRESERVERS,
    currency: { name: 'Wax Seals', icon: ICON_WAX_SEAL, earnedFrom: 'Earned from batches you start yourself and from shooing Dunkin' },
    joinable: true,
    upgrades: PRESERVERS_UPGRADES,
    passiveBonuses: [
      {
        id: 'preservers_canning_bonus',
        name: 'Master Preserver',
        description: '+20% canned goods value',
        type: 'price',
        value: 0.2,
        target: 'canning'
      },
      {
        id: 'preservers_wax_seals',
        name: 'Sealed Jars',
        description: 'Earn a Wax Seal for every batch you start yourself; the Canner earns none',
        type: 'special',
        value: 1,
        target: 'canning'
      }
    ],
    tradeOffs: [
      {
        id: 'preservers_raw_penalty',
        name: 'Processing Focus',
        description: 'Raw produce sells for 10% less',
        type: 'price',
        value: 0.1,
        target: 'raw_crops'
      },
      {
        id: 'preservers_glutton',
        name: 'The Glutton',
        description: 'Dunkin the bulldog raids the pantry: shoo him early or pay the vet',
        type: 'special',
        value: 0,
        target: 'pantry'
      }
    ]
  },
  {
    id: 'engineers',
    name: 'engineers',
    displayName: 'Engineers Guild',
    description: 'Innovators who perfect automation and efficiency. They prioritize mechanical solutions and scaling.',
    philosophy: 'Progress through precision. Every process can be optimized, every task automated.',
    focuses: ['Automation', 'Efficiency', 'Scaling', 'Speed'],
    colors: {
      primary: '#4169e1',
      secondary: '#6495ed',
      accent: '#b0c4de',
      background: '#1a2a4a',
      border: '#3454b4'
    },
    emblem: GUILD_ENGINEERS,
    currency: { name: 'Guild Currency', icon: ICON_GUILDS, earnedFrom: 'Coming in a future update' },
    joinable: false,
    upgrades: ENGINEERS_UPGRADES,
    passiveBonuses: [
      {
        id: 'engineers_auto_bonus',
        name: 'Automated Excellence',
        description: '+25% auto-harvester efficiency',
        type: 'automation',
        value: 0.25,
        target: 'auto_harvest'
      }
    ],
    tradeOffs: [
      {
        id: 'engineers_manual_penalty',
        name: 'Mechanical Mindset',
        description: 'Manual harvesting provides no bonus yield',
        type: 'yield',
        value: 0,
        target: 'manual_harvest_bonus'
      }
    ]
  },
  {
    id: 'merchants',
    name: 'merchants',
    displayName: 'Merchants Guild',
    description: 'Masters of trade who maximize profit from every transaction. They excel at selling and market timing.',
    philosophy: 'Value is created through exchange. The wise merchant sees opportunity where others see mere produce.',
    focuses: ['Trading', 'Profit', 'Market Timing', 'Bulk Sales'],
    colors: {
      primary: '#6b21a8',
      secondary: '#9333ea',
      accent: '#fbbf24',
      background: '#2d1a47',
      border: '#581c87'
    },
    emblem: GUILD_MERCHANTS,
    currency: { name: 'Guild Currency', icon: ICON_GUILDS, earnedFrom: 'Coming in a future update' },
    joinable: false,
    upgrades: MERCHANTS_UPGRADES,
    passiveBonuses: [
      {
        id: 'merchants_sale_bonus',
        name: 'Golden Touch',
        description: '+15% to all sale prices',
        type: 'price',
        value: 0.15,
        target: 'all_sales'
      }
    ],
    tradeOffs: [
      {
        id: 'merchants_growth_penalty',
        name: 'Trade Focus',
        description: 'Crop growth is 10% slower',
        type: 'speed',
        value: 0.1,
        target: 'growth'
      }
    ]
  }
];

/**
 * Get a guild by ID
 */
export function getGuildById(guildId: GuildType): Guild | undefined {
  return GUILDS.find(g => g.id === guildId);
}

/**
 * Get all upgrades for a guild
 */
export function getGuildUpgrades(guildId: GuildType): GuildUpgrade[] {
  const guild = getGuildById(guildId);
  return guild?.upgrades ?? [];
}

/**
 * Get tier 1 (sampling) upgrades for a guild
 */
export function getSamplingUpgrades(guildId: GuildType): GuildUpgrade[] {
  return getGuildUpgrades(guildId).filter(u => u.tier === 1);
}

/**
 * Get post-commitment upgrades for a guild
 */
export function getCommittedUpgrades(guildId: GuildType): GuildUpgrade[] {
  return getGuildUpgrades(guildId).filter(u => u.tier > 1);
}
