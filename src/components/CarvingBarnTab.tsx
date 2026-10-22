/**
 * Carving Barn Tab Component
 *
 * Fall Pumpkin Rush crafting: bake pies, make candles and cut stencils, then
 * carve and light plain pumpkins. Mirrors the Christmas Workshop tab: the
 * Scarecrow Crew's status in a slim bar under the materials, recipe cards, a
 * decorating station and Barn upgrades on the right, all within a 1600x1000 window.
 */

import InlineIcon from './InlineIcon';
import { ICON_LOCK } from '../config/assetPaths';
import { memo, useId, useState, type FC } from 'react';
import BaseTab from './BaseTab';
import EventArt, { type EventArtSource } from './EventArt';
import EventUpgradesPanel from './EventUpgradesPanel';
import {
  CARVABLE_VARIETIES,
  PUMPKIN_ART,
  PUMPKIN_FINISH_BONUSES,
  PUMPKIN_FINISH_MULTIPLIERS,
  PUMPKIN_FINISH_NAMES,
  PUMPKIN_RECIPES,
  PUMPKIN_VARIETIES
} from '../data/pumpkinEventData';
import { crewJobsPerSecond, ownsUpgrade, parsePumpkinKey } from '../utils/pumpkinPricing';
import type { UsePumpkinEventReturn } from '../hooks/usePumpkinEvent';
import type {
  PumpkinDecoration,
  PumpkinFinish,
  PumpkinInventory,
  PumpkinMaterials,
  PumpkinRecipe,
  PumpkinVariety,
  ScarecrowCrewAction
} from '../types/pumpkinEvent';
import styles from './CarvingBarnTab.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

interface CarvingBarnTabProps {
  event: UsePumpkinEventReturn;
  formatNumber: FormatNumber;
}

type MaterialName = keyof PumpkinMaterials;

const MATERIALS: Record<MaterialName, { label: string; one: string; many: string; art: EventArtSource }> = {
  seeds: { label: 'Seeds', one: 'seed', many: 'seeds', art: PUMPKIN_ART.seeds },
  pulp: { label: 'Pulp', one: 'pulp', many: 'pulp', art: PUMPKIN_ART.pulp },
  vines: { label: 'Vines', one: 'vine', many: 'vines', art: PUMPKIN_ART.vines },
  pies: { label: 'Pies', one: 'pie', many: 'pies', art: PUMPKIN_ART.pies },
  candles: { label: 'Candles', one: 'candle', many: 'candles', art: PUMPKIN_ART.candles },
  stencils: { label: 'Stencils', one: 'stencil', many: 'stencils', art: PUMPKIN_ART.stencils },
};

const MATERIAL_ORDER: MaterialName[] = ['seeds', 'pulp', 'vines', 'pies', 'candles', 'stencils'];

/** How many to craft per click; 'max' crafts as many as the materials allow */
type CraftQuantity = 1 | 5 | 10 | 'max';
const QUANTITIES: CraftQuantity[] = [1, 5, 10, 'max'];

const amountsOf = (amounts: Partial<PumpkinMaterials>) => Object.entries(amounts) as [MaterialName, number][];

/** "4 pulp and 1 seed" */
function describeAmounts(amounts: [MaterialName, number][], times: number): string {
  const parts = amounts.map(([material, amount]) => {
    const total = amount * times;
    return `${total} ${total === 1 ? MATERIALS[material].one : MATERIALS[material].many}`;
  });
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts.join('');
}

/** How many times a recipe can be crafted from these materials */
function maxCraftable(inputs: [MaterialName, number][], materials: PumpkinMaterials): number {
  if (inputs.length === 0) return 0;
  return Math.min(...inputs.map(([material, amount]) => Math.floor(materials[material] / amount)));
}

/** Pumpkins of a variety with this finish in the inventory, any quality */
function countFinish(inventory: PumpkinInventory, variety: PumpkinVariety, finish: PumpkinFinish): number {
  let count = 0;
  for (const [key, quantity] of Object.entries(inventory)) {
    const parts = parsePumpkinKey(key);
    if (parts.variety === variety && parts.finish === finish) count += quantity;
  }
  return count;
}

/** "+2 Candy Corn" or "×3 value" */
function finishBonus(finish: PumpkinFinish): string {
  const multiplier = PUMPKIN_FINISH_MULTIPLIERS[finish];
  return multiplier > 1 ? `×${multiplier} value` : `+${PUMPKIN_FINISH_BONUSES[finish]} Candy Corn`;
}

/** What the Scarecrow Crew is doing, in words */
function crewActionText(action: ScarecrowCrewAction | undefined): string {
  if (!action) return 'Waiting for materials';
  if (action.type === 'craft') {
    return PUMPKIN_RECIPES.find(r => r.id === action.recipeId)?.name ?? 'Crafting';
  }
  const finishName = PUMPKIN_FINISH_NAMES[action.finish];
  return finishName ? `Decorating a pumpkin: ${finishName}` : 'Decorating a pumpkin';
}

