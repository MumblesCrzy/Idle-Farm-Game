# Wisdom of the Ages - Prestige System Design Document

**Version:** 0.12.0  
**Status:** In Development  
**Last Updated:** February 7, 2026

---

## Overview

"Wisdom of the Ages" is a true prestige mechanic that introduces a generational farming cycle. Players have **80 in-game years** to grow their farm as large as possible. At the end of each "lifetime," progress is tallied and converted into **Wisdom** — a permanent currency that persists across all future lifetimes.

Wisdom can be spent on powerful permanent upgrades that provide lasting advantages, allowing players to progress further in each subsequent lifetime.

---

## Core Mechanics

### Lifetime Duration

- Each lifetime lasts exactly **80 years** (29,200 days)
- Time progresses naturally via the existing day/year system
- No early prestige option — players must complete the full 80 years
- When `totalDaysElapsed` reaches 29,200, the lifetime ends automatically

### End of Lifetime

When the 80-year mark is reached:

1. **Game Pauses** — All progression stops
2. **Summary Overlay Appears** — Displays lifetime statistics and Wisdom earned
3. **Wisdom Awarded** — Calculated based on lifetime performance
4. **New Lifetime Begins** — After player confirms, the game resets with Wisdom preserved

---

## Wisdom Formula

The Wisdom earned at the end of each lifetime is calculated as:

```
Wisdom = (Total Money Earned ÷ 1,000,000) × (Total Knowledge Gained ÷ 1,000) × Max Farm Tier Reached
```

### Formula Components

| Component | Description | Division Factor |
|-----------|-------------|-----------------|
| Total Money Earned | Cumulative gold earned during the lifetime (not current balance) | 1,000,000 |
| Total Knowledge Gained | Cumulative knowledge earned during the lifetime | 1,000 |
| Max Farm Tier Reached | Highest farm tier achieved (1-10) | None (multiplier) |

### Example Calculation

A player who:
- Earned 50,000,000 gold total
- Gained 15,000 knowledge total  
- Reached Farm Tier 7

Would receive: `(50,000,000 ÷ 1,000,000) × (15,000 ÷ 1,000) × 7 = 50 × 15 × 7 = 5,250 Wisdom`

> **Note:** Formula values are initial estimates and will be tuned after playtesting.

---

## Reset Behavior

### What RESETS (Start of New Lifetime)

| Category | Items Reset |
|----------|-------------|
| **Resources** | Money, Knowledge, Experience |
| **Farm** | Farm Tier (→1), Max Plots (→4), All planted veggies |
| **Time** | Day (→1), Total Days Elapsed (→0) |
| **Upgrades** | All Knowledge upgrades (Greenhouse, Heirloom, etc.) |
| **Guilds** | Guild commitment, Guild currencies (Sigils, etc.), Guild upgrades |
| **Canning** | Canning progress, Auto-canning settings |
| **Bees** | Bee boxes, Bee upgrades, Honey/Wax |

### What PERSISTS (Across All Lifetimes)

| Category | Items Preserved |
|----------|-----------------|
| **Wisdom** | Total Wisdom currency accumulated |
| **Wisdom Upgrades** | All purchased permanent upgrades |
| **Achievements** | Achievement unlock status (display only) |
| **Settings** | Audio, display, and game settings |
| **Events** | Seasonal event progress |

---

## Wisdom Upgrades

Wisdom is spent in a dedicated upgrade shop accessible from the main UI. These upgrades provide permanent bonuses that persist across all lifetimes. The wisdom upgrade shop should be locked until the player has at least 1 wisdom, any then it can stay unlocked.

### Confirmed Upgrades

#### Extended Lifespan
- **Effect:** Extends each lifetime by additional years
- **Tiers:** Multiple levels available
- **Example:** +5 years per level (85 → 90 → 95 years, etc.)

#### Permanent Guild Benefits
- **Effect:** Retain select guild upgrade effects after prestige
- **Tiers:** Multiple levels unlock more retained benefits
- **Note:** Does not retain guild commitment or currencies — only passive effects, build the framework for this without getting into details yet.

#### Starting Gold
- **Effect:** Begin each lifetime with bonus starting gold
- **Tiers:** Scaling amounts (e.g., 100 → 500 → 2,000 → 10,000)

#### Starting Knowledge
- **Effect:** Begin each lifetime with bonus knowledge
- **Tiers:** Scaling amounts (e.g., 10 → 50 → 200 → 1,000)

