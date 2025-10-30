import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { 
  CanningState, 
  Recipe, 
  CanningProcess, 
  CanningUpgrade,
  CanningIngredient 
} from '../types/canning';
import { INITIAL_RECIPES, calculateRecipeProfit } from '../data/recipes';

// Initial canning upgrades that affect the canning process
const INITIAL_CANNING_UPGRADES: CanningUpgrade[] = [
  {
    id: 'canning_speed',
    name: 'Quick Hands',
    description: 'Reduces canning time by 5% per level',
    type: 'speed',
    level: 0,
    cost: 100,
    baseCost: 100,
    upgradeCostScaling: 2.1,
    maxLevel: 18,
    costCurrency: 'money',
    effect: 1.0, // Multiplier for processing time
    unlocked: true
  },
  {
    id: 'canning_efficiency',
    name: 'Family Recipe',
    description: 'Increases canned product sale price by 10% per level',
    type: 'efficiency',
    level: 0,
    cost: 150,
    baseCost: 150,
    upgradeCostScaling: 1.5,
    costCurrency: 'knowledge',
    effect: 1.0, // Multiplier for sale price
    unlocked: true
  },
  {
    id: 'preservation_mastery',
    name: 'Heirloom Touch',
    description: 'Chance to get bonus canned products',
    type: 'quality',
    level: 0,
    cost: 200,
    baseCost: 200,
    upgradeCostScaling: 1.5,
    costCurrency: 'knowledge',
    effect: 0, // Percentage chance for bonus
    unlocked: true
  },
  {
    id: 'simultaneous_processing',
    name: 'Batch Canning',
    description: 'Allows more canning processes to run at once',
    type: 'automation',
    level: 0,
    cost: 500,
    baseCost: 500,
    upgradeCostScaling: 1.7,
    costCurrency: 'money',
    maxLevel: 14,
    effect: 1, // Number of additional simultaneous processes
    unlocked: true
  },
  {
    id: 'canner',
    name: 'Canner',
    description: 'Automatically starts canning processes every 10 seconds (gives reduced knowledge)',
    type: 'automation',
    level: 0,
    cost: 5000,
    baseCost: 5000,
    upgradeCostScaling: 1.0,
    costCurrency: 'knowledge',
    maxLevel: 1,
    effect: 0, // Binary on/off state
    unlocked: true
  }
];

const INITIAL_CANNING_STATE: CanningState = {
  recipes: [],
  unlockedRecipes: [],
  activeProcesses: [],
  maxSimultaneousProcesses: 1,
  upgrades: INITIAL_CANNING_UPGRADES,
  totalItemsCanned: 0,
  canningExperience: 0,
  autoCanning: {
    enabled: false,
    selectedRecipes: [],
    priorityOrder: []
  }
};

