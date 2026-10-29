/**
 * The garden on the Growing tab: a raised bed for every crop of a kind, five to a row. Each bed
 * has a sign with the crop's name, a ring that fills as it grows, Sell or Hold, the Auto
 * Harvester, upgrade levels with their auto-buyers, and Harvest. A click anywhere on a bed, away
 * from its working buttons, shows that crop's upgrades in the tool shed; from the keyboard, its
 * sign does the same. Every bed is the same size, so nothing moves as crops grow, unlock or get
 * picked. For the Engineers the machines harvest, so each bed shows its Auto Harvester's next pass
 * where Harvest would be.
 */
import { memo, type FC, type MouseEvent } from 'react';
import type { Veggie } from '../types/game';
import type { GuildState } from '../types/guilds';
import {
  getVeggieImage,
  GUILD_MERCHANTS,
  ICON_AUTOMATION,
  ICON_CRATE,
  ICON_KNOWLEDGE,
  ICON_LOCK,
  ICON_MONEY,
  UPGRADE_ADDITIONAL_PLOT,
  UPGRADE_AUTO_HARVESTER,
  UPGRADE_BETTER_SEEDS,
  UPGRADE_FERTILIZER,
  UPGRADE_HARVESTER_SPEED
} from '../config/assetPaths';
import { AUTO_PURCHASER_CYCLE_DAYS, GROWTH_COMPLETE_THRESHOLD, veggieSeasonBonuses } from '../config/gameConstants';
import { getHarvesterInterval } from '../utils/gameLoopProcessors';
import { glideFill, glideRing, useGlide } from '../hooks/useGlide';
import { getHotTipMultiplier, hasHandsOff } from '../utils/guildCalculations';
import { machineSpeed } from '../utils/stanley';
import type { PayrollControl } from '../hooks/usePayroll';
import styles from './CropGarden.module.css';

export type CropGroup = 'vegetables' | 'fruits';

type FormatNumber = (num: number, decimalPlaces?: number) => string;
type CropHandler = (index: number) => void;

/** An auto-buyer's state on a crop: buying, switched off, or not hired */
type BuyerState = 'on' | 'paused' | 'none';

const BUYER_TEXT: Record<BuyerState, string> = {
  on: 'auto-buyer on',
  paused: 'auto-buyer paused',
  none: 'no auto-buyer'
};

const DOT_CLASS: Record<BuyerState, string> = {
  on: styles.dotOn,
  paused: styles.dotPaused,
  none: styles.dotNone
};

/** The crops on the Vegetables and Fruits switch */
const GROUP_ART: Record<CropGroup, string> = {
  vegetables: getVeggieImage('Lettuce'),
  fruits: getVeggieImage('Strawberry')
};

const buyerState = (crop: Veggie, id: string): BuyerState => {
  const buyer = crop.autoPurchasers.find(ap => ap.id === id);
  if (!buyer?.owned) return 'none';
  return buyer.active ? 'on' : 'paused';
};

const isFruit = (crop: Veggie) => crop.cropType === 'fruit';

/** "~13 days" from a crop's growth per game day */
const daysToGrowText = (growthMultiplier: number) =>
  growthMultiplier > 0 ? `~${Math.ceil(100 / growthMultiplier)} days` : 'Not growing';

interface ToolProps {
  icon: string;
  label: string;
  /** The level, or null for an upgrade the crop can't take yet */
  level: number | null;
  buyer: BuyerState;
  maxed?: boolean;
}

/** An upgrade's level on a bed, with a dot for the auto-buyer that buys it */
const Tool: FC<ToolProps> = ({ icon, label, level, buyer, maxed = false }) => {
  const text = level === null
    ? `${label}: needs an Auto Harvester`
    : `${label}: level ${level}${maxed ? ' (max)' : ''}, ${BUYER_TEXT[buyer]}`;
  return (
    <span className={styles.tool} title={text}>
      <img src={icon} alt="" aria-hidden="true" />
      <b className={maxed ? styles.levelMax : undefined} aria-hidden="true">{level ?? '-'}</b>
      <span className={`${styles.dot} ${DOT_CLASS[buyer]}`} aria-hidden="true" />
      <span className="sr-only">{text}</span>
    </span>
  );
};

