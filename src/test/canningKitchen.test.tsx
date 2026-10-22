/**
 * Tests for the Canning tab's Kitchen layout: the pantry, the stove with Rush Batch, the
 * recipe book and its filters, the Preservers box and the kitchen stats.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CanningTab from '../components/CanningTab';
import { INITIAL_RECIPES } from '../data/recipes';
import { DEFAULT_GUILD_STATE, type GuildState } from '../types/guilds';
import type { CanningState, Recipe } from '../types/canning';
import type { Veggie } from '../types/game';

type TabProps = Parameters<typeof CanningTab>[0];

/** Recipes from the game's list, unlocked as named */
const recipesFrom = (ids: string[], unlocked: string[] = ids): Recipe[] => INITIAL_RECIPES
  .filter(config => ids.includes(config.id))
  .map(config => ({
    id: config.id,
    name: config.name,
    description: config.description,
    ingredients: config.ingredients.map((ingredient, veggieIndex) => ({ veggieIndex, ...ingredient })),
    honeyRequirement: config.honeyRequirement,
    processingTime: config.baseProcessingTime,
    baseProcessingTime: config.baseProcessingTime,
    salePrice: config.baseSalePrice,
    baseSalePrice: config.baseSalePrice,
    experienceRequired: config.experienceRequired,
    requiredAchievementId: config.requiredAchievementId,
    requiredGuildUpgrade: config.requiredGuildUpgrade,
    unlocked: unlocked.includes(config.id),
    timesCompleted: 0
  }));

const crop = (name: string, stash: number, unlocked = true) =>
  ({ name, stash, unlocked, salePrice: 1, betterSeedsLevel: 0 }) as Veggie;

const kitchen = (overrides: Partial<CanningState> = {}): CanningState => ({
  recipes: recipesFrom(['canned_radish', 'canned_lettuce', 'farmers_pride']),
  unlockedRecipes: [],
  activeProcesses: [],
  maxSimultaneousProcesses: 2,
  upgrades: [],
  totalItemsCanned: 12,
  canningExperience: 2000,
  autoCanning: { enabled: false, selectedRecipes: [], priorityOrder: [] },
  ...overrides
});

const renderKitchen = (overrides: Partial<TabProps> = {}) => {
  const veggies = [crop('Radish', 30), crop('Lettuce', 0), crop('Tomatoes', 9), crop('Peppers', 2), crop('Carrots', 5), crop('Broccoli', 0, false)];
  const stash = new Map(veggies.map(v => [v.name, v.stash]));
  const props: TabProps = {
    canningState: kitchen(),
    canningUnlocked: true,
    veggies,
    money: 1000,
    knowledge: 1000,
    heirloomOwned: false,
    startCanning: vi.fn(() => true),
    canMakeRecipe: (recipe: Recipe) => recipe.ingredients.every(i => (stash.get(i.veggieName) ?? 0) >= i.quantity),
    purchaseUpgrade: vi.fn(() => true),
    toggleAutoCanning: vi.fn(),
    recipeFilter: 'all',
    recipeSort: 'profit',
    canMakeOnly: false,
    onRecipeFilterChange: vi.fn(),
    onRecipeSortChange: vi.fn(),
    onCanMakeOnlyChange: vi.fn(),
    ...overrides
  };
  render(<CanningTab {...props} />);
  return props;
};

const recipeRow = (name: string) => screen.getByRole('button', { name: `Details for ${name}` }).closest('li')!;
const preserver: GuildState = {
  ...DEFAULT_GUILD_STATE,
  committedGuild: 'preservers',
  status: 'committed',
  guildCurrencies: { ...DEFAULT_GUILD_STATE.guildCurrencies, preservers: 238 }
};

