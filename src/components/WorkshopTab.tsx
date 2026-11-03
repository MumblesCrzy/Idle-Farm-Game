/**
 * Workshop Tab Component
 *
 * Christmas Tree Shop crafting: weave garland, make candles and ornaments, then
 * decorate plain trees. Laid out like the Carving Barn: the Elves' Bench status
 * in a slim bar under the stock, recipe cards, a decorating station and Workshop
 * upgrades on the right, all within a 1600x1000 window.
 */

import InlineIcon from './InlineIcon';
import { ICON_LOCK } from '../config/assetPaths';
import { memo, useId, useState, type FC } from 'react';
import BaseTab from './BaseTab';
import EventArt, { type EventArtSource } from './EventArt';
import EventUpgradesPanel from './EventUpgradesPanel';
import { CHRISTMAS_ART, CRAFTING_RECIPES, DECORATION_MULTIPLIERS, TREE_DEFINITIONS } from '../data/christmasEventData';
import { countTrees, elvesJobsPerSecond, ownsUpgrade } from '../utils/christmasTreePricing';
import type { UseChristmasEventReturn } from '../hooks/useChristmasEvent';
import type {
  ChristmasEventState,
  CraftingMaterials,
  CraftingRecipe,
  DecorationType,
  EventUpgrade,
  TreeInventory,
  TreeType
} from '../types/christmasEvent';
import frame from './TreeShopSections.module.css';
import styles from './WorkshopTab.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

interface WorkshopTabProps {
  event: UseChristmasEventReturn;
  formatNumber: FormatNumber;
}

type MaterialName = keyof CraftingMaterials;

const MATERIALS: Record<MaterialName, { label: string; one: string; many: string; art: EventArtSource }> = {
  wood: { label: 'Wood', one: 'wood', many: 'wood', art: CHRISTMAS_ART.wood },
  pinecones: { label: 'Pinecones', one: 'pinecone', many: 'pinecones', art: CHRISTMAS_ART.pinecones },
  branches: { label: 'Branches', one: 'branch', many: 'branches', art: CHRISTMAS_ART.branches },
  garlands: { label: 'Garland', one: 'garland', many: 'garlands', art: CHRISTMAS_ART.garland },
  candles: { label: 'Candles', one: 'candle', many: 'candles', art: CHRISTMAS_ART.candles },
  ornaments: { label: 'Ornaments', one: 'ornament', many: 'ornaments', art: CHRISTMAS_ART.ornaments },
  // Older saves only; Traditional Ornaments now makes ornaments
  naturalOrnaments: { label: 'Traditional Ornaments', one: 'traditional ornament', many: 'traditional ornaments', art: CHRISTMAS_ART.traditional },
};

const MATERIAL_ORDER: MaterialName[] = ['wood', 'pinecones', 'branches', 'garlands', 'candles', 'ornaments'];

/** How many to craft per click; 'max' crafts as many as the materials allow */
type CraftQuantity = 1 | 5 | 10 | 'max';
const QUANTITIES: CraftQuantity[] = [1, 5, 10, 'max'];

const TREES: TreeType[] = ['pine', 'spruce', 'fir'];

const amountsOf = (amounts: Partial<CraftingMaterials>) => Object.entries(amounts) as [MaterialName, number][];

/** "3 branches and 2 pinecones" */
function describeAmounts(amounts: [MaterialName, number][], times: number): string {
  const parts = amounts.map(([material, amount]) => {
    const total = amount * times;
    return `${total} ${total === 1 ? MATERIALS[material].one : MATERIALS[material].many}`;
  });
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts.join('');
}

/** How many times a recipe can be crafted from these materials */
function maxCraftable(inputs: [MaterialName, number][], materials: CraftingMaterials): number {
  if (inputs.length === 0) return 0;
  return Math.min(...inputs.map(([material, amount]) => Math.floor(materials[material] / amount)));
}

type Finish = 'ornamented' | 'candled' | 'luxury';

const FINISH_NAMES: Record<Finish, string> = { ornamented: 'Ornamented', candled: 'Candlelit', luxury: 'Luxury' };

/** "+5% value", or "×3 value" for a Luxury tree with the Star Forge */
function finishBonus(finish: Finish, upgrades: readonly EventUpgrade[]): string {
  const starForge = upgrades.find(u => u.id === 'star_forge');
  const multiplier = finish === 'luxury' && starForge?.owned
    ? starForge.multiplier ?? DECORATION_MULTIPLIERS.luxury
    : DECORATION_MULTIPLIERS[finish];
  return multiplier >= 2 ? `×${multiplier} value` : `+${Math.round((multiplier - 1) * 100)}% value`;
}

