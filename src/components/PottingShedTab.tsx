/**
 * Potting Shed Tab Component
 *
 * Spring Farmer's Market crafting: steep teas, make pesto and press seed
 * packets, then arrange and scent plain bunches into Gift Bouquets. Mirrors
 * the Carving Barn: the Gnome Crew's status in a slim bar, recipe cards four
 * to a row, a finishing station and Shed upgrades on the right.
 */

import InlineIcon from './InlineIcon';
import { ICON_LOCK } from '../config/assetPaths';
import { memo, useId, useState, type FC } from 'react';
import BaseTab from './BaseTab';
import EventArt, { type EventArtSource } from './EventArt';
import EventUpgradesPanel from './EventUpgradesPanel';
import {
  FLOWER_FINISH_BONUSES,
  FLOWER_FINISH_MULTIPLIERS,
  FLOWER_ORDER,
  FLOWER_VARIETIES,
  HERBS,
  HERB_ORDER,
  SPRING_ART,
  SPRING_EVENT_CONSTANTS,
  SPRING_GOOD_UNITS,
  SPRING_RECIPES
} from '../data/springEventData';
import { describeCrewAction, gnomeJobsPerSecond, ownsUpgrade, parseFlowerKey } from '../utils/springPricing';
import type { UseSpringEventReturn } from '../hooks/useSpringEvent';
import type {
  FlowerDecoration,
  FlowerFinish,
  FlowerInventory,
  FlowerVariety,
  GnomeCrewAction,
  HerbKind,
  SpringGood,
  SpringMaterials,
  SpringRecipe
} from '../types/springEvent';
import frame from './SpringSections.module.css';
import styles from './PottingShedTab.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

interface PottingShedTabProps {
  event: UseSpringEventReturn;
  formatNumber: FormatNumber;
}

type MaterialName = keyof SpringMaterials;

const MATERIALS: Record<MaterialName, { label: string; one: string; many: string; art: EventArtSource }> = {
  greenery: { label: 'Greenery', one: 'greenery', many: 'greenery', art: SPRING_ART.greenery },
  seeds: { label: 'Seeds', one: 'seed', many: 'seeds', art: SPRING_ART.seeds },
  mint: { label: 'Mint', one: 'mint', many: 'mint', art: SPRING_ART.mint },
  basil: { label: 'Basil', one: 'basil', many: 'basil', art: SPRING_ART.basil },
  chamomile: { label: 'Chamomile', one: 'chamomile', many: 'chamomile', art: SPRING_ART.chamomile },
  lavender: { label: 'Lavender', one: 'lavender', many: 'lavender', art: SPRING_ART.lavender },
  mintTea: { label: 'Mint Tea', one: 'tin of Mint Tea', many: 'tins of Mint Tea', art: SPRING_ART.mintTea },
  chamomileTea: { label: 'Chamomile Tea', one: 'tin of Chamomile Tea', many: 'tins of Chamomile Tea', art: SPRING_ART.chamomileTea },
  pesto: { label: 'Pesto', one: 'jar of Pesto', many: 'jars of Pesto', art: SPRING_ART.pesto },
  packets: { label: 'Seed Packets', one: 'seed packet', many: 'seed packets', art: SPRING_ART.packets },
};

/** The stock chips: what the recipes and the station use */
const STOCK_ORDER: MaterialName[] = ['greenery', 'seeds', 'mint', 'basil', 'chamomile', 'lavender'];

/** How many to craft per click; 'max' crafts as many as the materials allow */
type CraftQuantity = 1 | 5 | 10 | 'max';
const QUANTITIES: CraftQuantity[] = [1, 5, 10, 'max'];

const amountsOf = (amounts: Partial<SpringMaterials>) => Object.entries(amounts) as [MaterialName, number][];

/** "2 chamomile and 1 mint" */
function describeAmounts(amounts: [MaterialName, number][], times: number): string {
  const parts = amounts.map(([material, amount]) => {
    const total = amount * times;
    return `${total} ${total === 1 ? MATERIALS[material].one : MATERIALS[material].many}`;
  });
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts.join('');
}

/** How many times a recipe can be crafted from these materials */
function maxCraftable(inputs: [MaterialName, number][], materials: SpringMaterials): number {
  if (inputs.length === 0) return 0;
  return Math.min(...inputs.map(([material, amount]) => Math.floor(materials[material] / amount)));
}

