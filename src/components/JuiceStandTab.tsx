/**
 * Juice Stand Tab Component
 *
 * Summer Watermelon Festival crafting: the Ice House freezes blocks of ice, the
 * finishing table chills and carves plain melons into Picnic Baskets, and split
 * melons become Melon Balls, Agua Fresca, Pickled Rinds and Roasted Seeds.
 * Mirrors the Potting Shed, laid out as the mockup: the Ice House beside the
 * finishing table, recipe cards four to a row, then the Picnic Crew's bar.
 */

import InlineIcon from './InlineIcon';
import { ICON_LOCK } from '../config/assetPaths';
import { memo, useId, useState, type FC } from 'react';
import BaseTab from './BaseTab';
import EventArt, { type EventArtSource } from './EventArt';
import EventUpgradesPanel from './EventUpgradesPanel';
import ProgressBar from './ProgressBar';
import {
  COLD_GOODS,
  MELON_FINISH_BONUSES,
  MELON_FINISH_MULTIPLIERS,
  MELON_VARIETIES,
  SUMMER_ART,
  SUMMER_EVENT_CONSTANTS,
  SUMMER_RECIPES
} from '../data/summerEventData';
import { describeCrewAction, getGoodPrice, iceCap, ownsUpgrade, parseMelonKey, picnicJobsPerSecond } from '../utils/summerPricing';
import { getEventUpgradeCost } from '../utils/eventUpgrades';
import type { UseSummerEventReturn } from '../hooks/useSummerEvent';
import type {
  MelonDecoration,
  MelonFinish,
  MelonInventory,
  PicnicCrewAction,
  StockMelon,
  SummerGood,
  SummerMaterials,
  SummerRecipe
} from '../types/summerEvent';
import frame from './SummerSections.module.css';
import styles from './JuiceStandTab.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

interface JuiceStandTabProps {
  event: UseSummerEventReturn;
  formatNumber: FormatNumber;
}

type MaterialName = keyof SummerMaterials;

const MATERIALS: Record<MaterialName, { label: string; one: string; many: string; art: EventArtSource }> = {
  seeds: { label: 'Seeds', one: 'seed', many: 'seeds', art: SUMMER_ART.seeds },
  splits: { label: 'Splits', one: 'split melon', many: 'split melons', art: SUMMER_ART.splits },
  rinds: { label: 'Rinds', one: 'rind', many: 'rinds', art: SUMMER_ART.rinds },
  ice: { label: 'Ice', one: 'block of ice', many: 'blocks of ice', art: SUMMER_ART.ice },
  cups: { label: 'Cups', one: 'cup of melon balls', many: 'cups of melon balls', art: SUMMER_ART.cups },
  agua: { label: 'Agua Fresca', one: 'pitcher of Agua Fresca', many: 'pitchers of Agua Fresca', art: SUMMER_ART.agua },
  pickles: { label: 'Pickled Rinds', one: 'jar of Pickled Rinds', many: 'jars of Pickled Rinds', art: SUMMER_ART.pickles },
  roasted: { label: 'Roasted Seeds', one: 'bag of Roasted Seeds', many: 'bags of Roasted Seeds', art: SUMMER_ART.roasted },
};

/** The stock chips: what the recipes and the finishing table use */
const STOCK_ORDER: MaterialName[] = ['splits', 'rinds', 'seeds', 'ice', 'cups'];

/** The melons the finishing table works on; giants can't be finished */
const STOCK_MELONS: StockMelon[] = ['sugarBaby', 'crimsonSweet'];

/** How many to craft per click; 'max' crafts as many as the materials allow */
type CraftQuantity = 1 | 5 | 10 | 'max';
const QUANTITIES: CraftQuantity[] = [1, 5, 10, 'max'];

const amountsOf = (amounts: Partial<SummerMaterials>) => Object.entries(amounts) as [MaterialName, number][];

