/**
 * The Honey House: the honey and Golden Honey on hand, the batches waiting in the hives with
 * the button that collects them, what the bees give the farm, and the Beekeeper. Its parts
 * keep their sizes as honey comes and goes.
 */
import { memo, type FC } from 'react';
import type { BeekeeperAssistant } from '../types/bees';
import type { BeeLevels } from '../utils/beeProduction';
import { BEEKEEPER_HIRE_COST, WINTER_START_DAY, YEAR_DAYS, beekeeperBonusAt, percent } from '../utils/beeView';
import { BEE_CONSTANTS } from '../config/gameConstants';
import {
  BEE_BEEKEEPER,
  BEE_CROP_YIELD,
  BEE_HONEY_PRODUCTION,
  BEE_WINTER_HARDINESS,
  ICON_GOLDEN_HONEY,
  ICON_HONEY,
  SEASON_WINTER
} from '../config/assetPaths';
import styles from './HoneyHouse.module.css';

const HIRE_HIVES = BEE_CONSTANTS.BEEKEEPER_ASSISTANT_UNLOCK_BOXES;
const WINTER_DAYS = YEAR_DAYS - WINTER_START_DAY + 1;

interface HoneyHouseProps {
  honey: number;
  goldenHoney: number;
  waitingBatches: number;
  waitingLbs: number;
  goldenChance: number;
  hives: number;
  lbsPerBatch: number;
  batchDays: number;
  cropBonus: number;
  levels: BeeLevels;
  winterHardiness: boolean;
  /** Days until winter, or in winter until spring */
  countdown: { winter: boolean; days: number };
  assistant: BeekeeperAssistant;
  onCollectAll: () => void;
  onHireBeekeeper: () => void;
  onUpgradeBeekeeper: () => void;
  onToggleBeekeeper: (on: boolean) => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const HoneyHouse: FC<HoneyHouseProps> = memo(({
  honey,
  goldenHoney,
  waitingBatches,
  waitingLbs,
  goldenChance,
  hives,
  lbsPerBatch,
  batchDays,
  cropBonus,
  levels,
  winterHardiness,
  countdown,
  assistant,
  onCollectAll,
  onHireBeekeeper,
  onUpgradeBeekeeper,
  onToggleBeekeeper,
  formatNumber
}) => {
  const perDay = batchDays > 0 ? (hives * lbsPerBatch) / batchDays : 0;
  const cropParts = [
    `${percent(BEE_CONSTANTS.BASE_YIELD_BONUS_PER_BOX)} base`,
    levels.meadowMagic > 0 ? `${percent(levels.meadowMagic * 0.005)} Meadow Magic` : null,
    levels.flowerPower ? '0.2% Flower Power' : null
  ].filter(Boolean).join(', ');
  const perHive = BEE_CONSTANTS.BASE_YIELD_BONUS_PER_BOX + levels.meadowMagic * 0.005 + (levels.flowerPower ? 0.002 : 0);

  const hired = assistant.unlocked;
  const topLevel = assistant.level >= assistant.maxLevel;
  const canHire = hives >= HIRE_HIVES && honey >= BEEKEEPER_HIRE_COST;
  const canLevel = hired && !topLevel && honey >= assistant.upgradeCost;

  return (
    <section className={styles.panel} aria-labelledby="honey-house-title">
      <h2 id="honey-house-title" className={styles.title}>Honey House</h2>

      <div className={styles.stock}>
        <div className={styles.jar}>
          <img src={ICON_HONEY} alt="" />
          <div><b>{formatNumber(honey, 1)}</b><small>Honey</small></div>
        </div>
        <div className={styles.jar}>
          <img src={ICON_GOLDEN_HONEY} alt="" />
          <div><b>{formatNumber(goldenHoney, 1)}</b><small>Golden Honey</small></div>
        </div>
      </div>

      <div className={styles.waiting}>
        <h3 className={styles.label}>Waiting in the hives</h3>
        <div className={styles.amount}>
          {waitingBatches > 0
            ? `${waitingBatches} ${waitingBatches === 1 ? 'batch' : 'batches'} · ${formatNumber(waitingLbs, 1)} lbs`
            : 'Nothing waiting'}
        </div>
        <p className={styles.hint}>Each batch has a {percent(goldenChance)} chance to come out as Golden Honey</p>
        <button type="button" className={styles.collect} onClick={onCollectAll} disabled={waitingBatches === 0}>
          <img src={ICON_HONEY} alt="" />
          {waitingBatches > 0 ? `Collect all · ${formatNumber(waitingLbs, 1)} lbs` : 'Nothing to collect'}
        </button>
        <div className={styles.keeperRow}>
          {hired ? (
            <>
              <img src={BEE_BEEKEEPER} alt="" />
              <span className={styles.keeperText}>
                {assistant.active ? 'The Beekeeper collects each batch' : 'The Beekeeper is off'}
              </span>
              <button
                type="button"
                className={assistant.active ? styles.toggleOn : styles.toggleOff}
                onClick={() => onToggleBeekeeper(!assistant.active)}
                aria-pressed={assistant.active}
                aria-label={`Beekeeper ${assistant.active ? 'On' : 'Off'}`}
              >
                {assistant.active ? 'On' : 'Off'}
              </button>
            </>
          ) : (
            <span className={styles.keeperHint}>Hire the Beekeeper below, and he collects each batch for you</span>
          )}
        </div>
      </div>

      <div className={styles.facts}>
        <div className={styles.fact}>
          <img src={BEE_HONEY_PRODUCTION} alt="" />
          <div>
            <b>{lbsPerBatch} lbs a batch, every {Math.round(batchDays)} days</b>
            <small>
              {hives > 0
                ? `About ${perDay < 10 ? perDay.toFixed(1) : Math.round(perDay)} lbs of honey a day from ${hives} ${hives === 1 ? 'hive' : 'hives'}`
                : 'Add a hive to start making honey'}
            </small>
          </div>
        </div>
        <div className={styles.fact}>
          <img src={BEE_CROP_YIELD} alt="" />
          <div>
            <b>+{percent(cropBonus)} on every crop's harvest</b>
            <small>{percent(perHive)} a hive: {cropParts}</small>
          </div>
        </div>
        <div className={styles.fact}>
          <img src={winterHardiness ? BEE_WINTER_HARDINESS : SEASON_WINTER} alt="" />
          <div>
            {winterHardiness ? (
              <><b>Bees work through winter</b><small>Winter Hardiness</small></>
            ) : countdown.winter ? (
              <><b>Bees are resting for winter</b><small>They wake in spring, in {countdown.days} {countdown.days === 1 ? 'day' : 'days'}</small></>
            ) : (
              <><b>Bees rest for winter in {countdown.days} {countdown.days === 1 ? 'day' : 'days'}</b><small>For {WINTER_DAYS} days, unless they have Winter Hardiness</small></>
            )}
          </div>
        </div>
      </div>

      <div className={styles.keeper}>
        <img src={BEE_BEEKEEPER} alt="" className={styles.keeperArt} />
        <div className={styles.keeperInfo}>
          <div className={styles.keeperName}>
            Beekeeper
            {hired && assistant.level > 0 && <span className={styles.level}>Lv {assistant.level}</span>}
          </div>
          {hired ? (
            <div className={styles.keeperLine}>
              {topLevel
                ? `While on, bees work ${percent(assistant.productionSpeedBonus)} faster`
                : `While on, bees work ${percent(assistant.productionSpeedBonus)} faster; next level ${percent(beekeeperBonusAt(assistant.level + 1))}`}
            </div>
          ) : (
            <>
              <div className={styles.keeperLine}>Collects each batch as it's made; while on, bees work 10% faster</div>
              {hives < HIRE_HIVES ? (
                <div className={styles.need}>Needs {HIRE_HIVES} hives, you have {hives}</div>
              ) : (
                <div className={styles.need}>
                  <span className={styles.bar}><span style={{ width: `${Math.min(100, (honey / BEEKEEPER_HIRE_COST) * 100)}%` }} /></span>
                  {formatNumber(Math.min(honey, BEEKEEPER_HIRE_COST), 1)} of {BEEKEEPER_HIRE_COST} honey
                </div>
              )}
            </>
          )}
        </div>
        {!hired && (
          <button
            type="button"
            className={canHire ? styles.buy : styles.buyShort}
            onClick={onHireBeekeeper}
            disabled={!canHire}
            aria-label={`Hire the Beekeeper for ${BEEKEEPER_HIRE_COST} honey`}
          >
            <img src={ICON_HONEY} alt="" />{BEEKEEPER_HIRE_COST}
          </button>
        )}
        {hired && !topLevel && (
          <button
            type="button"
            className={canLevel ? styles.buy : styles.buyShort}
            onClick={onUpgradeBeekeeper}
            disabled={!canLevel}
            aria-label={`Raise the Beekeeper to level ${assistant.level + 1} for ${formatNumber(assistant.upgradeCost, 1)} honey`}
          >
            <img src={ICON_HONEY} alt="" />{formatNumber(assistant.upgradeCost, 1)}
          </button>
        )}
        {hired && topLevel && <span className={styles.top}>Top level</span>}
      </div>
    </section>
  );
});

HoneyHouse.displayName = 'HoneyHouse';

export default HoneyHouse;
