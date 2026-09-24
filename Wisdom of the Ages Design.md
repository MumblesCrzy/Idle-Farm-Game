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

#### Starting Experience
- **Effect:** Begin each lifetime with bonus experience
- **Tiers:** Scaling amounts

### Potential Future Upgrades (Ideas)

- **Faster Time Passage** — Days pass more quickly
- **Unlock Memory** — Start with specific veggies/features unlocked
- **Bee Legacy** — Start with a free bee box
- **Knowledge Retention** — Keep a percentage of knowledge through prestige
- **Guild Affinity** — Reduced requirements for guild commitment
- **Harvest Wisdom** — Bonus multiplier to base harvest yields
- **Lucky Seeds** — Increased chance for quality harvests
- **Market Connections** — Better base selling prices

---

## UI/UX Design

### Lifetime Progress Indicator

- Display current year prominently (existing Year/Day display)
- Consider adding a "Years Remaining" or progress bar for the 80-year cycle
- Visual indication as end of lifetime approaches (e.g., golden border at year 75+)

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

- Accessible from main UI (new tab or button)
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

## Open Questions

1. **Wisdom Shop Access** — Always available, or only at end of lifetime?
2. **Lifetime Counter Display** — Show "Lifetime #X" somewhere in UI?
3. **Achievement Interaction** — Should certain achievements only count once ever, or reset each lifetime?
4. **Tutorial/First Lifetime** — Any special handling for the very first playthrough?
5. **Offline Progress at Prestige** — If player is offline when 80 years hit, how to handle?

---

## Changelog

| Date | Author | Changes |
|------|--------|---------|
| 2026-02-07 | — | Initial design document created |