/** What the Elves are doing, in words */
function elvesActionText(action: ChristmasEventState['currentElvesAction']): string {
  if (!action) return 'Waiting for materials';
  if (action.type === 'craft') {
    return CRAFTING_RECIPES.find(r => r.id === action.recipeId)?.name ?? 'Crafting';
  }
  const finishName = FINISH_NAMES[action.decorationType as Finish];
  return finishName ? `Decorating a tree: ${finishName}` : 'Decorating a tree';
}

// ============================================================================
// RECIPE CARD
// ============================================================================

interface RecipeCardProps {
  recipe: CraftingRecipe;
  materials: CraftingMaterials;
  quantity: CraftQuantity;
  /** Name of the upgrade that unlocks this recipe, while it is locked */
  lockedBy: string | null;
  /** Whether the Elves are working on this recipe */
  isActive: boolean;
  onCraft: (recipeId: string, quantity: number) => boolean;
}

const RecipeCard: FC<RecipeCardProps> = memo(({ recipe, materials, quantity, lockedBy, isActive, onCraft }) => {
  const inputs = amountsOf(recipe.inputs);
  const outputs = amountsOf(recipe.output);
  const count = quantity === 'max' ? maxCraftable(inputs, materials) : quantity;
  // Chips show the amounts for one craft when Max can't make any
  const shown = Math.max(1, count);
  const hasMaterials = count >= 1 && inputs.every(([material, amount]) => materials[material] >= amount * count);
  const canCraft = lockedBy === null && hasMaterials;

  const label = lockedBy
    ? `${recipe.name}: locked, requires ${lockedBy}`
    : `${recipe.name} ×${count}: uses ${describeAmounts(inputs, shown)} to make ${describeAmounts(outputs, shown)}${hasMaterials ? '' : '. Not enough materials'}`;

  const className = [
    styles.recipeCard,
    lockedBy ? styles.locked : '',
    !lockedBy && !hasMaterials ? styles.cantCraft : '',
    isActive ? styles.active : ''
  ].filter(Boolean).join(' ');

  return (
    <li className={className}>
      {isActive && (
        <EventArt
          art={CHRISTMAS_ART.elvesAtWork}
          size={28}
          alt="The Elves are working on this"
          className={styles.elvesIndicator}
        />
      )}
      <h4 className={styles.recipeName}>{recipe.name}</h4>
      <p className={styles.recipeDescription}>{recipe.description}</p>

      <div className={styles.recipeIO}>
        {inputs.map(([material, amount]) => {
          const needed = amount * shown;
          return (
            <span
              key={material}
              className={`${styles.chip} ${materials[material] < needed ? styles.insufficient : ''}`}
              title={`${MATERIALS[material].label}: ${materials[material]} available`}
            >
              <EventArt art={MATERIALS[material].art} size={16} alt={MATERIALS[material].label} /> {needed}
            </span>
          );
        })}
        <span className={styles.arrow} aria-hidden="true">→</span>
        {outputs.map(([material, amount]) => (
          <span key={material} className={`${styles.chip} ${styles.outputChip}`}>
            <EventArt art={MATERIALS[material].art} size={16} alt={MATERIALS[material].label} /> +{amount * shown}
          </span>
        ))}
      </div>

      {lockedBy && (
        <p className={styles.lockNote}>
          <InlineIcon src={ICON_LOCK} size={14} gap={4} />Requires {lockedBy}
        </p>
      )}

      <button
        type="button"
        className={styles.craftButton}
        onClick={() => onCraft(recipe.id, count)}
        disabled={!canCraft}
        aria-label={label}
        title={recipe.description}
      >
        {lockedBy ? 'Locked' : `Craft ×${count}`}
      </button>
    </li>
  );
});

RecipeCard.displayName = 'RecipeCard';

// ============================================================================
// DECORATING STATION
// ============================================================================

interface DecorationOption {
  label: string;
  decorations: DecorationType[];
  finish: Finish;
  art: EventArtSource;
  uses: string;
}

const DECORATION_OPTIONS: DecorationOption[] = [
  { label: 'Ornaments', decorations: ['ornament'], finish: 'ornamented', art: CHRISTMAS_ART.ornaments, uses: '1 ornament' },
  { label: 'Candles', decorations: ['candle'], finish: 'candled', art: CHRISTMAS_ART.candles, uses: '1 candle' },
  { label: 'Luxury', decorations: ['ornament', 'candle'], finish: 'luxury', art: CHRISTMAS_ART.luxury, uses: '1 ornament and 1 candle' },
];

