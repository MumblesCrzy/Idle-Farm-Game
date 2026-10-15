# App.tsx Refactoring Plan

## Current State
- **File**: `src/App.tsx`
- **Lines**: 2,427 lines (October 15, 2026), down from 3,415 before the Phase 1-5 hooks were wired in
- **Problem**: Single file contains game logic, UI rendering, state management, and event handlers
- **Progress**: Phases 1-5 are wired in. Until October 2026 the hooks existed with tests but App.tsx still ran older inline copies; those copies are now deleted and each hook matches what App ran

## 📊 Code Analysis

### Current Structure (approximate line ranges)
| Section | Lines | Description |
|---------|-------|-------------|
| Imports | 1-140 | 140 lines of imports and setup |
| Helper Functions | 140-220 | `useLatestRef`, `createAutoPurchaseHandler` |
| GameProvider | 221-1175 | **~950 lines** - Main state management |
| useGame Hook | 1176-1190 | Context consumer hook |
| BeesTabWrapper | 1191-1210 | Wrapper for BeesTab |
| App Component | 1212-2610 | **~1,400 lines** - Main UI component |

### What's in GameProvider (~950 lines)
- Core game state initialization via `useGameState` hook
- Bee yield bonus state
- Christmas event initialization
- Irrigation purchase handler
- Farm purchase/reset logic
- Veggie purchase handlers (fertilizer, harvester, better seeds, heirloom)
- Weather and season systems
- Offline progress handling
- Weather randomization logic
- Harvest handlers
- Sell handlers
- Achievement system
- Event log system
- Auto-save system
- Day counter/auto-sell loop
- Christmas tree growth loop

### What's in App Component (~1,400 lines)
- Feature flag hooks
- Additional state (beeState, overlays, toasts, tutorials)
- Canning system hooks
- Achievement system
- Event log system
- Offline progress toast
- Achievement checking effect
- Global canning callbacks
- Save interval
- Harvest tutorial effect
- Number formatting
- Tab rendering logic
- All JSX rendering

---

## 🎯 Refactoring Goals

1. **Reduce App.tsx to ~500 lines** - Focused on composition and layout
2. **Improve testability** - Each extracted piece can be unit tested
3. **Better code organization** - Related logic grouped together
4. **Easier onboarding** - New developers can understand the codebase faster

---

## 📋 Extraction Plan

### Phase 1: Extract Utility Hooks (Low Risk)
**Estimated time: 1-2 hours**

#### ~~1.1 Create `useLatestRef` hook~~ ✅
- **From**: Lines 142-149
- **To**: `src/hooks/useLatestRef.ts`
- **Size**: ~10 lines
- **Why**: Generic utility used in multiple places
- **Status**: Complete - extracted with JSDoc documentation and 6 tests

#### 1.2 Create `useOfflineProgress` hook ✅
- **From**: GameProvider lines ~590-700
- **To**: `src/hooks/useOfflineProgress.ts`
- **Size**: ~110 lines
- **Why**: Self-contained offline progress detection and calculation
- **Status**: Complete - extracted with JSDoc documentation and 11 tests

#### 1.3 Create `useAutoSave` hook ✅
- **From**: App component lines ~1575-1615
- **To**: `src/hooks/useAutoSave.ts`
- **Size**: ~40 lines
- **Why**: Self-contained auto-save interval logic
- **Status**: Complete - extracted with JSDoc documentation and 11 tests

---

### Phase 2: Extract Purchase Handlers (Medium Risk)
**Estimated time: 2-3 hours**

#### 2.1 Create `usePurchaseHandlers` hook ✅
- **From**: GameProvider lines ~320-555
- **To**: `src/hooks/usePurchaseHandlers.ts`
- **Size**: ~235 lines (actual: ~400 lines with comprehensive JSDoc)
- **Why**: Groups all veggie upgrade purchase logic
- **Status**: Complete - extracted with JSDoc documentation and 24 tests
- **Contains**:
  - `handleBuyFertilizer`
  - `handleBuyHarvester`
  - `handleBuyHarvesterSpeed`
  - `handleBuyAdditionalPlot`
  - `handleBuyBetterSeeds`
  - `handleBuyHeirloom`
  - `handleBuyGreenhouse`
  - `handleBuyAutoSell`
  - `handleBuyAlmanac`
  - `handleBuyIrrigation`
  - `handleBuyAutoPurchaser`