/** "1 split melon" or "2 cups of melon balls and 1 rind" */
function describeAmounts(amounts: [MaterialName, number][], times: number): string {
  const parts = amounts.map(([material, amount]) => {
    const total = amount * times;
    return `${total} ${total === 1 ? MATERIALS[material].one : MATERIALS[material].many}`;
  });
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts.join('');
}

/** How many times a recipe can be crafted from these materials */
function maxCraftable(inputs: [MaterialName, number][], materials: SummerMaterials): number {
  if (inputs.length === 0) return 0;
  return Math.min(...inputs.map(([material, amount]) => Math.floor(materials[material] / amount)));
}

/** Melons of a kind with this finish in the inventory, any grade */
function countFinish(inventory: MelonInventory, variety: StockMelon, finish: MelonFinish): number {
  let count = 0;
  for (const [key, quantity] of Object.entries(inventory)) {
    const parts = parseMelonKey(key);
    if (parts.variety === variety && parts.finish === finish) count += quantity;
  }
  return count;
}

/** "+2 Tickets" or "×3 value" */
function finishBonus(finish: MelonFinish): string {
  const multiplier = MELON_FINISH_MULTIPLIERS[finish];
  return multiplier > 1 ? `×${multiplier}` : `+${MELON_FINISH_BONUSES[finish]}`;
}

// ============================================================================
// ICE HOUSE
// ============================================================================

interface IceHouseProps {
  owned: boolean;
  ice: number;
  cap: number;
  growth: number;
  /** Price of building it, in Tickets */
  cost: number;
  canAfford: boolean;
  onBuild: () => void;
}

const IceHouse: FC<IceHouseProps> = memo(({ owned, ice, cap, growth, cost, canAfford, onBuild }) => {
  const titleId = useId();
  const full = ice >= cap;
  const daysLeft = Math.max(0, Math.ceil(SUMMER_EVENT_CONSTANTS.ICE_INTERVAL - growth));
  const percent = full ? 100 : Math.min(100, (growth / SUMMER_EVENT_CONSTANTS.ICE_INTERVAL) * 100);

  return (
    <section className={styles.iceHouse} aria-labelledby={titleId}>
      <h3 id={titleId} className={styles.iceTitle}>
        <EventArt art={SUMMER_ART.ice} size={24} /> Ice House
        {owned && <span className={styles.iceCount}>{ice} / {cap}</span>}
      </h3>
      {owned ? (
        <>
          <ul className={`${styles.iceBlocks} ${cap > 10 ? styles.iceBlocksSmall : ''}`} aria-label={`${ice} of ${cap} blocks of ice`}>
            {Array.from({ length: cap }, (_, i) => (
              <li key={i} className={i < ice ? styles.iceBlock : `${styles.iceBlock} ${styles.iceEmpty}`}>
                <EventArt art={SUMMER_ART.ice} size={cap > 10 ? 18 : 30} />
              </li>
            ))}
          </ul>
          <div
            role="progressbar"
            aria-label="Next block of ice"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.floor(percent)}
          >
            <ProgressBar value={percent} max={100} height={10} color="#4F8FAD" />
          </div>
          <p className={styles.iceNote}>
            {full
              ? 'Full. Use a block to start the next one.'
              : `A block every ${SUMMER_EVENT_CONSTANTS.ICE_INTERVAL} days, next in ${daysLeft}.`}
            {' '}Spare ice sells as Snow Cones.
          </p>
        </>
      ) : (
        <>
          <p className={styles.iceNote}>
            It freezes a block every {SUMMER_EVENT_CONSTANTS.ICE_INTERVAL} days for chilling melons, up to {cap},
            and keeps going while you&apos;re away.
          </p>
          <button
            type="button"
            className={styles.buildButton}
            onClick={onBuild}
            disabled={!canAfford}
            aria-label={`Build the Ice House for ${cost} Tickets${canAfford ? '' : '. Not enough Tickets'}`}
          >
            Build the Ice House, {cost} Tickets
          </button>
        </>
      )}
    </section>
  );
});

