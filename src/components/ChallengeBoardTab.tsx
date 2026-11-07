/**
 * Challenge Board Tab Component
 *
 * The Summer Watermelon Festival's competitions, mockup A as picked: three challenge
 * cards side by side, each with its clock, the standings of you and the three rivals,
 * and the prizes or the Spit button; the trophy case under them; the Board upgrades
 * and the rivals on the right.
 *
 * Every number comes from utils/challenges, so the cards show what the board will judge.
 */

import { memo, useId, type FC } from 'react';
import BaseTab from './BaseTab';
import EventArt from './EventArt';
import EventUpgradesPanel from './EventUpgradesPanel';
import ProgressBar from './ProgressBar';
import { CHALLENGE_KINDS, CHALLENGE_ORDER, SUMMER_ART, SUMMER_EVENT_CONSTANTS } from '../data/summerEventData';
import { RIVALS } from '../data/rivals';
import { formatScore, placingFor, resultSummary, rivalScoreAt } from '../utils/challenges';
import { ownsUpgrade } from '../utils/summerPricing';
import type { UseSummerEventReturn } from '../hooks/useSummerEvent';
import type { Challenge, ChallengeBoardState, ChallengeKind } from '../types/summerEvent';
import frame from './SummerSections.module.css';
import styles from './ChallengeBoardTab.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

const C = SUMMER_EVENT_CONSTANTS;
const ORDINALS = ['1st', '2nd', '3rd', '4th'] as const;

/** Sweetness bars start at 8 Brix, so a tenth of a Brix still shows */
const BAR_FLOOR: Partial<Record<ChallengeKind, number>> = { sweetest: 8 };

/** The trophy case's label for each kind's best */
const BEST_LABELS: Record<ChallengeKind, string> = {
  harvestRace: 'Most',
  salesSprint: 'Most',
  sweetest: 'Sweetest',
  spitting: 'Longest',
  heaviest: 'Heaviest',
};

const PRIZE_LINE = `1st ${C.PRIZES[1]} · 2nd ${C.PRIZES[2]} · 3rd ${C.PRIZES[3]} · taking part ${C.PRIZES[4]}`;

// ============================================================================
// CHALLENGE CARD
// ============================================================================

interface Standing {
  name: string;
  score: number;
  you: boolean;
}

interface ChallengeCardProps {
  challenge: Challenge;
  seeds: number;
  onSpit: () => number | null;
}