#### 2.2 Move `createAutoPurchaseHandler` to hook file ✅
- **From**: Lines 150-215
- **To**: Included in `src/hooks/usePurchaseHandlers.ts`
- **Size**: ~65 lines
- **Status**: Complete - exported from usePurchaseHandlers.ts

---

### Phase 3: Extract Game Loop Logic (Medium Risk)
**Estimated time: 2-3 hours**

#### 3.1 Create `useDayLoop` hook ✅
- **From**: GameProvider lines ~1130-1175
- **To**: `src/hooks/useDayLoop.ts`
- **Size**: ~130 lines (with JSDoc documentation)
- **Why**: Day counter, auto-sell trigger, Christmas tree growth
- **Status**: Complete - extracted with JSDoc documentation and 14 tests
- **Contains**:
  - Day counter increment (1-365 cycle)
  - Auto-sell trigger on merchant days (every 30 days)
  - Christmas event tree growth processing
  - Christmas event passive income updates
  - Elves bench crafting processing
  - Global auto-purchase timer increment

#### 3.2 Create `useWeatherRandomization` hook ✅
- **From**: App component lines ~1150-1430
- **To**: `src/hooks/useWeatherRandomization.ts`
- **Size**: ~320 lines (with JSDoc documentation)
- **Why**: Complex weather calculation based on season/day
- **Status**: Complete - extracted with JSDoc documentation and 17 tests
- **Contains**:
  - Random weather event rolling based on seasonal chances
  - Rain/Snow trigger with duration tracking
  - Drought trigger with knowledge gain
  - Storm and Heatwave triggers
  - Weather duration handling and clearing
  - Special behavior (summer heatwave -> drought)
  - Event logging for all weather changes

---

### Phase 4: Extract Harvest & Sell Logic (Medium Risk)
**Estimated time: 2-3 hours**

#### 4.1 Create `useHarvestAndSell` hook ✅
- **From**: GameProvider lines ~550-700
- **To**: `src/hooks/useHarvestAndSell.ts`
- **Size**: ~320 lines (with JSDoc documentation)
- **Why**: Unified harvest and sell logic
- **Status**: Complete - extracted with JSDoc documentation and 19 tests
- **Contains**:
  - harvestVeggie function for manual and auto harvests
  - calculateHarvestRewards integration
  - Veggie unlock logic after harvest
  - Experience and knowledge gain handling
  - handleHarvest for manual harvest button
  - handleToggleSell for per-veggie sell toggle
  - handleSell for merchant sales
  - logHarvest for deferred event logging
  - Event logging for harvests and sales

*Note: Original plan had separate useHarvest and useSell hooks, combined into single useHarvestAndSell for better cohesion.*

---

### Phase 5: Simplify GameProvider (Medium Risk)
**Estimated time: 2-3 hours**

#### 5.1 Create `useFarmManagement` hook ✅
- **From**: GameProvider lines ~280-410
- **To**: `src/hooks/useFarmManagement.ts`
- **Size**: ~325 lines (with JSDoc documentation)
- **Why**: Farm upgrade and game reset are complex operations
- **Status**: Complete - extracted with JSDoc documentation and 24 tests
- **Contains**:
  - handleBuyLargerFarm - Farm tier upgrade with plot/exp calculations
  - resetGame - Complete game reset with external system cleanup
  - Milestone logging for farm tier upgrades
  - Proper state reset ordering to avoid render issues

#### 5.2 Remaining GameProvider Simplification
GameProvider is now well-organized with hooks:
- ✅ `useGameState` - Core state management
- ✅ `usePurchaseHandlers` - All purchase operations
- ✅ `useHarvestAndSell` - Harvest and sell handlers
- ✅ `useFarmManagement` - Farm/reset handlers
- ✅ `useWeatherSystem` - Weather state
- ✅ `useSeasonSystem` - Season calculation
- ✅ `useAutoPurchase` - Auto-purchase timer
- ✅ `useDayLoop` - Day progression
- ✅ `useOfflineProgress` - Tab focus detection
- ✅ `useChristmasEvent` - Seasonal event

**Current GameProvider size**: 732 lines. The App component is 1,511 lines; Phases 6 and 7 target it

---

### Phase 6: Extract App Component Logic (Higher Risk)
**Estimated time: 3-4 hours**

#### 6.1 Create `useAppState` hook
- **From**: App component state declarations
- **To**: `src/hooks/useAppState.ts`
- **Size**: ~100 lines
- **Contains**: All useState calls for overlays, toasts, tutorials, tabs