IceHouse.displayName = 'IceHouse';

// ============================================================================
// FINISHING TABLE
// ============================================================================

interface FinishOption {
  label: string;
  /** Verb phrase for the button's accessible name */
  action: string;
  decorations: MelonDecoration[];
  finish: MelonFinish;
  art: EventArtSource;
  uses: string;
  className: string;
}

const FINISH_OPTIONS: FinishOption[] = [
  { label: 'Chill', action: 'Chill', decorations: ['chill'], finish: 'chilled', art: SUMMER_ART.ice, uses: '1 block of ice', className: styles.chillButton },
  { label: 'Carve', action: 'Carve', decorations: ['carve'], finish: 'carved', art: SUMMER_ART.carved, uses: '1 cup of melon balls', className: styles.carveButton },
  { label: 'Picnic Basket', action: 'Make a Picnic Basket from', decorations: ['chill', 'carve'], finish: 'basket', art: SUMMER_ART.basket, uses: '1 block of ice and 1 cup of melon balls', className: styles.basketButton },
];

interface FinishingTableProps {
  inventory: MelonInventory;
  ice: number;
  cups: number;
  unlocked: StockMelon[];
  onFinish: (variety: StockMelon, decorations: MelonDecoration[]) => boolean;
}

const FinishingTable: FC<FinishingTableProps> = memo(({ inventory, ice, cups, unlocked, onFinish }) => {
  const titleId = useId();

  return (
    <section className={styles.finishingTable} aria-labelledby={titleId}>
      <h3 id={titleId} className={styles.sectionTitle}>
        <EventArt art={SUMMER_ART.basket} size={20} /> Finishing Table
      </h3>
      {STOCK_MELONS.map(variety => {
        const definition = MELON_VARIETIES[variety];
        const plain = countFinish(inventory, variety, 'plain');
        const open = unlocked.includes(variety);
        return (
          <div key={variety} className={styles.finishRow}>
            <span className={styles.finishMelon}>
              <EventArt art={definition.art} size={30} />
              <span>
                <b>{definition.name}</b>
                <span className={styles.finishCount}>{open ? `${plain} plain` : 'Not unlocked yet'}</span>
              </span>
            </span>
            {FINISH_OPTIONS.map(option => {
              const needsIce = option.decorations.includes('chill');
              const needsCup = option.decorations.includes('carve');
              const missing = [
                needsIce && ice < 1 ? 'ice' : '',
                needsCup && cups < 1 ? 'melon balls' : ''
              ].filter(Boolean);
              const disabled = !open || plain < 1 || missing.length > 0;
              const reason = !open
                ? '. Not unlocked yet'
                : plain < 1
                  ? `. No plain ${definition.plural}`
                  : missing.length > 0 ? `. Not enough ${missing.join(' or ')}` : '';
              return (
                <button
                  key={option.finish}
                  type="button"
                  className={`${styles.finishButton} ${option.className}`}
                  onClick={() => onFinish(variety, option.decorations)}
                  disabled={disabled}
                  aria-label={`${option.action} a ${definition.name}. Uses ${option.uses}${reason}`}
                >
                  <EventArt art={option.art} size={18} /> {option.label}, {finishBonus(option.finish)}
                </button>
              );
            })}
          </div>
        );
      })}
      <p className={styles.finishNote}>
        Chill uses a block of ice, Carve a cup of melon balls, a Picnic Basket both. Sugar Melons keep their double price.
      </p>
    </section>
  );
});

FinishingTable.displayName = 'FinishingTable';

// ============================================================================
// RECIPE CARD
// ============================================================================

interface RecipeCardProps {
  recipe: SummerRecipe;
  materials: SummerMaterials;
  quantity: CraftQuantity;
  /** The upgrade that unlocks this recipe, while it is locked */
  lock: { name: string; cost: number; canAfford: boolean } | null;
  /** Whether the Picnic Crew is working on this recipe */
  isActive: boolean;
  onCraft: (recipeId: string, quantity?: number) => boolean;
  onUnlock: (upgradeId: string) => unknown;
}

