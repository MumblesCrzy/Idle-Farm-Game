/**
 * The Engineers' Cannery: the factory floor that takes the Kitchen's place for committed
 * members. The hopper of crops and honey on the left; the machines in the middle, each making
 * the recipe it is set to again and again while the hopper has the ingredients; the floor's
 * stats and upgrades on the right. The floor keeps one size: as Batch Canning adds machines,
 * up to 16, they get smaller, so every one of them fits the window.
 */
import { memo, useCallback, useMemo, useState, type FC } from 'react';
import PantryPanel from './PantryPanel';
import CanningUpgradesPanel from './CanningUpgradesPanel';
import MachineRecipePicker from './MachineRecipePicker';
import { glideRing, useGlide } from '../hooks/useGlide';
import type { CanningMachine, CanningProcess, CanningState, Recipe } from '../types/canning';
import type { GuildState } from '../types/guilds';
import type { RecipeSort, Veggie } from '../types/game';
import { getBatchTime, shortOf as hopperShortOf } from '../utils/canningSimulation';
import { getEffectiveSalePrice, recipeIcons, sortRecipesByPreference, type RecipeValueContext } from '../utils/recipeHelpers';
import {
  GEAR_SOURCES,
  getGuildCanningTimeMultiplier,
  getJarsPerBatch,
  getStandardGradeJarMultiplier
} from '../utils/guildCalculations';
import { machineSpeed } from '../utils/stanley';
import { ICON_CANNING, ICON_GEARS } from '../config/assetPaths';
import styles from './FactoryFloor.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

/** Machines a floor can hold: one, and Batch Canning's 15 more */
const MAX_MACHINES = 16;
/** The machines' area keeps this height, whatever the number of machines */
const FLOOR_HEIGHT = 610;
const GAP = 10;

type Density = 'roomy' | 'medium' | 'compact';

/**
 * Columns, row height and how much each machine shows, for this many bays: big machines three
 * to a row up to 5 machines, medium ones four to a row up to 11, compact ones from 12 to 16
 */
function floorLayout(bays: number): { columns: number; rowHeight: number; density: Density } {
  const columns = bays <= 6 ? 3 : 4;
  const rows = Math.max(1, Math.ceil(bays / columns));
  const rowHeight = Math.min(300, Math.floor((FLOOR_HEIGHT - GAP * (rows - 1)) / rows));
  const density: Density = columns === 3 && rowHeight >= 250 ? 'roomy' : rowHeight >= 180 ? 'medium' : 'compact';
  return { columns, rowHeight, density };
}

const DENSITY_CLASS: Record<Density, string> = {
  roomy: '',
  medium: styles.medium,
  compact: styles.compact
};

type MachineState = 'running' | 'starting' | 'waiting' | 'off';

const STATE_TEXT: Record<MachineState, string> = {
  running: 'Running',
  starting: 'Starting',
  waiting: 'Waiting',
  off: 'No recipe'
};

interface MachineCardProps {
  index: number;
  machine: CanningMachine;
  process?: CanningProcess;
  recipe?: Recipe;
  /** What the hopper is short of while the machine waits, with how many it has and a batch needs */
  short: string | null;
  have?: number;
  need?: number;
  value: number;
  time: number;
  /** How fast the machines run: twice as fast in Stanley's Tune-Up */
  speed: number;
  jarsPerBatch: number;
  density: Density;
  onPick: (machine: number) => void;
  formatNumber: FormatNumber;
}

