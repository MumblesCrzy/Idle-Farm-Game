/**
 * Herb Garden Tab Component
 *
 * Spring Farmer's Market herbs: four perennials, planted once and gathered all
 * season. Each slot fills up to its cap, then waits to be gathered, so time
 * away fills every slot and no more. Four tiles, two by two, and Garden
 * upgrades on the right.
 */

import { memo, type FC } from 'react';
import BaseTab from './BaseTab';
import EventArt from './EventArt';
import EventUpgradesPanel from './EventUpgradesPanel';
import ProgressBar from './ProgressBar';
import { HERBS, HERB_ORDER, SPRING_ART } from '../data/springEventData';
import { describeCrewAction, herbCap, herbGrowthSpeed, ownsUpgrade, sprigsPerCycle } from '../utils/springPricing';
import type { UseSpringEventReturn } from '../hooks/useSpringEvent';
import type { HerbKind, HerbSlot } from '../types/springEvent';
import frame from './SpringSections.module.css';
import styles from './HerbGardenTab.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

interface HerbGardenTabProps {
  event: UseSpringEventReturn;
  formatNumber: FormatNumber;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** Days as a short number: whole days stay whole, others keep one decimal */
const shortDays = (days: number) => String(Math.round(days * 10) / 10);

// ============================================================================
// HERB TILE
// ============================================================================

interface HerbTileProps {
  herb: HerbKind;
  slot: HerbSlot;
  planted: boolean;
  /** Sprigs the slot holds before it waits */
  cap: number;
  /** Growth speed from the Watering Can */
  speed: number;
  /** Sprigs each time it grows, 2 with the Second Row */
  perCycle: number;
  canAfford: boolean;
  onGather: (herb: HerbKind) => void;
  onPlant: (herb: HerbKind) => void;
  formatNumber: FormatNumber;
}

const HerbTile: FC<HerbTileProps> = memo(({
  herb,
  slot,
  planted,
  cap,
  speed,
  perCycle,
  canAfford,
  onGather,
  onPlant,
  formatNumber
}) => {
  const definition = HERBS[herb];
  const every = `a sprig every ${shortDays(definition.interval / speed)} days${perCycle > 1 ? `, ${perCycle} at a time` : ''}`;
  const iconBox = `${styles.iconBox} ${styles[herb]}`;

  if (!planted) {
    const cost = formatNumber(definition.unlockCost, 0);
    return (
      <li className={`${styles.tile} ${styles.unplanted}`}>
        <span className={iconBox}>
          <EventArt art={definition.art} size={64} className={styles.unplantedArt} />
        </span>
        <div className={styles.body}>
          <h3 className={styles.herbName}>{definition.name}</h3>
          <span className={styles.herbNote}>Perennial · {every}</span>
          <p className={styles.pitch}>{definition.pitch}</p>
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.plantButton}
              onClick={() => onPlant(herb)}
              disabled={!canAfford}
              aria-label={`Plant ${definition.name} for ${cost} Petals${canAfford ? '' : '. Not enough Petals'}`}
            >
              Plant {definition.name} · {cost} <EventArt art={SPRING_ART.petals} size={16} />
            </button>
          </div>
        </div>
      </li>
    );
  }

  const full = slot.sprigs >= cap;
  const percent = full ? 100 : Math.min(100, (slot.growth / definition.interval) * 100);
  const daysToNext = Math.max(1, Math.ceil((definition.interval - slot.growth) / speed));
  // Ten sprigs fit at full size; a Trellis slot of 25 draws them smaller
  const sprigSize = cap > 10 ? 13 : 22;

  return (
    <li className={`${styles.tile} ${full ? styles.full : ''}`}>
      <span className={iconBox}>
        <EventArt art={definition.art} size={64} />
      </span>
      <div className={styles.body}>
        <h3 className={styles.herbName}>{definition.name}</h3>
        <span className={styles.herbNote}>Perennial · {every}</span>
        <span className={cap > 10 ? `${styles.sprigRow} ${styles.sprigRowSmall}` : styles.sprigRow} aria-hidden="true">
          {Array.from({ length: cap }, (_, i) => (
            <EventArt
              key={i}
              art={definition.art}
              size={sprigSize}
              className={i < slot.sprigs ? undefined : styles.sprigEmpty}
            />
          ))}
        </span>
        <span className={full ? `${styles.sprigCount} ${styles.fullText}` : styles.sprigCount}>
          {slot.sprigs} / {cap} sprigs{full ? ' · full' : ''}
        </span>
        <div className={full ? `${styles.nextRow} ${styles.fullText}` : styles.nextRow}>
          <div
            className={styles.nextBar}
            role="progressbar"
            aria-label={`Next ${definition.name} sprig`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.floor(percent)}
          >
            <ProgressBar value={percent} max={100} height={8} color={full ? '#B33A61' : '#E8698B'} />
          </div>
          <span>{full ? 'Waiting: gather to keep it growing' : `Next sprig in ${plural(daysToNext, 'day')}`}</span>
        </div>
        <div className={styles.footer}>
          <span className={styles.useText}>{definition.use}</span>
          <button
            type="button"
            className={full ? `${styles.gatherButton} ${styles.gatherFull}` : styles.gatherButton}
            onClick={() => onGather(herb)}
            disabled={slot.sprigs === 0}
            aria-label={`Gather ${plural(slot.sprigs, 'sprig')} of ${definition.name}`}
          >
            Gather {slot.sprigs}
          </button>
        </div>
      </div>
    </li>
  );
});

