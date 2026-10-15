# Release Notes - v0.12.0: Wisdom of the Ages

## 🌟 Overview

This release lays the groundwork for the **Wisdom of the Ages** prestige system — a major new feature that introduces limited lifespans, a prestige currency (Wisdom), and permanent upgrades that persist across lifetimes.

> **Note:** This release includes the full prestige system implementation, all prestige-related bug fixes, accessibility improvements, a dev telemetry system, and a comprehensive test suite.

---

## ✨ New Features

### Prestige System Foundation

#### Save Schema & Migration
- Added new persistent state structures:
  - `PrestigeState` — tracks Wisdom currency, lifetime count, and wisdom upgrades
  - `WisdomUpgrades` — stores purchased prestige upgrades (e.g., `extendedLifespan`, `startingGold`, `permanentGuildBenefits`)
  - `TutorialFlags` — tracks tutorial overlay states (`hasSeenLifespanIntro`, `hasSeenShopExplanation`)
- Added offline tracking fields to save system:
  - `lastSavedAt` — UTC timestamp of last save (for offline time calculation)
  - `lastTotalDaysElapsed` — snapshot of game days for computing remaining lifetime
- Automatic migration for existing saves — new fields initialize with sensible defaults

#### Offline Progress with Lifetime Cap
- Offline simulation now respects the player's maximum lifetime (default: 80 years = 29,200 game days)
- Extended lifespan wisdom upgrade adds +5 years per level
- When offline time would exceed the lifetime boundary:
  - Progress is capped at the lifetime end
  - `cappedToLifetime` flag is returned for UI handling
  - `offlinePrestigePending` state is set to trigger prestige flow
- Season now advances dynamically during offline simulation (using `getSeason` from day)
- Offline max cap increased from 8 hours to 24 hours — with 80-year lifetimes the previous cap was too restrictive

