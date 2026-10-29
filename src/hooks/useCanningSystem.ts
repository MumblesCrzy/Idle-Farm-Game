import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { 
  CanningState, 
  Recipe, 
  CanningProcess, 
  CanningUpgrade,
  CanningIngredient 
} from '../types/canning';
import { INITIAL_RECIPES, calculateRecipeProfit } from '../data/recipes';
import { useGameTick } from './useGameClock';
import { useLatestRef } from './useLatestRef';
import { useStableCallback } from './useStableCallback';
import { sortRecipesByPreference, type RecipeValueContext, filterRecipesByCategory } from '../utils/recipeHelpers';
import { useDeferredEffects } from './useDeferredEffects';
import { GAME_STEP_MS } from '../utils/gameClock';
import { machineSpeed } from '../utils/stanley';
import { ADDITIVES_UPGRADE, getOfflineCapMs, isEngineer, withAdditives, withoutHotTip } from '../utils/guildCalculations';
import {
  CANNER_INTERVAL_STEPS,
  FLOOR_CHECK_STEPS,
  assignMachines,
  floorMachines,
  getBatchRewards,
  getBatchTime,
  hasIngredients,
  pickRecipeToStart,
  planFloorStarts,
  seededRandom,
  shortOf,
  simulateCanning,
  type CanningCatchUp,
  type FloorStart,
  type HoneyStock
} from '../utils/canningSimulation';

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
    upgradeCostScaling: 2.3,
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
    upgradeCostScaling: 1.8,
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
    upgradeCostScaling: 1.8,
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
    upgradeCostScaling: 2.0,
    costCurrency: 'money',
    maxLevel: 15, // 16 slots: four full rows on the stove
    effect: 1, // Number of additional simultaneous processes
    unlocked: true
  },
  {
    id: 'canner',
    name: 'Canner',
    description: 'Automatically starts canning processes every 10 seconds (gives reduced knowledge)',
    type: 'automation',
    level: 0,
    cost: 10000,
    baseCost: 10000,
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

import type { GuildState } from '../types/guilds';

/** Each upgrade's effect at its level */
function withEffects(upgrades: CanningUpgrade[]): CanningUpgrade[] {
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
}

/** Each upgrade's next cost at its level */
function withCosts(upgrades: CanningUpgrade[]): CanningUpgrade[] {
  return upgrades.map(upgrade => ({
    ...upgrade,
    cost: Math.ceil(upgrade.baseCost * Math.pow(upgrade.upgradeCostScaling, upgrade.level))
  }));
}

/**
 * A saved canning state with today's upgrade rules: names, costs and max levels come from the
 * definitions, and only each upgrade's level from the save. Saves keep whole upgrades, so this
 * is how a raised max level, like Batch Canning's 15th, reaches existing games.
 */
function withCurrentUpgradeRules(state: CanningState): CanningState {
  const levels = new Map((state.upgrades ?? []).map(upgrade => [upgrade.id, upgrade.level]));
  const upgrades = INITIAL_CANNING_UPGRADES.map(definition => ({ ...definition, level: levels.get(definition.id) ?? 0 }));
  return { ...state, upgrades: withCosts(withEffects(upgrades)) };
}
import type { BatchCount } from '../utils/guildCalculations';

// The recipe checks, made outside the hook so each function holds only its own inputs: one made
// inside would hold the whole scope of the render that made it, and old renders with it
const canMakeWith = (crops: Parameters<typeof hasIngredients>[1], honey: HoneyStock) =>
  (recipe: Recipe): boolean => hasIngredients(recipe, crops, honey);
const sortWith = (recipeSort: Parameters<typeof sortRecipesByPreference>[1], context: RecipeValueContext) =>
  (recipes: Recipe[]) => sortRecipesByPreference(recipes, recipeSort, context);

// Hook for managing canning system state and logic
export function useCanningSystem<T extends {name: string, stash: number, salePrice: number, betterSeedsLevel?: number}>(
  // experience: number, // Unused parameter
  veggies: T[],
  setVeggies: React.Dispatch<React.SetStateAction<T[]>>,
  heirloomOwned: boolean,
  money: number,
  setMoney: (value: number | ((prev: number) => number)) => void,
  knowledge: number,
  setKnowledge: (value: number | ((prev: number) => number)) => void,
  initialCanningState?: CanningState,
  recipeSort: 'name' | 'profit' | 'time' | 'difficulty' = 'profit',
  farmTier?: number,
  regularHoney?: number,
  goldenHoney?: number,
  totalHoneyCollected?: number,
  setRegularHoney?: (value: number | ((prev: number) => number)) => void,
  setGoldenHoney?: (value: number | ((prev: number) => number)) => void,
  unlockedAchievementIds?: string[],
  guildState?: GuildState,
  isPaused?: boolean,
  onGoodsCanned?: (count: number) => void,
  /** Finished batches by who started them, with Prize Jars, for the Preservers' Wax Seals */
  onBatchesFinished?: (batches: BatchCount) => void,
  /** Bee upgrades owned: Honey Jars opens the honey jar recipes */
  ownedBeeUpgrades?: readonly string[],
  /** A factory floor machine ran short of an ingredient and is waiting for it */
  onMachineWaiting?: (machine: number, recipeName: string, short: string) => void
) {
  const [canningState, setCanningState] = useState<CanningState>(() => (
    initialCanningState ? withCurrentUpgradeRules(initialCanningState) : INITIAL_CANNING_STATE
  ));

  // Latest committed canning state, for the game-step callbacks
  const canningStateRef = useLatestRef(canningState);
  
  // Ref to always have access to current veggie state in callbacks
  const currentVeggiesRef = useRef(veggies);
  currentVeggiesRef.current = veggies;

  // Latest guild state, for batch times and payouts
  const guildStateRef = useRef(guildState);
  guildStateRef.current = guildState;

  // Committed Engineers run a factory floor instead of a kitchen (Industrial Canning, Hands Off)
  const onFloor = isEngineer(guildState);
  const onFloorRef = useLatestRef(onFloor);

  // Guild upgrades decide which recipes exist and what they take: the Cellar recipes need Cellar
  // Recipes, and Additives cut each crop by one, bought this Legacy or kept from an earlier one.
  // One string, so the list is rebuilt only when the set changes.
  const ownedGuildUpgradesKey = guildState
    ? [...guildState.purchasedUpgrades, ...(guildState.legacy?.keptUnlocks ?? [])].join('|')
    : '';
  // Bee upgrades do the same for the honey jars, which need Honey Jars from the Bees tab
  const ownedBeeUpgradesKey = (ownedBeeUpgrades ?? []).join('|');
  
  // Build the recipe list from configuration. It runs whenever the crops change, every game
  // step, so it keeps how many times each recipe was made.
  useEffect(() => {
    setCanningState(prev => {
      const completed = new Map(prev.recipes.map(recipe => [recipe.id, recipe.timesCompleted]));
      const ownedGuildUpgrades = new Set(ownedGuildUpgradesKey.split('|'));
      const beeUpgradesOwned = new Set(ownedBeeUpgradesKey.split('|'));
      const additives = ownedGuildUpgrades.has(ADDITIVES_UPGRADE);
      const available = INITIAL_RECIPES.filter(config =>
        (!config.requiredGuildUpgrade || ownedGuildUpgrades.has(config.requiredGuildUpgrade)) &&
        (!config.requiredBeeUpgrade || beeUpgradesOwned.has(config.requiredBeeUpgrade)));
      const recipes: Recipe[] = available.map(config => {
        const ingredients: CanningIngredient[] = config.ingredients.map(ing => {
          const veggieIndex = veggies.findIndex(v => v.name === ing.veggieName);
          return {
            veggieIndex,
            veggieName: ing.veggieName,
            quantity: withAdditives(ing.quantity, additives)
          };
        });
        
        // First recipe unlocks with farm tier 3+, others with canning experience
        const isFirstRecipe = config.id === 'canned_radish';
        
        // Check if this is a honey recipe
        const isHoneyRecipe = !!config.honeyRequirement;
        
        // Check if required achievement is unlocked (if one is required)
        const achievementCheck = !config.requiredAchievementId || 
          (unlockedAchievementIds || []).includes(config.requiredAchievementId);
        
        // For honey recipes, also check honey collected requirement
        let unlocked: boolean;
        if (isHoneyRecipe) {
          const honeyUnlocked = (totalHoneyCollected || 0) >= (config.honeyCollectedRequired || 0);
          unlocked = achievementCheck && honeyUnlocked && (
            isFirstRecipe 
              ? (farmTier || 1) >= 3
              : prev.canningExperience >= config.experienceRequired
          );
        } else {
          unlocked = achievementCheck && (isFirstRecipe 
            ? (farmTier || 1) >= 3
            : prev.canningExperience >= config.experienceRequired);
        }
        
        return {
          id: config.id,
          name: config.name,
          description: config.description,
          ingredients,
          honeyRequirement: config.honeyRequirement,
          tier: config.tier,
          honeyCollectedRequired: config.honeyCollectedRequired,
          processingTime: config.baseProcessingTime,
          baseProcessingTime: config.baseProcessingTime,
          salePrice: config.baseSalePrice,
          baseSalePrice: config.baseSalePrice,
          experienceRequired: config.experienceRequired,
          requiredAchievementId: config.requiredAchievementId,
          requiredGuildUpgrade: config.requiredGuildUpgrade,
          requiredBeeUpgrade: config.requiredBeeUpgrade,
          unlocked,
          timesCompleted: completed.get(config.id) ?? 0
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
  }, [veggies, farmTier, totalHoneyCollected, unlockedAchievementIds, ownedGuildUpgradesKey, ownedBeeUpgradesKey]); // Watch farmTier instead of experience for first recipe unlock
  
  // Update recipe unlocks based on canning experience and farm tier
  useEffect(() => {
    setCanningState(prev => {
      const updatedRecipes = prev.recipes.map(recipe => {
        // First recipe unlocks with farm tier 3+, others with canning experience
        const isFirstRecipe = recipe.id === 'canned_radish';
        
        // Check if this is a honey recipe
        const isHoneyRecipe = !!recipe.honeyRequirement;
        
        // Check if required achievement is unlocked (if one is required)
        const achievementCheck = !recipe.requiredAchievementId || 
          (unlockedAchievementIds || []).includes(recipe.requiredAchievementId);
        
        let unlocked: boolean;
        if (isHoneyRecipe) {
          const honeyUnlocked = (totalHoneyCollected || 0) >= (recipe.honeyCollectedRequired || 0);
          unlocked = achievementCheck && honeyUnlocked && (
            isFirstRecipe 
              ? (farmTier || 1) >= 3
              : prev.canningExperience >= recipe.experienceRequired
          );
        } else {
          unlocked = achievementCheck && (isFirstRecipe 
            ? (farmTier || 1) >= 3
            : prev.canningExperience >= recipe.experienceRequired);
        }
        
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
  }, [farmTier, canningState.canningExperience, totalHoneyCollected, unlockedAchievementIds]); // Watch farmTier, honey collected, and achievements

  // Note: Canning state is now preserved across farm tier upgrades
  // The reset logic has been removed to maintain player progress
  
  // Check if player has enough ingredients for a recipe
  const canMakeRecipe = useMemo(
    () => canMakeWith(veggies, { regular: regularHoney || 0, golden: goldenHoney || 0 }),
    [veggies, regularHoney, goldenHoney]
  );
  
  // Start a canning process
  const startCanning = useCallback((recipeId: string, automated: boolean = false): boolean => {
    // Hands Off: on the factory floor the machines do the canning
    if (!automated && onFloorRef.current) return false;
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
    
    // Consume honey if required
    if (recipe.honeyRequirement) {
      if (recipe.honeyRequirement.regular > 0 && setRegularHoney) {
        setRegularHoney(prev => prev - recipe.honeyRequirement!.regular);
      }
      if (recipe.honeyRequirement.golden > 0 && setGoldenHoney) {
        setGoldenHoney(prev => prev - recipe.honeyRequirement!.golden);
      }
    }
    
    // Calculate actual processing time with speed upgrades and the guild's
    const processingTime = getBatchTime(recipe, canningState.upgrades, guildStateRef.current);
    
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
    
    // Call event logging callback if available
    const globalCanningStartCallback = window.globalCanningStartCallback;
    if (globalCanningStartCallback) {
      const ingredientsList = recipe.ingredients
        .map(ing => `${ing.quantity} ${ing.veggieName}`)
        .join(', ');
      globalCanningStartCallback(recipe.name, ingredientsList, processingTime, automated);
    }
    
    return true;
  }, [canningState.recipes, canningState.activeProcesses, canningState.maxSimultaneousProcesses, canningState.upgrades, canMakeRecipe, setVeggies, setRegularHoney, setGoldenHoney, onFloorRef]);
  
  // Complete a canning process
  // Refs to avoid stale closures in completeCanning
  const heirloomOwnedRef = useRef(heirloomOwned);
  heirloomOwnedRef.current = heirloomOwned;
  
  const onGoodsCannedRef = useLatestRef(onGoodsCanned);
  const onBatchesFinishedRef = useLatestRef(onBatchesFinished);
  
  const completeCanning = useStableCallback((processIndex: number): void => {
    const process = canningState.activeProcesses[processIndex];
    if (!process) return;
    
    const recipe = canningState.recipes.find(r => r.id === process.recipeId);
    if (!recipe) return;
    
    // Price, bonus item, knowledge and canning experience for this batch
    const {
      money: totalEarnings,
      knowledge: knowledgeReward,
      experience: canningExperienceReward,
      items: totalItems,
      prize
    } = getBatchRewards(
      recipe,
      process.automated ?? false,
      canningState.upgrades,
      currentVeggiesRef.current,
      heirloomOwnedRef.current,
      guildStateRef.current
    );
    
    // Add money and knowledge
    setMoney(prev => prev + totalEarnings);
    setKnowledge(prev => prev + knowledgeReward);
    onGoodsCannedRef.current?.(totalItems);
    const automated = process.automated ?? false;
    onBatchesFinishedRef.current?.({ manual: automated ? 0 : 1, automated: automated ? 1 : 0, prizes: prize && !automated ? 1 : 0 });
    
    // Call event logging callback if available
    const globalCanningCompleteCallback = window.globalCanningCompleteCallback;
    if (globalCanningCompleteCallback) {
      globalCanningCompleteCallback(recipe.name, totalEarnings, knowledgeReward, totalItems, process.automated ?? false);
    }
    
    // Remove completed process; a factory floor machine counts the jars it made
    const machine = process.machine;
    setCanningState(prev => ({
      ...prev,
      activeProcesses: prev.activeProcesses.filter((_, index) => index !== processIndex),
      totalItemsCanned: prev.totalItemsCanned + totalItems,
      canningExperience: prev.canningExperience + canningExperienceReward,
      recipes: prev.recipes.map(r => (r.id === recipe.id ? { ...r, timesCompleted: r.timesCompleted + 1 } : r)),
      ...(machine !== undefined && prev.machines ? {
        machines: prev.machines.map((m, index) => (index === machine ? { ...m, jarsMade: m.jarsMade + totalItems } : m)),
        floorBatches: (prev.floorBatches ?? 0) + 1
      } : {})
    }));
  });
  
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
      
      const upgradesWithCosts = withCosts(withEffects(updatedUpgrades));
      
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
  }, [canningState.upgrades, money, knowledge, setMoney, setKnowledge]);
  
  // Hidden-tab catch-up. The game clock stops while the tab is hidden and every system
  // credits that time when the player returns. Canning runs the missed steps on the next
  // step: batches count down and pay out, and the Canner keeps starting batches while the
  // stash allows.
  const pendingCatchUpStepsRef = useRef(0);
  const isPausedRef = useLatestRef(isPaused ?? false);
  const honeyRef = useLatestRef<HoneyStock>({ regular: regularHoney || 0, golden: goldenHoney || 0 });
  const scheduleAfterCommit = useDeferredEffects();

  useEffect(() => {
    let hiddenAt: number | null = document.hidden ? Date.now() : null;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt === null) return;
      const hiddenSteps = Math.floor((Date.now() - hiddenAt) / GAME_STEP_MS);
      hiddenAt = null;
      if (isPausedRef.current || hiddenSteps < 1) return;
      const maxSteps = getOfflineCapMs(guildStateRef.current) / GAME_STEP_MS;
      pendingCatchUpStepsRef.current = Math.min(pendingCatchUpStepsRef.current + hiddenSteps, maxSteps);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPausedRef]);

  // Pays what a catch-up finished and spends what the Canner used
  const applyCatchUp = (result: CanningCatchUp) => {
    const { cropsUsed, honeyUsed, rewards } = result;
    if (Object.keys(cropsUsed).length > 0) {
      setVeggies(prev => prev.map(veggie => (
        cropsUsed[veggie.name] ? { ...veggie, stash: Math.max(0, veggie.stash - cropsUsed[veggie.name]) } : veggie
      )));
    }
    if (honeyUsed.regular > 0) setRegularHoney?.(prev => prev - honeyUsed.regular);
    if (honeyUsed.golden > 0) setGoldenHoney?.(prev => prev - honeyUsed.golden);
    if (rewards.money > 0) setMoney(prev => prev + rewards.money);
    if (rewards.knowledge > 0) setKnowledge(prev => prev + rewards.knowledge);
    if (rewards.items > 0) onGoodsCannedRef.current?.(rewards.items);
    if (result.batchCount.manual + result.batchCount.automated > 0) onBatchesFinishedRef.current?.(result.batchCount);
    const logBatches = window.globalCanningCompleteCallback;
    if (logBatches) {
      result.finished.forEach(batches => logBatches(
        `${batches.batches}x ${batches.recipe.name} while away`, batches.money, batches.knowledge, batches.items, batches.automated
      ));
    }
  };

  // Runs missed steps in one state update; the payouts follow the commit. The rolls are
  // seeded so a re-run of the updater makes the same ones.
  const catchUp = (steps: number) => {
    const key = {};
    const seed = Math.floor(Math.random() * 2 ** 32);
    setCanningState(prev => {
      // On the factory floor the machines start batches, and the Canner stays off
      const floor = onFloorRef.current && !!prev.machines;
      const cannerOn = !floor && (prev.upgrades.find(u => u.id === 'canner')?.level || 0) > 0 && prev.autoCanning.enabled;
      if (prev.activeProcesses.length === 0 && !cannerOn && !floor) {
        scheduleAfterCommit(key, undefined);
        return prev;
      }
      const result = simulateCanning(steps, {
        state: prev,
        crops: currentVeggiesRef.current,
        honey: honeyRef.current,
        sortedRecipes: sortRecipes(prev.recipes.filter(recipe => recipe.unlocked)),
        cannerOn,
        floor,
        heirloomOwned: heirloomOwnedRef.current,
        // Batches finished while away pay their usual value, even if a Hot Tip was running
        guildState: withoutHotTip(guildStateRef.current),
        random: seededRandom(seed)
      });
      scheduleAfterCommit(key, () => applyCatchUp(result));
      const batchesByRecipe = new Map<string, number>();
      result.finished.forEach(f => batchesByRecipe.set(f.recipe.id, (batchesByRecipe.get(f.recipe.id) ?? 0) + f.batches));
      return {
        ...prev,
        activeProcesses: result.activeProcesses,
        totalItemsCanned: prev.totalItemsCanned + result.rewards.items,
        canningExperience: prev.canningExperience + result.rewards.experience,
        machines: prev.machines?.map((m, index) => (result.machineJars[index] ? { ...m, jarsMade: m.jarsMade + result.machineJars[index] } : m)),
        floorBatches: (prev.floorBatches ?? 0) + result.floorBatches,
        recipes: prev.recipes.map(recipe => {
          const batches = batchesByRecipe.get(recipe.id);
          return batches ? { ...recipe, timesCompleted: recipe.timesCompleted + batches } : recipe;
        })
      };
    });
  };

  // Count down active canning jobs, one game step per second
  const hasActiveProcesses = canningState.activeProcesses.length > 0;

  useGameTick(() => {
    if (isPaused) return;

    // Hidden time comes first, once no finished batch is waiting to be paid
    const missedSteps = pendingCatchUpStepsRef.current;
    if (missedSteps > 0 && !canningStateRef.current.activeProcesses.some(process => process.completed)) {
      pendingCatchUpStepsRef.current = 0;
      catchUp(missedSteps + 1); // this step included
      return;
    }

    if (!hasActiveProcesses) return;
    
    // Stanley's Tune-Up runs the Canner's batches twice as fast; hand-started ones keep their pace
    const cannerStep = machineSpeed(guildStateRef.current);
    setCanningState(prev => {
      const updatedProcesses = prev.activeProcesses.map(process => {
        const newRemainingTime = Math.max(0, process.remainingTime - (process.automated ? cannerStep : 1));
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
  }, { order: 60 });

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

  const efficiencyUpgrade = canningState.upgrades.find(u => u.id === 'canning_efficiency');
  const efficiencyMultiplier = efficiencyUpgrade?.effect || 1;

  const recipeValueContext = useMemo<RecipeValueContext>(() => ({
    veggies,
    heirloomOwned,
    efficiencyMultiplier,
    guildState
  }), [veggies, heirloomOwned, efficiencyMultiplier, guildState]);

  const sortRecipes = useMemo(() => sortWith(recipeSort, recipeValueContext), [recipeSort, recipeValueContext]);


  // Auto-canning timer - runs every 10 seconds when Canner upgrade is purchased and enabled
  const cannerEnabled = cannerLevel > 0 && autoCanningEnabled;
  
  useGameTick(() => {
    if (isPaused) return;
    if (!cannerEnabled) return;
    // The factory floor replaces the Canner
    if (onFloorRef.current) return;
    
    // Read the latest committed state; starting a job is a normal state update
    const currentState = canningStateRef.current;

    // Only try to start new processes if we have available slots
    if (currentState.activeProcesses.length >= currentState.maxSimultaneousProcesses) return;

    // Sort unlocked recipes according to current preference
    const sortedRecipes = sortRecipes(currentState.recipes.filter(recipe => recipe.unlocked));

    // Start the first recipe the stash, and honey for honey recipes, covers
    const recipeToStart = pickRecipeToStart(sortedRecipes, currentVeggiesRef.current, honeyRef.current);
    if (recipeToStart) {
      startCanning(recipeToStart.id, true);
    }
  }, { every: CANNER_INTERVAL_STEPS, order: 70 });
  
  // The Engineers' factory floor: a machine for every stove slot. Joining sets it up with the
  // first unlocked recipes in the player's order; Batch Canning adds machines with none.
  const sortRecipesRef = useLatestRef(sortRecipes);
  useEffect(() => {
    if (!onFloor) return;
    setCanningState(prev => {
      if (prev.recipes.length === 0) return prev;
      const sorted = sortRecipesRef.current(prev.recipes.filter(recipe => recipe.unlocked));
      const machines = floorMachines(prev, sorted, currentVeggiesRef.current, honeyRef.current);
      const activeProcesses = assignMachines(prev.activeProcesses, machines.length);
      const unchanged = prev.machines?.length === machines.length
        && activeProcesses.every((process, index) => process === prev.activeProcesses[index]);
      return unchanged ? prev : { ...prev, machines, activeProcesses };
    });
  }, [onFloor, canningState.maxSimultaneousProcesses, canningState.recipes.length, sortRecipesRef, honeyRef]);

  // Starts planned batches: the hopper pays their ingredients and each machine gets its batch
  const startFloorBatches = (starts: FloorStart[]) => {
    const cropsUsed: Record<string, number> = {};
    const honeyUsed: HoneyStock = { regular: 0, golden: 0 };
    for (const { recipe } of starts) {
      for (const ingredient of recipe.ingredients) {
        cropsUsed[ingredient.veggieName] = (cropsUsed[ingredient.veggieName] ?? 0) + ingredient.quantity;
      }
      honeyUsed.regular += recipe.honeyRequirement?.regular ?? 0;
      honeyUsed.golden += recipe.honeyRequirement?.golden ?? 0;
    }
    setVeggies(prev => prev.map(veggie => (
      cropsUsed[veggie.name] ? { ...veggie, stash: veggie.stash - cropsUsed[veggie.name] } : veggie
    )));
    if (honeyUsed.regular > 0) setRegularHoney?.(prev => prev - honeyUsed.regular);
    if (honeyUsed.golden > 0) setGoldenHoney?.(prev => prev - honeyUsed.golden);
    const upgrades = canningStateRef.current.upgrades;
    const batches: CanningProcess[] = starts.map(({ machine, recipe }) => {
      const time = getBatchTime(recipe, upgrades, guildStateRef.current);
      return { recipeId: recipe.id, startTime: Date.now(), remainingTime: time, totalTime: time, completed: false, automated: true, machine };
    });
    setCanningState(prev => ({ ...prev, activeProcesses: [...prev.activeProcesses, ...batches] }));
  };

  // Each game step, free machines start their recipes while the hopper has them. A machine
  // waiting for stock looks every other step, or every step during Stanley's Tune-Up.
  const floorWaitingRef = useRef<ReadonlySet<number>>(new Set());
  const floorStepRef = useRef(0);
  const onMachineWaitingRef = useLatestRef(onMachineWaiting);
  useGameTick(() => {
    if (isPaused || !onFloorRef.current) return;
    const state = canningStateRef.current;
    if (!state.machines || pendingCatchUpStepsRef.current > 0) return;
    floorStepRef.current += 1;
    const plan = planFloorStarts({
      machines: state.machines,
      processes: state.activeProcesses,
      recipes: state.recipes,
      crops: currentVeggiesRef.current,
      honey: honeyRef.current,
      waiting: floorWaitingRef.current,
      checkWaiting: machineSpeed(guildStateRef.current) > 1 || floorStepRef.current % FLOOR_CHECK_STEPS === 0
    });
    // Said once, when a machine starts waiting
    plan.waiting.forEach(machine => {
      if (floorWaitingRef.current.has(machine)) return;
      const recipe = state.recipes.find(r => r.id === state.machines?.[machine]?.recipeId);
      const short = recipe ? shortOf(recipe, currentVeggiesRef.current, honeyRef.current) : null;
      if (recipe && short) onMachineWaitingRef.current?.(machine, recipe.name, short);
    });
    floorWaitingRef.current = plan.waiting;
    if (plan.starts.length > 0) startFloorBatches(plan.starts);
  }, { order: 65 });

  // The player sets a machine's recipe, or clears it. A batch it is running finishes as it
  // was, and the machine looks at the hopper for its new recipe on the next step.
  const setMachineRecipe = useCallback((machine: number, recipeId: string | null) => {
    setCanningState(prev => (prev.machines?.[machine]
      ? { ...prev, machines: prev.machines.map((m, index) => (index === machine ? { recipeId, jarsMade: 0 } : m)) }
      : prev));
    const waiting = new Set(floorWaitingRef.current);
    waiting.delete(machine);
    floorWaitingRef.current = waiting;
  }, []);

  // Get available recipes (unlocked and can make)
  const getAvailableRecipes = useCallback(() => {
    return filterRecipesByCategory(canningState.recipes, 'all', canMakeRecipe, true);
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

  // Rush Batch (Preservers): every running batch finishes now, and the completion effect pays
  // them as usual. The caller charges the Wax Seals.
  const rushBatches = useCallback(() => {
    setCanningState(prev => ({
      ...prev,
      activeProcesses: prev.activeProcesses.map(process => (
        process.completed ? process : { ...process, remainingTime: 0, completed: true }
      ))
    }));
  }, []);

  // Reset canning state to initial values
  const resetCanningState = useCallback(() => {
    setCanningState(INITIAL_CANNING_STATE);
  }, []);

  return {
    canningState,
    startCanning,
    completeCanning,
    purchaseUpgrade,
    canMakeRecipe,
    getAvailableRecipes,
    getRecipeAnalysis,
    toggleAutoCanning,
    rushBatches,
    setMachineRecipe,
    resetCanningState
  };
}