/** One machine: its plate and light, its recipe, a gauge of the batch it is making, and its output */
const MachineCard: FC<MachineCardProps> = memo(({
  index,
  machine,
  process,
  recipe,
  short,
  have,
  need,
  value,
  time,
  speed,
  jarsPerBatch,
  density,
  onPick,
  formatNumber
}) => {
  const done = process && process.totalTime > 0
    ? Math.min(100, ((process.totalTime - process.remainingTime) / process.totalTime) * 100)
    : 0;
  // The gauge glides between game steps, and snaps back for the next batch
  const glides = useGlide(done);
  const state: MachineState = process ? 'running' : !recipe ? 'off' : short ? 'waiting' : 'starting';
  const secondsLeft = process ? Math.max(0, Math.ceil(process.remainingTime / speed)) : 0;
  const name = `Machine ${index + 1}`;
  let waitNote: string | null = null;
  if (short) {
    waitNote = density !== 'roomy' || have === undefined || need === undefined
      ? `Waiting for ${short}`
      : have < 1
        ? `Waiting for ${short}: the hopper has none`
        : `Waiting for ${short}: a batch needs ${formatNumber(need, 2)}, the hopper has ${formatNumber(have, 2)}`;
  }

  return (
    <li className={state === 'waiting' ? `${styles.machine} ${styles.waiting}` : styles.machine}>
      <div className={styles.plate}>
        <span className={styles.plateName}>{name}</span>
        <span className={`${styles.light} ${state === 'waiting' ? styles.amber : state === 'off' ? '' : styles.go}`} aria-hidden="true" />
        <span className={styles.state}>{STATE_TEXT[state]}</span>
      </div>
      <button
        type="button"
        className={styles.pick}
        onClick={() => onPick(index)}
        aria-label={`${name}: ${recipe ? recipe.name : 'no recipe'}. Pick its recipe`}
      >
        {recipe && recipeIcons(recipe).slice(0, density === 'roomy' ? 4 : 2).map((icon, i) => <img key={i} src={icon} alt="" />)}
        <span className={styles.pickName}>{recipe ? recipe.name : 'Pick a recipe'}</span>
        <span className={styles.caret} aria-hidden="true">{density === 'roomy' ? 'Change ▾' : '▾'}</span>
      </button>
      <div className={styles.dial}>
        <span className={`${styles.gauge} glide-ring`} style={glideRing(done, glides)} aria-hidden="true">
          <span>{process ? `${secondsLeft}s` : state === 'off' ? 'Off' : 'Idle'}</span>
        </span>
        {recipe ? (
          <div className={styles.facts}>
            <span>Each batch <b className={styles.price}>${formatNumber(value, 2)}</b></span>
            <span>Takes <b>{time} s</b>{speed > 1 && <b className={styles.fast}> ×2</b>}</span>
            <span>Made <b>{formatNumber(machine.jarsMade)} {machine.jarsMade === 1 ? 'jar' : 'jars'}</b></span>
          </div>
        ) : (
          <p className={styles.idleNote}>Pick a recipe to start it</p>
        )}
      </div>
      {waitNote && <p className={styles.warn}>{waitNote}</p>}
      {density === 'roomy' && recipe && (
        <div className={styles.tray} aria-hidden="true">
          {Array.from({ length: Math.min(jarsPerBatch, 6) }, (_, i) => <img key={i} src={ICON_CANNING} alt="" />)}
          <span>{jarsPerBatch} {jarsPerBatch === 1 ? 'jar' : 'jars'} a batch</span>
        </div>
      )}
      {process && <span className="sr-only">{`${name} is making ${recipe?.name ?? 'a batch'}, ${secondsLeft} seconds left`}</span>}
    </li>
  );
});

MachineCard.displayName = 'MachineCard';

interface FactoryFloorProps {
  canningState: CanningState;
  veggies: Veggie[];
  /** Crops recipes use, for the hopper */
  hopperCrops: Array<{ name: string; stash: number }>;
  showHoney: boolean;
  regularHoney: number;
  goldenHoney: number;
  heirloomOwned: boolean;
  money: number;
  knowledge: number;
  guildState: GuildState;
  recipeSort: RecipeSort;
  /** The next recipe canning experience opens */
  nextRecipe?: Recipe;
  onSetMachineRecipe: (machine: number, recipeId: string | null) => void;
  purchaseUpgrade: (upgradeId: string) => boolean;
  toggleAutoCanning: () => void;
  formatNumber: FormatNumber;
}

