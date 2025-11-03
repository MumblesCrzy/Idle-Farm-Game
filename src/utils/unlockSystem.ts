import type { Veggie } from '../types/game';

/**
 * Result of an unlock check operation
 */
export interface UnlockResult {
  /** Updated veggies array */
  veggies: Veggie[];
  /** Indices of newly unlocked veggies */
  newlyUnlocked: number[];
  /** Highest unlocked veggie index */
  highestUnlockedIndex: number;
  /** Whether any veggies were unlocked */
  hasNewUnlocks: boolean;
}

/**
 * Information about what can be unlocked next
 */
export interface NextUnlockInfo {
  /** Index of the next veggie that can be unlocked */
  nextIndex: number;
  /** Name of the next veggie */
  veggieName: string;
  /** Experience required to unlock */
  experienceRequired: number;
  /** Experience still needed */
  experienceRemaining: number;
  /** Whether player has enough plots */
  hasPlotSpace: boolean;
}

/**
 * Checks if a specific veggie can be unlocked
 * @param veggie - The vegetable to check
 * @param currentExperience - Player's current experience
 * @param hasPlotSpace - Whether player has available plot space
 * @returns True if the veggie can be unlocked
 */
export function canUnlockVeggie(
  veggie: Veggie,
  currentExperience: number,
  hasPlotSpace: boolean
): boolean {
  return !veggie.unlocked && 
         currentExperience >= veggie.experienceToUnlock && 
         hasPlotSpace;
}

/**
 * Calculates the total number of plots currently in use
 * @param veggies - Array of all vegetables
 * @returns Total plots used (base + additional)
 */
export function calculatePlotsUsed(veggies: Veggie[]): number {
  const basePlots = veggies.filter(v => v.unlocked).length;
  const additionalPlots = veggies.reduce((sum, v) => sum + (v.additionalPlotLevel || 0), 0);
  return basePlots + additionalPlots;
}

/**
 * Gets the highest index of an unlocked veggie
 * @param veggies - Array of all vegetables
 * @returns Index of highest unlocked veggie, or -1 if none unlocked
 */
export function getHighestUnlockedIndex(veggies: Veggie[]): number {
  let highest = -1;
  veggies.forEach((v, idx) => {
    if (v.unlocked) {
      highest = Math.max(highest, idx);
    }
  });
  return highest;
}

/**
 * Gets information about the next veggie that can be unlocked
 * @param veggies - Array of all vegetables
 * @param currentExperience - Player's current experience
 * @param maxPlots - Maximum plots available
 * @returns Info about next unlock, or null if all veggies unlocked
 */
export function getNextUnlockInfo(
  veggies: Veggie[],
  currentExperience: number,
  maxPlots: number
): NextUnlockInfo | null {
  const plotsUsed = calculatePlotsUsed(veggies);
  const hasPlotSpace = plotsUsed < maxPlots;
  
  // Find the first locked veggie (veggies are in unlock order)
  for (let i = 0; i < veggies.length; i++) {
    const veggie = veggies[i];
    if (!veggie.unlocked) {
      return {
        nextIndex: i,
        veggieName: veggie.name,
        experienceRequired: veggie.experienceToUnlock,
        experienceRemaining: Math.max(0, veggie.experienceToUnlock - currentExperience),
        hasPlotSpace
      };
    }
  }
  
  return null; // All veggies unlocked
}

/**
 * Gets all veggies that are currently eligible to be unlocked
 * @param veggies - Array of all vegetables
 * @param currentExperience - Player's current experience
 * @param maxPlots - Maximum plots available
 * @returns Array of indices for veggies that can be unlocked
 */
export function getEligibleUnlocks(
  veggies: Veggie[],
  currentExperience: number,
  maxPlots: number
): number[] {
  const plotsUsed = calculatePlotsUsed(veggies);
  const eligible: number[] = [];
  
  for (let i = 0; i < veggies.length; i++) {
    const veggie = veggies[i];
    const hasPlotSpace = (plotsUsed + eligible.length) < maxPlots;
    
    if (canUnlockVeggie(veggie, currentExperience, hasPlotSpace)) {
      eligible.push(i);
    }
  }
  
  return eligible;
}

/**
 * Processes all eligible veggie unlocks and returns updated state
 * @param veggies - Current array of vegetables
 * @param currentExperience - Player's current experience
 * @param maxPlots - Maximum plots available
 * @returns Unlock result with updated veggies and unlock information
 */