interface DecoratingStationProps {
  inventory: TreeInventory;
  ornaments: number;
  candles: number;
  upgrades: readonly EventUpgrade[];
  onDecorate: (treeType: TreeType, decorations: DecorationType[]) => boolean;
}

const DecoratingStation: FC<DecoratingStationProps> = memo(({ inventory, ornaments, candles, upgrades, onDecorate }) => {
  const titleId = useId();
  const [treeType, setTreeType] = useState<TreeType>('pine');
  const plain = countTrees(inventory, treeType, 'plain');
  const treeName = TREE_DEFINITIONS[treeType].displayName;

  return (
    <section className={styles.stationSection} aria-labelledby={titleId}>
      <div className={styles.sectionHeader}>
        <h3 id={titleId} className={styles.sectionTitle}>
          <EventArt art={CHRISTMAS_ART.decorated} size={20} /> Decorating Station
        </h3>
        <span className={styles.supplies}>
          <EventArt art={CHRISTMAS_ART.ornaments} size={16} alt="Ornaments" /> {ornaments}
          <EventArt art={CHRISTMAS_ART.candles} size={16} alt="Candles" /> {candles}
        </span>
      </div>

      <div className={styles.treeButtons} role="group" aria-label="Tree to decorate">
        {TREES.map(option => {
          const count = countTrees(inventory, option, 'plain');
          const name = TREE_DEFINITIONS[option].name;
          return (
            <button
              key={option}
              type="button"
              className={styles.treeButton}
              onClick={() => setTreeType(option)}
              aria-pressed={treeType === option}
              aria-label={`${name}: ${count} plain tree${count === 1 ? '' : 's'}`}
            >
              <EventArt art={CHRISTMAS_ART[option]} size={18} /> {name} ({count})
            </button>
          );
        })}
      </div>

      <div className={styles.decorateButtons}>
        {DECORATION_OPTIONS.map(option => {
          const missing = [
            option.decorations.includes('ornament') && ornaments < 1 ? 'ornaments' : '',
            option.decorations.includes('candle') && candles < 1 ? 'candles' : ''
          ].filter(Boolean);
          const disabled = plain < 1 || missing.length > 0;
          const reason = plain < 1
            ? `. No plain ${treeName}s`
            : missing.length > 0 ? `. Not enough ${missing.join(' or ')}` : '';
          return (
            <button
              key={option.finish}
              type="button"
              className={`${styles.decorateButton} ${option.finish === 'luxury' ? styles.luxuryButton : ''}`}
              onClick={() => onDecorate(treeType, option.decorations)}
              disabled={disabled}
              aria-label={`Decorate a ${treeName} with ${option.label.toLowerCase()}. Uses ${option.uses}${reason}`}
            >
              <span className={styles.decorateLabel}>
                <EventArt art={option.art} size={18} /> {option.label}
              </span>
              <span className={styles.decorateDetail}>Uses {option.uses} · {finishBonus(option.finish, upgrades)}</span>
            </button>
          );
        })}
      </div>

      <p className={styles.finishedLine}>
        {treeName}s in stock: {plain} plain · {countTrees(inventory, treeType, 'ornamented')} ornamented
        · {countTrees(inventory, treeType, 'candled')} candlelit · {countTrees(inventory, treeType, 'luxury')} luxury
      </p>
    </section>
  );
});

DecoratingStation.displayName = 'DecoratingStation';

// ============================================================================
// ELVES' BENCH
// ============================================================================

interface ElvesBarProps {
  owned: boolean;
  jobsPerSecond: number;
  action?: ChristmasEventState['currentElvesAction'];
}

/** The Elves' status in one line, fixed-width parts first so the bar holds still as jobs change */
const ElvesBar: FC<ElvesBarProps> = memo(({ owned, jobsPerSecond, action }) => (
  <section
    className={owned ? `${frame.crewBar} ${frame.crewActive}` : frame.crewBar}
    aria-label="Elves' Bench"
    title={owned ? 'Each job, the Elves weave garland, then make candles, then ornaments, and decorate plain trees when nothing is left to craft. Harvested trees get the best decorations available.' : undefined}
  >
    <h3 className={frame.crewTitle}>
      <EventArt art={CHRISTMAS_ART.elves} size={22} /> Elves' Bench{owned ? ' (Active)' : ''}
    </h3>
    {owned ? (
      <>
        <p className={frame.crewRate}>
          {jobsPerSecond} job{jobsPerSecond === 1 ? '' : 's'} per second
        </p>
        <p className={frame.crewNow}>
          Now: <strong>{elvesActionText(action)}</strong>
        </p>
      </>
    ) : (
      <p className={frame.crewLocked}>
        Buy the Elves' Bench upgrade to automate crafting and decorating!
      </p>
    )}
  </section>
));