interface BedProps {
  crop: Veggie;
  index: number;
  isActive: boolean;
  /** No free plots, so locked crops wait for a larger farm */
  farmFull: boolean;
  /** The first locked bed explains in full; the rest say it short */
  fullLockNote: boolean;
  money: number;
  growthMultiplier: number;
  /** The guild's effect on the Auto Harvester */
  guildState?: GuildState;
  onSelect: CropHandler;
  onHarvest: CropHandler;
  onToggleSell: CropHandler;
  onBuyHarvester: CropHandler;
  formatNumber: FormatNumber;
}

const Bed: FC<BedProps> = memo(({
  crop,
  index,
  isActive,
  farmFull,
  fullLockNote,
  money,
  growthMultiplier,
  guildState,
  onSelect,
  onHarvest,
  onToggleSell,
  onBuyHarvester,
  formatNumber
}) => {
  const art = getVeggieImage(crop.name);
  const growth = Math.min(100, Math.max(0, crop.growth));
  const interval = getHarvesterInterval(crop, guildState);
  const harvesterShare = interval > 0 ? Math.min(100, (crop.harvesterTimer / interval) * 100) : 0;
  // The ring and bars glide between game steps, and snap back after a harvest
  const growthGlides = useGlide(growth);
  const harvesterGlides = useGlide(harvesterShare);

  if (!crop.unlocked) {
    return (
      <li className={`${styles.bed} ${styles.lockedBed}`}>
        <div className={styles.lockedSign}>{crop.name}</div>
        <img src={art} alt="" aria-hidden="true" className={styles.ghost} />
        <div className={styles.post}>
          <img src={ICON_LOCK} alt="" aria-hidden="true" />
          {!farmFull
            ? `Unlocks at ${formatNumber(crop.experienceToUnlock, 2)} Growing Experience`
            : fullLockNote
              ? 'Needs a larger farm. Buy the next Farm Tier to plant it'
              : 'Needs a larger farm'}
        </div>
      </li>
    );
  }

  const ready = crop.growth >= GROWTH_COMPLETE_THRESHOLD;
  // The Engineers' machines take every harvest (Hands Off), so the bed shows the machine instead
  const machine = hasHandsOff(guildState);
  // Stanley's Tune-Up counts the harvester down twice as fast
  const speed = machineSpeed(guildState);
  // Ferdinand's Hot Tip: what is marked Sell sells for double
  const hotTip = crop.sellEnabled && getHotTipMultiplier(guildState) > 1;
  const secondsToPass = Math.max(0, Math.ceil((interval - crop.harvesterTimer) / speed));
  const machineText = ready ? `Next pass ${secondsToPass} s` : secondsToPass > 0 ? `${secondsToPass} s` : 'Waiting';
  const secondsToGrow = growthMultiplier > 0 ? Math.max(0, Math.ceil((100 - crop.growth) / growthMultiplier)) : null;
  const days = daysToGrowText(growthMultiplier);
  const bedClass = [
    styles.bed,
    isFruit(crop) ? styles.fruitBed : '',
    ready ? styles.ripeBed : '',
    isActive ? styles.pickedBed : ''
  ].filter(Boolean).join(' ');

  // A click anywhere on the bed picks the crop, apart from the buttons that can act. One that
  // can't, like Growing, passes the click on to the bed.
  const pickFromBed = (event: MouseEvent<HTMLLIElement>) => {
    const button = (event.target as Element).closest('button');
    if (!button || button.disabled) onSelect(index);
  };

  return (
    <li className={bedClass} onClick={pickFromBed}>
      <button
        type="button"
        className={styles.sign}
        onClick={() => onSelect(index)}
        aria-pressed={isActive}
        title={`Bonus growth: ${veggieSeasonBonuses[crop.name]?.join(', ') ?? 'None'}`}
      >
        <b>{crop.name}</b> <small>{days}</small>
      </button>

      <div
        className={styles.plant}
        title={secondsToGrow === null ? 'Not growing right now' : `Growth: ${secondsToGrow} seconds until grown`}
      >
        <span
          className={`${styles.ring} ${ready ? styles.ripeRing : ''} glide-ring`}
          style={glideRing(growth, growthGlides)}
          aria-hidden="true"
        >
          <span><img src={art} alt="" /></span>
        </span>
        <span className={ready ? styles.ripeChip : styles.growthChip}>
          {ready ? 'Ripe!' : `${Math.floor(growth)}% grown`}
        </span>
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={crop.sellEnabled ? styles.sellPill : styles.holdPill}
          onClick={() => onToggleSell(index)}
          aria-label={crop.sellEnabled ? `${crop.name}: Sell. Click to Hold` : `${crop.name}: Hold. Click to Sell`}
          title={hotTip
            ? 'Sold for double during the Hot Tip, by Sell All and the Merchant (click to Hold)'
            : crop.sellEnabled ? 'Sold by Sell All and the Merchant (click to Hold)' : 'Kept in the stash (click to Sell)'}
        >
          <img src={crop.sellEnabled ? ICON_MONEY : ICON_CRATE} alt="" aria-hidden="true" />
          {crop.sellEnabled ? 'Sell' : 'Hold'}
          {hotTip && <span className={styles.hotTipMark}>×2</span>}
        </button>
        {machine ? (
          speed > 1 && <span className={styles.tuneUpChip} title="Stanley's Tune-Up: this machine runs twice as fast">×2</span>
        ) : !crop.harvesterOwned ? (
          <button
            type="button"
            className={styles.buyHarvester}
            onClick={() => onBuyHarvester(index)}
            disabled={money < crop.harvesterCost}
            aria-label={`Auto Harvester for ${crop.name}: Buy · $${formatNumber(crop.harvesterCost, 1)}`}
          >
            <img src={UPGRADE_AUTO_HARVESTER} alt="" aria-hidden="true" />
            Buy · ${formatNumber(crop.harvesterCost, 1)}
          </button>
        ) : crop.autoHarvesterEnabled ? (
          <span
            className={styles.harvester}
            title={`Auto Harvester: ${secondsToPass} seconds until next harvest attempt`}
          >
            <img src={UPGRADE_AUTO_HARVESTER} alt="Auto Harvester" />
            <span className={styles.harvesterBar}><span className="glide" style={glideFill(harvesterShare, harvesterGlides)} /></span>
            <em>{interval} s</em>
          </span>
        ) : (
          <span className={styles.harvester} title="Auto Harvester paused: switch it on in the shed">
            <img src={UPGRADE_AUTO_HARVESTER} alt="Auto Harvester" />
            <em className={styles.paused}>Paused</em>
          </span>
        )}
      </div>

      <div className={styles.tools}>
        <Tool
          icon={UPGRADE_FERTILIZER}
          label="Fertilizer"
          level={crop.fertilizerLevel}
          buyer={buyerState(crop, 'assistant')}
          maxed={crop.fertilizerLevel >= crop.fertilizerMaxLevel}
        />
        <Tool icon={UPGRADE_BETTER_SEEDS} label="Better Seeds" level={crop.betterSeedsLevel} buyer={buyerState(crop, 'cultivator')} />
        <Tool icon={UPGRADE_ADDITIONAL_PLOT} label="Additional Plot" level={crop.additionalPlotLevel} buyer={buyerState(crop, 'surveyor')} />
        <Tool
          icon={UPGRADE_HARVESTER_SPEED}
          label="Harvester Speed"
          level={crop.harvesterOwned ? crop.harvesterSpeedLevel ?? 0 : null}
          buyer={buyerState(crop, 'mechanic')}
        />
      </div>

      {machine ? (
        <div
          className={ready ? `${styles.machine} ${styles.machineRipe}` : styles.machine}
          title={`Auto Harvester: every ${interval} s it takes the crop, if it is ripe`}
        >
          <img src={UPGRADE_AUTO_HARVESTER} alt="" aria-hidden="true" />
          <span className={styles.machineBar} aria-hidden="true"><span className="glide" style={glideFill(harvesterShare, harvesterGlides)} /></span>
          <span><span className="sr-only">Auto Harvester: </span>{machineText}</span>
        </div>
      ) : (
        <button
          type="button"
          className={ready ? styles.harvestReady : styles.harvestGrowing}
          onClick={() => onHarvest(index)}
          disabled={!ready}
          aria-label={ready ? `Harvest ${crop.name}` : `${crop.name} is growing`}
          // The first-harvest tutorial points at the picked crop's button
          data-tutorial={isActive ? 'harvest-button' : undefined}
        >
          {ready ? 'Harvest' : 'Growing'}
        </button>
      )}
    </li>
  );
});