#### 6.2 Create `useGlobalCallbacks` hook
- **From**: App component lines ~1510-1560
- **To**: `src/hooks/useGlobalCallbacks.ts`
- **Size**: ~50 lines
- **Why**: Encapsulate window object mutations (eventual removal)

#### 6.3 Create `useAchievementChecker` hook
- **From**: App component lines ~1640-1755
- **To**: `src/hooks/useAchievementChecker.ts`
- **Size**: ~115 lines
- **Why**: Achievement checking effect with many dependencies

---

### Phase 7: Extract Tab Rendering (Lower Risk)
**Estimated time: 2-3 hours**

#### 7.1 Create `TabContent` component
- **From**: App component JSX
- **To**: `src/components/TabContent.tsx`
- **Size**: ~200 lines
- **Why**: Isolate tab switching logic and lazy loading

#### 7.2 Create `OverlaysContainer` component
- **From**: App component JSX (overlays section)
- **To**: `src/components/OverlaysContainer.tsx`
- **Size**: ~150 lines
- **Why**: Group all overlay rendering

---

## 📁 New File Structure

```
src/
├── hooks/
│   ├── useLatestRef.ts           (NEW - 10 lines)
│   ├── useOfflineProgress.ts     (NEW - 110 lines)
│   ├── useAutoSave.ts            (NEW - 40 lines)
│   ├── usePurchaseHandlers.ts    (NEW - 300 lines)
│   ├── useDayLoop.ts             (NEW - 45 lines)
│   ├── useWeatherRandomization.ts (NEW - 105 lines)
│   ├── useHarvest.ts             (NEW - 120 lines)
│   ├── useSell.ts                (NEW - 155 lines)
│   ├── useAppState.ts            (NEW - 100 lines)
│   ├── useGlobalCallbacks.ts     (NEW - 50 lines)
│   ├── useAchievementChecker.ts  (NEW - 115 lines)
│   └── ... (existing hooks)
├── components/
│   ├── TabContent.tsx            (NEW - 200 lines)
│   ├── OverlaysContainer.tsx     (NEW - 150 lines)
│   └── ... (existing components)
└── App.tsx                       (REFACTORED - ~500 lines)
```

---

## ⏱️ Time Estimates

| Phase | Description | Hours | Risk |
|-------|-------------|-------|------|
| 1 | Utility Hooks | 1-2 | Low |
| 2 | Purchase Handlers | 2-3 | Medium |
| 3 | Game Loop Logic | 2-3 | Medium |
| 4 | Harvest & Sell | 2-3 | Medium |
| 5 | Simplify GameProvider | 2-3 | Medium |
| 6 | App Component Logic | 3-4 | Higher |
| 7 | Tab Rendering | 2-3 | Lower |
| **Total** | | **14-21** | |

---

## 🔄 Suggested Order of Execution

### Round 1: Safe Extractions (4-6 hours)
1. `useLatestRef` - Simple utility, no dependencies
2. `useAutoSave` - Self-contained, clear boundaries
3. `useOfflineProgress` - Self-contained, well-defined interface

### Round 2: Purchase Logic (4-6 hours)
4. `usePurchaseHandlers` - Large but well-defined interface
5. Move `createAutoPurchaseHandler` 

### Round 3: Game Loops (4-6 hours)
6. `useWeatherRandomization` - Complex but isolated
7. `useDayLoop` - Depends on weather, but clear interface
8. `useHarvest` and `useSell` - Core game logic

### Round 4: UI Organization (4-6 hours)
9. `TabContent` component - Isolate tab rendering
10. `OverlaysContainer` component - Group overlays
11. `useAppState` hook - Consolidate App state
12. `useAchievementChecker` hook - Complex effect extraction

---

## ✅ Definition of Done

- [ ] App.tsx is under 600 lines
- [ ] All extracted hooks have JSDoc documentation
- [ ] All extracted hooks have corresponding test files
- [x] No functionality regression (all 721 tests pass)
- [ ] Build succeeds without warnings
- [ ] Code review completed

---

## 🚨 Risk Mitigation

1. **Run tests after each extraction** - Catch regressions early
2. **Keep original code commented** - Easy rollback if needed
3. **Extract in small increments** - One hook at a time
4. **Update imports incrementally** - Don't break the build
5. **Document hook interfaces** - Clear contracts between components

---

## 📝 Notes

- The existing `useGameState` hook already extracts some state (~280 lines saved)
- Consider using a state machine library (XState) for complex game state in future
- The global window callbacks (from original TODO #5) should be addressed during Phase 6

---

*Plan created: December 31, 2025*
*Based on App.tsx analysis at ~2,500 lines*