ElvesBar.displayName = 'ElvesBar';

// ============================================================================
// TAB
// ============================================================================

const WorkshopTab: FC<WorkshopTabProps> = ({ event, formatNumber }) => {
  const { materials, holidayCheer, craftItem, decorateTree, currentElvesAction, purchaseUpgrade } = event;
  const { upgrades, treeInventory } = event.eventState;
  const recipesTitleId = useId();
  const [quantity, setQuantity] = useState<CraftQuantity>(1);

  const elvesOwned = ownsUpgrade(upgrades, 'elves_bench');
  const jobsPerSecond = elvesJobsPerSecond(upgrades);
  const activeRecipeId = elvesOwned && currentElvesAction?.type === 'craft' ? currentElvesAction.recipeId : null;

  const lockedBy = (recipe: CraftingRecipe): string | null => {
    if (!recipe.requiredUpgrade || ownsUpgrade(upgrades, recipe.requiredUpgrade)) return null;
    return upgrades.find(u => u.id === recipe.requiredUpgrade)?.name ?? recipe.requiredUpgrade;
  };

  const mainContent = (
    <div className={frame.container}>
      {/* Left column: stock, the Elves, recipes and decorating */}
      <div className={frame.leftColumn}>
        <div className={frame.headerRow}>
          <h2 className={frame.sectionTitle}>
            <EventArt art={CHRISTMAS_ART.workshop} size={24} /> Workshop
          </h2>
          <ul className={frame.stockList} aria-label="Stock">
            {MATERIAL_ORDER.map(material => (
              <li key={material} className={frame.stockItem}>
                <EventArt art={MATERIALS[material].art} size={20} />
                <span className={frame.stockLabel}>{MATERIALS[material].label}</span>
                <span className={frame.stockValue}>{formatNumber(materials[material], 0)}</span>
              </li>
            ))}
          </ul>
        </div>

        <ElvesBar owned={elvesOwned} jobsPerSecond={jobsPerSecond} action={currentElvesAction} />

        <section className={styles.craftingSection} aria-labelledby={recipesTitleId}>
          <div className={styles.sectionHeader}>
            <h3 id={recipesTitleId} className={styles.sectionTitle}>
              <EventArt art={CHRISTMAS_ART.garland} size={20} /> Recipes
            </h3>
            <div className={styles.quantityPicker} role="group" aria-label="Craft quantity">
              {QUANTITIES.map(option => (
                <button
                  key={option}
                  type="button"
                  className={styles.quantityButton}
                  onClick={() => setQuantity(option)}
                  aria-pressed={quantity === option}
                  aria-label={option === 'max' ? 'Craft as many as possible' : `Craft ${option} at a time`}
                >
                  {option === 'max' ? 'Max' : `×${option}`}
                </button>
              ))}
            </div>
          </div>
          <ul className={styles.recipesGrid}>
            {CRAFTING_RECIPES.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                materials={materials}
                quantity={quantity}
                lockedBy={lockedBy(recipe)}
                isActive={activeRecipeId === recipe.id}
                onCraft={craftItem}
              />
            ))}
          </ul>
        </section>

        <DecoratingStation
          inventory={treeInventory}
          ornaments={materials.ornaments}
          candles={materials.candles}
          upgrades={upgrades}
          onDecorate={decorateTree}
        />
      </div>

      {/* Right column: Workshop upgrades */}
      <div className={frame.rightColumn}>
        <EventUpgradesPanel
          title="Workshop Upgrades"
          category="workshop"
          upgrades={upgrades}
          currency="cheer"
          balance={holidayCheer}
          purchaseUpgrade={purchaseUpgrade}
          formatNumber={formatNumber}
        />
      </div>
    </div>
  );

  return (
    <BaseTab
      isUnlocked={true}
      mainContent={mainContent}
    />
  );
};

const MemoizedWorkshopTab = memo(WorkshopTab);
MemoizedWorkshopTab.displayName = 'WorkshopTab';

export default MemoizedWorkshopTab;