#### Live-Gameplay Lifetime End Detection
- Day loop now checks `totalDaysElapsed >= getMaxLifetimeDays()` during active play (not only during offline catch-up)
- When the boundary is reached during live play:
  - All 4 game loops (growth, auto-harvest, day tick, elves' bench) halt immediately
  - `offlinePrestigePending` is set to `true`
  - Wisdom tab is forced active so the player can prestige

#### Complete Prestige Reset
- `handleStartNextLifetime` now resets all state fields required by the design doc's "What RESETS" table:
  - `totalDaysElapsed`, `totalHarvests`, `maxPlots` (→ 4), `highestUnlockedVeggie` (→ 0)
  - `irrigationOwned`, `greenhouseOwned`, `heirloomOwned`, `autoSellOwned`
  - `almanacLevel` / `almanacCost`, `currentWeather` (→ 'Clear')
  - Guild state (commitment + currencies + upgrades)
  - Bee system (boxes, upgrades, honey/wax)
  - `globalAutoPurchaseTimer`
- Starting bonuses from Wisdom upgrades are properly applied on reset

#### Starting Experience on Farm Tier Upgrade
- `handleBuyLargerFarm` now includes the prestige `startingExperience` bonus when computing initial experience for the new tier, keeping extra crops unlocked

#### Lifetime Achievements
- 6 new prestige-category achievements added to `achievements.ts`:
  - `lifetime_complete_1` — "First Generation" (complete 1 lifetime)
  - `lifetime_complete_2` — "Family Tradition" (complete 2 lifetimes)
  - `lifetime_complete_5` — "Lineage" (complete 5 lifetimes)
  - `lifetime_complete_10` — "Dynasty" (complete 10 lifetimes)
  - `starting_bonus_bought_1` — "First Inheritance" (buy first starting-life bonus)
  - `wisdom_10000` — "Wisdom Seeker" (accumulate 1,000,000 total Wisdom)

#### Cross-Lifetime Achievement Persistence
- `PrestigeState.achievementsUnlocked` map is now actively used:
  - Written to when any achievement unlocks (stores `unlockedAt` timestamp + `lifetimeWhenUnlocked`)
  - Checked on init to restore previously-earned achievements across lifetimes
  - `useAchievements` hook accepts `persistedUnlocks` parameter for restoration

#### Pause Button
- New pause/play toggle in the header bar between Info and Achievements buttons
- All 4 game loops (growth, auto-harvest, day tick, elves' bench) gated on `isPausedRef`
- Visual states: purple when running ("⏸ Pause"), green with pulse animation when paused ("▶ Play")
- Proper `aria-label` and `aria-pressed` attributes for accessibility

---

## 🔧 Technical Improvements

### Save System (`saveSystem.ts`)
- Fixed `DEFAULT_MS_PER_GAME_DAY` to `1000` (1 second = 1 game day) to match actual game loop
- Added helper functions:
  - `convertMsToDays()` / `convertDaysToMs()` — with safe division handling
  - `getMaxLifetimeDaysForPlayer()` — calculates lifetime cap including upgrades
  - `computeAllowedOfflineMs()` — pre-computes offline ms allowed before lifetime boundary
- Save function now automatically updates `lastSavedAt` and `lastTotalDaysElapsed` on every save

### Offline Progress (`offlineProgress.ts`)
- Added `OfflineProgressOptions` interface for typed options parameter
- Added `maxTotalDays` option to cap simulation at lifetime boundary
- Return type now includes:
  - `cappedToLifetime` — true if offline time was capped
  - `offlineMsApplied` — actual ms simulated after capping
  - `lifetimeEnded` — true if lifetime was already complete
- Fixed potential division-by-zero when `dayLength` is 0
- Season is now derived dynamically from `day` using `getSeason()` during simulation

### App Integration (`App.tsx`)
- Added `prestigeStateRef` to track prestige state for lifetime calculations
- Added `offlinePrestigePending` state flag for prestige UI triggering
- Lifetime cap now applied to all offline progress call sites:
  - Initial load useEffect
  - Tab visibility change handler
  - Mount check for closed-tab returns
- When offline progress is capped:
  - Console logs the event
  - Sets `offlinePrestigePending` to `true`
  - Sets `totalDaysElapsed` to the lifetime maximum

### Lifetime Stat Tracking
- Added `trackMoneyEarned`, `trackKnowledgeGained`, `trackFarmTierReached` to `GameState` interface
- Tracking functions exposed via `GameContext` for component access
- Money tracking hooked into:
  - `handleSell` (vegetable sales)
  - `ArchieIcon` (Archie click rewards) via new `onMoneyEarned` prop
  - Achievement rewards (in `useAchievements` callback)
  - Canning system (via wrapped `setMoneyWithTracking` setter)
  - DevTools money additions (dev mode only)
- Knowledge tracking hooked into:
  - `harvestVeggie` (manual harvest)
  - Auto-harvest game loop (via ref for stable callback)
  - Offline progress (all 3 call sites: initial load, visibility change, mount check)
  - Achievement rewards (in `useAchievements` callback)
  - Canning system (via wrapped `setKnowledgeWithTracking` setter)
  - DevTools knowledge additions (dev mode only)
- Farm tier tracking hooked into:
  - `handleBuyLargerFarm` (farm tier upgrades)

### Dev Telemetry System (`devTelemetry.ts`)
- New `DevTelemetryManager` singleton gated behind the `devTelemetry` feature flag — zero-cost no-op in production
- 5 structured telemetry events:
  - `lifetime_complete` — emitted when a lifetime ends (lifetimeCount, wisdomGained, totalMoneyEarned, totalKnowledgeGained, maxFarmTierReached, durationDays)
  - `wisdom_awarded` — emitted alongside lifetime_complete with formula component breakdown
  - `shop_purchase` — emitted on Wisdom Shop purchases (upgradeId, levelBefore, levelAfter, cost)
  - `achievement_unlocked` — emitted on achievement unlock (achievementId, lifetimeWhenUnlocked)
  - `offline_catchup` — emitted on both mount and visibility-change offline catch-up (offlineMsRequested, offlineMsApplied, cappedToLifetime)
- Events persisted to localStorage (last 500 events) with automatic truncation
- Grouped console output with `console.groupCollapsed` + `console.table` for readable dev inspection
- Aggregate helpers for balance tuning:
  - `getAvgWisdomPerLifetime()` — average wisdom earned per completed lifetime
  - `getLifetimeLengthDistribution()` — histogram of lifetime durations by year
  - `getShopPurchaseRateByUpgrade()` — per-upgrade purchase counts
  - `getOfflineCatchupCappedRate()` — fraction of offline catch-ups capped by lifetime end
- `printDashboard()` — one-call summary of all aggregates to console
- `exportCSV()` / `downloadCSV()` — export event log as CSV for offline analysis
- Exposed as `window.__telemetry` in dev builds for easy console access
- Toggle + Dashboard/CSV/Clear buttons added to Settings overlay's Developer Tools section
- New `devTelemetry` feature flag added to `featureFlags.ts` (debug category, default off)

### Prestige Test Suite (`prestige.test.ts`)
- 59 tests across 10 describe blocks:
  - Wisdom calculation accuracy
  - Prestige reset preserving correct data
  - Upgrade cost calculations
  - Lifetime boundary edge cases (exactly day 29,200)
  - `computeAllowedOfflineMs` capping
  - Conversion utilities (`convertMsToDays`, `convertDaysToMs`)
  - Save/load with prestige data + migration from pre-prestige saves
  - Tracking helpers (`trackMoneyEarned`, `trackKnowledgeGained`, `trackFarmTierReached`)
  - Purchase simulation with insufficient/sufficient wisdom
  - Full prestige cycle (earn → prestige → verify bonuses → earn again)

### Wisdom Tab UI
- New `WisdomTab` component for prestige upgrade purchases:
  - `LifetimeSummaryCard` — displays lifetime stats (money earned, knowledge gained, max tier, wisdom earned)
  - `UpgradeCard` — individual upgrade purchase cards with level display and cost
  - Wisdom calculation formula: `floor((money/10K) × (knowledge/500) × maxTier) + floor(√currentWisdom)`
- Five wisdom upgrades implemented:
  - **Extended Lifespan** — +5 years per level (max 10)
  - **Inheritance** — +$500 starting gold per level (max 20)
  - **Ancestral Wisdom** — +25 starting knowledge per level (max 20)
  - **Family Legacy** — +50 starting experience per level (max 20)
  - **Guild Traditions** — +10% guild benefits retained per level (max 5)
- Purple/gold prestige theme with gradient backgrounds and accent colors
- Tab button appears only when lifetime has ended (`offlinePrestigePending` is true)
- Force-lock mechanic: player cannot switch tabs until starting next lifetime
- `handlePurchaseWisdomUpgrade` — deducts wisdom and increments upgrade level
- `handleStartNextLifetime` — resets game with upgrade bonuses applied:
  - Starting gold bonus from Inheritance upgrade
  - Starting knowledge bonus from Ancestral Wisdom upgrade
  - Starting experience bonus from Family Legacy upgrade
- Prestige state now saved to localStorage via auto-save system

### Lifetime Counter UI
- New lifetime badge component in StatsDisplay header:
  - Shows "✨ Lifetime N" with current lifetime number
  - Purple gradient background matching prestige theme
  - Golden pulsing animation when near end of lifetime (year 75+)
  - Tooltip shows lifetime count and years remaining
  - Full accessibility: ARIA labels for screen readers
- Props added to `StatsDisplay`:
  - `prestigeState` — for lifetime count
  - `lifetimeMaxDays` — for calculating years remaining

### Tutorial Overlays
- New `LifespanTutorial` component with two tutorial overlays:
  - **Lifespan Intro** — Shown at the start of the first game (day 0-1, lifetime 1)
    - Introduces the 80-year lifespan concept
    - Explains that progress carries forward through Wisdom
    - Dismissible with "Begin Your Journey" button
  - **Shop Explanation** — Shown after first lifetime completes (day 0-1, lifetime 2+)
    - Explains the Wisdom Shop and prestige mechanics
    - Highlights permanent upgrades and their benefits
    - Dismissible with "Open Wisdom Shop" or "Begin Next Lifetime" buttons
- Purple gradient theme consistent with prestige styling
- Full accessibility:
  - Focus trap for keyboard navigation
  - Escape key to dismiss
  - ARIA labels and roles
  - Smooth fade in/out animations
- Tutorial state persisted via `lifespanIntroShown` and `shopExplanationShown` flags

---

## 📝 Design Documentation

Updated `Wisdom of the Ages Design.md` with:

### Lifetime Counter Display
- Small UI badge showing current lifetime number
- Positioned unobtrusively (header bar or stats area)
- Accessibility: proper ARIA labels

### Achievements System
- Achievements are one-time unlocks (idempotent)
- New lifetime-based achievements:
  - Complete 1 / 2 / 5 / 10 lifetimes
- Stored in `achievementsUnlocked` map with timestamp and lifetime context

### Tutorial Flow
- **Start of game:** Introduction to limited lifespan concept
- **After first lifetime:** Explanation of Wisdom Shop and prestige mechanics
- Tracked via `TutorialFlags` in save state

### Offline Catch-up & End-of-Lifetime Handling
- Conservative approach: offline simulation stops at lifetime boundary
- No post-lifetime progress is granted
- UI will show prestige summary when `offlinePrestigePending` is set

### Telemetry & Key Counters (Dev-only)
- Event hooks for: `lifetime_complete`, `offline_catchup_capped`, `shop_purchase`, `achievement_unlocked`
- Toggleable via feature flags for dev builds

### Accessibility
- Keyboard navigation for all prestige UI elements
- Screen reader support with ARIA labels
- `prefers-reduced-motion` media queries added across 12 CSS files:
  - Infinite animations set to `animation: none`
  - Transitions set to `transition: none`
  - Hover transforms disabled
  - Spinner animations retained for loading indication
  - Files: Toast.css, WisdomTab, HeaderBar, EventLogOverlay, GrowingTab, ShopfrontTab, SettingsOverlay, TreeFarmTab, WorkshopTab, StatsDisplay, HarvestTutorial, LifespanTutorial

---

## 🚧 Known Limitations / Planned for Future Releases

The following features are designed but not yet implemented:

- [x] ~~Prestige flow UI (summary overlay, Wisdom award, reset)~~ — Implemented as WisdomTab
- [x] ~~Wisdom Shop with purchase logic and gating~~ — Implemented in WisdomTab with 5 upgrades
- [x] ~~Lifetime counter UI component~~ — Implemented in StatsDisplay header
- [x] ~~Tutorial overlay components~~ — Implemented as LifespanTutorial (Lifespan Intro + Shop Explanation)
- [x] ~~Achievement notification system~~ — Lifetime achievements + cross-lifetime persistence implemented
- [x] ~~Telemetry hooks implementation~~ — devTelemetry module with 5 event types, feature flag toggle, CSV export
- [x] ~~Automated tests for migration, offline cap, and achievements~~ — 59 tests in prestige.test.ts

---

## 🐛 Bug Fixes

- Fixed inconsistent `DEFAULT_MS_PER_GAME_DAY` constant (was 1 hour, now correctly 1 second)
- Fixed potential crash when `dayLength` is 0 in offline calculations
- Fixed live-gameplay lifetime end: day loop now halts at lifetime boundary instead of ticking indefinitely past 29,200 days
- Fixed incomplete prestige reset: `handleStartNextLifetime` was missing resets for 15+ state fields (plots, weather, almanac, guilds, bees, etc.)
- Fixed `startingExperience` bonus not applying when buying a larger farm
- Fixed performance regression: `lifetimeMaxDaysRef` useEffect depended on entire `prestigeState` object (changes every second via tracking functions); narrowed to `extendedLifespanLevel` only
- Fixed growth loop missing `offlinePrestigePendingRef` guard — veggies continued growing after lifetime end

---

## 📦 Files Changed

### New Files
- `RELEASE_NOTES_v0.12.0.md` — This file
- `src/components/WisdomTab.tsx` — Prestige tab component with upgrade cards and lifetime summary
- `src/components/WisdomTab.module.css` — Purple/gold prestige theme styling
- `src/components/LifespanTutorial.tsx` — Tutorial overlay components (Lifespan Intro + Shop Explanation)
- `src/components/LifespanTutorial.module.css` — Tutorial overlay styling with prestige theme
- `src/utils/devTelemetry.ts` — Dev-only telemetry manager with event logging, aggregates, and CSV export
- `src/test/prestige.test.ts` — 59 prestige system tests (wisdom, reset, upgrades, boundaries, migration)

### Modified Files
- `src/utils/saveSystem.ts` — Prestige types, offline helpers, save/load integration
- `src/utils/offlineProgress.ts` — Lifetime cap support, typed options, getSeason integration; `MAX_OFFLINE_HOURS` → 24
- `src/utils/featureFlags.ts` — Added `devTelemetry` feature flag
- `src/App.tsx` — Offline integration with lifetime cap, prestige state tracking, WisdomTab integration, upgrade/prestige handlers, live lifetime end detection, complete prestige reset, pause button state, all 4 game loops gated on isPausedRef + offlinePrestigePendingRef, telemetry emit calls, performance fix for lifetimeMaxDaysRef dependency
- `src/types/game.ts` — Added tracking function types, `isPaused`/`setIsPaused` to GameState interface
- `src/components/ArchieIcon.tsx` — Added `onMoneyEarned` callback prop for prestige tracking
- `src/components/App.module.css` — Added wisdom tab button styles
- `src/components/StatsDisplay.tsx` — Added lifetime counter badge with prestige state props
- `src/components/StatsDisplay.module.css` — Added lifetime badge styles with golden animation + reduced-motion
- `src/components/HeaderBar.tsx` — Added pause/play toggle button with isPaused/onTogglePause props
- `src/components/HeaderBar.module.css` — Pause button styles (purple/green) with pulse animation + reduced-motion
- `src/components/SettingsOverlay.tsx` — Added dev telemetry toggle, dashboard, CSV export, and clear buttons
- `src/data/achievements.ts` — Added 6 prestige-category lifetime achievements
- `src/hooks/useAchievements.ts` — Added `persistedUnlocks` parameter for cross-lifetime restoration
- `src/config/assetPaths.ts` — Added `ICON_WISDOM` export
- `Wisdom of the Ages Design.md` — Design documentation updates
- 12 CSS files — Added `@media (prefers-reduced-motion: reduce)` blocks

---

## 🔄 Migration Notes

- **Existing saves will auto-migrate** — New prestige fields initialize to defaults
- **No player action required** — Migration happens transparently on load
- **Backward compatible** — Old saves work fine; new fields are added seamlessly
