/**
 * The End Legacy dialog: what the player keeps, with the unlock to pick, and what goes back
 * to the start, with their real numbers. A checkbox arms the End Legacy button.
 */
import { memo, useId, useState, type FC } from 'react';
import InlineIcon from './InlineIcon';
import type { GuildState } from '../types/guilds';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { describeDays, legacyKeepableUnlocks, legacyLevelPreview, legacyNumeral, type LegacyResetSummary } from '../utils/legacy';
import { ICON_LOCK, ICON_MILESTONE, ICON_MONEY, ICON_SCROLL, ICON_TROPHY } from '../config/assetPaths';
import { getGoldenParachuteMoney } from '../utils/guildCalculations';
import styles from './LegacyDialog.module.css';

interface LegacyDialogProps {
  /** Take focus and answer Escape; false while the tab is hidden */
  active: boolean;
  guildState: GuildState;
  reset: LegacyResetSummary;
  onClose: () => void;
  onConfirm: (pickedUnlock: string | null) => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

/** The guild-only upgrades, named so the dialog can say why they stay */
const GUILD_ONLY_NOTES: Record<string, string> = {
  growers: 'Ritual Circles stays with the Growers: Ritual Harvest spends Sigils',
  preservers: 'Rush Batch stays with the Preservers: it spends Wax Seals',
  engineers: 'Overclock stays with the Engineers: only members get Tune-Ups from Stanley',
  merchants: "Hostile Takeover and Insider Trading stay with the Merchants: the larger farm's reset comes back after a Legacy, and Ferdinand visits members only"
};

/** One line under each unlock, in plain words */
const UNLOCK_NOTES: Record<string, string> = {
  growers_verdant_glyphs: 'Every Fertilizer upgrade keeps its +25%',
  growers_whispers_of_seed: 'Crops keep selling for 10× in any guild',
  growers_fruit_cultivation: 'The 10 fruit crops stay open',
  growers_soilbound_pact: 'Crops keep their Blessed Crop chance',
  preservers_cellar_recipes: 'The 10 Cellar recipes stay open, in any guild',
  preservers_family_cookbook: 'Recipe Mastery ribbons keep paying',
  preservers_trusted_apprentice: 'Canner batches keep paying half knowledge',
  preservers_pantry_lock: 'Only matters if you rejoin the Preservers: Dunkin visits members',
  engineers_sprinkler_network: 'Irrigation keeps its +30% and stops Heatwaves, in any guild',
  engineers_climate_control: 'The Greenhouse keeps adding +20% growth all year',
  engineers_sound_dampers: 'Only matters if you rejoin the Engineers: their bees lose less honey',
  engineers_night_shift: 'Time away keeps counting up to 12 hours, in any guild',
  merchants_additives: 'Recipes keep needing one fewer of each crop, in any guild',
  merchants_head_hunters: 'Only matters if you rejoin the Merchants: Payroll is for members',
  merchants_futures: 'The Merchant keeps selling while you are away, in any guild',
  merchants_golden_parachute: 'Every Legacy you end carries a tenth of your money into the next'
};

/** "3 hives", "1 hive" */
const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

const LegacyDialog: FC<LegacyDialogProps> = memo(({ active, guildState, reset, onClose, onConfirm, formatNumber }) => {
  const { containerRef, handleTabKey } = useFocusTrap(active, onClose);
  const titleId = useId();
  const unlockGroupId = useId();
  const levels = legacyLevelPreview(guildState);
  const keepable = legacyKeepableUnlocks(guildState);
  const [picked, setPicked] = useState<string | null>(keepable[0]?.id ?? null);
  const [understood, setUnderstood] = useState(false);
  const current = (guildState.legacy?.count ?? 0) + 1;
  // Golden Parachute carries a tenth of the money into the next Legacy
  const parachute = getGoldenParachuteMoney(guildState, reset.money);
  const guildOnlyNote = guildState.committedGuild ? GUILD_ONLY_NOTES[guildState.committedGuild] : undefined;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={containerRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleTabKey}
      >
        <div className={styles.header}>
          <InlineIcon src={ICON_SCROLL} size={36} gap={12} />
          <div>
            <h2 id={titleId} className={styles.title}>End your Legacy?</h2>
            <p className={styles.subtitle}>
              You have spent {describeDays(reset.daysThisLegacy)} in the {reset.guildName}. Legacy {legacyNumeral(current)} ends here,
              and Legacy {legacyNumeral(current + 1)} starts a new farm at Farm Tier 1 with what you keep.
            </p>
          </div>
        </div>

        <div className={styles.columns}>
          <section className={styles.column} aria-label="You keep">
            <h3 className={`${styles.columnTitle} ${styles.keepTitle}`}>You keep</h3>

            <div className={styles.section}>
              <h4 className={styles.caption}>Half your levels, rounded down</h4>
              {levels.length === 0 ? (
                <p className={styles.hint}>No leveled upgrades bought this Legacy. Two levels of one carry one over.</p>
              ) : (
                <table className={styles.levels}>
                  <thead>
                    <tr><th scope="col">Upgrade</th><th scope="col">This Legacy</th><th scope="col">Kept</th></tr>
                  </thead>
                  <tbody>
                    {levels.map(row => (
                      <tr key={row.upgrade.id}>
                        <td>{row.upgrade.name}</td>
                        <td className={styles.num}>{row.bought}</td>
                        <td className={`${styles.num} ${styles.kept}`}>
                          {row.keptAfter}{row.keptBefore > 0 && <span className={styles.before}> (was {row.keptBefore})</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className={styles.hint}>Kept levels work at full strength in any guild, and add up across Legacies.</p>
            </div>

            <div className={styles.section} role="radiogroup" aria-labelledby={unlockGroupId}>
              <h4 id={unlockGroupId} className={styles.caption}>One unlock to keep for good</h4>
              {keepable.length === 0 && (
                <p className={styles.hint}>Nothing to keep this time: no one-time upgrade bought this Legacy that can leave the guild.</p>
              )}
              {keepable.map(upgrade => (
                <label key={upgrade.id} className={`${styles.pick} ${picked === upgrade.id ? styles.pickOn : ''}`}>
                  <input type="radio" name="legacy-unlock" checked={picked === upgrade.id} onChange={() => setPicked(upgrade.id)} />
                  <span>
                    <b>{upgrade.name}</b>
                    <span className={styles.pickNote}>{UNLOCK_NOTES[upgrade.id] ?? upgrade.description}</span>
                  </span>
                </label>
              ))}
              {guildOnlyNote && (
                <p className={styles.guildOnly}><InlineIcon src={ICON_LOCK} size={14} gap={5} />{guildOnlyNote}</p>
              )}
            </div>

            <div className={styles.section}>
              <h4 className={styles.caption}>Also kept</h4>
              <p className={styles.line}><InlineIcon src={ICON_TROPHY} size={20} gap={8} /><span><b>{plural(reset.achievementsKept, 'special and hidden achievement')}</b>, with the bonuses and outfits they grant</span></p>
              <p className={styles.line}><InlineIcon src={ICON_MILESTONE} size={20} gap={8} /><span>Pumpkin Rush and Christmas Tree Shop progress, and your settings</span></p>
              {parachute > 0 && (
                <p className={styles.line}><InlineIcon src={ICON_MONEY} size={20} gap={8} /><span><b>${formatNumber(parachute)}</b> from Golden Parachute, a tenth of your money</span></p>
              )}
            </div>
          </section>

          <section className={styles.column} aria-label="Back to the start">
            <h3 className={`${styles.columnTitle} ${styles.resetTitle}`}>Back to the start</h3>
            <ul className={styles.losses}>
              <li><b>Farm Tier {reset.farmTier} → Tier 1.</b> {plural(reset.maxPlots, 'plot')} → 4, {plural(reset.cropsUnlocked, 'crop')} → Radish only, every crop upgrade</li>
              <li><b>{parachute > 0
                ? <>${formatNumber(reset.money)} → ${formatNumber(parachute)}, {formatNumber(reset.knowledge)} knowledge and {formatNumber(reset.experience)} experience → 0</>
                : <>${formatNumber(reset.money)}, {formatNumber(reset.knowledge)} knowledge and {formatNumber(reset.experience)} experience → 0</>}</b></li>
              <li><b>Canning.</b> {plural(reset.recipesUnlocked, 'recipe')}, {plural(reset.canningUpgradeLevels, 'upgrade level')}, {formatNumber(reset.canningExperience)} canning experience</li>
              <li><b>Bees.</b> {plural(reset.hives, 'hive')}, {formatNumber(reset.honey, 1)} honey, {formatNumber(reset.goldenHoney, 1)} Golden Honey, {plural(reset.beeUpgrades, 'upgrade')}</li>
              <li><b>{reset.guildName} membership.</b> {formatNumber(reset.guildCurrency)} {reset.guildCurrencyName} and every other guild upgrade. You choose a guild again at Farm Tier 5</li>
              <li><b>{plural(reset.achievementsReset, 'achievement')}</b>, to earn again with their rewards</li>
              <li><b>Year {reset.year} → Year 1, Day 1</b></li>
            </ul>
            <p className={styles.warning}>The game saves your new Legacy and reloads. Nothing from the old farm can come back after that.</p>
          </section>
        </div>

        <div className={styles.footer}>
          <label className={styles.understand}>
            <input type="checkbox" checked={understood} onChange={e => setUnderstood(e.target.checked)} />
            I understand this can't be undone
          </label>
          <span className={styles.spacer} />
          <button type="button" className={styles.cancel} onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={styles.confirm}
            disabled={!understood}
            title={understood ? undefined : 'Tick the box first'}
            onClick={() => onConfirm(picked)}
          >
            End Legacy
          </button>
        </div>
      </div>
    </div>
  );
});

LegacyDialog.displayName = 'LegacyDialog';

export default LegacyDialog;