/** Bunches of a flower with this finish in the inventory, any quality */
function countFinish(inventory: FlowerInventory, variety: FlowerVariety, finish: FlowerFinish): number {
  let count = 0;
  for (const [key, quantity] of Object.entries(inventory)) {
    const parts = parseFlowerKey(key);
    if (parts.variety === variety && parts.finish === finish) count += quantity;
  }
  return count;
}

/** "+2 Petals" or "×3 value" */
function finishBonus(finish: FlowerFinish): string {
  const multiplier = FLOWER_FINISH_MULTIPLIERS[finish];
  return multiplier > 1 ? `×${multiplier} value` : `+${FLOWER_FINISH_BONUSES[finish]} Petals`;
}

const isHerb = (material: MaterialName): material is HerbKind => (HERB_ORDER as string[]).includes(material);

// ============================================================================
// RECIPE CARD
// ============================================================================

interface RecipeCardProps {
  recipe: SpringRecipe;
  materials: SpringMaterials;
  quantity: CraftQuantity;
  /** Name of the upgrade that unlocks this recipe, while it is locked */
  lockedBy: string | null;
  /** An herb the recipe needs that is not planted yet */
  unplantedHerb: HerbKind | null;
  /** Whether the Gnome Crew is working on this recipe */
  isActive: boolean;
  onCraft: (recipeId: string, quantity?: number) => boolean;
}

