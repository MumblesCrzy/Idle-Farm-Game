import type { Achievement, AchievementGameState } from '../types/achievements';
import { 
  VEGGIE_CARROT, 
  ICON_PLOTS, 
  VEGGIE_EGGPLANT, 
  ICON_MONEY, 
  ICON_GROWING, 
  ICON_KNOWLEDGE, 
  ICON_CANNING,
  ICON_HOLIDAY_CHEER,
  TREE_DECORATED,
  ICON_MILESTONE,
  ICON_BEE,
  ICON_HONEY,
  ICON_GOLDEN_HONEY,
  ICON_BEE_HIVE,
  PUMPKIN_STAND,
  PUMPKIN_SUGAR_PIE,
  PUMPKIN_LANTERN,
  PUMPKIN_GIANT,
  PUMPKIN_SCALE,
  RIBBON_BLUE,
  SPECIAL_GLUTTON,
  SPECIAL_STANLEY,
  ICON_SCROLL
} from '../config/assetPaths';
import { PUMPKIN_EVENT_CONSTANTS } from './pumpkinEventData';
import { INITIAL_BEE_UPGRADES } from './beeUpgrades';

/** The real Atlantic Giant world record, in pounds */
const WORLD_RECORD = PUMPKIN_EVENT_CONSTANTS.WORLD_RECORD_WEIGHT;

/** Every bee upgrade, and the Beekeeper Assistant */
const ALL_BEE_UPGRADES = INITIAL_BEE_UPGRADES.length + 1;

/** Bee upgrades bought at least once, counting the Beekeeper Assistant once hired */
const beeUpgradesPurchased = (beeState: AchievementGameState['beeState']): number => {
  if (!beeState) return 0;
  const bought = INITIAL_BEE_UPGRADES.filter(definition =>
    beeState.upgrades.some(upgrade => upgrade.id === definition.id && upgrade.purchased)
  ).length;
  return bought + (beeState.beekeeperAssistant?.unlocked ? 1 : 0);
};

/** Achievements that add a permanent bonus, by the id they add to permanentBonuses */
export const PERMANENT_BONUS_ACHIEVEMENTS: Record<string, string> = {
  frost_fertilizer: 'frost_fertilizer',
  pumpkin_2500_sold: 'harvest_moon'
};