Bed.displayName = 'Bed';

/** Payroll, for committed Merchants: lay off every auto-buyer, or hire everyone back, all or none */
const PayrollSwitch: FC<{ payroll: PayrollControl; formatNumber: FormatNumber }> = ({ payroll, formatNumber }) => {
  const { staff, rehire, canRehire, onLayOff, onRehire } = payroll;
  if (staff > 0) {
    return (
      <div className={styles.payroll}>
        <img src={GUILD_MERCHANTS} alt="" aria-hidden="true" />
        <span className={styles.payrollLabel}>Payroll: {staff} on staff</span>
        <button
          type="button"
          className={styles.layOff}
          onClick={onLayOff}
          title="Fires every Assistant, Cultivator, Surveyor and Mechanic. Nothing is refunded, and hiring them back costs their full prices"
        >
          Lay off everyone
        </button>
      </div>
    );
  }
  const money = `$${formatNumber(rehire.money, 2)}`;
  const knowledge = formatNumber(rehire.knowledge, 2);
  return (
    <div className={`${styles.payroll} ${styles.payrollOff}`}>
      <img src={GUILD_MERCHANTS} alt="" aria-hidden="true" />
      <span className={styles.payrollLabel}>Payroll: laid off</span>
      <button
        type="button"
        className={styles.rehire}
        onClick={onRehire}
        disabled={!canRehire}
        aria-label={`Rehire everyone for ${money} and ${knowledge} knowledge`}
        title={canRehire
          ? `Hires all ${rehire.count} auto-buyers on every open crop`
          : `Needs ${money} and ${knowledge} knowledge for all ${rehire.count} at once`}
      >
        Rehire everyone
        <img src={ICON_MONEY} alt="" aria-hidden="true" />{money}
        {rehire.knowledge > 0 && <><img src={ICON_KNOWLEDGE} alt="" aria-hidden="true" />{knowledge}</>}
      </button>
    </div>
  );
};