const RecipeCard: FC<RecipeCardProps> = memo(({ recipe, materials, quantity, lock, isActive, onCraft, onUnlock }) => {
  const lockedBy = lock?.name ?? null;
  const inputs = amountsOf(recipe.inputs);
  const outputs = amountsOf(recipe.output);
  const [output] = outputs[0] ?? ['agua', 1];
  const count = quantity === 'max' ? maxCraftable(inputs, materials) : quantity;
  // Chips show the amounts for one craft when Max can't make any
  const shown = Math.max(1, count);
  const hasMaterials = count >= 1 && inputs.every(([material, amount]) => materials[material] >= amount * count);
  const canCraft = lockedBy === null && hasMaterials;

  const good = output as SummerGood;
  const price = getGoodPrice(good);
  const cold = COLD_GOODS.includes(good);
  const inStock = materials[output];

  const label = lockedBy
    ? `${recipe.name}: locked, requires the ${lockedBy}`
    : `Craft ${recipe.name} ×${count}: uses ${describeAmounts(inputs, shown)} to make ${describeAmounts(outputs, shown)}${hasMaterials ? '' : '. Not enough materials'}`;

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
          art={SUMMER_ART.crew}
          size={26}
          alt="The Picnic Crew is working on this"
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
        {outputs.map(([material, amount]) => (
          <span key={material} className={`${styles.chip} ${styles.outputChip}`}>
            <EventArt art={MATERIALS[material].art} size={16} alt={MATERIALS[material].label} /> +{amount * shown}
          </span>
        ))}
      </div>

      {lockedBy ? (
        <p className={styles.lockNote}>
          <InlineIcon src={ICON_LOCK} size={14} gap={4} />Needs the {lockedBy}
        </p>
      ) : (
        <p className={styles.stockLine}>
          {inStock} in stock · {price} Ticket{price === 1 ? '' : 's'}{cold ? `, ${getGoodPrice(good, true)} in a Heatwave` : ''}
        </p>
      )}

      {lock && recipe.requiredUpgrade ? (
        <button
          type="button"
          className={styles.unlockButton}
          onClick={() => onUnlock(recipe.requiredUpgrade!)}
          disabled={!lock.canAfford}
          aria-label={`Buy the ${lock.name} for ${lock.cost} Tickets, to make ${recipe.name}${lock.canAfford ? '' : '. Not enough Tickets'}`}
        >
          Buy the {lock.name}, {lock.cost} Tickets
        </button>
      ) : (
        <button
          type="button"
          className={styles.craftButton}
          onClick={() => onCraft(recipe.id, count)}
          disabled={!canCraft}
          aria-label={label}
          title={recipe.description}
        >
          Craft ×{count}
        </button>
      )}
    </li>
  );
});

RecipeCard.displayName = 'RecipeCard';

// ============================================================================
// PICNIC CREW
// ============================================================================

interface PicnicCrewBarProps {
  owned: boolean;
  jobsPerSecond: number;
  action?: PicnicCrewAction;
}

const PicnicCrewBar: FC<PicnicCrewBarProps> = memo(({ owned, jobsPerSecond, action }) => (
  <section className={frame.crewBar} aria-label="Picnic Crew">
    <EventArt art={SUMMER_ART.crew} size={22} />
    {owned ? (
      <>
        <b>Picnic Crew (Active)</b>
        <span className={frame.crewPill}>{jobsPerSecond} job{jobsPerSecond === 1 ? '' : 's'} per second</span>
        <span className={frame.crewNow}>Now: <b>{action ? describeCrewAction(action) : 'Waiting for work'}</b></span>
        <span className={frame.crewHint}>
          Packs Picnic Baskets, balls melons, mixes Agua Fresca, pickles rinds and roasts seeds, keeping {SUMMER_EVENT_CONSTANTS.CREW_SEED_RESERVE} for spitting.
        </span>
      </>
    ) : (
      <span>Hire the Picnic Crew to pack Picnic Baskets and work the recipes for you, even while you&apos;re away.</span>
    )}
  </section>
));

