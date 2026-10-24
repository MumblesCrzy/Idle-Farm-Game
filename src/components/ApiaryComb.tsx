/**
 * The apiary as a honeycomb: a cell for each hive the farm can keep. A hive's cell fills with
 * honey as its next batch nears; one with honey waiting has a gold edge and collects when
 * clicked. The next cell buys a hive, and the empty cells show what more hives open. Every
 * cell keeps its place, so nothing moves as hives fill up or are bought.
 */
import { memo, type CSSProperties, type FC } from 'react';
import type { BeeBox } from '../types/bees';
import { storedBatches } from '../utils/beeProduction';
import { HIVE_MILESTONES } from '../utils/beeView';
import { glideFill, useGlide } from '../hooks/useGlide';
import { BEE_HIVE_EXPANSION, ICON_BEE_HIVE, ICON_HONEY } from '../config/assetPaths';
import styles from './ApiaryComb.module.css';

/** Cells in a row, and the spacing that interlocks the rows */
const COLUMNS = 5;
const PITCH_X = 92;
const PITCH_Y = 79;

interface ApiaryCombProps {
  boxes: BeeBox[];
  maxHives: number;
  /** Days a batch takes now */
  batchDays: number;
  lbsPerBatch: number;
  /** The next hive's price, or null once every cell has a hive */
  nextHiveCost: number | null;
  honey: number;
  /** The Beekeeper is collecting, so honey never waits */
  beekeeperCollects: boolean;
  onCollect: (boxId: string) => void;
  onAddHive: () => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const cellPlace = (index: number): CSSProperties => {
  const row = Math.floor(index / COLUMNS);
  return { left: (index % COLUMNS) * PITCH_X + (row % 2 ? PITCH_X / 2 : 0), top: row * PITCH_Y };
};

const daysText = (days: number) => (days === 1 ? '1 day' : `${days} days`);
const batchesText = (batches: number) => (batches === 1 ? '1 batch' : `${batches} batches`);

interface HiveCellProps {
  box: BeeBox;
  number: number;
  batchDays: number;
  lbsPerBatch: number;
  onCollect: (boxId: string) => void;
}

/** One hive's cell: a button while honey waits in it */
const HiveCell: FC<HiveCellProps> = ({ box, number, batchDays, lbsPerBatch, onCollect }) => {
  const waiting = storedBatches(box);
  const fill = Math.min(100, Math.max(0, (box.productionTimer / batchDays) * 100));
  // Honey glides up between game steps, and drops straight back when a batch is made
  const glides = useGlide(fill);
  const daysLeft = Math.max(1, Math.ceil(batchDays - box.productionTimer));
  // Winter stops a hive without Winter Hardiness; its cell turns frosty
  const resting = !box.active;
  const honey = (
    <span className={resting ? `${styles.fill} ${styles.restingFill}` : styles.fill}>
      <span className={`${styles.honey} glide`} style={glideFill(fill, glides, 'y')} />
    </span>
  );
  const art = <img src={ICON_BEE_HIVE} alt="" className={styles.hiveArt} />;

  if (waiting > 0) {
    return (
      <button
        type="button"
        className={`${styles.hex} ${styles.waiting}`}
        onClick={() => onCollect(box.id)}
        aria-label={`Collect hive ${number}: ${batchesText(waiting)}, ${waiting * lbsPerBatch} lbs`}
      >
        <span className={styles.edge} />
        {honey}
        <span className={styles.content}>{art}<span className={styles.readyPill}>{waiting} ready</span></span>
      </button>
    );
  }

  return (
    <div className={`${styles.hex} ${resting ? styles.resting : ''}`}>
      <span className={styles.edge} />
      {honey}
      <span className={styles.content} aria-hidden="true">
        {art}
        <span className={resting ? styles.restPill : styles.dayPill}>{resting ? 'Resting' : daysText(daysLeft)}</span>
      </span>
      <span className="sr-only">
        {resting ? `Hive ${number}: resting for winter` : `Hive ${number}: next batch in ${daysText(daysLeft)}`}
      </span>
    </div>
  );
};

const ApiaryComb: FC<ApiaryCombProps> = memo(({
  boxes,
  maxHives,
  batchDays,
  lbsPerBatch,
  nextHiveCost,
  honey,
  beekeeperCollects,
  onCollect,
  onAddHive,
  formatNumber
}) => {
  const hives = boxes.length;
  const short = nextHiveCost === null ? 0 : Math.max(0, nextHiveCost - honey);

  return (
    <section className={styles.panel} aria-labelledby="apiary-title">
      <div className={styles.header}>
        <h2 id="apiary-title" className={styles.title}>Apiary</h2>
        <span className={styles.count}>{hives} of {maxHives} hives</span>
        <span className={styles.spacer} />
        <span className={styles.note}>
          {nextHiveCost === null ? 'Every cell has a hive' : `Next hive: ${formatNumber(nextHiveCost, 1)} honey`}
        </span>
      </div>

      <ul className={styles.comb} aria-label="Hives">
        {Array.from({ length: maxHives }, (_, index) => {
          const place = cellPlace(index);

          if (index < hives) {
            return (
              <li key={boxes[index].id} className={styles.cell} style={place}>
                <HiveCell box={boxes[index]} number={index + 1} batchDays={batchDays} lbsPerBatch={lbsPerBatch} onCollect={onCollect} />
              </li>
            );
          }

          if (index === hives && nextHiveCost !== null) {
            return (
              <li key="next" className={styles.cell} style={place}>
                <button
                  type="button"
                  className={`${styles.hex} ${short > 0 ? styles.nextShort : styles.next}`}
                  onClick={onAddHive}
                  disabled={short > 0}
                  aria-label={`Add hive ${hives + 1} for ${formatNumber(nextHiveCost, 1)} honey${short > 0 ? `, ${formatNumber(short, 1)} more needed` : ''}`}
                >
                  <span className={styles.edge} />
                  <span className={styles.fill} />
                  <span className={styles.content} aria-hidden="true">
                    <img src={BEE_HIVE_EXPANSION} alt="" className={styles.addArt} />
                    <span className={styles.price}><img src={ICON_HONEY} alt="" />{formatNumber(nextHiveCost, 1)}</span>
                    <span className={styles.priceNote}>{short > 0 ? `${formatNumber(short, 1)} more` : 'Add a hive'}</span>
                  </span>
                </button>
              </li>
            );
          }

          // Room for more hives; a cell where a hive count opens something shows it
          const milestone = HIVE_MILESTONES.find(m => m.hives === index + 1);
          return (
            <li
              key={`room-${index}`}
              className={styles.cell}
              style={place}
              aria-hidden="true"
              title={milestone ? `${milestone.hives} hives open ${milestone.name}` : undefined}
            >
              <div className={`${styles.hex} ${styles.room}`}>
                <span className={styles.edge} />
                <span className={styles.fill} />
                {milestone && (
                  <span className={styles.content}>
                    <img src={milestone.icon} alt="" className={styles.milestoneArt} />
                    <span className={styles.milestoneLabel}>{milestone.hives} hives</span>
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className={styles.legend}>
        <span>Fill: progress to the next batch</span>
        <span>{beekeeperCollects ? 'The Beekeeper collects each batch as it\'s made' : 'Gold edge: honey waiting, click to collect'}</span>
        {hives < maxHives && <span>Icons: what more hives open</span>}
      </div>
    </section>
  );
});

ApiaryComb.displayName = 'ApiaryComb';

export default ApiaryComb;