HerbTile.displayName = 'HerbTile';

// ============================================================================
// TAB
// ============================================================================

const HerbGardenTab: FC<HerbGardenTabProps> = ({ event, formatNumber }) => {
  const {
    herbs,
    materials,
    petals,
    currentCrewAction,
    gatherHerb,
    gatherAllHerbs,
    purchaseUpgrade
  } = event;
  const { upgrades } = event.eventState;

  const cap = herbCap(upgrades);
  const speed = herbGrowthSpeed(upgrades);
  const perCycle = sprigsPerCycle(upgrades);
  const planted = HERB_ORDER.filter(herb => ownsUpgrade(upgrades, HERBS[herb].unlockUpgrade));
  const waiting = planted.reduce((sum, herb) => sum + herbs[herb].sprigs, 0);
  const crewHired = ownsUpgrade(upgrades, 'gnome_crew');

  const plantHerb = (herb: HerbKind) => {
    purchaseUpgrade(HERBS[herb].unlockUpgrade);
  };

  const mainContent = (
    <div className={frame.container}>
      {/* Left column: header, the Gnome Crew and the four herbs */}
      <div className={frame.leftColumn}>
        <div className={frame.headerRow}>
          <div className={frame.titleGroup}>
            <h2 className={frame.sectionTitle}>
              <EventArt art={SPRING_ART.garden} size={26} /> Herb Garden
            </h2>
            {waiting > 0 && (
              <button
                type="button"
                className={frame.primaryAction}
                onClick={gatherAllHerbs}
                aria-label={`Gather All: ${plural(waiting, 'sprig')}`}
              >
                Gather All ({waiting})
              </button>
            )}
          </div>

          <ul className={frame.stockList} aria-label="Sprigs in stock">
            {HERB_ORDER.map(herb => (
              <li key={herb} className={frame.stockItem} title={`${HERBS[herb].name} gathered and in stock`}>
                <EventArt art={HERBS[herb].art} size={20} />
                <span className={frame.stockLabel}>{HERBS[herb].name}</span>
                <span className={frame.stockValue}>{formatNumber(materials[herb], 0)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={frame.crewBar}>
          <EventArt art={SPRING_ART.gnome} size={22} />
          {crewHired ? (
            <>
              <b>Gnome Crew (Active)</b>
              <span className={frame.crewPill}>gathers any slot that fills</span>
              {currentCrewAction && (
                <span className={frame.crewNow}>Now: <b>{describeCrewAction(currentCrewAction)}</b></span>
              )}
            </>
          ) : (
            <span>The Potting Shed's Gnome Crew gathers any slot that fills.</span>
          )}
          <span className={frame.crewHint}>While you are away, herbs grow until a slot is full, then wait for you.</span>
        </div>

        <ul className={styles.tiles} aria-label="Herbs">
          {HERB_ORDER.map(herb => (
            <HerbTile
              key={herb}
              herb={herb}
              slot={herbs[herb]}
              planted={planted.includes(herb)}
              cap={cap}
              speed={speed}
              perCycle={perCycle}
              canAfford={petals >= HERBS[herb].unlockCost}
              onGather={gatherHerb}
              onPlant={plantHerb}
              formatNumber={formatNumber}
            />
          ))}
        </ul>
      </div>

      {/* Right column: Garden upgrades */}
      <div className={frame.rightColumn}>
        <EventUpgradesPanel
          title="Garden Upgrades"
          category="garden"
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

const MemoizedHerbGardenTab = memo(HerbGardenTab);
MemoizedHerbGardenTab.displayName = 'HerbGardenTab';

export default MemoizedHerbGardenTab;
