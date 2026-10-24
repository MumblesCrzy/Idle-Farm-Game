import type { Recipe } from '../types/canning';
import type { RecipeFilter, RecipeSort } from '../types/game';
import type { GuildState } from '../types/guilds';
import { getJarsPerBatch, getRecipeValueMultiplier } from './guildCalculations';
import { getVeggieImage, ICON_GOLDEN_HONEY, ICON_HONEY } from '../config/assetPaths';

/** A recipe's ingredients as pictures: each crop, then honey and Golden Honey when it needs them */
export const recipeIcons = (recipe: Pick<Recipe, 'ingredients' | 'honeyRequirement'>): string[] => [
  ...recipe.ingredients.map(ingredient => getVeggieImage(ingredient.veggieName)),
  ...(recipe.honeyRequirement?.regular ? [ICON_HONEY] : []),
  ...(recipe.honeyRequirement?.golden ? [ICON_GOLDEN_HONEY] : [])
];

export type VeggieContext = {
  name: string;
  salePrice: number;
  betterSeedsLevel?: number;
};

export type RecipeValueContext = {
  veggies: VeggieContext[];
  heirloomOwned: boolean;
  efficiencyMultiplier?: number;
  /** Guild rules on canning value and jars; leave out for none */
  guildState?: GuildState;
};

/** The Preservers upgrade that opens the Cellar recipes */
export const CELLAR_RECIPES_UPGRADE = 'preservers_cellar_recipes';

export const filterRecipesByCategory = (
  recipes: Recipe[],
  recipeFilter: RecipeFilter,
  canMakeRecipe: (recipe: Recipe) => boolean,
  canMakeOnly: boolean = false
): Recipe[] => {
  let filtered = recipes.filter(recipe => recipe.unlocked);

  // Apply "Can Make" filter first if enabled
  if (canMakeOnly) {
    filtered = filtered.filter(recipe => canMakeRecipe(recipe));
  }

  // Then apply category filter
  switch (recipeFilter) {
    case 'simple':
      filtered = filtered.filter(recipe => recipe.ingredients.length <= 2);
      break;
    case 'complex':
      filtered = filtered.filter(recipe => {
        const totalIngredients = recipe.ingredients.length;
        return totalIngredients >= 3 && totalIngredients <= 4;
      });
      break;
    case 'gourmet':
      filtered = filtered.filter(recipe => recipe.ingredients.length >= 5);
      break;
    case 'honey':
      filtered = filtered.filter(recipe => !!recipe.honeyRequirement);
      break;
    case 'cellar':
      filtered = filtered.filter(recipe => recipe.requiredGuildUpgrade === CELLAR_RECIPES_UPGRADE);
      break;
    default:
      break;
  }

  return filtered;
};

export const getBetterSeedsMultiplier = (
  recipe: Recipe,
  context: RecipeValueContext
): number => {
  if (recipe.ingredients.length === 0) return 1;

  const totalBetterSeedsLevel = recipe.ingredients.reduce((sum, ingredient) => {
    const veggie = context.veggies.find(v => v.name === ingredient.veggieName);
    return sum + (veggie?.betterSeedsLevel || 0);
  }, 0);

  const averageBetterSeedsLevel = totalBetterSeedsLevel / recipe.ingredients.length;
  return Math.pow(context.heirloomOwned ? 1.5 : 1.25, averageBetterSeedsLevel);
};

/**
 * What one batch sells for: price, Family Recipe, Better Seeds, the guild's value rules and
 * the jars per batch. Heirloom Touch's chance of a bonus jar and Prize Jars are left out.
 */
export const getEffectiveSalePrice = (
  recipe: Recipe,
  context: RecipeValueContext
): number => {
  const efficiencyMultiplier = context.efficiencyMultiplier ?? 1;
  const jars = getJarsPerBatch(context.guildState);
  return recipe.salePrice * efficiencyMultiplier * getBetterSeedsMultiplier(recipe, context)
    * getRecipeValueMultiplier(context.guildState, recipe) * jars;
};

export const getRawIngredientValue = (
  recipe: Recipe,
  context: RecipeValueContext
): number => {
  return recipe.ingredients.reduce((sum, ing) => {
    const veggie = context.veggies.find(v => v.name === ing.veggieName);
    return sum + (veggie?.salePrice || 0) * ing.quantity;
  }, 0);
};

export const getRecipeProfit = (
  recipe: Recipe,
  context: RecipeValueContext
): number => {
  return getEffectiveSalePrice(recipe, context) - getRawIngredientValue(recipe, context);
};

export const sortRecipesByPreference = (
  recipes: Recipe[],
  recipeSort: RecipeSort,
  context: RecipeValueContext
): Recipe[] => {
  return [...recipes].sort((a, b) => {
    switch (recipeSort) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'profit': {
        const profitA = getRecipeProfit(a, context);
        const profitB = getRecipeProfit(b, context);
        return profitB - profitA;
      }
      case 'time':
        return a.processingTime - b.processingTime;
      case 'difficulty':
        return b.ingredients.length - a.ingredients.length;
      default:
        return 0;
    }
  });
};
