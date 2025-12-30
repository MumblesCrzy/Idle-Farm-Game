import type { Recipe } from '../types/canning';
import type { RecipeFilter, RecipeSort } from '../types/game';

export type VeggieContext = {
  name: string;
  salePrice: number;
  betterSeedsLevel?: number;
};

export type RecipeValueContext = {
  veggies: VeggieContext[];
  heirloomOwned: boolean;
  efficiencyMultiplier?: number;
};

export const filterRecipesByCategory = (
  recipes: Recipe[],
  recipeFilter: RecipeFilter,
  canMakeRecipe: (recipe: Recipe) => boolean
): Recipe[] => {
  let filtered = recipes.filter(recipe => recipe.unlocked);

  switch (recipeFilter) {
    case 'available':
      filtered = filtered.filter(recipe => canMakeRecipe(recipe));
      break;
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

export const getEffectiveSalePrice = (
  recipe: Recipe,
  context: RecipeValueContext
): number => {
  const efficiencyMultiplier = context.efficiencyMultiplier ?? 1;
  return recipe.salePrice * efficiencyMultiplier * getBetterSeedsMultiplier(recipe, context);
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