const ChallengeCard: FC<ChallengeCardProps> = memo(({ challenge, seeds, onSpit }) => {
  const titleId = useId();
  const definition = CHALLENGE_KINDS[challenge.kind];
  const race = definition.scoring === 'race';
  const rivalScores = RIVALS.map((_, i) => rivalScoreAt(challenge, i));
  const placing = placingFor(challenge.score, rivalScores);
  const days = Math.max(0, Math.ceil(challenge.daysLeft));
  const elapsed = challenge.length > 0 ? ((challenge.length - days) / challenge.length) * 100 : 100;

  // You first on a tie, as the judging has it
  const standings: Standing[] = [
    { name: 'You', score: challenge.score, you: true },
    ...RIVALS.map((rival, i) => ({ name: rival.name, score: rivalScores[i], you: false })),
  ].sort((a, b) => b.score - a.score || Number(b.you) - Number(a.you));
  const floor = BAR_FLOOR[challenge.kind] ?? 0;
  const top = Math.max(...standings.map(s => s.score), floor + 1);
  const barWidth = (score: number) => Math.max(0, Math.min(100, ((score - floor) / (top - floor)) * 100));

  // Who to watch: the rival who will finish highest
  const leaderIndex = challenge.rivalFinals.indexOf(Math.max(...challenge.rivalFinals));
  const leader = RIVALS[leaderIndex];
  const note = race
    ? `Rivals climb with the clock. ${leader?.name ?? 'The leader'} is on pace for ${formatScore(challenge.kind, challenge.rivalFinals[leaderIndex] ?? 0)}.`
    : challenge.kind === 'sweetest'
      ? 'Rivals posted their best when it opened. A Sugar Melon is 12.0 and up.'
      : 'Rivals posted their best when it opened.';

  const badgeClass = challenge.score <= 0 ? styles.badgeNone : placing === 1 ? styles.badgeFirst : styles.badgePlaced;
  const badge = challenge.score <= 0 ? 'No entry yet' : `You're ${ORDINALS[placing - 1]}`;

  const canSpit = challenge.spitsLeft > 0 && seeds >= C.SPIT_SEEDS;
  const spitReason = challenge.spitsLeft <= 0 ? '. No spits left' : seeds < C.SPIT_SEEDS ? '. Not enough seeds' : '';

  return (
    <section className={styles.challengeCard} aria-labelledby={titleId}>
      <div className={styles.cardHeader}>
        <h3 id={titleId} className={styles.cardTitle}>
          <EventArt art={definition.art} size={28} /> {definition.name}
        </h3>
        <span className={`${styles.badge} ${badgeClass}`}>{badge}</span>
      </div>
      <p className={styles.cardDescription}>{definition.description}</p>

      <div className={styles.clock}>
        <div role="progressbar" aria-label={`${definition.name} time gone`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(elapsed)}>
          <ProgressBar value={elapsed} max={100} height={10} color="#F08A3C" />
        </div>
        <span>{days} of {challenge.length} days left</span>
      </div>

      <ol className={styles.standings} aria-label={`${definition.name} standings`}>
        {standings.map(standing => (
          <li key={standing.name} className={standing.you ? `${styles.standing} ${styles.you}` : styles.standing}>
            <span className={styles.standingName}>{standing.name}</span>
            <span className={styles.standingTrack} aria-hidden="true">
              <span className={styles.standingBar} style={{ width: `${barWidth(standing.score)}%` }} />
            </span>
            <span className={styles.standingScore}>{formatScore(challenge.kind, standing.score)}</span>
          </li>
        ))}
      </ol>

      <p className={styles.cardNote}>{note}</p>

      {challenge.kind === 'spitting' ? (
        <div className={styles.cardFooter}>
          <button
            type="button"
            className={styles.spitButton}
            onClick={() => onSpit()}
            disabled={!canSpit}
            aria-label={`Spit a seed: uses ${C.SPIT_SEEDS} seeds, ${challenge.spitsLeft} of ${C.SPITS_PER_CHALLENGE} spits left${spitReason}`}
          >
            <EventArt art={SUMMER_ART.seeds} size={18} /> Spit ({C.SPIT_SEEDS} seeds)
          </button>
          <span className={styles.spitCount}>
            {challenge.spitsLeft} of {C.SPITS_PER_CHALLENGE} spits left<br />{seeds} seeds
          </span>
        </div>
      ) : (
        <p className={styles.cardFooter}>
          <EventArt art={SUMMER_ART.tickets} size={18} alt="Tickets" /> {PRIZE_LINE}
        </p>
      )}
    </section>
  );
});

ChallengeCard.displayName = 'ChallengeCard';

// ============================================================================
// TROPHY CASE
// ============================================================================

interface TrophyCaseProps {
  board: ChallengeBoardState;
  heaviestOpen: boolean;
}