describe('the Kitchen', () => {
  it('lists the crops recipes use in the pantry, with what is on hand', () => {
    renderKitchen();
    const pantry = within(screen.getByRole('region', { name: 'Pantry' }));

    expect(pantry.getByText('Radish').closest('li')).toHaveTextContent('30');
    expect(pantry.getByText('Lettuce').closest('li')).toHaveTextContent('0');
    // Locked and empty: not on the farm yet
    expect(pantry.queryByText('Broccoli')).not.toBeInTheDocument();
  });

  it('shows the stove with its batches and empty slots', () => {
    renderKitchen({
      canningState: kitchen({
        activeProcesses: [{ recipeId: 'canned_radish', startTime: 0, remainingTime: 12, totalTime: 30, completed: false, automated: true }]
      })
    });

    expect(screen.getByRole('heading', { name: 'Stove 1 of 2' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Canned Radish: 12 seconds left' })).toHaveAttribute('aria-valuenow', '60');
    expect(screen.getByAltText('Canner')).toBeInTheDocument();
    expect(screen.getAllByText('Empty')).toHaveLength(1);
  });

  it('starts a recipe the stash covers, and marks what a short recipe is missing', async () => {
    const user = userEvent.setup();
    const props = renderKitchen();

    await user.click(within(recipeRow('Canned Radish')).getByRole('button', { name: 'Can Canned Radish' }));
    expect(props.startCanning).toHaveBeenCalledWith('canned_radish');

    const short = recipeRow('Canned Lettuce');
    expect(within(short).queryByRole('button', { name: /^Can / })).not.toBeInTheDocument();
    expect(within(short).getByText('Short')).toHaveAttribute('title', 'Short of Lettuce');
    expect(within(short).getByAltText('3 Lettuce, short')).toBeInTheDocument();
  });

  it('disables Can while every stove is busy', () => {
    const busy = { recipeId: 'canned_radish', startTime: 0, remainingTime: 12, totalTime: 30, completed: false };
    renderKitchen({ canningState: kitchen({ activeProcesses: [busy, { ...busy, startTime: 1 }] }) });

    expect(within(recipeRow('Canned Radish')).getByRole('button', { name: 'Can Canned Radish' })).toBeDisabled();
  });

  it('opens a recipe\'s details from its name', async () => {
    const user = userEvent.setup();
    renderKitchen();

    await user.click(screen.getByRole('button', { name: 'Details for Farmer\'s Pride' }));

    expect(screen.getByRole('dialog')).toHaveTextContent('Farmer\'s Pride');
  });

  it('filters by category, with a Cellar filter once Cellar recipes are open', async () => {
    const user = userEvent.setup();
    const props = renderKitchen();
    const filters = within(screen.getByRole('group', { name: 'Recipe categories' }));

    expect(filters.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(filters.queryByRole('button', { name: 'Cellar' })).not.toBeInTheDocument();
    await user.click(filters.getByRole('button', { name: 'Honey' }));
    expect(props.onRecipeFilterChange).toHaveBeenCalledWith('honey');
  });

  it('shows Cellar recipes with their tag and their filter', () => {
    renderKitchen({ canningState: kitchen({ recipes: recipesFrom(['canned_radish', 'cellar_dilly_beans']) }) });

    expect(within(screen.getByRole('group', { name: 'Recipe categories' })).getByRole('button', { name: 'Cellar' })).toBeInTheDocument();
    expect(within(recipeRow('Dilly Beans')).getByText('Cellar')).toBeInTheDocument();
  });

  it('shows Recipe Mastery ribbons with the Family Cookbook', () => {
    const recipes = recipesFrom(['canned_radish']).map(recipe => ({ ...recipe, timesCompleted: 120 }));
    const cookbook: GuildState = { ...preserver, purchasedUpgrades: ['preservers_family_cookbook'], upgradeLevels: { preservers_family_cookbook: 1 } };
    renderKitchen({ canningState: kitchen({ recipes }), guildState: cookbook });

    expect(within(recipeRow('Canned Radish')).getByTitle('Made 100 times: +25% value')).toBeInTheDocument();
  });

  it('offers Rush Batch on the stove when the Preservers own it', async () => {
    const user = userEvent.setup();
    const onRush = vi.fn();
    renderKitchen({ guildState: preserver, rushBatch: { cost: 5, canRush: true, onRush } });

    await user.click(screen.getByRole('button', { name: /^Rush Batch: spend 5 Wax Seals/ }));
    expect(onRush).toHaveBeenCalledTimes(1);
  });

  it('shows the Preservers their Wax Seals, and nobody else', () => {
    renderKitchen({ guildState: preserver });
    expect(screen.getByRole('region', { name: 'Preservers Guild' })).toHaveTextContent('238');
  });

  it('leaves the Preservers box out for everyone else', () => {
    renderKitchen({ guildState: DEFAULT_GUILD_STATE });
    expect(screen.queryByRole('region', { name: 'Preservers Guild' })).not.toBeInTheDocument();
  });

  it('counts recipes and names the next experience goal, skipping recipes held back by an achievement', () => {
    const recipes = recipesFrom(['canned_radish', 'canned_lettuce', 'canners_cocoa_honey', 'pickled_cucumbers'], ['canned_radish', 'canned_lettuce']);
    renderKitchen({ canningState: kitchen({ recipes, canningExperience: 70000 }) });
    const stats = screen.getByRole('region', { name: 'Kitchen stats' });

    expect(stats).toHaveTextContent('Recipes2 of 4');
    expect(stats).toHaveTextContent('Jars canned12');
    expect(stats).not.toHaveTextContent('Next recipe at');
  });
});