export function processUnlocks(
  veggies: Veggie[],
  currentExperience: number,
  maxPlots: number
): UnlockResult {
  const newVeggies = [...veggies];
  const newlyUnlocked: number[] = [];
  let plotsUsed = calculatePlotsUsed(newVeggies);
  
  // Process unlocks in order
  for (let i = 0; i < newVeggies.length; i++) {
    const veggie = newVeggies[i];
    const hasPlotSpace = plotsUsed < maxPlots;
    
    if (canUnlockVeggie(veggie, currentExperience, hasPlotSpace)) {
      newVeggies[i] = { ...veggie, unlocked: true };
      newlyUnlocked.push(i);
      plotsUsed++; // Increment as we unlock
    }
  }
  
  return {
    veggies: newVeggies,
    newlyUnlocked,
    highestUnlockedIndex: getHighestUnlockedIndex(newVeggies),
    hasNewUnlocks: newlyUnlocked.length > 0
  };
}

/**
 * Checks if player has enough plot space for additional plots
 * @param veggies - Array of all vegetables
 * @param maxPlots - Maximum plots available
 * @param additionalPlotsNeeded - Number of additional plots needed (default: 1)
 * @returns True if player has enough space
 */
export function hasPlotSpaceForAdditionalPlots(
  veggies: Veggie[],
  maxPlots: number,
  additionalPlotsNeeded: number = 1
): boolean {
  const plotsUsed = calculatePlotsUsed(veggies);
  return (plotsUsed + additionalPlotsNeeded) <= maxPlots;
}

/**
 * Gets a summary of unlock progress
 * @param veggies - Array of all vegetables
 * @returns Object with unlock statistics
 */
export function getUnlockProgress(veggies: Veggie[]): {
  unlockedCount: number;
  totalCount: number;
  percentageUnlocked: number;
  allUnlocked: boolean;
} {
  const unlockedCount = veggies.filter(v => v.unlocked).length;
  const totalCount = veggies.length;
  
  return {
    unlockedCount,
    totalCount,
    percentageUnlocked: (unlockedCount / totalCount) * 100,
    allUnlocked: unlockedCount === totalCount
  };
}

/**
 * Validates unlock state consistency
 * Checks for issues like unlocked veggies exceeding max plots
 * @param veggies - Array of all vegetables
 * @param maxPlots - Maximum plots available
 * @returns Object with validation result and any issues found
 */
export function validateUnlockState(
  veggies: Veggie[],
  maxPlots: number
): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const plotsUsed = calculatePlotsUsed(veggies);
  
  // Check if plots used exceeds max plots
  if (plotsUsed > maxPlots) {
    issues.push(`Plots used (${plotsUsed}) exceeds max plots (${maxPlots})`);
  }
  
  // Check if veggies are unlocked in order
  let foundLocked = false;
  veggies.forEach((veggie, index) => {
    if (!veggie.unlocked) {
      foundLocked = true;
    } else if (foundLocked && index > 0) {
      // Found an unlocked veggie after a locked one
      issues.push(`Veggie "${veggie.name}" at index ${index} is unlocked but earlier veggies are locked`);
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Forces unlock of a specific veggie (for debugging/admin purposes)
 * Does not check experience or plot requirements
 * @param veggies - Array of all vegetables
 * @param index - Index of veggie to unlock
 * @returns Updated veggies array with forced unlock
 */
export function forceUnlock(veggies: Veggie[], index: number): Veggie[] {
  if (index < 0 || index >= veggies.length) {
    console.warn(`Cannot force unlock: invalid index ${index}`);
    return veggies;
  }
  
  const newVeggies = [...veggies];
  newVeggies[index] = { ...newVeggies[index], unlocked: true };
  return newVeggies;
}

/**
 * Unlocks all veggies up to a specific index (for debugging/testing)
 * @param veggies - Array of all vegetables
 * @param upToIndex - Unlock all veggies up to and including this index
 * @returns Updated veggies array
 */
export function unlockAllUpTo(veggies: Veggie[], upToIndex: number): Veggie[] {
  const newVeggies = [...veggies];
  for (let i = 0; i <= Math.min(upToIndex, veggies.length - 1); i++) {
    newVeggies[i] = { ...newVeggies[i], unlocked: true };
  }
  return newVeggies;
}

/**
 * Unlocks all vegetables (for debugging/testing)
 * @param veggies - Array of all vegetables
 * @returns Updated veggies array with all unlocked
 */
export function unlockAll(veggies: Veggie[]): Veggie[] {
  return veggies.map(v => ({ ...v, unlocked: true }));
}