PicnicCrewBar.displayName = 'PicnicCrewBar';

// ============================================================================
// TAB
// ============================================================================

const JuiceStandTab: FC<JuiceStandTabProps> = ({ event, formatNumber }) => {
  const { materials, tickets, inventory, craftItem, finishMelon, currentCrewAction, purchaseUpgrade } = event;
  const { upgrades, iceGrowth } = event.eventState;
  const recipesTitleId = useId();
  const [quantity, setQuantity] = useState<CraftQuantity>(1);

  const crewOwned = ownsUpgrade(upgrades, 'picnic_crew');
  const activeRecipeId = crewOwned && currentCrewAction?.type === 'craft' ? currentCrewAction.recipeId : null;
  const unlockedMelons = STOCK_MELONS.filter(variety => ownsUpgrade(upgrades, MELON_VARIETIES[variety].unlockUpgrade));

  const lockFor = (recipe: SummerRecipe): RecipeCardProps['lock'] => {
    if (!recipe.requiredUpgrade || ownsUpgrade(upgrades, recipe.requiredUpgrade)) return null;
    const upgrade = upgrades.find(u => u.id === recipe.requiredUpgrade);
    const cost = upgrade ? getEventUpgradeCost(upgrade) : 0;
    return { name: upgrade?.name ?? recipe.requiredUpgrade, cost, canAfford: tickets >= cost };
  };
  const iceHouse = upgrades.find(u => u.id === 'unlock_ice_house');
  const iceHouseCost = iceHouse ? getEventUpgradeCost(iceHouse) : 0;

  const mainContent = (
    <div className={frame.container}>
      {/* Left column: stock, the Ice House and finishing table, recipes and the crew */}
      <div className={frame.leftColumn}>
        <div className={frame.headerRow}>
          <h2 className={frame.sectionTitle}>
            <EventArt art={SUMMER_ART.juiceStand} size={26} /> Juice Stand
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

        <div className={styles.iceAndFinish}>
          <IceHouse
            owned={ownsUpgrade(upgrades, 'unlock_ice_house')}
            ice={materials.ice}
            cap={iceCap(upgrades)}
            growth={iceGrowth}
            cost={iceHouseCost}
            canAfford={tickets >= iceHouseCost}
            onBuild={() => purchaseUpgrade('unlock_ice_house')}
          />
          <FinishingTable
            inventory={inventory}
            ice={materials.ice}
            cups={materials.cups}
            unlocked={unlockedMelons}
            onFinish={finishMelon}
          />
        </div>

        <section className={styles.section} aria-labelledby={recipesTitleId}>
          <div className={styles.sectionHeader}>
            <h3 id={recipesTitleId} className={styles.sectionTitle}>
              <EventArt art={SUMMER_ART.agua} size={20} /> Recipes
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
            {SUMMER_RECIPES.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                materials={materials}
                quantity={quantity}
                lock={lockFor(recipe)}
                isActive={activeRecipeId === recipe.id}
                onCraft={craftItem}
                onUnlock={purchaseUpgrade}
              />
            ))}
          </ul>
        </section>

        <PicnicCrewBar
          owned={crewOwned}
          jobsPerSecond={picnicJobsPerSecond(upgrades)}
          action={currentCrewAction}
        />
      </div>

      {/* Right column: Stand upgrades */}
      <div className={frame.rightColumn}>
        <EventUpgradesPanel
          title="Stand Upgrades"
          category="workshop"
          upgrades={upgrades}
          currency="tickets"
          balance={tickets}
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

const MemoizedJuiceStandTab = memo(JuiceStandTab);
MemoizedJuiceStandTab.displayName = 'JuiceStandTab';

export default MemoizedJuiceStandTab;