export const INITIAL_ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  // Farming Achievements
  {
    id: 'first_harvest',
    name: 'First Harvest',
    description: 'Harvest your first vegetable',
    icon: VEGGIE_CARROT,
    category: 'farming',
    requirement: {
      type: 'custom',
      customCheck: (gameState) => (gameState.totalHarvests ?? 0) >= 1
    },
    reward: {
      money: 50,
      message: 'Welcome to farming! Here\'s $50 to get you started.'
    }
  },
  {
    id: 'veggie_collector',
    name: 'Veggie Collector',
    description: 'Unlock 5 different vegetables',
    icon: ICON_PLOTS,
    category: 'farming',
    requirement: {
      type: 'veggies_unlocked',
      value: 5
    },
    reward: {
      knowledge: 10,
      message: 'Your growing expertise earned you 10 knowledge!'
    }
  },
  {
    id: 'master_gardener',
    name: 'Master Gardener',
    description: 'Unlock all vegetables',
    icon: VEGGIE_EGGPLANT,
    category: 'farming',
    requirement: {
      type: 'veggies_unlocked',
      value: 10
    },
    reward: {
      knowledge: 50,
      money: 1000,
      message: 'You\'ve mastered the art of farming! +50 knowledge and $1000'
    }
  },
  
  // Wealth Achievements
  {
    id: 'penny_pincher',
    name: 'Penny Pincher',
    description: 'Accumulate $1,000',
    icon: ICON_MONEY,
    category: 'wealth',
    requirement: {
      type: 'money',
      value: 1000
    }
  },
  {
    id: 'entrepreneur',
    name: 'Entrepreneur',
    description: 'Accumulate $10,000',
    icon: ICON_MONEY,
    category: 'wealth',
    requirement: {
      type: 'money',
      value: 10000
    },
    reward: {
      money: 500,
      message: 'Your business sense is paying off! +$500 bonus'
    }
  },
  {
    id: 'millionaire',
    name: 'Millionaire',
    description: 'Accumulate $1,000,000',
    icon: ICON_MONEY,
    category: 'wealth',
    requirement: {
      type: 'money',
      value: 1000000
    },
    reward: {
      money: 50000,
      knowledge: 100,
      message: 'You\'re a farming tycoon! +$50,000 and +100 knowledge'
    },
    hidden: true
  },
  
  // Progression Achievements
  {
    id: 'rookie_farmer',
    name: 'Rookie Farmer',
    description: 'Reach 100 experience',
    icon: ICON_GROWING,
    category: 'progression',
    requirement: {
      type: 'experience',
      value: 100
    }
  },
  {
    id: 'seasoned_farmer',
    name: 'Seasoned Farmer',
    description: 'Reach 1,000 experience',
    icon: ICON_GROWING,
    category: 'progression',
    requirement: {
      type: 'experience',
      value: 1000
    },
    reward: {
      knowledge: 20,
      message: 'Your experience is growing! +20 knowledge'
    }
  },
  {
    id: 'farm_master',
    name: 'Farm Master',
    description: 'Reach 10,000 experience',
    icon: ICON_GROWING,
    category: 'progression',
    requirement: {
      type: 'experience',
      value: 10000
    },
    reward: {
      knowledge: 100,
      money: 5000,
      message: 'You\'re a true master! +100 knowledge and $5,000'
    }
  },
  {
    id: 'knowledge_seeker',
    name: 'Knowledge Seeker',
    description: 'Accumulate 100 knowledge',
    icon: ICON_KNOWLEDGE,
    category: 'progression',
    requirement: {
      type: 'knowledge',
      value: 100
    }
  },
  {
    id: 'wisdom_sage',
    name: 'Wisdom Sage',
    description: 'Accumulate 1,000 knowledge',
    icon: ICON_KNOWLEDGE,
    category: 'progression',
    requirement: {
      type: 'knowledge',
      value: 1000
    },
    reward: {
      knowledge: 100,
      message: 'Your wisdom knows no bounds! +100 knowledge'
    }
  },
  
  // Canning Achievements
  {
    id: 'preservation_novice',
    name: 'Preservation Novice',
    description: 'Can your first item',
    icon: ICON_CANNING,
    category: 'canning',
    requirement: {
      type: 'canning_items',
      value: 1
    },
    reward: {
      money: 100,
      message: 'Your first preserved creation! +$100'
    }
  },
  {
    id: 'canning_expert',
    name: 'Canning Expert',
    description: 'Can 100 items',
    icon: ICON_CANNING,
    category: 'canning',
    requirement: {
      type: 'canning_items',
      value: 100
    },
    reward: {
      knowledge: 50,
      message: 'You\'re a preservation expert! +50 knowledge'
    }
  },
  {
    id: 'preservation_master',
    name: 'Preservation Master',
    description: 'Can 1,000 items',
    icon: ICON_CANNING,
    category: 'canning',
    requirement: {
      type: 'canning_items',
      value: 1000
    },
    reward: {
      knowledge: 200,
      money: 10000,
      message: 'Master of preservation! +200 knowledge and $10,000'
    },
    hidden: true
  },

  // Preservers Guild: Dunkin the Glutton
  {
    id: 'glutton_first_shoo',
    name: 'Get out of the kitchen Dunkin!',
    description: 'Shoo Dunkin out of the kitchen',
    icon: SPECIAL_GLUTTON,
    category: 'canning',
    requirement: {
      type: 'custom',
      customCheck: (gameState) => (gameState.guildState?.glutton?.shoos ?? 0) >= 1
    },
    reward: {
      knowledge: 50,
      message: 'And stay out! +50 knowledge'
    }
  },
  {
    id: 'glutton_pantry_guardian',
    name: 'Pantry Guardian',
    description: 'Shoo Dunkin before his first bite 25 times',
    icon: SPECIAL_GLUTTON,
    category: 'canning',
    requirement: {
      type: 'custom',
      value: 25,
      customCheck: (gameState) => (gameState.guildState?.glutton?.earlyShoos ?? 0) >= 25,
      getProgress: (gameState) => gameState.guildState?.glutton?.earlyShoos ?? 0
    },
    reward: {
      knowledge: 150,
      money: 5000,
      message: 'Not a crumb lost! +150 knowledge and $5,000'
    }
  },
  {
    id: 'glutton_vet_bills',
    name: "Vet's Best Customer",
    description: 'Send a stuffed Dunkin to the vet 10 times',
    icon: SPECIAL_GLUTTON,
    category: 'canning',
    requirement: {
      type: 'custom',
      value: 10,
      customCheck: (gameState) => (gameState.guildState?.glutton?.vetBills ?? 0) >= 10,
      getProgress: (gameState) => gameState.guildState?.glutton?.vetBills ?? 0
    },
    reward: {
      knowledge: 100,
      message: 'The vet sends a thank-you card. +100 knowledge'
    },
    hidden: true
  },

  // Engineers Guild: Stanley the cat
  {
    id: 'stanley_first_tune_up',
    name: 'Well Oiled',
    description: 'Get a Tune-Up from Stanley',
    icon: SPECIAL_STANLEY,
    category: 'farming',
    requirement: {
      type: 'custom',
      customCheck: (gameState) => (gameState.guildState?.stanley?.tuneUps ?? 0) >= 1
    },
    reward: {
      knowledge: 50,
      message: 'Purring like an engine! +50 knowledge'
    }
  },
  {
    id: 'stanley_overtime',
    name: 'Overtime',
    description: 'Get 100 Tune-Ups from Stanley',
    icon: SPECIAL_STANLEY,
    category: 'farming',
    requirement: {
      type: 'custom',
      value: 100,
      customCheck: (gameState) => (gameState.guildState?.stanley?.tuneUps ?? 0) >= 100,
      getProgress: (gameState) => gameState.guildState?.stanley?.tuneUps ?? 0
    },
    reward: {
      knowledge: 150,
      money: 5000,
      message: 'The factory never sleeps! +150 knowledge and $5,000'
    }
  },
  {
    id: 'engineers_lights_out_factory',
    name: 'Lights-Out Factory',
    description: 'Make 10,000 batches on the factory floor',
    icon: ICON_CANNING,
    category: 'canning',
    requirement: {
      type: 'custom',
      value: 10000,
      customCheck: (gameState) => (gameState.canningState?.floorBatches ?? 0) >= 10000,
      getProgress: (gameState) => gameState.canningState?.floorBatches ?? 0
    },
    reward: {
      knowledge: 250,
      money: 25000,
      message: 'The machines run themselves now! +250 knowledge and $25,000'
    },
    hidden: true
  },

  // Legacy: special, so they survive the reset they celebrate
  {
    id: 'legacy_first',
    name: 'Turning the Page',
    description: 'End your first Legacy',
    icon: ICON_SCROLL,
    category: 'special',
    requirement: {
      type: 'custom',
      customCheck: (gameState) => (gameState.guildState?.legacy?.count ?? 0) >= 1
    },
    reward: {
      knowledge: 100,
      money: 1000,
      message: 'A new chapter begins. +100 knowledge and $1,000'
    }
  },
  {
    id: 'legacy_two_trades',
    name: 'Two Trades',
    description: 'Hold kept unlocks from two different guilds',
    icon: ICON_SCROLL,
    category: 'special',
    requirement: {
      type: 'custom',
      customCheck: (gameState) => new Set((gameState.guildState?.legacy?.keptUnlocks ?? []).map(id => id.split('_')[0])).size >= 2
    },
    reward: {
      knowledge: 250,
      message: 'Skills from two guilds, one farm. +250 knowledge'
    }
  },
  
  // Farm Tier Achievements
  {
    id: 'expanding_horizons',
    name: 'Expanding Horizons',
    description: 'Upgrade your farm to tier 3',
    icon: ICON_PLOTS,
    category: 'special',
    requirement: {
      type: 'farm_tier',
      value: 3
    },
    reward: {
      money: 500,
      message: 'Your farm is growing! +$500'
    }
  },
  {
    id: 'farming_empire',
    name: 'Farming Empire',
    description: 'Upgrade your farm to tier 10',
    icon: ICON_PLOTS,
    category: 'special',
    requirement: {
      type: 'farm_tier',
      value: 10
    },
    reward: {
      knowledge: 100,
      money: 5000,
      message: 'You\'ve built an empire! +100 knowledge and $5,000'
    },
    hidden: true
  },
  
  // Christmas Tree Shop Achievements
  {
    id: 'first_tree_sold',
    name: 'First Tree Sold',
    description: 'Sell your first Christmas tree',
    icon: TREE_DECORATED,
    category: 'special',
    requirement: {
      type: 'christmas_trees_sold',
      value: 1
    },
    reward: {
      message: 'Holiday Cheer unlocked! The spirit of Christmas is in the air.'
    }
  },
  {
    id: 'winter_sweater',
    name: 'Archie\'s Winter Sweater',
    description: 'Sell 50 Christmas trees',
    icon: ICON_MILESTONE,
    category: 'special',
    requirement: {
      type: 'christmas_trees_sold',
      value: 50
    },
    reward: {
      message: 'Archie looks cozy in his new winter sweater!'
    }
  },
  {
    id: 'reindeer_hat',
    name: 'Archie\'s Reindeer Hat',
    description: 'Sell 250 Christmas trees',
    icon: ICON_MILESTONE,
    category: 'special',
    requirement: {
      type: 'christmas_trees_sold',
      value: 250
    },
    reward: {
      message: 'Archie is ready to help Santa!'
    }
  },
  {
    id: 'frost_fertilizer',
    name: 'Frost Fertilizer',
    description: 'Sell 1,000 Christmas trees',
    icon: ICON_HOLIDAY_CHEER,
    category: 'special',
    requirement: {
      type: 'christmas_trees_sold',
      value: 1000
    },
    reward: {
      knowledge: 50,
      message: 'Permanent +5% winter crop yield unlocked! +50 knowledge'
    }
  },
  {
    id: 'canners_cocoa',
    name: 'Canner\'s Cocoa Recipe',
    description: 'Sell 2,500 Christmas trees',
    icon: ICON_CANNING,
    category: 'special',
    requirement: {
      type: 'christmas_trees_sold',
      value: 2500
    },
    reward: {
      knowledge: 100,
      message: 'New canning recipe unlocked: Hot Cocoa! +100 knowledge'
    }
  },
  {
    id: 'snowfall_cosmetic',
    name: 'Eternal Snowfall',
    description: 'Sell 5,000 Christmas trees',
    icon: ICON_MILESTONE,
    category: 'special',
    requirement: {
      type: 'christmas_trees_sold',
      value: 5000
    },
    reward: {
      knowledge: 200,
      message: 'Snowfall permanently added to farm background! +200 knowledge'
    },
    hidden: true
  },

  // Fall Pumpkin Rush Achievements: the Farm Stand's sales milestones, paying farm
  // rewards beside their Candy Corn
  {
    id: 'pumpkin_first_sale',
    name: 'Open for Business',
    description: 'Sell your first pumpkin',
    icon: PUMPKIN_STAND,
    category: 'special',
    requirement: {
      type: 'pumpkins_sold',
      value: 1
    },
    reward: {
      candyCorn: 50,
      money: 100,
      message: 'The Farm Stand is open! +50 Candy Corn and $100'
    }
  },
  {
    id: 'pumpkin_50_sold',
    name: 'Roadside Favorite',
    description: 'Sell 50 pumpkins',
    icon: PUMPKIN_SUGAR_PIE,
    category: 'special',
    requirement: {
      type: 'pumpkins_sold',
      value: 50
    },
    reward: {
      candyCorn: 150,
      knowledge: 25,
      unlocks: ["Archie's Fall Sweater"],
      message: 'Folks drive out for your pumpkins, and Archie gets a Fall Sweater! +150 Candy Corn and 25 knowledge'
    }
  },
  {
    id: 'pumpkin_250_sold',
    name: 'Patch Celebrity',
    description: 'Sell 250 pumpkins',
    icon: PUMPKIN_LANTERN,
    category: 'special',
    requirement: {
      type: 'pumpkins_sold',
      value: 250
    },
    reward: {
      candyCorn: 500,
      money: 1000,
      message: 'Everyone knows your patch! +500 Candy Corn and $1,000'
    }
  },
  {
    id: 'pumpkin_1000_sold',
    name: 'Great Pumpkin',
    description: 'Sell 1,000 pumpkins',
    icon: PUMPKIN_GIANT,
    category: 'special',
    requirement: {
      type: 'pumpkins_sold',
      value: 1000
    },
    reward: {
      candyCorn: 1500,
      knowledge: 100,
      message: 'The Great Pumpkin rises! +1,500 Candy Corn and 100 knowledge'
    }
  },
  {
    id: 'pumpkin_2500_sold',
    name: 'Pumpkin Legend',
    description: 'Sell 2,500 pumpkins',
    icon: RIBBON_BLUE,
    category: 'special',
    requirement: {
      type: 'pumpkins_sold',
      value: 2500
    },
    reward: {
      candyCorn: 4000,
      knowledge: 200,
      unlocks: ['Harvest Moon', "Archie's Warlock Costume"],
      message: 'Harvest Moon: permanent +5% fall crop yield, and Archie gets a Warlock Costume! +4,000 Candy Corn and 200 knowledge'
    }
  },
  {
    id: 'pumpkin_world_record',
    name: 'New World Record',
    description: `Grow an Atlantic Giant heavier than the ${WORLD_RECORD.toLocaleString('en-US')} lb world record`,
    icon: PUMPKIN_SCALE,
    category: 'special',
    requirement: {
      type: 'custom',
      value: WORLD_RECORD + 1,
      customCheck: (gameState) => (gameState.heaviestGiant ?? 0) > WORLD_RECORD,
      getProgress: (gameState) => gameState.heaviestGiant ?? 0
    },
    reward: {
      candyCorn: 5000,
      knowledge: 250,
      message: 'The record books need a new page! +5,000 Candy Corn and 250 knowledge'
    },
    hidden: true
  },

  // Bee System Achievements
  {
    id: 'first_honey_harvest',
    name: 'First Harvest',
    description: 'Collect your first honey from a bee box',
    icon: ICON_HONEY,
    category: 'bees',
    requirement: {
      type: 'custom',
      customCheck: (gameState) => (gameState.beeState?.totalHoneyCollected || 0) >= 1
    },
    reward: {
      knowledge: 5,
      message: 'Sweet success! Your bees are producing. +5 knowledge'
    }
  },
  {
    id: 'golden_touch',
    name: 'Golden Touch',
    description: 'Collect your first Golden Honey',
    icon: ICON_GOLDEN_HONEY,
    category: 'bees',
    requirement: {
      type: 'custom',
      customCheck: (gameState) => (gameState.beeState?.totalGoldenHoneyCollected || 0) >= 1
    },
    reward: {
      knowledge: 15,
      message: 'A rare and precious gift from your bees! +15 knowledge'
    }
  },
  {
    id: 'buzzing_business',
    name: 'Buzzing Business',
    description: 'Own 10 bee boxes',
    icon: ICON_BEE_HIVE,
    category: 'bees',
    requirement: {
      type: 'custom',
      value: 10,
      customCheck: (gameState) => {
        const boxCount = gameState.beeState?.boxes?.length || 0;
        return boxCount >= 10;
      },
      getProgress: (gameState) => gameState.beeState?.boxes?.length || 0
    },
    reward: {
      knowledge: 20,
      message: 'Your apiary is thriving! +20 knowledge'
    }
  },
  {
    id: 'apiary_master',
    name: 'Apiary Master',
    description: 'Own 25 bee boxes',
    icon: ICON_BEE_HIVE,
    category: 'bees',
    requirement: {
      type: 'custom',
      value: 25,
      customCheck: (gameState) => {
        const boxCount = gameState.beeState?.boxes?.length || 0;
        return boxCount >= 25;
      },
      getProgress: (gameState) => gameState.beeState?.boxes?.length || 0
    },
    reward: {
      knowledge: 50,
      money: 1000,
      message: 'A masterful bee operation! +50 knowledge and $1,000'
    }
  },
  {
    id: 'sweet_empire',
    name: 'Sweet Empire',
    description: 'Own 30 bee boxes (maximum)',
    icon: ICON_BEE_HIVE,
    category: 'bees',
    requirement: {
      type: 'custom',
      value: 30,
      customCheck: (gameState) => {
        const boxCount = gameState.beeState?.boxes?.length || 0;
        return boxCount >= 30;
      },
      getProgress: (gameState) => gameState.beeState?.boxes?.length || 0
    },
    reward: {
      knowledge: 100,
      money: 5000,
      message: 'Your bee empire is unmatched! +100 knowledge and $5,000'
    }
  },
  {
    id: 'honey_hoarder',
    name: 'Honey Hoarder',
    description: 'Collect 100 honey total (lifetime)',
    icon: ICON_HONEY,
    category: 'bees',
    requirement: {
      type: 'custom',
      value: 100,
      customCheck: (gameState) => (gameState.beeState?.totalHoneyCollected || 0) >= 100,
      getProgress: (gameState) => gameState.beeState?.totalHoneyCollected || 0
    },
    reward: {
      knowledge: 30,
      message: 'A sweet stockpile! +30 knowledge'
    }
  },
  {
    id: 'beekeepers_pride',
    name: 'Beekeeper\'s Pride',
    description: 'Craft the ultimate honey recipe (Beekeeper\'s Pride)',
    icon: ICON_CANNING,
    category: 'bees',
    requirement: {
      type: 'custom',
      customCheck: (gameState) => {
        // Check if the player has crafted at least one Beekeeper's Pride recipe
        const recipe = gameState.canningState?.recipes?.find((r) => r.name === "Beekeeper's Pride");
        return recipe ? (recipe.timesCompleted || 0) >= 1 : false;
      }
    },
    reward: {
      knowledge: 75,
      money: 2000,
      message: 'The pinnacle of honey-infused craftsmanship! +75 knowledge and $2,000'
    }
  },
  {
    id: 'queens_court',
    name: 'Queen\'s Court',
    description: 'Purchase all bee upgrades and the Beekeeper',
    icon: ICON_BEE,
    category: 'bees',
    requirement: {
      type: 'custom',
      value: ALL_BEE_UPGRADES,
      // Each upgrade bought at least once: leveled upgrades don't need their top level
      customCheck: (gameState) => beeUpgradesPurchased(gameState.beeState) >= ALL_BEE_UPGRADES,
      getProgress: (gameState) => beeUpgradesPurchased(gameState.beeState)
    },
    reward: {
      knowledge: 100,
      money: 3000,
      message: 'You\'ve mastered every aspect of beekeeping! +100 knowledge and $3,000'
    }
  }
];
