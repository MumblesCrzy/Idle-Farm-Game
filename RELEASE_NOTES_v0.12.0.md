# Release Notes - v0.12.0: Wisdom of the Ages

## 🌟 Overview

This release lays the groundwork for the **Wisdom of the Ages** prestige system — a major new feature that introduces limited lifespans, a prestige currency (Wisdom), and permanent upgrades that persist across lifetimes.

> **Note:** This is a foundational release. The full prestige UI, Wisdom Shop, and lifetime counter display are planned for subsequent releases.

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

### Wisdom Tab UI
- New `WisdomTab` component for prestige upgrade purchases:
  - `LifetimeSummaryCard` — displays lifetime stats (money earned, knowledge gained, max tier, wisdom earned)
  - `UpgradeCard` — individual upgrade purchase cards with level display and cost
  - Wisdom calculation formula: `floor((money/1M) × (knowledge/1K) × maxTier)`
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
- Respects `prefers-reduced-motion` for animations

---

## 🚧 Known Limitations / Planned for Future Releases

The following features are designed but not yet implemented:

- [x] ~~Prestige flow UI (summary overlay, Wisdom award, reset)~~ — Implemented as WisdomTab
- [x] ~~Wisdom Shop with purchase logic and gating~~ — Implemented in WisdomTab with 5 upgrades
- [x] ~~Lifetime counter UI component~~ — Implemented in StatsDisplay header
- [x] ~~Tutorial overlay components~~ — Implemented as LifespanTutorial (Lifespan Intro + Shop Explanation)
- [ ] Achievement notification system
- [ ] Telemetry hooks implementation
- [ ] Automated tests for migration, offline cap, and achievements

---

## 🐛 Bug Fixes

- Fixed inconsistent `DEFAULT_MS_PER_GAME_DAY` constant (was 1 hour, now correctly 1 second)
- Fixed potential crash when `dayLength` is 0 in offline calculations

---

## 📦 Files Changed

### New Files
- `RELEASE_NOTES_v0.12.0.md` — This file
- `src/components/WisdomTab.tsx` — Prestige tab component with upgrade cards and lifetime summary
- `src/components/WisdomTab.module.css` — Purple/gold prestige theme styling
- `src/components/LifespanTutorial.tsx` — Tutorial overlay components (Lifespan Intro + Shop Explanation)
- `src/components/LifespanTutorial.module.css` — Tutorial overlay styling with prestige theme

### Modified Files
- `src/utils/saveSystem.ts` — Prestige types, offline helpers, save/load integration
- `src/utils/offlineProgress.ts` — Lifetime cap support, typed options, getSeason integration
- `src/App.tsx` — Offline integration with lifetime cap, prestige state tracking, WisdomTab integration, upgrade/prestige handlers
- `src/types/game.ts` — Added tracking function types to GameState interface
- `src/components/ArchieIcon.tsx` — Added `onMoneyEarned` callback prop for prestige tracking
- `src/components/App.module.css` — Added wisdom tab button styles
- `src/components/StatsDisplay.tsx` — Added lifetime counter badge with prestige state props
- `src/components/StatsDisplay.module.css` — Added lifetime badge styles with golden animation
- `src/config/assetPaths.ts` — Added `ICON_WISDOM` export
- `Wisdom of the Ages Design.md` — Design documentation updates

---

## 🔄 Migration Notes

- **Existing saves will auto-migrate** — New prestige fields initialize to defaults
- **No player action required** — Migration happens transparently on load
- **Backward compatible** — Old saves work fine; new fields are added seamlessly