// Hook for managing canning system state and logic
export function useCanningSystem<T extends {name: string, stash: number, salePrice: number, betterSeedsLevel?: number}>(
  experience: number,
  veggies: T[],
  setVeggies: React.Dispatch<React.SetStateAction<T[]>>,
  heirloomOwned: boolean,
  money: number,
  setMoney: (value: number | ((prev: number) => number)) => void,
  knowledge: number,
  setKnowledge: (value: number | ((prev: number) => number)) => void,
  initialCanningState?: CanningState,
  recipeSort: 'name' | 'profit' | 'time' | 'difficulty' = 'profit',
  farmTier?: number
) {
  const [canningState, setCanningState] = useState<CanningState>(initialCanningState || INITIAL_CANNING_STATE);
  
  // Ref to always have access to current veggie state in callbacks
  const currentVeggiesRef = useRef(veggies);
  currentVeggiesRef.current = veggies;
  
  // Initialize recipes from configuration
  useEffect(() => {
    setCanningState(prev => {
      const recipes: Recipe[] = INITIAL_RECIPES.map(config => {
        const ingredients: CanningIngredient[] = config.ingredients.map(ing => {
          const veggieIndex = veggies.findIndex(v => v.name === ing.veggieName);
          return {
            veggieIndex,
            veggieName: ing.veggieName,
            quantity: ing.quantity
          };
        });
        
        // First recipe unlocks with growing experience, others with canning experience
        const isFirstRecipe = config.id === 'canned_radish';
        const unlocked = isFirstRecipe 
          ? experience >= config.experienceRequired // Use growing experience for first recipe
          : prev.canningExperience >= config.experienceRequired; // Use canning experience from prev state
        
        return {
          id: config.id,
          name: config.name,
          description: config.description,
          ingredients,
          processingTime: config.baseProcessingTime,
          baseProcessingTime: config.baseProcessingTime,
          salePrice: config.baseSalePrice,
          baseSalePrice: config.baseSalePrice,
          experienceRequired: config.experienceRequired,
          unlocked,
          timesCompleted: 0
        };
      });
      
      const unlockedRecipeIds = recipes
        .filter(recipe => recipe.unlocked)
        .map(recipe => recipe.id);
      
      return { 
        ...prev, 
        recipes,
        unlockedRecipes: unlockedRecipeIds
      };
    });
  }, [veggies, experience]); // Removed canningState.canningExperience to avoid circular dependency
  
  // Update recipe unlocks based on experience
  useEffect(() => {
    setCanningState(prev => {
      const updatedRecipes = prev.recipes.map(recipe => {
        // First recipe unlocks with growing experience, others with canning experience
        const isFirstRecipe = recipe.id === 'canned_radish';
        const unlocked = isFirstRecipe 
          ? experience >= recipe.experienceRequired // Use growing experience for first recipe
          : prev.canningExperience >= recipe.experienceRequired; // Use canning experience for others
        
        return {
          ...recipe,
          unlocked
        };
      });
      
      const newUnlockedRecipes = updatedRecipes
        .filter(recipe => recipe.unlocked)
        .map(recipe => recipe.id);
      
      return {
        ...prev,
        recipes: updatedRecipes,
        unlockedRecipes: newUnlockedRecipes
      };
    });
  }, [experience, canningState.canningExperience]); // Watch both experience types

  // Reset canning state when farm tier changes (farm upgrade)
  const farmTierRef = useRef(farmTier);
  useEffect(() => {
    if (farmTier !== undefined && farmTierRef.current !== undefined && farmTier > farmTierRef.current) {
      // Farm tier increased, reset canning state
      setCanningState(INITIAL_CANNING_STATE);
    }
    farmTierRef.current = farmTier;
  }, [farmTier]);
  
  // Update upgrade effects based on levels
  const updateUpgradeEffects = useCallback((upgrades: CanningUpgrade[]) => {
    return upgrades.map(upgrade => {
      let effect = 0;
      
      switch (upgrade.type) {
        case 'speed':
          effect = Math.max(0.1, 1 - (upgrade.level * 0.05)); // Faster processing
          break;
        case 'efficiency':
          effect = 1 + (upgrade.level * 0.10); // Higher sale prices
          break;
        case 'quality':
          effect = upgrade.level * 5; // Percentage chance for bonus
          break;
        case 'automation':
          effect = upgrade.level; // Additional simultaneous processes
          break;
      }
      
      return { ...upgrade, effect };
    });
  }, []);
  
  // Update upgrade costs based on level
  const updateUpgradeCosts = useCallback((upgrades: CanningUpgrade[]) => {
    return upgrades.map(upgrade => ({
      ...upgrade,
      cost: Math.ceil(upgrade.baseCost * Math.pow(upgrade.upgradeCostScaling, upgrade.level))
    }));
  }, []);
  
  // Check if player has enough ingredients for a recipe
  const canMakeRecipe = useCallback((recipe: Recipe): boolean => {
    return recipe.ingredients.every(ingredient => {
      const veggie = veggies[ingredient.veggieIndex];
      return veggie && veggie.stash >= ingredient.quantity;
    });
  }, [veggies]);
  
  // Start a canning process
  const startCanning = useCallback((recipeId: string, automated: boolean = false): boolean => {
    const recipe = canningState.recipes.find(r => r.id === recipeId);
    if (!recipe || !recipe.unlocked || !canMakeRecipe(recipe)) {
      return false;
    }
    
    if (canningState.activeProcesses.length >= canningState.maxSimultaneousProcesses) {
      return false; // Can't start more processes
    }
    
    // Consume vegetables from stash
    setVeggies(prev => {
      return prev.map(veggie => {
        const ingredient = recipe.ingredients.find(ing => ing.veggieName === veggie.name);
        if (ingredient) {
          return {
            ...veggie,
            stash: veggie.stash - ingredient.quantity
          };
        }
        return veggie;
      });
    });
    
    // Calculate actual processing time with speed upgrades
    const speedUpgrade = canningState.upgrades.find(u => u.id === 'canning_speed');
    const processingTime = Math.ceil(recipe.baseProcessingTime * (speedUpgrade?.effect || 1));
    
    const process: CanningProcess = {
      recipeId,
      startTime: Date.now(),
      remainingTime: processingTime,
      totalTime: processingTime,
      completed: false,
      automated
    };
    
    setCanningState(prev => ({
      ...prev,
      activeProcesses: [...prev.activeProcesses, process]
    }));
    
    return true;
  }, [canningState.recipes, canningState.activeProcesses, canningState.maxSimultaneousProcesses, canningState.upgrades, canMakeRecipe, setVeggies]);
  
  // Complete a canning process
  const completeCanning = useCallback((processIndex: number): void => {
    const process = canningState.activeProcesses[processIndex];
    if (!process) return;
    
    const recipe = canningState.recipes.find(r => r.id === process.recipeId);
    if (!recipe) return;
    
    // Calculate sale price with efficiency upgrades
    const efficiencyUpgrade = canningState.upgrades.find(u => u.id === 'canning_efficiency');
    const qualityUpgrade = canningState.upgrades.find(u => u.id === 'preservation_mastery');
    
    // Calculate better seeds multiplier for this recipe
    const getBetterSeedsMultiplier = () => {
      if (recipe.ingredients.length === 0) return 1;
      
      // Calculate average better seeds level of all ingredients
      const totalBetterSeedsLevel = recipe.ingredients.reduce((sum, ingredient) => {
        const veggie = veggies.find(v => v.name === ingredient.veggieName);
        return sum + (veggie?.betterSeedsLevel || 0);
      }, 0);
      
      const averageBetterSeedsLevel = totalBetterSeedsLevel / recipe.ingredients.length;
      
      // Apply a more moderate bonus than raw veggies (1.25x per level instead of 1.5x)
      // This keeps canning competitive but not overpowered
      return Math.pow(heirloomOwned ? 1.5 : 1.25, averageBetterSeedsLevel);
    };
    
    const basePrice = recipe.baseSalePrice * (efficiencyUpgrade?.effect || 1) * getBetterSeedsMultiplier();
    
    // Check for bonus production
    const bonusChance = qualityUpgrade?.effect || 0;
    const bonusItems = Math.random() * 100 < bonusChance ? 1 : 0;
    const totalItems = 1 + bonusItems;
    
    const totalEarnings = basePrice * totalItems;
    
    // Calculate knowledge reward based on recipe complexity
    // Base: 2 knowledge per ingredient, with bonus items giving extra knowledge
    // Automated processes give 1/10th knowledge to balance automation convenience
    const baseKnowledgeReward = (recipe.ingredients.length * 2) * totalItems;
    const knowledgeReward = process.automated ? Math.ceil(baseKnowledgeReward / 10) : baseKnowledgeReward;
    
    // Calculate canning experience reward
    // Automated processes give 1/10th canning experience to balance automation convenience
    const baseCanningExperience = (recipe.ingredients.length * 10) * totalItems;
    const canningExperienceReward = process.automated ? Math.ceil(baseCanningExperience / 10) : baseCanningExperience;
    
    // Add money and knowledge
    setMoney(prev => prev + totalEarnings);
    setKnowledge(prev => prev + knowledgeReward);
    
    // Remove completed process
    setCanningState(prev => ({
      ...prev,
      activeProcesses: prev.activeProcesses.filter((_, index) => index !== processIndex),
      totalItemsCanned: prev.totalItemsCanned + totalItems,
      canningExperience: prev.canningExperience + canningExperienceReward,
      recipes: prev.recipes.map(r => 
        r.id === recipe.id 
          ? { ...r, timesCompleted: r.timesCompleted + 1 }
          : r
      )
    }));
  }, [canningState.activeProcesses, canningState.recipes, canningState.upgrades, setMoney, setKnowledge]);
  
  // Purchase a canning upgrade
  const purchaseUpgrade = useCallback((upgradeId: string): boolean => {
    const upgrade = canningState.upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return false;
    
    if (upgrade.maxLevel && upgrade.level >= upgrade.maxLevel) return false;
    
    const canAfford = upgrade.costCurrency === 'money' 
      ? money >= upgrade.cost 
      : knowledge >= upgrade.cost;
    
    if (!canAfford) return false;
    
    // Deduct cost
    if (upgrade.costCurrency === 'money') {
      setMoney(prev => prev - upgrade.cost);
    } else {
      setKnowledge(prev => prev - upgrade.cost);
    }
    
    // Update upgrade
    setCanningState(prev => {
      const updatedUpgrades = prev.upgrades.map(u => 
        u.id === upgradeId 
          ? { ...u, level: u.level + 1 }
          : u
      );
      
      const upgradesWithEffects = updateUpgradeEffects(updatedUpgrades);
      const upgradesWithCosts = updateUpgradeCosts(upgradesWithEffects);
      
      // Update max simultaneous processes if needed
      const simultaneousUpgrade = upgradesWithCosts.find(u => u.id === 'simultaneous_processing');
      const maxProcesses = 1 + (simultaneousUpgrade?.effect || 0);
      
      return {
        ...prev,
        upgrades: upgradesWithCosts,
        maxSimultaneousProcesses: maxProcesses
      };
    });
    
    return true;
  }, [canningState.upgrades, money, knowledge, setMoney, setKnowledge, updateUpgradeEffects, updateUpgradeCosts]);
  
  // Process timer updates for active canning
  useEffect(() => {
    if (canningState.activeProcesses.length === 0) return;
    
    const interval = setInterval(() => {
      setCanningState(prev => {
        const updatedProcesses = prev.activeProcesses.map(process => {
          const newRemainingTime = Math.max(0, process.remainingTime - 1);
          return {
            ...process,
            remainingTime: newRemainingTime,
            completed: newRemainingTime <= 0
          };
        });
        
        return {
          ...prev,
          activeProcesses: updatedProcesses
        };
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [canningState.activeProcesses.length]);

  // Handle completed processes in a separate effect to avoid race conditions
  useEffect(() => {
    const completedProcesses = canningState.activeProcesses
      .map((process, index) => ({ process, index }))
      .filter(({ process }) => process.completed);

    if (completedProcesses.length > 0) {
      // Process completions in the next tick to avoid state conflicts
      const timeout = setTimeout(() => {
        // Complete processes in reverse order to maintain correct indices
        completedProcesses
          .reverse()
          .forEach(({ index }) => completeCanning(index));
      }, 50);
      
      return () => clearTimeout(timeout);
    }
  }, [canningState.activeProcesses, completeCanning]);
  
  // Extract canner state for stable dependencies
  const cannerUpgrade = canningState.upgrades.find(u => u.id === 'canner');
  const cannerLevel = cannerUpgrade?.level || 0;
  const autoCanningEnabled = canningState.autoCanning.enabled;
  const unlockedRecipeCount = canningState.recipes.filter(r => r.unlocked).length;

  // Function to sort recipes based on current sort preference
  const sortRecipes = useCallback((recipes: Recipe[]) => {
    // Helper functions to match CanningPanel logic
    const getBetterSeedsMultiplier = (recipe: Recipe) => {
      if (recipe.ingredients.length === 0) return 1;
      
      const totalBetterSeedsLevel = recipe.ingredients.reduce((sum, ingredient) => {
        const veggie = veggies.find(v => v.name === ingredient.veggieName);
        return sum + (veggie?.betterSeedsLevel || 0);
      }, 0);
      
      const averageBetterSeedsLevel = totalBetterSeedsLevel / recipe.ingredients.length;
      return Math.pow(heirloomOwned ? 1.5 : 1.25, averageBetterSeedsLevel);
    };

    const getEffectiveSalePrice = (recipe: Recipe) => {
      const efficiencyUpgrade = canningState.upgrades.find(u => u.id === 'canning_efficiency');
      const efficiencyMultiplier = efficiencyUpgrade?.effect || 1;
      return recipe.salePrice * efficiencyMultiplier * getBetterSeedsMultiplier(recipe);
    };

    const getRawValue = (recipe: Recipe) => {
      return recipe.ingredients.reduce((sum, ing) => {
        const veggie = veggies.find(v => v.name === ing.veggieName);
        return sum + (veggie?.salePrice || 0) * ing.quantity;
      }, 0);
    };

    const getProfit = (recipe: Recipe) => {
      return getEffectiveSalePrice(recipe) - getRawValue(recipe);
    };

    return [...recipes].sort((a, b) => {
      switch (recipeSort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'profit': {
          const profitA = getProfit(a);
          const profitB = getProfit(b);
          return profitB - profitA; // Descending (higher profit first)
        }
        case 'time':
          return a.processingTime - b.processingTime; // Ascending (faster first)
        case 'difficulty':
          return b.ingredients.length - a.ingredients.length; // Descending (more ingredients first)
        default:
          return 0;
      }
    });
  }, [recipeSort, veggies, canningState.upgrades]);

  // Auto-canning timer - runs every 10 seconds when Canner upgrade is purchased and enabled
  useEffect(() => {
    const cannerEnabled = cannerLevel > 0 && autoCanningEnabled;
    
    console.log('Auto-canning effect triggered:', {
      cannerLevel,
      autoCanningEnabled,
      cannerEnabled
    });
    
    if (!cannerEnabled) return;
    
    const autoCanningInterval = setInterval(() => {
      console.log('Auto-canning interval triggered');
      
      // Use a fresh state getter to avoid stale closures
      setCanningState(currentState => {
        const currentActiveProcesses = currentState.activeProcesses.length;
        const currentMaxProcesses = currentState.maxSimultaneousProcesses;
        
        console.log('Auto-canning: Process check', {
          currentActiveProcesses,
          currentMaxProcesses,
          hasSlots: currentActiveProcesses < currentMaxProcesses
        });
        
        // Only try to start new processes if we have available slots
        if (currentActiveProcesses < currentMaxProcesses) {
          // Get unlocked recipes first
          const unlockedRecipes = currentState.recipes.filter(recipe => recipe.unlocked);
          
          console.log('Auto-canning: Unlocked recipes', unlockedRecipes.map(r => r.name));
          
          // Sort recipes according to current preference
          const sortedRecipes = sortRecipes(unlockedRecipes);
          
          console.log('Auto-canning: Sorted recipes', sortedRecipes.map(r => r.name));
          
          // Find the first recipe that we can actually make (has enough ingredients)
          // Use current veggie state from ref to avoid stale closure issues
          let recipeToStart = null;
          for (const recipe of sortedRecipes) {
            // Check if we have enough ingredients using current veggie state
            const hasIngredients = recipe.ingredients.every(ingredient => {
              const veggie = currentVeggiesRef.current[ingredient.veggieIndex];
              return veggie && veggie.stash >= ingredient.quantity;
            });
            
            if (hasIngredients) {
              recipeToStart = recipe;
              break;
            }
          }
          
          if (recipeToStart) {
            console.log('Auto-canning: Found recipe with resources:', recipeToStart.name);
            // Start the recipe that has enough ingredients
            setTimeout(() => {
              const success = startCanning(recipeToStart.id, true);
              console.log('Auto-canning: Start result', success);
            }, 0);
          } else {
            console.log('Auto-canning: No recipes have enough ingredients');
          }
        } else {
          console.log('Auto-canning: All process slots full');
        }
        
        return currentState; // Return unchanged state
      });
    }, 10000); // 10 seconds
    
    console.log('Auto-canning timer started');
    return () => {
      console.log('Auto-canning timer stopped');
      clearInterval(autoCanningInterval);
    };
  }, [cannerLevel, autoCanningEnabled, unlockedRecipeCount]);
  
  // Get available recipes (unlocked and can make)
  const getAvailableRecipes = useCallback(() => {
    return canningState.recipes.filter(recipe => 
      recipe.unlocked && canMakeRecipe(recipe)
    );
  }, [canningState.recipes, canMakeRecipe]);
  
  // Get recipe profit analysis
  const getRecipeAnalysis = useCallback((recipe: Recipe) => {
    return calculateRecipeProfit(
      {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        ingredients: recipe.ingredients.map(ing => ({
          veggieName: ing.veggieName,
          quantity: ing.quantity
        })),
        baseProcessingTime: recipe.baseProcessingTime,
        baseSalePrice: recipe.baseSalePrice,
        experienceRequired: recipe.experienceRequired,
        category: 'simple' // Default category
      },
      veggies
    );
  }, [veggies]);
  
  // Toggle auto-canning enabled state
  const toggleAutoCanning = useCallback(() => {
    setCanningState(prev => ({
      ...prev,
      autoCanning: {
        ...prev.autoCanning,
        enabled: !prev.autoCanning.enabled
      }
    }));
  }, []);

  return {
    canningState,
    startCanning,
    completeCanning,
    purchaseUpgrade,
    canMakeRecipe,
    getAvailableRecipes,
    getRecipeAnalysis,
    toggleAutoCanning
  };
}