import React from 'react';
import type { Recipe } from '../types/canning';

interface RecipeCardProps {
  recipe: Recipe;
  canMake: boolean;
  onStartCanning: (recipeId: string) => void;
  onShowDetails: (recipe: Recipe) => void;
  veggies: Array<{name: string, stash: number, salePrice: number, betterSeedsLevel: number}>;
  efficiencyMultiplier?: number; // Family Recipe upgrade multiplier
  speedMultiplier?: number; // Quick Hands upgrade multiplier
  heirloomOwned?: boolean; // Heirloom upgrade multiplier
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ 
  recipe, 
  canMake, 
  onStartCanning, 
  onShowDetails,
  veggies,
  efficiencyMultiplier = 1,
  speedMultiplier = 1,
  heirloomOwned = false,
  formatNumber
}) => {
  const getIngredientSummary = () => {
    // Create shorthand mapping for common veggies
    const getShortName = (veggieName: string) => {
      const shortNames: { [key: string]: string } = {
        'Radish': 'Rad',
        'Lettuce': 'Let',
        'Green Beans': 'GrB',
        'Broccoli': 'Bro',
        'Carrots': 'Car',
        'Tomatoes': 'Tom',
        'Peppers': 'Pep',
        'Onions': 'Oni',
        'Cucumbers': 'Cuc',
        'Zucchini': 'Zuc'
      };
      return shortNames[veggieName] || veggieName.substring(0, 3);
    };
    
    // Show all ingredients with shorthand format and current amounts
    return recipe.ingredients.map(ingredient => {
      const shortName = getShortName(ingredient.veggieName);
      const veggie = veggies.find(v => v.name === ingredient.veggieName);
      const currentAmount = veggie?.stash || 0;
      return `${shortName}×${ingredient.quantity}(${currentAmount})`;
    }).join(' + ');
  };

  const getRawValue = () => {
    return recipe.ingredients.reduce((total, ingredient) => {
      const veggie = veggies.find(v => v.name === ingredient.veggieName);
      return total + (veggie?.salePrice || 0) * ingredient.quantity;
    }, 0);
  };

  const getEffectiveSalePrice = () => {
    return recipe.salePrice * efficiencyMultiplier * getBetterSeedsMultiplier();
  };

  // Calculate better seeds multiplier based on ingredient better seeds levels
  const getBetterSeedsMultiplier = () => {
    if (recipe.ingredients.length === 0) return 1;
    
    // Calculate average better seeds level of all ingredients
    const totalBetterSeedsLevel = recipe.ingredients.reduce((sum, ingredient) => {
      const veggie = veggies.find(v => v.name === ingredient.veggieName);
      return sum + (veggie?.betterSeedsLevel || 0);
    }, 0);
    
    const averageBetterSeedsLevel = totalBetterSeedsLevel / recipe.ingredients.length;
    
    return Math.pow(heirloomOwned ? 1.5 : 1.25, averageBetterSeedsLevel);
  };

  const getEffectiveProcessingTime = () => {
    return Math.ceil(recipe.baseProcessingTime * speedMultiplier);
  };

  const getProfit = () => {
    const rawValue = getRawValue();
    const effectiveSalePrice = getEffectiveSalePrice();
    return effectiveSalePrice - rawValue;
  };

  // Calculate reward amounts (assuming manual canning)
  const getKnowledgeReward = () => {
    return recipe.ingredients.length * 2;
  };

  const getCanningExperienceReward = () => {
    return recipe.ingredients.length * 10;
  };

  return (
    <div
      style={{
        border: `2px solid ${canMake ? '#700e01' : '#ccc'}`,
        borderRadius: '6px',
        padding: '8px',
        margin: '4px',
        minWidth: '160px',
        maxWidth: '180px',
        backgroundColor: canMake ? '#f8fff8' : '#f5f5f5',
        transition: 'all 0.2s ease',
        opacity: canMake ? 1 : 0.7,
        boxShadow: canMake ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
      }}
      title={recipe.description} // Tooltip for entire card
    >
      {/* Clickable content area */}
      <div
        style={{
          cursor: 'pointer'
        }}
        onClick={() => onShowDetails(recipe)}
        onMouseEnter={(e) => {
          if (canMake) {
            e.currentTarget.parentElement!.style.transform = 'translateY(-2px)';
            e.currentTarget.parentElement!.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.parentElement!.style.transform = 'translateY(0)';
          e.currentTarget.parentElement!.style.boxShadow = canMake ? '0 1px 3px rgba(0,0,0,0.1)' : 'none';
        }}
      >
        <div 
          style={{ 
            fontWeight: 'bold', 
            fontSize: '13px', 
            marginBottom: '6px',
            color: canMake ? '#333' : '#888'
          }}
        >
          {recipe.name}
        </div>
        
        {/*<div style={{ 
          fontSize: '11px', 
          color: '#666', 
          marginBottom: '6px',
          fontWeight: '500'
        }}>
          {getIngredientSummary()}
        </div>*/}
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ 
            fontWeight: 'bold', 
            color: '#4CAF50',
            fontSize: '14px'
          }}>
            ${formatNumber(getEffectiveSalePrice(), 2)}
            {getBetterSeedsMultiplier() > 1 && (
              <span style={{ 
                fontSize: '9px', 
                color: '#8BC34A', 
                marginLeft: '2px',
                fontWeight: 'normal'
              }}>
                +{formatNumber((getBetterSeedsMultiplier() - 1) * 100, 2)}%
              </span>
            )}
          </span>
          <span style={{ 
            fontSize: '11px', 
            color: '#666' 
          }}>
            {getEffectiveProcessingTime()}s
          </span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '10px', 
          color: '#666',
          marginBottom: '8px'
        }}>
          <span style={{ color: '#2196F3' }}>
            +{getKnowledgeReward()} kn
          </span>
          <span style={{ color: '#9C27B0' }}>
            +{getCanningExperienceReward()} exp
          </span>
        </div>
        {/* <div style={{ 
          fontSize: '11px', 
          color: getProfitColor(),
          fontWeight: 'bold',
          marginBottom: '6px'
        }}>
          Profit: +${getProfit().toFixed(2)}
        </div>         */}
      </div>
      
      {canMake && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartCanning(recipe.id);
          }}
          style={{
            width: '100%',
            padding: '6px',
            backgroundColor: '#700e01',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#620000';
                                                        
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#700e01';
          }}
        >
          Start Canning
        </button>
      )}
            
      {!canMake && (
        <div style={{
          width: '100%',
          padding: '6px',
          backgroundColor: '#ccc',
          color: '#666',
          textAlign: 'center',
          borderRadius: '4px',
          fontSize: '11px',
          boxSizing: 'border-box'
        }}>
          Missing Ingredients
        </div>
      )}
      
      {recipe.timesCompleted > 0 && (
        <div style={{
          fontSize: '10px',
          color: '#888',
          textAlign: 'center',
          marginTop: '4px'
        }}>
          Made {recipe.timesCompleted} times
        </div>
      )}
    </div>
  );
};

export default RecipeCard;