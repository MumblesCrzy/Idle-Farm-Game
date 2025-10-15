import React, { useEffect } from 'react';
import './AdvancedStashDisplay.css';

// Constants from App.tsx
const SEASON_BONUS = 0.1;

const veggieSeasonBonuses: Record<string, string[]> = {
  Radish: ['Spring', 'Fall'],
  Lettuce: ['Spring', 'Fall'],
  Carrots: ['Spring', 'Fall'],
  Broccoli: ['Fall'],
  Cabbage: ['Spring', 'Fall'],
  Onions: ['Spring'],
  'Green Beans': ['Summer'],
  Zucchini: ['Summer'],
  Cucumbers: ['Summer'],
  Tomatoes: ['Summer'],
  Peppers: ['Summer'],
};

// Calculate base growth rate with fertilizer bonus (no weather/season effects)
const calculateBaseGrowthRate = (veggie: Veggie): number => {
  let growthRate = veggie.growthRate;
  // Fertilizer bonus - 5% multiplicative increase per level
  growthRate *= (1 + veggie.fertilizerLevel * 0.05);
  return growthRate;
};

// Calculate yearly veggie production accounting for winter penalty
const calculateYearlyProduction = (veggie: Veggie, greenhouseOwned: boolean): number => {
  const baseRate = calculateBaseGrowthRate(veggie);
  
  // Season lengths (from getSeason function)
  const springDays = 80;   // days 0-79
  const summerDays = 92;   // days 80-171  
  const fallDays = 93;     // days 172-264
  const winterDays = 100;  // days 265-364 (365 total)
  
  let totalProduction = 0;
  
  // Calculate production for each season
  const seasons = [
    { name: 'Spring', days: springDays, rate: baseRate },
    { name: 'Summer', days: summerDays, rate: baseRate },
    { name: 'Fall', days: fallDays, rate: baseRate },
    { name: 'Winter', days: winterDays, rate: greenhouseOwned ? baseRate : baseRate * 0.1 }
  ];
  
  seasons.forEach(season => {
    let seasonRate = season.rate;
    
    // Add seasonal bonuses for appropriate seasons (ignoring winter bonus logic for simplicity)
    const bonusSeasons = veggieSeasonBonuses[veggie.name] || [];
    if (bonusSeasons.includes(season.name) && season.name !== 'Winter') {
      seasonRate += SEASON_BONUS;
    }
    
    // Days per cycle for this season
    const daysPerCycle = 100 / seasonRate;
    
    // Cycles possible in this season
    const cyclesThisSeason = season.days / daysPerCycle;
    
    // Production for this season
    const veggiesPerCycle = 1 + (veggie.additionalPlotLevel || 0);
    totalProduction += cyclesThisSeason * veggiesPerCycle;
  });
  
  return Math.floor(totalProduction);
};

type Veggie = {
  fertilizerMaxLevel: number;
  harvesterSpeedLevel?: number;
  harvesterSpeedCost?: number;
  name: string;
  growth: number;
  growthRate: number;
  stash: number;
  unlocked: boolean;
  experience: number;
  experienceToUnlock: number;
  fertilizerLevel: number;
  fertilizerCost: number;
  harvesterOwned: boolean;
  harvesterCost: number;
  harvesterTimer: number;
  salePrice: number;
  betterSeedsLevel: number;
  betterSeedsCost: number;
  additionalPlotLevel: number;
  additionalPlotCost: number;
  autoPurchasers: any[];
};

type AdvancedStashDisplayProps = {
  visible: boolean;
  onClose: () => void;
  veggies: Veggie[];
  greenhouseOwned: boolean;
  irrigationOwned: boolean;
  day: number;
};

const AdvancedStashDisplay: React.FC<AdvancedStashDisplayProps> = ({
  visible,
  onClose,
  veggies,
  greenhouseOwned,
  // irrigationOwned, // Will be used in later calculation todos
  // day // Will be used in later calculation todos
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when overlay is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [visible, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!visible) return null;

  // Filter to only show unlocked veggies
  const unlockedVeggies = veggies.filter(veggie => veggie.unlocked);

  // Calculate totals
  const totalStash = unlockedVeggies.reduce((sum, veggie) => sum + veggie.stash, 0);
  const totalValue = unlockedVeggies.reduce((sum, veggie) => sum + (veggie.stash * veggie.salePrice), 0);

  return (
    <div className="advanced-stash-overlay" onClick={handleBackdropClick}>
      <div className="advanced-stash-content">
        <div className="advanced-stash-header">
          <h2>Advanced Stash Details</h2>
          <button 
            className="close-button" 
            onClick={onClose}
            aria-label="Close stash details"
          >
            ×
          </button>
        </div>
        
        <div className="stash-summary">
          <div className="summary-item">
            <span className="summary-label">Total Stash:</span>
            <span className="summary-value">{totalStash}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Value:</span>
            <span className="summary-value">${totalValue.toFixed(2)}</span>
          </div>
        </div>

        <div className="stash-table-container">
          <table className="stash-table">
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 1, textAlign: 'center' }}>
              <tr>
                <th>Vegetable</th>
                <th>Current Count & Value</th>
                <th>Growth Rate</th>
                <th>Est. Yearly Production</th>
                <th>Est. Annual Revenue</th>
              </tr>
            </thead>
            <tbody>
              {unlockedVeggies.map((veggie) => {
                // Calculate accurate base growth rate with fertilizer
                const baseGrowthRate = calculateBaseGrowthRate(veggie);
                
                // Calculate yearly production with correct math (accounts for winter penalty)
                const totalYearlyProduction = calculateYearlyProduction(veggie, greenhouseOwned);
                
                // Calculate annual revenue (yearly production × current sale price)
                const annualRevenue = totalYearlyProduction * veggie.salePrice;
                
                // Calculate time per cycle for display (1 second IRL = 1 day in game)
                const daysPerCycle = 100 / baseGrowthRate;
                
                return (
                  <tr key={veggie.name}>
                    <td className="veggie-name">{veggie.name}</td>
                    <td className="stash-count">
                      {veggie.stash}
                      <br />
                      <small style={{ color: '#6c757d', fontSize: '0.8em' }}>
                        ${(veggie.salePrice).toFixed(2)} value
                        <br />
                        ${(veggie.stash * veggie.salePrice).toFixed(2)} total value
                      </small>
                    </td>
                    <td className="growth-rate">
                      {baseGrowthRate.toFixed(2)}%/day
                      <br />
                      <small style={{ color: '#6c757d', fontSize: '0.8em' }}>
                        {daysPerCycle.toFixed(1)} days per cycle
                      </small>
                      {!greenhouseOwned && (
                        <>
                          <br />
                          <small style={{ color: '#d63384', fontSize: '0.75em' }}>
                            Winter: {(daysPerCycle * 10).toFixed(1)} days/cycle
                          </small>
                        </>
                      )}
                    </td>
                    <td className="yearly-growth">
                      {totalYearlyProduction.toLocaleString()}
                      <br />
                      <small style={{ color: '#6c757d', fontSize: '0.8em' }}>
                        {(1 + (veggie.additionalPlotLevel || 0))} per cycle
                      </small>
                    </td>
                    <td className="annual-revenue">${annualRevenue.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="stash-footer">
          <p className="note">
            * Growth calculations are estimates based on current conditions and assume optimal growing conditions
          </p>
          <button className="close-footer-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedStashDisplay;