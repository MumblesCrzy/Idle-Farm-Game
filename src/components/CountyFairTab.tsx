/**
 * County Fair Tab Component
 *
 * The giant-pumpkin weigh-off for the Fall Pumpkin Rush.
 * Features:
 * - Fair countdown, or an open fair ready for one entry
 * - Giant shelf: enter an Atlantic Giant in the weigh-off or sell it
 * - Expected rival weights, so players can judge when to enter
 * - Last result and the trophy case
 */

import { memo, useMemo, type FC } from 'react';
import BaseTab from './BaseTab';
import EventArt, { type EventArtSource } from './EventArt';
import ProgressBar from './ProgressBar';
import type { UsePumpkinEventReturn } from '../hooks/usePumpkinEvent';
import type { FairPlacing, GiantPumpkin, WeighOffResult } from '../types/pumpkinEvent';
import { PUMPKIN_ART, PUMPKIN_EVENT_CONSTANTS, PUMPKIN_VARIETIES } from '../data/pumpkinEventData';
import { floorCandyCorn, getGiantPrice, getSaleMultiplier, ownsUpgrade, rivalBaseWeight } from '../utils/pumpkinPricing';
import styles from './CountyFairTab.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

const C = PUMPKIN_EVENT_CONSTANTS;
const GIANT_NAME = PUMPKIN_VARIETIES.giant.name;

/** Weights read best in full, such as "1,240 lb" */
const formatPounds = (pounds: number) => `${Math.round(pounds).toLocaleString('en-US')} lb`;

/** Small Candy Corn icon that screen readers read as the currency name */
const CandyCorn: FC<{ size?: number }> = ({ size = 16 }) => (
  <EventArt art={PUMPKIN_ART.candyCorn} size={size} alt="Candy Corn" className={styles.currencyIcon} />
);

const PLACINGS: Record<FairPlacing, { label: string; art: EventArtSource }> = {
  1: { label: '1st place', art: PUMPKIN_ART.ribbonFirst },
  2: { label: '2nd place', art: PUMPKIN_ART.ribbonSecond },
  3: { label: '3rd place', art: PUMPKIN_ART.ribbonThird },
  4: { label: 'No ribbon', art: PUMPKIN_ART.scale },
};

/** Weights the rivals can bring to the next fair, rounded the way judgeWeighOff rounds them */
interface RivalRange {
  typical: number;
  lightest: number;
  heaviest: number;
}

function rivalRange(fairsEntered: number): RivalRange {
  const base = rivalBaseWeight(fairsEntered);
  return {
    typical: Math.round(base),
    lightest: Math.round(base * (1 - C.RIVAL_SPREAD / 2)),
    heaviest: Math.round(base * (1 + C.RIVAL_SPREAD / 2)),
  };
}

/** How a giant would likely do against the next fair's rivals; a tie goes to the player */
function giantOutlook(weight: number, range: RivalRange): { text: string; tone: 'win' | 'maybe' | 'lose' } {
  if (weight >= range.heaviest) return { text: 'Outweighs every rival', tone: 'win' };
  if (weight < range.lightest) return { text: 'Lighter than every rival', tone: 'lose' };
  return { text: 'In the running', tone: 'maybe' };
}

// ============================================================================
// GIANT ROW
// ============================================================================

interface GiantRowProps {
  giant: GiantPumpkin;
  price: number;
  fairOpen: boolean;
  daysUntilFair: number;
  range: RivalRange;
  onEnter: (giantId: string) => unknown;
  onSell: (giantId: string) => void;
  formatNumber: FormatNumber;
}

const GiantRow: FC<GiantRowProps> = memo(({ giant, price, fairOpen, daysUntilFair, range, onEnter, onSell, formatNumber }) => {
  const weight = formatPounds(giant.weight);
  const blueRibbon = giant.quality === 'blueRibbon';
  const outlook = giantOutlook(giant.weight, range);
  const outlookClass = outlook.tone === 'win'
    ? `${styles.outlook} ${styles.outlookWin}`
    : outlook.tone === 'lose'
      ? `${styles.outlook} ${styles.outlookLose}`
      : styles.outlook;

  return (
    <li className={styles.giantRow}>
      <EventArt art={PUMPKIN_ART.giant} size={40} className={styles.giantArt} />
      <div className={styles.giantInfo}>
        <div className={styles.giantWeight}>{weight}</div>
        <div className={styles.giantDetails}>
          <span>{GIANT_NAME}</span>
          {blueRibbon && (
            <span className={styles.blueRibbonBadge}>
              <EventArt art={PUMPKIN_ART.blueRibbon} size={12} />
              Blue Ribbon
            </span>
          )}
        </div>
        <div className={outlookClass}>{outlook.text}</div>
      </div>
      <div className={styles.giantActions}>
        <button
          type="button"
          className={styles.enterButton}
          onClick={() => onEnter(giant.id)}
          disabled={!fairOpen}
          title={fairOpen ? undefined : `The fair opens in ${daysUntilFair} ${daysUntilFair === 1 ? 'day' : 'days'}`}
          aria-label={`Enter weigh-off: ${weight}${blueRibbon ? ' Blue Ribbon' : ''} ${GIANT_NAME}`}
        >
          Enter weigh-off
        </button>
        <button
          type="button"
          className={styles.sellButton}
          onClick={() => onSell(giant.id)}
          aria-label={`Sell for ${formatNumber(price, 1)} Candy Corn: ${weight}${blueRibbon ? ' Blue Ribbon' : ''} ${GIANT_NAME}`}
        >
          Sell for {formatNumber(price, 1)} <CandyCorn />
        </button>
      </div>
    </li>
  );
});

GiantRow.displayName = 'GiantRow';

// ============================================================================
// LAST RESULT
// ============================================================================

interface ResultDetailsProps {
  result: WeighOffResult;
  formatNumber: FormatNumber;
}

const ResultDetails: FC<ResultDetailsProps> = memo(({ result, formatNumber }) => {
  const placing = PLACINGS[result.placing] ?? PLACINGS[4];
  // Heaviest first; a tie goes to the player, so they list first
  const standings = [
    { label: 'Your giant', weight: result.weight, yours: true },
    ...result.rivalWeights.map((weight, i) => ({ label: `Rival ${i + 1}`, weight, yours: false })),
  ].sort((a, b) => b.weight - a.weight || Number(b.yours) - Number(a.yours));

  return (
    <>
      <div className={result.placing <= 3 ? `${styles.placing} ${styles.placingRibbon}` : styles.placing}>
        <EventArt art={placing.art} size={48} />
        <span className={styles.placingLabel}>{placing.label}</span>
      </div>
      <ol className={styles.standings}>
        {standings.map(entry => (
          <li key={entry.label} className={entry.yours ? `${styles.standing} ${styles.standingYours}` : styles.standing}>
            <span>{entry.label}</span>
            <span className={styles.standingWeight}>{formatPounds(entry.weight)}</span>
          </li>
        ))}
      </ol>
      <div className={styles.prize}>
        Prize: +{formatNumber(result.prize, 1)} <CandyCorn />
      </div>
    </>
  );
});

ResultDetails.displayName = 'ResultDetails';

// ============================================================================
// COUNTY FAIR TAB
// ============================================================================

interface CountyFairTabProps {
  event: UsePumpkinEventReturn;
  formatNumber: FormatNumber;
}

const CountyFairTab: FC<CountyFairTabProps> = memo(({ event, formatNumber }) => {
  const { eventState, giantShelf, sellGiant, enterWeighOff, demandMultiplier } = event;
  const { weighOff, upgrades } = eventState;

  const fairOpen = weighOff.daysUntilFair <= 0;
  const daysUntilFair = Math.max(0, Math.ceil(weighOff.daysUntilFair));
  const daysElapsed = Math.min(C.FAIR_INTERVAL_DAYS, Math.max(0, C.FAIR_INTERVAL_DAYS - daysUntilFair));
  const range = useMemo(() => rivalRange(weighOff.fairsEntered), [weighOff.fairsEntered]);

  const sortedGiants = useMemo(() => [...giantShelf].sort((a, b) => b.weight - a.weight), [giantShelf]);
  const saleMultiplier = getSaleMultiplier(upgrades);
  const giantPrice = (giant: GiantPumpkin) =>
    floorCandyCorn(getGiantPrice(giant.weight, giant.quality, upgrades, demandMultiplier) * saleMultiplier);

  const shelfFull = giantShelf.length >= C.MAX_GIANT_SHELF;
  const giantsUnlocked = ownsUpgrade(upgrades, PUMPKIN_VARIETIES.giant.unlockUpgrade);
  const { ribbons, lastResult } = weighOff;

  const mainContent = (
    <div className={styles.container}>
      {/* Left Column: Fair Status, Competition and the Giant Shelf */}
      <div className={styles.leftColumn}>
        <section
          className={fairOpen ? `${styles.fairBanner} ${styles.fairBannerOpen}` : styles.fairBanner}
          aria-label="Fair status"
        >
          <div className={styles.fairHeading}>
            <EventArt art={PUMPKIN_ART.fair} size={36} />
            <h2 className={styles.fairTitle}>
              {fairOpen
                ? 'The fair is open!'
                : `Next fair in ${daysUntilFair} ${daysUntilFair === 1 ? 'day' : 'days'}`}
            </h2>
          </div>
          {fairOpen ? (
            <p className={styles.fairHint}>
              Enter one Atlantic Giant in the weigh-off. The next fair opens {C.FAIR_INTERVAL_DAYS} days after you enter.
            </p>
          ) : (
            <>
              <ProgressBar value={daysElapsed} max={C.FAIR_INTERVAL_DAYS} color="#C0392B" height={10} />
              <p className={styles.fairHint}>The fair stays open until you enter a giant.</p>
            </>
          )}
        </section>

        <section className={styles.competition} aria-label="Expected competition">
          <h3 className={styles.sectionTitle}>
            <EventArt art={PUMPKIN_ART.scale} size={20} />
            Expected Competition
          </h3>
          <p className={styles.competitionText}>
            {C.RIVAL_COUNT} rivals, about <strong>{formatPounds(range.typical)}</strong> each
            ({formatPounds(range.lightest)} to {formatPounds(range.heaviest)}).
          </p>
          <p className={styles.competitionHint}>
            Rivals grow heavier with every fair you enter. A tie goes to you.
          </p>
        </section>

        <section className={styles.shelf} aria-label="Giant shelf">
          <div className={styles.shelfHeader}>
            <h3 className={styles.sectionTitle}>
              <EventArt art={PUMPKIN_ART.giant} size={20} />
              Giant Shelf
            </h3>
            <span className={styles.shelfUsage} aria-label={`Shelf usage: ${giantShelf.length} of ${C.MAX_GIANT_SHELF}`}>
              {giantShelf.length} / {C.MAX_GIANT_SHELF}
            </span>
          </div>
          {shelfFull && (
            <p className={styles.shelfFull}>The shelf is full. New giants are sold at the stand as soon as they are harvested.</p>
          )}

          {sortedGiants.length > 0 ? (
            <ul className={styles.giantList}>
              {sortedGiants.map(giant => (
                <GiantRow
                  key={giant.id}
                  giant={giant}
                  price={giantPrice(giant)}
                  fairOpen={fairOpen}
                  daysUntilFair={daysUntilFair}
                  range={range}
                  onEnter={enterWeighOff}
                  onSell={sellGiant}
                  formatNumber={formatNumber}
                />
              ))}
            </ul>
          ) : weighOff.giantsGrown === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>No Atlantic Giants yet</p>
              <p>
                {giantsUnlocked
                  ? 'You have Atlantic Giant seeds: plant one in the Pumpkin Patch.'
                  : `Atlantic Giants are unlocked in the Pumpkin Patch for ${formatNumber(PUMPKIN_VARIETIES.giant.unlockCost, 1)} Candy Corn.`}
                {' '}Each giant you harvest is weighed and comes to this shelf, ready for the weigh-off or the stand.
              </p>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>The shelf is empty</p>
              <p>Grow another Atlantic Giant in the Pumpkin Patch to enter the next weigh-off.</p>
            </div>
          )}
        </section>
      </div>

      {/* Right Column: Last Result and Trophy Case */}
      <div className={styles.rightColumn}>
        <section className={styles.resultCard} aria-label="Last weigh-off" aria-live="polite">
          <h3 className={styles.resultTitle}>Last Weigh-Off</h3>
          {lastResult ? (
            <ResultDetails result={lastResult} formatNumber={formatNumber} />
          ) : (
            <p className={styles.noResult}>No entries yet. Bring your heaviest giant when the fair opens.</p>
          )}
        </section>

        <section className={styles.trophyCase} aria-label="Trophy case">
          <h3 className={styles.trophyTitle}>Trophy Case</h3>
          <dl className={styles.trophyStats}>
            <div className={styles.trophyStat}>
              <dt><EventArt art={PUMPKIN_ART.ribbonFirst} size={22} /> 1st place</dt>
              <dd>{formatNumber(ribbons.first, 1)}</dd>
            </div>
            <div className={styles.trophyStat}>
              <dt><EventArt art={PUMPKIN_ART.ribbonSecond} size={22} /> 2nd place</dt>
              <dd>{formatNumber(ribbons.second, 1)}</dd>
            </div>
            <div className={styles.trophyStat}>
              <dt><EventArt art={PUMPKIN_ART.ribbonThird} size={22} /> 3rd place</dt>
              <dd>{formatNumber(ribbons.third, 1)}</dd>
            </div>
            <div className={`${styles.trophyStat} ${styles.trophyStatWide}`}>
              <dt>Personal best</dt>
              <dd>{weighOff.personalBest > 0 ? formatPounds(weighOff.personalBest) : '-'}</dd>
            </div>
            <div className={styles.trophyStat}>
              <dt>Fairs entered</dt>
              <dd>{formatNumber(weighOff.fairsEntered, 1)}</dd>
            </div>
            <div className={styles.trophyStat}>
              <dt>Giants grown</dt>
              <dd>{formatNumber(weighOff.giantsGrown, 1)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );

  return (
    <BaseTab
      isUnlocked={true}
      mainContent={mainContent}
    />
  );
});

CountyFairTab.displayName = 'CountyFairTab';

export default CountyFairTab;
