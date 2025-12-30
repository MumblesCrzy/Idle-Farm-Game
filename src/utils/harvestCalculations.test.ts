import { describe, it, expect } from 'vitest';
import {
  calculateHarvestAmount,
  calculateExperienceGain,
  calculateKnowledgeGain,
  calculateHarvestRewards
} from './harvestCalculations';

describe('Harvest Calculations', () => {
  describe('calculateHarvestAmount', () => {
    it('should calculate base harvest amount with no bonuses', () => {
      const result = calculateHarvestAmount(0, 'Spring', [], 0);
      expect(result).toBe(1);
    });

    it('should add additional plots to harvest amount', () => {
      const result = calculateHarvestAmount(2, 'Spring', [], 0);
      expect(result).toBe(3); // 1 base + 2 additional plots
    });

    it('should apply Frost Fertilizer bonus in Winter', () => {
      const result = calculateHarvestAmount(2, 'Winter', ['frost_fertilizer'], 0);
      expect(result).toBe(4); // ceil((1 + 2) * 1.05) = ceil(3.15) = 4
    });

    it('should not apply Frost Fertilizer bonus in other seasons', () => {
      const result = calculateHarvestAmount(2, 'Spring', ['frost_fertilizer'], 0);
      expect(result).toBe(3); // No winter bonus
    });

    it('should apply bee yield bonus', () => {
      const result = calculateHarvestAmount(0, 'Spring', [], 0.2);
      expect(result).toBe(2); // ceil(1 * 1.2) = ceil(1.2) = 2
    });

    it('should apply both Frost Fertilizer and bee yield bonus', () => {
      const result = calculateHarvestAmount(2, 'Winter', ['frost_fertilizer'], 0.2);
      // (1 + 2) = 3, then * 1.05 = 3.15, ceil = 4, then * 1.2 = 4.8, ceil = 5
      expect(result).toBe(5);
    });
  });

  describe('calculateExperienceGain', () => {
    it('should calculate manual harvest experience', () => {
      const result = calculateExperienceGain(5, 100, false);
      expect(result).toBe(6); // 5 + (100 * 0.01) = 5 + 1 = 6
    });

    it('should calculate auto harvest experience at half rate', () => {
      const result = calculateExperienceGain(5, 100, true);
      expect(result).toBe(3); // (5 * 0.5) + (100 * 0.01 * 0.5) = 2.5 + 0.5 = 3
    });

    it('should handle zero knowledge', () => {
      const result = calculateExperienceGain(5, 0, false);
      expect(result).toBe(5);
    });
  });

  describe('calculateKnowledgeGain', () => {
    it('should calculate manual harvest knowledge gain', () => {
      const result = calculateKnowledgeGain(0, 1, false);
      expect(result).toBe(1); // 1 * 1.0 + 0 = 1
    });

    it('should calculate auto harvest knowledge gain at half rate', () => {
      const result = calculateKnowledgeGain(0, 1, true);
      expect(result).toBe(0.5); // 0.5 * 1.0 + 0 = 0.5
    });

    it('should apply almanac multiplier', () => {
      const result = calculateKnowledgeGain(5, 1, false);
      expect(result).toBe(1.5); // 1 * 1.5 + 0 = 1.5
    });

    it('should apply farm tier bonus', () => {
      const result = calculateKnowledgeGain(0, 3, false);
      expect(result).toBe(3.5); // 1 * 1.0 + (1.25 * 2) = 1 + 2.5 = 3.5
    });

    it('should combine almanac and farm tier bonuses', () => {
      const result = calculateKnowledgeGain(5, 3, false);
      expect(result).toBe(4); // 1 * 1.5 + (1.25 * 2) = 1.5 + 2.5 = 4
    });
  });

  describe('calculateHarvestRewards', () => {
    it('should calculate all rewards for manual harvest', () => {
      const result = calculateHarvestRewards(
        2,        // additionalPlotLevel
        'Spring', // season
        [],       // permanentBonuses
        0,        // beeYieldBonus
        0,        // almanacLevel
        1,        // farmTier
        100,      // knowledge
        false     // isAutoHarvest
      );

      expect(result.harvestAmount).toBe(3); // 1 + 2
      expect(result.experienceGain).toBe(4); // 3 + (100 * 0.01) = 4
      expect(result.knowledgeGain).toBe(1); // 1 * 1.0 + 0 = 1
    });

    it('should calculate all rewards for auto harvest', () => {
      const result = calculateHarvestRewards(
        2,        // additionalPlotLevel
        'Spring', // season
        [],       // permanentBonuses
        0,        // beeYieldBonus
        0,        // almanacLevel
        1,        // farmTier
        100,      // knowledge
        true      // isAutoHarvest
      );

      expect(result.harvestAmount).toBe(3); // 1 + 2
      expect(result.experienceGain).toBe(2); // (3 * 0.5) + (100 * 0.01 * 0.5) = 1.5 + 0.5 = 2
      expect(result.knowledgeGain).toBe(0.5); // 0.5 * 1.0 + 0 = 0.5
    });

    it('should handle complex scenario with all bonuses', () => {
      const result = calculateHarvestRewards(
        4,                      // additionalPlotLevel
        'Winter',              // season
        ['frost_fertilizer'],  // permanentBonuses
        0.3,                   // beeYieldBonus (30%)
        5,                     // almanacLevel
        3,                     // farmTier
        200,                   // knowledge
        false                  // isAutoHarvest
      );

      // harvestAmount: (1 + 4) = 5, * 1.05 = 5.25, ceil = 6, * 1.3 = 7.8, ceil = 8
      expect(result.harvestAmount).toBe(8);
      
      // experienceGain: 8 + (200 * 0.01) = 8 + 2 = 10
      expect(result.experienceGain).toBe(10);
      
      // knowledgeGain: 1 * 1.5 + (1.25 * 2) = 1.5 + 2.5 = 4
      expect(result.knowledgeGain).toBe(4);
    });
  });
});