const TrophyCase: FC<TrophyCaseProps> = memo(({ board, heaviestOpen }) => {
  const titleId = useId();

  return (
    <section className={styles.trophyCase} aria-labelledby={titleId}>
      <h3 id={titleId} className={styles.trophyTitle}>
        <EventArt art={SUMMER_ART.trophy} size={20} /> Trophy Case
      </h3>
      <ul className={styles.trophies}>
        {CHALLENGE_ORDER.map(kind => {
          const definition = CHALLENGE_KINDS[kind];
          const ribbons = board.ribbons[kind];
          const best = board.bests[kind];
          const locked = kind === 'heaviest' && !heaviestOpen;
          const won = ribbons.first + ribbons.second + ribbons.third > 0;
          return (
            <li key={kind} className={locked ? `${styles.trophy} ${styles.trophyLocked}` : styles.trophy}>
              <span className={styles.trophyName}>
                <EventArt art={definition.art} size={22} /> {definition.name}
              </span>
              {won ? (
                <span className={styles.ribbons}>
                  {ribbons.first > 0 && <span><EventArt art={SUMMER_ART.ribbonFirst} size={18} alt="First place" /> {ribbons.first}</span>}
                  {ribbons.second > 0 && <span><EventArt art={SUMMER_ART.ribbonSecond} size={18} alt="Second place" /> {ribbons.second}</span>}
                  {ribbons.third > 0 && <span><EventArt art={SUMMER_ART.ribbonThird} size={18} alt="Third place" /> {ribbons.third}</span>}
                </span>
              ) : (
                <span className={styles.trophyNote}>No ribbons yet</span>
              )}
              <span className={styles.trophyNote}>
                {locked
                  ? 'Opens with the Carolina Cross'
                  : best > 0 ? `${BEST_LABELS[kind]}: ${formatScore(kind, best)}` : 'No best yet'}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
});

TrophyCase.displayName = 'TrophyCase';

// ============================================================================
// THE RIVALS
// ============================================================================

const RivalsPanel: FC<{ beaten: number[] }> = memo(({ beaten }) => {
  const titleId = useId();
  return (
    <section className={styles.rivals} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.rivalsTitle}>The Rivals</h2>
      <ul className={styles.rivalList}>
        {RIVALS.map((rival, i) => (
          <li key={rival.id} className={styles.rival}>
            <span className={`${styles.portrait} ${styles[`portrait_${rival.id}`] ?? ''}`} aria-hidden="true"><img src={rival.portrait} alt="" width={40} height={40} /></span>
            <span className={styles.rivalText}>
              <b>{rival.name}</b>
              Beaten {beaten[i] ?? 0} time{(beaten[i] ?? 0) === 1 ? '' : 's'}
            </span>
          </li>
        ))}
      </ul>
      <p className={styles.rivalsNote}>Each first place makes that kind&apos;s rivals tougher. Losing never makes them easier.</p>
    </section>
  );
});

RivalsPanel.displayName = 'RivalsPanel';

// ============================================================================
// TAB
// ============================================================================

interface ChallengeBoardTabProps {
  event: UseSummerEventReturn;
  formatNumber: FormatNumber;
}

const ChallengeBoardTab: FC<ChallengeBoardTabProps> = ({ event, formatNumber }) => {
  const { board, materials, tickets, spit, purchaseUpgrade } = event;
  const { upgrades } = event.eventState;

  const ribbonTotals = CHALLENGE_ORDER.reduce(
    (sum, kind) => ({
      first: sum.first + board.ribbons[kind].first,
      second: sum.second + board.ribbons[kind].second,
      third: sum.third + board.ribbons[kind].third,
    }),
    { first: 0, second: 0, third: 0 }
  );
  const lastResult = board.lastResult;

  const mainContent = (
    <div className={frame.container}>
      {/* Left column: the bar, the three challenges and the trophy case */}
      <div className={frame.leftColumn}>
        <div className={frame.headerRow}>
          <h2 className={frame.sectionTitle}>
            <EventArt art={SUMMER_ART.board} size={26} /> Challenge Board
          </h2>
          <p className={styles.barNote} aria-live="polite">
            {lastResult
              ? <>Last: {resultSummary(lastResult)}</>
              : "Three challenges open, each a game year of play. Rivals wait while you're away."}
          </p>
          <ul className={frame.stockList} aria-label="Ribbons won">
            <li className={frame.stockItem}>
              <EventArt art={SUMMER_ART.ribbonFirst} size={20} />
              <span className={frame.stockLabel}>1st</span>
              <span className={frame.stockValue}>{formatNumber(ribbonTotals.first, 0)}</span>
            </li>
            <li className={frame.stockItem}>
              <EventArt art={SUMMER_ART.ribbonSecond} size={20} />
              <span className={frame.stockLabel}>2nd</span>
              <span className={frame.stockValue}>{formatNumber(ribbonTotals.second, 0)}</span>
            </li>
            <li className={frame.stockItem}>
              <EventArt art={SUMMER_ART.ribbonThird} size={20} />
              <span className={frame.stockLabel}>3rd</span>
              <span className={frame.stockValue}>{formatNumber(ribbonTotals.third, 0)}</span>
            </li>
          </ul>
        </div>

        {board.challenges.length > 0 ? (
          <div className={styles.challengeCards}>
            {board.challenges.map(challenge => (
              <ChallengeCard key={challenge.id} challenge={challenge} seeds={materials.seeds} onSpit={spit} />
            ))}
          </div>
        ) : (
          <p className={styles.boardEmpty}>The first three challenges open with the next day of play.</p>
        )}

        <TrophyCase board={board} heaviestOpen={ownsUpgrade(upgrades, 'unlock_carolina_cross')} />
      </div>

      {/* Right column: Board upgrades, then the rivals */}
      <div className={styles.rightStack}>
        <div className={frame.rightColumn}>
          <EventUpgradesPanel
            title="Board Upgrades"
            category="board"
            upgrades={upgrades}
            currency="tickets"
            balance={tickets}
            purchaseUpgrade={purchaseUpgrade}
            formatNumber={formatNumber}
          />
        </div>
        <RivalsPanel beaten={board.beaten} />
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

const MemoizedChallengeBoardTab = memo(ChallengeBoardTab);
MemoizedChallengeBoardTab.displayName = 'ChallengeBoardTab';

export default MemoizedChallengeBoardTab;