interface CropGardenProps {
  veggies: Veggie[];
  /** The kind of crop on show */
  group: CropGroup;
  /** Fruits are open (the Growers' Fruit Cultivation), so the garden can switch to them */
  fruitsOpen: boolean;
  onShowGroup: (group: CropGroup) => void;
  activeVeggie: number;
  farmFull: boolean;
  money: number;
  globalAutoPurchaseTimer: number;
  growthMultiplierOf: (crop: Veggie) => number;
  onSelect: CropHandler;
  onHarvest: CropHandler;
  onToggleSell: CropHandler;
  onBuyHarvester: CropHandler;
  formatNumber: FormatNumber;
  /** The guild's effect on Auto Harvesters */
  guildState?: GuildState;
  /** Payroll, for committed Merchants */
  payroll?: PayrollControl;
}

const CropGarden: FC<CropGardenProps> = memo(({
  veggies,
  group,
  fruitsOpen,
  onShowGroup,
  activeVeggie,
  farmFull,
  money,
  globalAutoPurchaseTimer,
  growthMultiplierOf,
  onSelect,
  onHarvest,
  onToggleSell,
  onBuyHarvester,
  formatNumber,
  guildState,
  payroll
}) => {
  const showFruits = group === 'fruits';
  const beds = veggies
    .map((crop, index) => ({ crop, index }))
    .filter(({ crop }) => isFruit(crop) === showFruits);
  const firstLocked = beds.find(({ crop }) => !crop.unlocked)?.index;
  const unlockedOf = (fruit: boolean) => {
    const kind = veggies.filter(crop => isFruit(crop) === fruit);
    return `${kind.filter(crop => crop.unlocked).length}/${kind.length}`;
  };
  const autoBuyersWorking = veggies.some(crop => crop.autoPurchasers.some(ap => ap.owned && ap.active));
  const daysToShop = AUTO_PURCHASER_CYCLE_DAYS - globalAutoPurchaseTimer;
  const machines = hasHandsOff(guildState);
  const shopGlides = useGlide(globalAutoPurchaseTimer);

  return (
    <section className={styles.garden} aria-label="Garden">
      <div className={styles.header}>
        {fruitsOpen ? (
          <div className={styles.groupSwitch} role="group" aria-label="Crop kind">
            <button type="button" aria-pressed={!showFruits} onClick={() => onShowGroup('vegetables')}>
              <img src={GROUP_ART.vegetables} alt="" aria-hidden="true" />
              Vegetables <span className={styles.count}>{unlockedOf(false)}</span>
            </button>
            <button type="button" aria-pressed={showFruits} onClick={() => onShowGroup('fruits')}>
              <img src={GROUP_ART.fruits} alt="" aria-hidden="true" />
              Fruits <span className={styles.count}>{unlockedOf(true)}</span>
            </button>
          </div>
        ) : (
          <h3 className={styles.groupTitle}>
            <img src={GROUP_ART.vegetables} alt="" aria-hidden="true" />
            Vegetables <span className={styles.count}>{unlockedOf(false)}</span>
          </h3>
        )}
        {!payroll && <span className={styles.hint}>
          {machines ? 'Machines harvest every bed. Click a bed to see its upgrades' : 'Click a bed to see its upgrades in the shed'}
        </span>}
        <span className={styles.spacer} />
        {autoBuyersWorking && (
          <div className={styles.timer} title={`Auto-buyers buy a level of their upgrade every ${AUTO_PURCHASER_CYCLE_DAYS} days, when you can afford it`}>
            <img src={ICON_AUTOMATION} alt="" aria-hidden="true" />
            Auto-buyers shop in {daysToShop} {daysToShop === 1 ? 'day' : 'days'}
            <span className={styles.miniBar}>
              <span className="glide" style={glideFill((globalAutoPurchaseTimer / AUTO_PURCHASER_CYCLE_DAYS) * 100, shopGlides)} />
            </span>
          </div>
        )}
        {payroll && payroll.staff === 0 && (
          <div className={`${styles.timer} ${styles.timerIdle}`}>
            <img src={ICON_AUTOMATION} alt="" aria-hidden="true" />
            No auto-buyers on staff
          </div>
        )}
        {payroll && <PayrollSwitch payroll={payroll} formatNumber={formatNumber} />}
      </div>

      <ul className={styles.beds} aria-label={showFruits ? 'Fruits' : 'Vegetables'}>
        {beds.map(({ crop, index }) => (
          <Bed
            key={crop.name}
            crop={crop}
            index={index}
            isActive={index === activeVeggie}
            farmFull={farmFull}
            fullLockNote={index === firstLocked}
            money={money}
            growthMultiplier={growthMultiplierOf(crop)}
            onSelect={onSelect}
            onHarvest={onHarvest}
            onToggleSell={onToggleSell}
            onBuyHarvester={onBuyHarvester}
            formatNumber={formatNumber}
            guildState={guildState}
          />
        ))}
      </ul>

      <div className={styles.legend}>
        <span><span className={`${styles.dot} ${styles.dotOn}`} aria-hidden="true" />auto-buyer on</span>
        <span><span className={`${styles.dot} ${styles.dotPaused}`} aria-hidden="true" />paused</span>
        <span><span className={`${styles.dot} ${styles.dotNone}`} aria-hidden="true" />no auto-buyer</span>
        <span>{machines ? 'Gold: ripe, the machine takes it on its next pass' : 'Hold keeps a crop out of Sell All and the Merchant'}</span>
        {machines && <span>×2: Stanley's Tune-Up is running</span>}
      </div>
    </section>
  );
});

CropGarden.displayName = 'CropGarden';

export default CropGarden;