const FactoryFloor: FC<FactoryFloorProps> = memo(({
  canningState,
  veggies,
  hopperCrops,
  showHoney,
  regularHoney,
  goldenHoney,
  heirloomOwned,
  money,
  knowledge,
  guildState,
  recipeSort,
  nextRecipe,
  onSetMachineRecipe,
  purchaseUpgrade,
  toggleAutoCanning,
  formatNumber
}) => {
  const [picking, setPicking] = useState<number | null>(null);
  const closePicker = useCallback(() => setPicking(null), []);
  const pick = useCallback((recipeId: string | null) => {
    if (picking !== null) onSetMachineRecipe(picking, recipeId);
    setPicking(null);
  }, [picking, onSetMachineRecipe]);

  const machines = canningState.machines ?? [];
  const speed = machineSpeed(guildState);
  const jarsPerBatch = getJarsPerBatch(guildState);
  const efficiencyMultiplier = canningState.upgrades.find(u => u.id === 'canning_efficiency')?.effect || 1;
  const valueContext = useMemo<RecipeValueContext>(
    () => ({ veggies, heirloomOwned, efficiencyMultiplier, guildState }),
    [veggies, heirloomOwned, efficiencyMultiplier, guildState]
  );
  const valueOf = useCallback((recipe: Recipe) => getEffectiveSalePrice(recipe, valueContext), [valueContext]);
  const timeOf = useCallback((recipe: Recipe) => getBatchTime(recipe, canningState.upgrades, guildState), [canningState.upgrades, guildState]);
  const shortOf = useCallback(
    (recipe: Recipe) => hopperShortOf(recipe, veggies, { regular: regularHoney, golden: goldenHoney }),
    [veggies, regularHoney, goldenHoney]
  );
  const unlocked = useMemo(
    () => sortRecipesByPreference(canningState.recipes.filter(recipe => recipe.unlocked), recipeSort, valueContext),
    [canningState.recipes, recipeSort, valueContext]
  );

  // The next machine's bay shows until the floor is full
  const bays = Math.min(MAX_MACHINES, machines.length + 1);
  const { columns, rowHeight, density } = floorLayout(bays);

  const floorProcesses = canningState.activeProcesses.filter(process => process.machine !== undefined);
  const batchesPerMinute = floorProcesses.reduce((sum, process) => (process.totalTime > 0 ? sum + (60 * speed) / process.totalTime : sum), 0);
  const nextGear = GEAR_SOURCES.batches - (guildState.gearProgress?.batches ?? 0);
  const timeCut = Math.round((1 - getGuildCanningTimeMultiplier(guildState)) * 100);
  const gradeCut = Math.round((1 - getStandardGradeJarMultiplier(guildState)) * 100);

  return (
    <div className={styles.cannery}>
      <PantryPanel
        crops={hopperCrops}
        showHoney={showHoney}
        regularHoney={regularHoney}
        goldenHoney={goldenHoney}
        formatNumber={formatNumber}
        title="Hopper"
        hopper
      />

      <section className={styles.floor} aria-labelledby="floor-heading">
        <div className={styles.floorHeader}>
          <img src={ICON_CANNING} alt="" />
          <h2 id="floor-heading" className={styles.floorTitle}>
            Factory floor · {machines.length} {machines.length === 1 ? 'machine' : 'machines'}
          </h2>
          <span className={styles.floorNote}>Each machine makes its recipe again and again while the hopper has the ingredients</span>
        </div>
        <ul
          className={`${styles.machines} ${DENSITY_CLASS[density]}`}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoRows: `${rowHeight}px` }}
          aria-label="Machines"
        >
          {machines.map((machine, index) => {
            const process = canningState.activeProcesses.find(p => p.machine === index);
            const recipe = machine.recipeId ? canningState.recipes.find(r => r.id === machine.recipeId) : undefined;
            const short = !process && recipe ? shortOf(recipe) : null;
            const lacking = short && recipe ? recipe.ingredients.find(ingredient => ingredient.veggieName === short) : undefined;
            const have = lacking
              ? veggies[lacking.veggieIndex]?.stash ?? 0
              : short === 'Honey' ? regularHoney : short === 'Golden Honey' ? goldenHoney : undefined;
            const need = lacking
              ? lacking.quantity
              : short === 'Honey' ? recipe?.honeyRequirement?.regular : short === 'Golden Honey' ? recipe?.honeyRequirement?.golden : undefined;
            return (
              <MachineCard
                key={index}
                index={index}
                machine={machine}
                process={process}
                recipe={recipe}
                short={short}
                have={have}
                need={need}
                value={recipe ? valueOf(recipe) : 0}
                time={recipe ? timeOf(recipe) : 0}
                speed={speed}
                jarsPerBatch={jarsPerBatch}
                density={density}
                onPick={setPicking}
                formatNumber={formatNumber}
              />
            );
          })}
          {machines.length < MAX_MACHINES && (
            <li className={styles.bay}>
              <b>Machine {machines.length + 1}</b>
              <span>{density === 'compact' ? 'Batch Canning adds it' : 'Batch Canning, in the upgrades, adds this machine'}</span>
            </li>
          )}
        </ul>
      </section>

      <div className={styles.side}>
        <section className={styles.stats} aria-labelledby="floor-stats-heading">
          <div className={styles.statsHeader}>
            <h2 id="floor-stats-heading" className={styles.cap}>Floor</h2>
            <span className={styles.gears} title="Gears: 1 for every 5 batches off the floor">
              <img src={ICON_GEARS} alt="" />
              {formatNumber(guildState.guildCurrencies.engineers)}
              <span className="sr-only"> Gears</span>
            </span>
          </div>
          <div className={styles.stat}><span>Machines running</span><b>{floorProcesses.length} of {machines.length}</b></div>
          <div className={styles.stat}><span>Batches a minute</span><b>{formatNumber(batchesPerMinute, 1)}</b></div>
          <div className={styles.stat}><span>Jars an hour</span><b>{formatNumber(batchesPerMinute * 60 * jarsPerBatch, 0)}</b></div>
          <div className={styles.stat}><span>Next Gear</span><b>in {nextGear} {nextGear === 1 ? 'batch' : 'batches'}</b></div>
          <div className={styles.stat}><span>Batch time</span><b>-{timeCut}% · Industrial</b></div>
          <div className={styles.stat}><span>Jar value</span><b>-{gradeCut}% · Standard Grade</b></div>
          <div className={styles.stat}><span>Canning experience</span><b>{formatNumber(canningState.canningExperience)}</b></div>
          {nextRecipe && (
            <div className={styles.stat}><span>Next recipe at</span><b>{formatNumber(nextRecipe.experienceRequired)} exp</b></div>
          )}
        </section>

        <CanningUpgradesPanel
          upgrades={canningState.upgrades}
          money={money}
          knowledge={knowledge}
          onPurchaseUpgrade={purchaseUpgrade}
          canningState={canningState}
          onToggleAutoCanning={toggleAutoCanning}
          floor
        />
      </div>

      <MachineRecipePicker
        machine={picking}
        currentRecipeId={picking !== null ? machines[picking]?.recipeId ?? null : null}
        recipes={unlocked}
        valueOf={valueOf}
        timeOf={timeOf}
        shortOf={shortOf}
        onPick={pick}
        onClose={closePicker}
        formatNumber={formatNumber}
      />
    </div>
  );
});

FactoryFloor.displayName = 'FactoryFloor';

export default FactoryFloor;
