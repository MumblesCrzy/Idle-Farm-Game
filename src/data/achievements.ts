import type { Achievement } from '../types/achievements';
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
  ICON_BEE_BOX
} from '../config/assetPaths';

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
      customCheck: (gameState) => gameState.totalHarvests >= 1
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

  // Bee System Achievements
  {
    id: 'first_honey_harvest',
    name: 'First Harvest',
    description: 'Collect your first honey from a bee box',
    icon: ICON_HONEY,
    category: 'special',
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
    category: 'special',
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
    icon: ICON_BEE_BOX,
    category: 'special',
    requirement: {
      type: 'custom',
      customCheck: (gameState) => (gameState.beeState?.boxes?.length || 0) >= 10
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
    icon: ICON_BEE_BOX,
    category: 'special',
    requirement: {
      type: 'custom',
      customCheck: (gameState) => (gameState.beeState?.boxes?.length || 0) >= 25
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
    description: 'Own 50 bee boxes (maximum)',
    icon: ICON_BEE_BOX,
    category: 'special',
    requirement: {
      type: 'custom',
      customCheck: (gameState) => (gameState.beeState?.boxes?.length || 0) >= 50
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
    category: 'special',
    requirement: {
      type: 'custom',
      customCheck: (gameState) => (gameState.beeState?.totalHoneyCollected || 0) >= 100
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
    category: 'special',
    requirement: {
      type: 'custom',
      customCheck: (gameState) => {
        // Check if the player has crafted at least one Beekeeper's Pride recipe
        const recipe = gameState.canningState?.recipes?.find((r: any) => r.name === "Beekeeper's Pride");
        return recipe ? (recipe.timesCrafted || 0) >= 1 : false;
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
    description: 'Unlock all bee upgrades',
    icon: ICON_BEE,
    category: 'special',
    requirement: {
      type: 'custom',
      customCheck: (gameState) => {
        const upgrades = gameState.beeState?.upgrades || [];
        if (upgrades.length === 0) return false;
        
        // Check if all upgrades are unlocked (purchased at least once)
        // There are 5 unique upgrades: Busy Bees, Royal Jelly, Hexcomb Engineering, Meadow Magic, Queen's Blessing
        const uniqueUpgrades = ['busy_bees', 'royal_jelly', 'hexcomb_engineering', 'meadow_magic', 'queens_blessing'];
        return uniqueUpgrades.every(upgradeId => {
          const upgrade = upgrades.find((u: any) => u.id === upgradeId);
          return upgrade && upgrade.purchased;
        });
      }
    },
    reward: {
      knowledge: 100,
      money: 3000,
      message: 'You\'ve mastered every aspect of beekeeping! +100 knowledge and $3,000'
    }
  }
];