// ============================================================================
// RECIPE CARD
// ============================================================================

interface RecipeCardProps {
  recipe: PumpkinRecipe;
  materials: PumpkinMaterials;
  quantity: CraftQuantity;
  /** Name of the upgrade that unlocks this recipe, while it is locked */
  lockedBy: string | null;
  /** Whether the Scarecrow Crew is working on this recipe */
  isActive: boolean;
  onCraft: (recipeId: string, quantity?: number) => boolean;
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
          art={PUMPKIN_ART.scarecrow}
          size={28}
          alt="Scarecrow Crew is working on this"
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
// CARVING STATION
// ============================================================================

interface DecorationOption {
  label: string;
  /** Verb phrase for the button's accessible name */
  action: string;
  decorations: PumpkinDecoration[];
  finish: PumpkinFinish;
  art: EventArtSource;
  uses: string;
}

const DECORATION_OPTIONS: DecorationOption[] = [
  { label: 'Carve', action: 'Carve', decorations: ['carving'], finish: 'carved', art: PUMPKIN_ART.carved, uses: '1 stencil' },
  { label: 'Light', action: 'Light', decorations: ['candle'], finish: 'candlelit', art: PUMPKIN_ART.candlelit, uses: '1 candle' },
  { label: "Jack-o'-Lantern", action: "Make a Jack-o'-Lantern from", decorations: ['carving', 'candle'], finish: 'lantern', art: PUMPKIN_ART.lantern, uses: '1 stencil and 1 candle' },
];

interface CarvingStationProps {
  inventory: PumpkinInventory;
  stencils: number;
  candles: number;
  onDecorate: (variety: PumpkinVariety, decorations: PumpkinDecoration[]) => boolean;
}

const CarvingStation: FC<CarvingStationProps> = memo(({ inventory, stencils, candles, onDecorate }) => {
  const titleId = useId();
  const [variety, setVariety] = useState<PumpkinVariety>(CARVABLE_VARIETIES[0]);
  const plain = countFinish(inventory, variety, 'plain');
  const varietyName = PUMPKIN_VARIETIES[variety].name;

  return (
    <section className={styles.carvingSection} aria-labelledby={titleId}>
      <div className={styles.sectionHeader}>
        <h3 id={titleId} className={styles.sectionTitle}>
          <EventArt art={PUMPKIN_ART.lantern} size={20} /> Carving Station
        </h3>
        <span className={styles.supplies}>
          <EventArt art={PUMPKIN_ART.stencils} size={16} alt="Stencils" /> {stencils}
          <EventArt art={PUMPKIN_ART.candles} size={16} alt="Candles" /> {candles}
        </span>
      </div>

      <div className={styles.varietyButtons} role="group" aria-label="Pumpkin to decorate">
        {CARVABLE_VARIETIES.map(option => {
          const count = countFinish(inventory, option, 'plain');
          const name = PUMPKIN_VARIETIES[option].name;
          return (
            <button
              key={option}
              type="button"
              className={styles.varietyButton}
              onClick={() => setVariety(option)}
              aria-pressed={variety === option}
              aria-label={`${name}: ${count} plain pumpkin${count === 1 ? '' : 's'}`}
            >
              <EventArt art={PUMPKIN_VARIETIES[option].art} size={18} /> {name} ({count})
            </button>
          );
        })}
      </div>

      <div className={styles.decorateButtons}>
        {DECORATION_OPTIONS.map(option => {
          const needsStencil = option.decorations.includes('carving');
          const needsCandle = option.decorations.includes('candle');
          const missing = [
            needsStencil && stencils < 1 ? 'stencils' : '',
            needsCandle && candles < 1 ? 'candles' : ''
          ].filter(Boolean);
          const disabled = plain < 1 || missing.length > 0;
          const reason = plain < 1
            ? `. No plain ${varietyName} pumpkins`
            : missing.length > 0 ? `. Not enough ${missing.join(' or ')}` : '';
          return (
            <button
              key={option.finish}
              type="button"
              className={`${styles.decorateButton} ${option.finish === 'lantern' ? styles.lanternButton : ''}`}
              onClick={() => onDecorate(variety, option.decorations)}
              disabled={disabled}
              aria-label={`${option.action} a ${varietyName} pumpkin. Uses ${option.uses}${reason}`}
            >
              <span className={styles.decorateLabel}>
                <EventArt art={option.art} size={18} /> {option.label}
              </span>
              <span className={styles.decorateDetail}>Uses {option.uses} · {finishBonus(option.finish)}</span>
            </button>
          );
        })}
      </div>

      <p className={styles.finishedLine}>
        {varietyName} in stock: {plain} plain · {countFinish(inventory, variety, 'carved')} carved
        · {countFinish(inventory, variety, 'candlelit')} candlelit · {countFinish(inventory, variety, 'lantern')} Jack-o'-Lanterns
      </p>
    </section>
  );
});

CarvingStation.displayName = 'CarvingStation';

// ============================================================================
// SCARECROW CREW
// ============================================================================

interface ScarecrowCrewPanelProps {
  owned: boolean;
  jobsPerSecond: number;
  action?: ScarecrowCrewAction;
}

/** The crew's status in one line, fixed-width parts first so the bar holds still as jobs change */
const ScarecrowCrewPanel: FC<ScarecrowCrewPanelProps> = memo(({ owned, jobsPerSecond, action }) => (
  <section
    className={owned ? `${styles.crewBar} ${styles.crewActive}` : styles.crewBar}
    aria-label="Scarecrow Crew"
    title={owned ? 'Each job, the crew makes candles, then vine stencils, then pies, then seed stencils, and carves or lights plain pumpkins when nothing is left to craft. Harvested pumpkins are finished with the best decorations available.' : undefined}
  >
    <h3 className={styles.crewTitle}>
      <EventArt art={PUMPKIN_ART.scarecrow} size={22} /> Scarecrow Crew{owned ? ' (Active)' : ''}
    </h3>
    {owned ? (
      <>
        <p className={styles.crewRate}>
          {jobsPerSecond} job{jobsPerSecond === 1 ? '' : 's'} per second
        </p>
        <p className={styles.crewNow}>
          Now: <strong>{crewActionText(action)}</strong>
        </p>
      </>
    ) : (
      <p className={styles.lockedMessage}>
        Buy the Scarecrow Crew upgrade to automate crafting, carving and lighting!
      </p>
    )}
  </section>
));

ScarecrowCrewPanel.displayName = 'ScarecrowCrewPanel';

// ============================================================================
// TAB
// ============================================================================

const CarvingBarnTab: FC<CarvingBarnTabProps> = ({ event, formatNumber }) => {
  const { materials, candyCorn, craftItem, decoratePumpkin, currentCrewAction, purchaseUpgrade } = event;
  const { upgrades, inventory } = event.eventState;
  const recipesTitleId = useId();
  const [quantity, setQuantity] = useState<CraftQuantity>(1);

  const crewOwned = ownsUpgrade(upgrades, 'scarecrow_crew');
  const jobsPerSecond = crewJobsPerSecond(upgrades);
  const activeRecipeId = crewOwned && currentCrewAction?.type === 'craft' ? currentCrewAction.recipeId : null;

  const lockedBy = (recipe: PumpkinRecipe): string | null => {
    if (!recipe.requiredUpgrade || ownsUpgrade(upgrades, recipe.requiredUpgrade)) return null;
    return upgrades.find(u => u.id === recipe.requiredUpgrade)?.name ?? recipe.requiredUpgrade;
  };

  const mainContent = (
    <div className={styles.container}>
      {/* Left column: materials, the crew, recipes and carving */}
      <div className={styles.leftColumn}>
        <div className={styles.headerRow}>
          <h2 className={styles.barnTitle}>
            <EventArt art={PUMPKIN_ART.barn} size={24} /> Carving Barn
          </h2>
          <ul className={styles.materialsList} aria-label="Materials">
            {MATERIAL_ORDER.map(material => (
              <li key={material} className={styles.materialItem}>
                <EventArt art={MATERIALS[material].art} size={20} />
                <span className={styles.materialLabel}>{MATERIALS[material].label}</span>
                <span className={styles.materialValue}>{formatNumber(materials[material], 0)}</span>
              </li>
            ))}
          </ul>
        </div>

        <ScarecrowCrewPanel
          owned={crewOwned}
          jobsPerSecond={jobsPerSecond}
          action={currentCrewAction}
        />

        <section className={styles.craftingSection} aria-labelledby={recipesTitleId}>
          <div className={styles.sectionHeader}>
            <h3 id={recipesTitleId} className={styles.sectionTitle}>
              <EventArt art={PUMPKIN_ART.pies} size={20} /> Recipes
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
            {PUMPKIN_RECIPES.map(recipe => (
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

        <CarvingStation
          inventory={inventory}
          stencils={materials.stencils}
          candles={materials.candles}
          onDecorate={decoratePumpkin}
        />

      </div>

      {/* Right column: Barn upgrades */}
      <div className={styles.rightColumn}>
        <EventUpgradesPanel
          title="Barn Upgrades"
          category="workshop"
          upgrades={upgrades}
          currency="candyCorn"
          balance={candyCorn}
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

const MemoizedCarvingBarnTab = memo(CarvingBarnTab);
MemoizedCarvingBarnTab.displayName = 'CarvingBarnTab';

export default MemoizedCarvingBarnTab;