const RecipeCard: FC<RecipeCardProps> = memo(({ recipe, materials, quantity, lockedBy, unplantedHerb, isActive, onCraft }) => {
  const inputs = amountsOf(recipe.inputs);
  const [output, made] = amountsOf(recipe.output)[0] ?? ['mintTea', 1];
  const count = quantity === 'max' ? maxCraftable(inputs, materials) : quantity;
  // Chips show the amounts for one craft when Max can't make any
  const shown = Math.max(1, count);
  const hasMaterials = count >= 1 && inputs.every(([material, amount]) => materials[material] >= amount * count);
  const canCraft = lockedBy === null && unplantedHerb === null && hasMaterials;

  const good = output as SpringGood;
  const [unitOne, unitMany] = SPRING_GOOD_UNITS[good] ?? ['', ''];
  const inStock = materials[output];
  const price = SPRING_EVENT_CONSTANTS.GOOD_PRICES[good];
  const herbName = unplantedHerb ? HERBS[unplantedHerb].name : '';

  const label = lockedBy
    ? `${recipe.name}: locked, requires ${lockedBy}`
    : unplantedHerb
      ? `${recipe.name}: plant ${herbName} in the Herb Garden first`
      : `Craft ${recipe.name} ×${count}: uses ${describeAmounts(inputs, shown)} to make ${describeAmounts([[output, made]], shown)}${hasMaterials ? '' : '. Not enough materials'}`;

  const className = [
    styles.recipeCard,
    lockedBy || unplantedHerb ? styles.locked : '',
    !lockedBy && !unplantedHerb && !hasMaterials ? styles.cantCraft : '',
    isActive ? styles.active : ''
  ].filter(Boolean).join(' ');

  return (
    <li className={className}>
      {isActive && (
        <EventArt
          art={SPRING_ART.gnome}
          size={26}
          alt="The Gnome Crew is working on this"
          className={styles.crewIndicator}
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
        <span className={`${styles.chip} ${styles.outputChip}`}>
          <EventArt art={MATERIALS[output].art} size={16} alt={MATERIALS[output].label} /> +{made * shown}
        </span>
      </div>

      {lockedBy ? (
        <p className={styles.lockNote}>
          <InlineIcon src={ICON_LOCK} size={14} gap={4} />Needs the {lockedBy}
        </p>
      ) : (
        <p className={styles.stockLine}>
          {inStock} {inStock === 1 ? unitOne : unitMany} in stock · sells for {price} Petals
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
        {lockedBy ? 'Locked' : unplantedHerb ? `No ${herbName.toLowerCase()} yet` : `Craft ×${count}`}
      </button>
    </li>
  );
});

RecipeCard.displayName = 'RecipeCard';

// ============================================================================
// FINISHING STATION
// ============================================================================

interface FinishOption {
  label: string;
  /** Verb phrase for the button's accessible name */
  action: string;
  decorations: FlowerDecoration[];
  finish: FlowerFinish;
  art: EventArtSource;
  uses: string;
}

const FINISH_OPTIONS: FinishOption[] = [
  { label: 'Arrange', action: 'Arrange', decorations: ['arrange'], finish: 'arranged', art: SPRING_ART.greenery, uses: '1 greenery' },
  { label: 'Scent', action: 'Scent', decorations: ['scent'], finish: 'scented', art: SPRING_ART.lavender, uses: '1 lavender' },
  { label: 'Gift Bouquet', action: 'Make a Gift Bouquet from', decorations: ['arrange', 'scent'], finish: 'bouquet', art: SPRING_ART.bouquet, uses: '1 greenery and 1 lavender' },
];

const FINISH_BUTTON_CLASS: Record<string, string> = {
  arranged: styles.arrangeButton,
  scented: styles.scentButton,
  bouquet: styles.bouquetButton,
};

interface FinishingStationProps {
  inventory: FlowerInventory;
  greenery: number;
  lavender: number;
  unlocked: FlowerVariety[];
  onFinish: (variety: FlowerVariety, decorations: FlowerDecoration[]) => boolean;
}

const FinishingStation: FC<FinishingStationProps> = memo(({ inventory, greenery, lavender, unlocked, onFinish }) => {
  const titleId = useId();
  const [chosen, setChosen] = useState<FlowerVariety>('tulip');
  const variety = unlocked.includes(chosen) ? chosen : unlocked[0] ?? 'tulip';
  const plain = countFinish(inventory, variety, 'plain');
  const plural = FLOWER_VARIETIES[variety].plural;
  const name = FLOWER_VARIETIES[variety].name;

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <div className={styles.sectionHeader}>
        <h3 id={titleId} className={styles.sectionTitle}>
          <EventArt art={SPRING_ART.bouquet} size={20} /> Finishing Station
        </h3>
        <span className={styles.supplies}>
          <EventArt art={SPRING_ART.greenery} size={16} alt="Greenery" /> {greenery}
          <EventArt art={SPRING_ART.lavender} size={16} alt="Lavender" /> {lavender}
        </span>
      </div>

      <div className={styles.flowerButtons} role="group" aria-label="Bunch to finish">
        {FLOWER_ORDER.map(option => {
          const count = countFinish(inventory, option, 'plain');
          const definition = FLOWER_VARIETIES[option];
          const open = unlocked.includes(option);
          return (
            <button
              key={option}
              type="button"
              className={styles.flowerButton}
              onClick={() => setChosen(option)}
              disabled={!open}
              aria-pressed={variety === option}
              aria-label={open
                ? `${definition.plural}: ${count} plain bunch${count === 1 ? '' : 'es'}`
                : `${definition.plural}: not unlocked yet`}
              title={open ? undefined : `Unlock ${definition.plural} in the Flower Beds`}
            >
              <EventArt art={definition.art} size={18} /> {definition.plural} ({count})
            </button>
          );
        })}
      </div>

      <div className={styles.finishButtons}>
        {FINISH_OPTIONS.map(option => {
          const needsGreenery = option.decorations.includes('arrange');
          const needsLavender = option.decorations.includes('scent');
          const missing = [
            needsGreenery && greenery < 1 ? 'greenery' : '',
            needsLavender && lavender < 1 ? 'lavender' : ''
          ].filter(Boolean);
          const disabled = plain < 1 || missing.length > 0;
          const reason = plain < 1
            ? `. No plain ${plural}`
            : missing.length > 0 ? `. Not enough ${missing.join(' or ')}` : '';
          return (
            <button
              key={option.finish}
              type="button"
              className={`${styles.finishButton} ${FINISH_BUTTON_CLASS[option.finish]}`}
              onClick={() => onFinish(variety, option.decorations)}
              disabled={disabled}
              aria-label={`${option.action} a bunch of ${plural}. Uses ${option.uses}${reason}`}
            >
              <span className={styles.finishLabel}>
                <EventArt art={option.art} size={18} /> {option.label}
              </span>
              <span className={styles.finishDetail}>Uses {option.uses} · {finishBonus(option.finish)}</span>
            </button>
          );
        })}
      </div>

      <p className={styles.finishedLine}>
        {plural} in stock: {plain} plain · {countFinish(inventory, variety, 'arranged')} arranged
        · {countFinish(inventory, variety, 'scented')} scented · {countFinish(inventory, variety, 'bouquet')} {name} Gift Bouquets
      </p>
    </section>
  );
});

FinishingStation.displayName = 'FinishingStation';

// ============================================================================
// GNOME CREW
// ============================================================================

interface GnomeCrewBarProps {
  owned: boolean;
  jobsPerSecond: number;
  cartLoader: boolean;
  action?: GnomeCrewAction;
}

const GnomeCrewBar: FC<GnomeCrewBarProps> = memo(({ owned, jobsPerSecond, cartLoader, action }) => (
  <section className={frame.crewBar} aria-label="Gnome Crew">
    <EventArt art={SPRING_ART.gnome} size={22} />
    {owned ? (
      <>
        <b>Gnome Crew (Active)</b>
        <span className={frame.crewPill}>{jobsPerSecond} job{jobsPerSecond === 1 ? '' : 's'} per second</span>
        <span className={frame.crewNow}>Now: <b>{action ? describeCrewAction(action) : 'Waiting for work'}</b></span>
        <span className={frame.crewHint}>
          Gathers full herbs, presses packets, makes teas and pesto, then ties Gift Bouquets{cartLoader ? ' and loads the Cart' : ''}.
        </span>
      </>
    ) : (
      <span>Buy the Gnome Crew to gather full herbs, make teas and pesto and tie Gift Bouquets for you.</span>
    )}
  </section>
));

GnomeCrewBar.displayName = 'GnomeCrewBar';

// ============================================================================
// TAB
// ============================================================================

const PottingShedTab: FC<PottingShedTabProps> = ({ event, formatNumber }) => {
  const { materials, petals, craftItem, finishBunch, currentCrewAction, purchaseUpgrade } = event;
  const { upgrades, inventory } = event.eventState;
  const recipesTitleId = useId();
  const [quantity, setQuantity] = useState<CraftQuantity>(1);

  const crewOwned = ownsUpgrade(upgrades, 'gnome_crew');
  const activeRecipeId = crewOwned && currentCrewAction?.type === 'craft' ? currentCrewAction.recipeId : null;
  const unlockedFlowers = FLOWER_ORDER.filter(variety => ownsUpgrade(upgrades, FLOWER_VARIETIES[variety].unlockUpgrade));

  const lockedBy = (recipe: SpringRecipe): string | null => {
    if (!recipe.requiredUpgrade || ownsUpgrade(upgrades, recipe.requiredUpgrade)) return null;
    return upgrades.find(u => u.id === recipe.requiredUpgrade)?.name ?? recipe.requiredUpgrade;
  };

  const unplantedHerb = (recipe: SpringRecipe): HerbKind | null =>
    amountsOf(recipe.inputs)
      .map(([material]) => material)
      .filter(isHerb)
      .find(herb => !ownsUpgrade(upgrades, HERBS[herb].unlockUpgrade)) ?? null;

  const mainContent = (
    <div className={frame.container}>
      {/* Left column: stock, the crew, recipes and the finishing station */}
      <div className={frame.leftColumn}>
        <div className={frame.headerRow}>
          <h2 className={frame.sectionTitle}>
            <EventArt art={SPRING_ART.shed} size={26} /> Potting Shed
          </h2>
          <ul className={frame.stockList} aria-label="Materials">
            {STOCK_ORDER.map(material => (
              <li key={material} className={frame.stockItem}>
                <EventArt art={MATERIALS[material].art} size={20} />
                <span className={frame.stockLabel}>{MATERIALS[material].label}</span>
                <span className={frame.stockValue}>{formatNumber(materials[material], 0)}</span>
              </li>
            ))}
          </ul>
        </div>

        <GnomeCrewBar
          owned={crewOwned}
          jobsPerSecond={gnomeJobsPerSecond(upgrades)}
          cartLoader={ownsUpgrade(upgrades, 'cart_loader')}
          action={currentCrewAction}
        />

        <section className={styles.section} aria-labelledby={recipesTitleId}>
          <div className={styles.sectionHeader}>
            <h3 id={recipesTitleId} className={styles.sectionTitle}>
              <EventArt art={SPRING_ART.mintTea} size={20} /> Recipes
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
            {SPRING_RECIPES.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                materials={materials}
                quantity={quantity}
                lockedBy={lockedBy(recipe)}
                unplantedHerb={unplantedHerb(recipe)}
                isActive={activeRecipeId === recipe.id}
                onCraft={craftItem}
              />
            ))}
          </ul>
        </section>

        <FinishingStation
          inventory={inventory}
          greenery={materials.greenery}
          lavender={materials.lavender}
          unlocked={unlockedFlowers}
          onFinish={finishBunch}
        />
      </div>

      {/* Right column: Shed upgrades */}
      <div className={frame.rightColumn}>
        <EventUpgradesPanel
          title="Shed Upgrades"
          category="workshop"
          upgrades={upgrades}
          currency="petals"
          balance={petals}
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

const MemoizedPottingShedTab = memo(PottingShedTab);
MemoizedPottingShedTab.displayName = 'PottingShedTab';

export default MemoizedPottingShedTab;