#### Starting Growing experience
- **Effect:** Begin each lifetime with bonus experience
- **Tiers:** Scaling amounts that immediately unlockes higher tier crops for low level farms.
- **Notes:**This should also apply to when a larger farm is purchased, keeping the extra +N crops unlocked at the start. As an example level 2 in this upgrade would immeditely unlock level 1,2,3 crops on the farm level 1, and level 1,2,3,4,5,6 on a level 4 farm.

### Potential Future Upgrades (Ideas)

- **Bee Legacy** — Start with a N number of free bee boxes, scaled with the upgrade level
- **Mega Hives** - Double hive capacity and production
- **Guild Affinity** — Reduced requirements for guild commitment

---

## UI/UX Design

### Lifetime Progress Indicator

- Display current year prominently (existing Year/Day display)
- Consider adding a "Years Remaining"
- Visual indication as end of lifetime approaches (e.g., golden border at year 75+)

### Lifetime Counter Display

- Purpose: show which lifetime the player is currently in and provide quick context about progress across generations.
- Location: next to the existing Year/Day display in the header (top-right area) so it is always visible.
- Fields to show:
  - "Lifetime" label and a counter: "Lifetime: #" (current lifetime number, starting at 1 for the very first playthrough).
  - Optional small subtext: "Completed: N" (total lifetimes fully completed) if the UI needs to distinguish current vs completed counts.
- Behavior:
  - Increment `lifetimeCount` when a lifetime fully completes (after the end-of-lifetime summary and confirmation to begin the next lifetime).
  - On first load of a migrated save, initialize `lifetimeCount` = 1 if no previous lifetimes exist.
  - The counter persists in `PrestigeState.lifetimeCount` and is shown immediately on game start and in the end-of-lifetime overlay.
  - Accessibility: provide tooltip or screen-reader text: "You are in lifetime X of Y" (Y only if an extended lifespan or planned max is shown).

Design notes:
- Keep the visual small and unobtrusive (e.g., small badge with a lifetime icon) so it doesn't compete with the Day/Year readout.
- Use the same golden accent used for end-of-lifetime visuals when the lifetime is near completion to provide consistent affordance.

### End of Lifetime Overlay

```
┌─────────────────────────────────────────────────────────┐
│                  WISDOM OF THE AGES                      │
│              Your Lifetime Has Concluded                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   📊 LIFETIME STATISTICS                                 │
│   ────────────────────                                   │
│   Years Lived:           80                              │
│   Total Gold Earned:     52,347,891                      │
│   Total Knowledge:       18,432                          │
│   Max Farm Tier:         8                               │
│                                                          │
│   📜 WISDOM CALCULATION                                  │
│   ────────────────────                                   │
│   (52,347,891 ÷ 1,000,000) × (18,432 ÷ 1,000) × 8       │
│   = 52.35 × 18.43 × 8                                   │
│   = 7,717 Wisdom                                         │
│                                                          │
│   🌟 Total Wisdom: 12,453 (+7,717)                       │
│                                                          │
│              [ Begin New Lifetime ]                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Wisdom Shop

- Accessible from main UI (new tab)
- Shows current Wisdom balance
- Lists all available upgrades with:
  - Name and description
  - Current level / Max level
  - Cost for next level
  - Effect preview
- Upgrades can be purchased at any time (during lifetime or at prestige screen)

---

## Technical Implementation Notes

### New State Fields Required

```typescript
// Add to GameState or create new PrestigeState
interface PrestigeState {
  wisdom: number;                    // Total wisdom currency
  lifetimeCount: number;             // Number of completed lifetimes
  wisdomUpgrades: WisdomUpgrades;    // Purchased permanent upgrades
  
  // Lifetime tracking (reset each prestige)
  totalMoneyEarned: number;          // Track all gold earned this lifetime
  totalKnowledgeGained: number;      // Track all knowledge earned this lifetime
  maxFarmTierReached: number;        // Highest tier achieved this lifetime
}

