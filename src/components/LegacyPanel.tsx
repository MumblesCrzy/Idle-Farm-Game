/**
 * The "Your Legacy" box on the Guilds tab: which Legacy this is, the unlocks and levels kept
 * from earlier ones, and the Legacies that came before.
 */
import { memo, type FC } from 'react';
import InlineIcon from './InlineIcon';
import type { LegacyRecord } from '../types/guilds';
import { GUILDS } from '../data/guildData';
import { findGuildUpgrade } from '../utils/guildCalculations';
import { describeDays, guildDisplayName, legacyNumeral, legacyUpgradeName } from '../utils/legacy';
import { ICON_SCROLL } from '../config/assetPaths';
import styles from './LegacyPanel.module.css';

interface LegacyPanelProps {
  legacy: LegacyRecord;
  /** Whether a guild can be joined yet; the note changes below the unlock tier */
  guildsUnlocked: boolean;
  /** The narrow version for the Guilds sidebar, which scrolls inside when the record runs long */
  compact?: boolean;
}

/** The emblem of the guild an upgrade belongs to */
const emblemFor = (upgradeId: string): string | undefined => {
  const guildId = findGuildUpgrade(upgradeId)?.guild;
  return GUILDS.find(guild => guild.id === guildId)?.emblem;
};

const LegacyPanel: FC<LegacyPanelProps> = memo(({ legacy, guildsUnlocked, compact = false }) => {
  const keptLevels = Object.entries(legacy.keptLevels).filter(([, levels]) => levels > 0);
  const history = [...legacy.history].reverse();

  return (
    <section className={compact ? `${styles.panel} ${styles.compact}` : styles.panel} aria-labelledby="legacy-panel-heading">
      <h3 id="legacy-panel-heading" className={styles.title}>
        <InlineIcon src={ICON_SCROLL} size={24} gap={8} />Your Legacy
        <span className={styles.badge}>Legacy {legacyNumeral(legacy.count + 1)}</span>
      </h3>

      <div className={styles.group}>
        <span className={styles.caption}>Kept unlocks</span>
        <div className={styles.chips}>
          {legacy.keptUnlocks.length === 0 && <span className={styles.none}>None yet</span>}
          {legacy.keptUnlocks.map(id => {
            const emblem = emblemFor(id);
            return (
              <span key={id} className={styles.chip}>
                {emblem && <InlineIcon src={emblem} size={16} gap={5} />}
                {legacyUpgradeName(id)}
              </span>
            );
          })}
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.caption}>Kept levels</span>
        <div className={styles.chips}>
          {keptLevels.length === 0 && <span className={styles.none}>None yet</span>}
          {keptLevels.map(([id, levels]) => (
            <span key={id} className={styles.chip}>{legacyUpgradeName(id)} {levels}</span>
          ))}
        </div>
      </div>

      <p className={styles.note}>
        {guildsUnlocked
          ? 'They work now, in any guild, at full strength.'
          : 'They work now, in any guild, at full strength. Choose a guild again at Farm Tier 5.'}
      </p>

      {history.length > 0 && (
        <ul className={styles.history} aria-label="Past Legacies">
          {history.map((entry, index) => (
            <li key={`${entry.endedAt}-${index}`}>
              <b>Legacy {legacyNumeral(legacy.count - index)}</b> · {guildDisplayName(entry.guild)} · {describeDays(entry.days)}
              {entry.unlock ? ` · kept ${legacyUpgradeName(entry.unlock)}` : ''}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});

LegacyPanel.displayName = 'LegacyPanel';

export default LegacyPanel;