interface WisdomUpgrades {
  extendedLifespan: number;          // Levels purchased
  permanentGuildBenefits: number;    
  startingGold: number;
  startingKnowledge: number;
  startingExperience: number;
  // ... additional upgrades
}
```

### Save System Changes

- Add `prestigeState` to `ExtendedGameState`
- Create migration for existing saves (initialize with 0 wisdom, lifetime 1)
- Prestige data should persist even through hard resets (consider separate storage key?)

### Key Implementation Points

1. **Track Lifetime Stats** — Hook into money/knowledge gain functions to accumulate totals
2. **Farm Tier Tracking** — Update `maxFarmTierReached` on each tier upgrade
3. **Day Counter Check** — Monitor `totalDaysElapsed` for 80-year (29,200 day) threshold
4. **Prestige Reset Function** — Similar to existing `resetGame` but preserves prestige state
5. **Apply Wisdom Bonuses** — On new lifetime start, apply starting resource bonuses

### Game Loop Integration

```typescript
// In game loop or day progression
if (totalDaysElapsed >= getMaxLifetimeDays()) {
  triggerEndOfLifetime();
}

function getMaxLifetimeDays(): number {
  const baseYears = 80;
  const bonusYears = wisdomUpgrades.extendedLifespan * 5; // 5 years per level
  return (baseYears + bonusYears) * 365;
}
```

---

## Testing Considerations

- [ ] Verify wisdom calculation accuracy with various stat combinations
- [ ] Test prestige reset preserves correct data
- [ ] Confirm wisdom upgrades apply bonuses correctly
- [ ] Test edge cases (prestige at exactly day 29,200)
- [ ] Validate save/load with prestige data
- [ ] Test migration from pre-prestige saves
- [ ] Balance testing for wisdom formula and upgrade costs

---

## Achievements

Achievements are permanent, one-time unlocks that persist across lifetimes. They should be tracked in save data so that each achievement is awarded only once and never re-awarded on subsequent lifetimes.

Persistence / Schema

Add an `achievementsUnlocked` map to `PrestigeState`:

```typescript
interface PrestigeState {
  wisdom: number;
  lifetimeCount: number;
  wisdomUpgrades: WisdomUpgrades;
  achievementsUnlocked: Record<string, {
    unlockedAt: number;           // UTC epoch ms
    lifetimeWhenUnlocked: number; // lifetimeCount when unlocked
  }>;
  // other fields...
}
```

Awarding rules

- Before awarding an achievement, check `achievementsUnlocked[id]` and skip awarding if present.
- On award: add entry to `achievementsUnlocked`, persist the save immediately, and show a toast/notification. Record `lifetimeWhenUnlocked` for analytics and UI.
- Do not auto-grant achievements retroactively for historical stats except via an explicit migration step.

Required Lifetime Achievements

Add these lifetime milestone achievements to the achievements catalog:

- `achievement.lifetime_complete_1` — "First Generation"
  - Description: "Complete your first lifetime."
  - Trigger: When the player finishes lifetime #1 (on prestige).

- `achievement.lifetime_complete_2` — "Family Tradition"
  - Description: "Complete 2 lifetimes."
  - Trigger: When the player finishes lifetime #2.

- `achievement.lifetime_complete_5` — "Lineage"
  - Description: "Complete 5 lifetimes."
  - Trigger: When the player finishes lifetime #5.

- `achievement.lifetime_complete_10` — "Dynasty"
  - Description: "Complete 10 lifetimes."
  - Trigger: When the player finishes lifetime #10.

Additional achievement ideas (examples)

- `achievement.starting_bonus_bought_1` — "First Inheritance": Buy your first starting-life bonus.
- `achievement.starting_bonus_bought_5` — "Generational Investor": Buy a total of 5 starting-life bonuses across lifetimes.
- `achievement.wisdom_10000` — "Wisdom Seeker": Accumulate 1,000,000 total Wisdom.

UI/UX

- Achievements screen: show locked/unlocked state, unlocked timestamp and lifetime number.
- When an achievement unlocks during gameplay or at prestige, show a toast. If multiple unlock at once, queue or consolidate notifications.
- On the prestige summary overlay, if an achievement was unlocked by the prestige event, show it in the summary area (small list or link to the achievements screen).

Migration and edge cases

- Migrate older saves by creating an empty `achievementsUnlocked` map if absent.
- If you wish to retroactively award achievements for past performance, provide an explicit migration that scans historical stats and adds entries (opt-in; do not auto-award by default).
- Handle duplicate/unordered unlock events idempotently: check existing map before writing and persist immediately after adding.

Tests

- Unlock each lifetime achievement and verify `achievementsUnlocked` contains the correct id and `lifetimeWhenUnlocked`.
- Re-trigger unlock conditions and verify no duplicate entries or notifications appear.
- Test migration from old saves to ensure `achievementsUnlocked` is initialized.

---

## Intro & Tutorial Flow

This section defines the onboarding flow that introduces the limited-lifespan prestige mechanic at game start and explains the Wisdom Shop at the end of the first lifetime. The goal is to teach players the core concept without interrupting experienced players.

High level behaviour

- Show a short, skippable intro overlay at the very first game start (only when `prestigeState.lifetimeCount === 1` and `tutorialFlags.hasSeenLifespanIntro` is false).
- After the first lifetime completes, show a short explanation on the prestige summary overlay about the Wisdom Shop and starting-life bonuses (only when `tutorialFlags.hasSeenShopExplanation` is false).
- Both overlays are optional to skip, and once dismissed their flags are persisted so they won't appear again.

Save flags and schema

Add to the global save structure:

```typescript
interface TutorialFlags {
  hasSeenLifespanIntro?: boolean;
  hasSeenShopExplanation?: boolean;
}

interface ExtendedGameState {
  // existing fields...
  tutorialFlags: TutorialFlags;
  prestigeState: PrestigeState;
}
```

Start-of-game overlay (lifespan intro)

- Trigger: On first game start when `prestigeState.lifetimeCount === 1 && !tutorialFlags.hasSeenLifespanIntro`.
- Purpose: Introduce the 80-year lifetime, the concept of Wisdom as persistent currency, and the idea that later generations will be stronger.
- UX copy (short):
  - Title: "A Limited Life, A Lasting Legacy"
  - Body: "You have 80 years to build your farm. At the end of your life you'll earn Wisdom — a permanent resource that helps future generations. This is called 'Wisdom of the Ages'."
  - Buttons: [Start Farming] (primary), [More Details] (optional link to documentation/FAQ)
- Behaviour: Overlay is skippable; on close set `tutorialFlags.hasSeenLifespanIntro = true` and persist save.

End-of-first-lifetime overlay (shop explanation)

- Trigger: Immediately after prestige when `prestigeState.lifetimeCount === 1 && !tutorialFlags.hasSeenShopExplanation`.
- Purpose: Explain the Wisdom Shop UI, clarify that some upgrades (starting-life bonuses) can only be purchased between lifetimes and will apply to the next lifetime.
- UX copy (short):
  - Title: "Your Legacy Awaits"
  - Body: "You just earned Wisdom! Visit the Wisdom Shop to buy permanent upgrades. Some upgrades (starting bonuses) can only be bought between lifetimes and will apply to the next life."
  - Buttons: [Open Wisdom Shop] (primary), [Begin Next Lifetime] (secondary)
- Behaviour: Offer a quick link to the shop and mark `tutorialFlags.hasSeenShopExplanation = true` when dismissed.

Skip logic for returning players

- If `prestigeState.lifetimeCount > 1`, do not show the start-of-game overlay. If `tutorialFlags` flags are already true, do not show overlays.
- Provide a manual help entry or button in settings to re-open these overlays for players who want a refresher.

Implementation notes

- Persist flags as part of the save and include them in migration (default to false on migration).
- Prefer modest length copy (one or two short paragraphs). Keep overlays skippable so experienced players are not blocked.
- On small screens consider collapsing the overlay into a compact card or walkthrough step.

Tests

- New player: verify start-of-game overlay appears and that closing it sets `hasSeenLifespanIntro`.
- After first prestige: verify shop overlay appears and that dismissing it sets `hasSeenShopExplanation`.
- Returning player: verify neither overlay appears when flags are set or `lifetimeCount > 1`.

Accessibility

- Ensure overlays are keyboard-navigable and that screen readers announce title and body text. Provide accessible labels for primary actions.

---

## Open Questions

1. **Wisdom Shop Access** — Always available, or only at end of lifetime?
2. **Lifetime Counter Display** — Show "Lifetime #X" somewhere in UI?
3. **Achievement Interaction** — Should certain achievements only count once ever, or reset each lifetime?
4. **Tutorial/First Lifetime** — Any special handling for the very first playthrough?
5. **Offline Progress at Prestige** — If player is offline when 80 years hit, how to handle?

---

## Offline Time Catch-up & End-of-Lifetime Handling

We have an existing "time catch-up" offline system that simulates game progress while the player is away. That system should continue to operate, but must never simulate past the end-of-lifetime boundary. This section specifies a safe integration approach so offline processing applies up to the lifetime end and then pauses for prestige.

Design goals

- Apply offline gains normally when the offline interval does not reach the lifetime end.
- If the offline interval would cross the lifetime boundary, simulate only up to the exact end-of-lifetime moment and then pause the game and present the end-of-lifetime summary (prestige screen).
- Avoid granting any resources or events that would have occurred after the lifetime end.

State fields required

- `lastSavedAt: number` (UTC ms) — timestamp of last save/quit
- `lastTotalDaysElapsed: number` — total in-game days elapsed at last save
- Optional convenience: `prestigeState.lifetimeEndAt: number` (UTC ms) — predicted real-time moment when current lifetime will end (if you compute it), otherwise compute from `lastTotalDaysElapsed` + offline rate

Integration approach (recommended)

1. On load, compute the offline interval:

```ts
const now = Date.now();
const offlineMs = Math.max(0, now - save.lastSavedAt);
const predictedTotalDays = save.lastTotalDaysElapsed + convertMsToDays(offlineMs, save);
const lifetimeEndDays = getMaxLifetimeDaysForPlayer(save.prestigeState);
```

2. If `predictedTotalDays < lifetimeEndDays`:
- Run the existing `timeCatchUp(offlineMs)` path and apply offline gains normally.

3. If `predictedTotalDays >= lifetimeEndDays`:
- Compute how much in-game time remains until lifetime end:

```ts
const remainingDays = lifetimeEndDays - save.lastTotalDaysElapsed;
const allowedOfflineMs = convertDaysToMs(remainingDays, save);
```

- Run the offline simulation only for `allowedOfflineMs` (or call `timeCatchUp` with a cap like `timeCatchUp({maxDays: lifetimeEndDays})`). This ensures resource generation and events are simulated only up to the lifetime boundary.
- After the capped simulation completes, set `totalDaysElapsed = lifetimeEndDays` (defensive), persist the save, and immediately trigger the end-of-lifetime logic (pause progression and show the prestige summary overlay). Do not simulate any further offline time past that point.

Implementation notes

- Make the time catch-up / offline simulation function accept an optional cap parameter (maxDays or maxTimestamp). For example:

```ts
function timeCatchUp(offlineMs: number, opts?: { maxTotalDays?: number }): void {
  // simulate in small steps but stop if totalDaysElapsed >= opts.maxTotalDays
}
```

- If your catch-up system is event-driven or non-linear (e.g., triggers seasonal events), simulate in small ticks (e.g., per-day or per-hour) rather than applying a single bulk formula so the cap can be enforced precisely.
- If precise per-second simulation is too expensive, you can simulate in larger time-chunks as long as the chunk size is small enough to not meaningfully overshoot the lifetime boundary (e.g., per-day chunks when lifetime measured in days).

Clock tampering and safety

- Cap `offlineMs` to a reasonable maximum (e.g., 30 days) to limit effects of system clock changes; document the limitation. If a player manually changes their system clock to get more offline gains, this cap prevents arbitrarily large gains.
- If `offlineMs` is negative (system clock moved backwards), treat as zero.

Edge cases

- If events or resource formulas depend on absolute timestamps (e.g., seasonal events), ensure their offline simulation is also capped and that any mid-event state is consistent when the prestige triggers.
- If the lifetime ends mid-action (e.g., mid-harvest or mid-canning), decide on consistent rules: recommended is to finalize partial actions only up to the end-of-lifetime moment (process partial progress if possible), then include them in lifetime stats.

Tests

- Simulate a save where the offline interval does not reach the lifetime end: expect normal offline gains and no prestige screen on load.
- Simulate a save where the offline interval crosses the lifetime end: expect offline simulation to run only up to the lifetime boundary, then the prestige modal to show; no gains beyond the boundary should be applied.
- Test with extreme offlineMs values and negative clock changes to ensure caps and guards work.

Developer note

- This approach requires extending the time catch-up function(s) to support a max-cap parameter if not already present. If the current system already supports step-wise simulation, this is a minimal change; if it uses a single bulk formula, refactor to step-wise or add an inverse mapping to compute allowed offlineMs for the remainingDays.

---

## Changelog

| Date | Author | Changes |
|------|--------|---------|
| 2026-02-07 | — | Initial design document created |
 
---

## Telemetry & Key Counters (dev-only)

These metrics and events are intended for internal, developer-only use to help tune the prestige system, detect anomalies, and guide balance decisions. They should not be shown to players in production UIs, but surfaced to dev dashboards or logs.

Suggested event list (emit on the named trigger):

- `lifetime_complete` — when a lifetime ends. Payload: { lifetimeCount, wisdomGained, totalMoneyEarned, totalKnowledgeGained, maxFarmTierReached, durationDays }
- `wisdom_awarded` — when Wisdom is granted. Payload: { amount, formulaComponents }
- `shop_purchase` — when a Wisdom Shop purchase is made. Payload: { upgradeId, levelBefore, levelAfter, cost, appliesNow }
- `achievement_unlocked` — on achievement unlock. Payload: { achievementId, lifetimeWhenUnlocked }
- `offline_catchup` — when offline simulation runs. Payload: { offlineMsRequested, offlineMsApplied, cappedToLifetime: bool }
- `offline_catchup_capped` — when offline catch-up was capped by lifetime end. Payload: { requestedMs, appliedMs, remainingDaysAtLastSave }

Key counters / aggregates (periodically computed)

- avg_wisdom_per_lifetime (by cohort)
- distribution: lifetime_length_distribution (how often players reach 80 years vs extended lifespans)
- retention_by_lifetimeCount (how many players return after 1,2,5 lifetimes)
- shop_purchase_rate_by_upgrade (per-upgrade counts)
- offline_catchup_capped_rate (how often players hit lifetime end while offline)

Telemetry notes

- Respect privacy: do not include personal identifiers in events. If remote analytics are used, make sure usage follows the project's privacy policy and local regulations.
- Provide a dev-only toggle to enable/disable telemetry during testing.
- Use event sampling for very high-frequency events or aggregate client-side and send periodic summaries to reduce noise and cost.

Example event JSON (lifetime_complete)

```json
{
  "event": "lifetime_complete",
  "time": 1675833600000,
  "payload": {
    "lifetimeCount": 3,
    "wisdomGained": 7717,
    "totalMoneyEarned": 52347891,
    "totalKnowledgeGained": 18432,
    "maxFarmTierReached": 8,
    "durationDays": 29200
  }
}
```

Dev dashboard suggestion

- Surface the key counters on a simple internal dashboard (or export to CSV) so designers can tune the wisdom formula, upgrade costs, and the starting-life progression.

---

## Accessibility (expanded)

Make the prestige/lifetime UX accessible by default. The list below captures actionable accessibility requirements and implementation guidance.

General requirements

- All overlays (start-of-game intro, end-of-lifetime summary, wisdom shop modal) must be keyboard-focus-trapped while open and return focus to the invoking control when closed.
- Overlays and toasts must be reachable via keyboard (Tab / Shift+Tab), and primary actions (Confirm/Begin, Open Shop) must have clear focus styles.
- Provide ARIA roles and labels for dynamic regions: use `role="dialog"` and `aria-labelledby` for overlays and `role="status"` or `aria-live="polite"` for toast notifications.
- Announce important events to screen readers: when the prestige summary opens, dispatch an `aria-live` announcement with the short summary (e.g., "Lifetime complete: you earned 7,717 Wisdom").
- Respect `prefers-reduced-motion`: disable or simplify animations for players with the setting.

Lifetime counter accessibility

- Expose the lifetime counter as an accessible readout: include `aria-label="Lifetime: X"` and ensure screen readers can announce updates when the lifetime increments.
- Provide a tooltip or accessible help link near the counter that explains what a lifetime is and how Wisdom works.

End-of-lifetime overlay specifics

- Focus management: when the overlay appears, move focus to the overlay container or the first actionable button. Trap focus inside until dismissed.
- Provide keyboard-only workflows for both inspecting stats and proceeding to the shop or next lifetime (Enter/Space to activate, Esc to close if appropriate).
- Offer a text-only summary mode for screen readers that can be read without interacting with the visual overlay.

Achievements & toasts

- When an achievement unlocks, show a visual toast and also provide an `aria-live` announcement (polite) describing the achievement. If multiple achievements unlock at once, consolidate the announcement (e.g., "3 achievements unlocked: First Generation, First Inheritance, Wisdom Seeker").
- Ensure toasts are dismissible by keyboard and do not trap focus.

Color & contrast

- Ensure all lifetime-related UI elements meet WCAG AA contrast ratios (4.5:1 for text). The golden accent used for end-of-life warning must meet contrast requirements against its background or have an alternate high-contrast variant.

Testing & verification

- Test with common screen readers (NVDA, VoiceOver) and keyboard-only navigation scenarios.
- Test `prefers-reduced-motion` and `prefers-contrast` (where supported) to ensure overlays and toasts behave appropriately.

Developer notes

- Provide helper utilities for dialogs (focus-trap, aria attributes) and for readable announcements (`announce(message: string, politeness?: 'polite'|'assertive')`).
- Keep localization in mind for ARIA labels and announcements.

---
