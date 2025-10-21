import React, { useState } from 'react';
import type { Recipe } from '../types/canning';
import type { AutoCanningConfig } from '../utils/canningAutoPurchase';

interface AutoCanningControlsProps {
  config: AutoCanningConfig;
  recipes: Recipe[];
  onUpdateConfig: (config: AutoCanningConfig) => void;
}

const AutoCanningControls: React.FC<AutoCanningControlsProps> = ({
  config,
  recipes,
  onUpdateConfig
}) => {
  const [showConfig, setShowConfig] = useState(false);
  
  const unlockedRecipes = recipes.filter(r => r.unlocked);
  
  const handleToggleEnabled = () => {
    onUpdateConfig({
      ...config,
      enabled: !config.enabled
    });
  };
  
  const handleToggleRecipe = (recipeId: string) => {
    const selectedRecipes = config.selectedRecipes.includes(recipeId)
      ? config.selectedRecipes.filter(id => id !== recipeId)
      : [...config.selectedRecipes, recipeId];
    
    onUpdateConfig({
      ...config,
      selectedRecipes
    });
  };
  
  const handleReorderRecipe = (recipeId: string, direction: 'up' | 'down') => {
    const currentIndex = config.priorityOrder.indexOf(recipeId);
    if (currentIndex === -1) return;
    
    const newOrder = [...config.priorityOrder];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      [newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]];
      onUpdateConfig({
        ...config,
        priorityOrder: newOrder
      });
    }
  };
  
  const handleAddToPriority = (recipeId: string) => {
    if (!config.priorityOrder.includes(recipeId)) {
      onUpdateConfig({
        ...config,
        priorityOrder: [...config.priorityOrder, recipeId]
      });
    }
  };
  
  const handleRemoveFromPriority = (recipeId: string) => {
    onUpdateConfig({
      ...config,
      priorityOrder: config.priorityOrder.filter(id => id !== recipeId)
    });
  };

  return (
    <div style={{
      backgroundColor: '#f0f8ff',
      border: '2px solid #4682b4',
      borderRadius: '8px',
      padding: '12px',
      marginTop: '16px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <h4 style={{
          margin: 0,
          fontSize: '14px',
          color: '#1e3a8a',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🤖 Auto-Canning System
          {config.enabled && (
            <span style={{
              fontSize: '10px',
              background: '#22c55e',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '12px',
              fontWeight: 'bold'
            }}>
              ACTIVE
            </span>
          )}
        </h4>
        
        <button
          onClick={() => setShowConfig(!showConfig)}
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            backgroundColor: '#4682b4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showConfig ? 'Hide Config' : 'Configure'}
        </button>
      </div>

      {/* Quick toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: showConfig ? '16px' : '0'
      }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: '#374151',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={handleToggleEnabled}
            style={{ transform: 'scale(1.2)' }}
          />
          Enable Auto-Canning
        </label>
        
        {config.enabled && (
          <div style={{
            fontSize: '10px',
            color: '#6b7280',
            backgroundColor: '#f3f4f6',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            {config.selectedRecipes.length} recipes selected
          </div>
        )}
      </div>

      {/* Configuration panel */}
      {showConfig && (
        <div style={{
          borderTop: '1px solid #cbd5e1',
          paddingTop: '12px'
        }}>
          {/* General settings */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: '#374151'
            }}>
              <input
                type="checkbox"
                checked={config.onlyUseExcess}
                onChange={(e) => onUpdateConfig({
                  ...config,
                  onlyUseExcess: e.target.checked
                })}
              />
              Only use excess vegetables
            </label>
            
            <div style={{ fontSize: '11px', color: '#374151' }}>
              <label>
                Reserve: 
                <input
                  type="number"
                  value={config.excessThreshold}
                  onChange={(e) => onUpdateConfig({
                    ...config,
                    excessThreshold: Math.max(0, parseInt(e.target.value) || 0)
                  })}
                  style={{
                    marginLeft: '4px',
                    width: '50px',
                    padding: '2px 4px',
                    fontSize: '11px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '2px'
                  }}
                  min="0"
                />
              </label>
            </div>
          </div>

          {/* Recipe selection */}
          <div style={{ marginBottom: '16px' }}>
            <h5 style={{
              margin: '0 0 8px 0',
              fontSize: '12px',
              color: '#1e3a8a'
            }}>
              Select Recipes to Auto-Make:
            </h5>
            
            <div style={{
              maxHeight: '120px',
              overflowY: 'auto',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              padding: '4px'
            }}>
              {unlockedRecipes.map(recipe => (
                <label
                  key={recipe.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px',
                    fontSize: '11px',
                    color: '#374151',
                    cursor: 'pointer',
                    borderRadius: '2px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <input
                    type="checkbox"
                    checked={config.selectedRecipes.includes(recipe.id)}
                    onChange={() => handleToggleRecipe(recipe.id)}
                  />
                  <span style={{ flex: 1 }}>{recipe.name}</span>
                  <span style={{ color: '#6b7280', fontSize: '10px' }}>
                    ${recipe.salePrice}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority order */}
          {config.selectedRecipes.length > 1 && (
            <div>
              <h5 style={{
                margin: '0 0 8px 0',
                fontSize: '12px',
                color: '#1e3a8a'
              }}>
                Priority Order (higher = first):
              </h5>
              
              <div style={{
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                padding: '4px',
                maxHeight: '100px',
                overflowY: 'auto'
              }}>
                {config.priorityOrder.map((recipeId, index) => {
                  const recipe = recipes.find(r => r.id === recipeId);
                  if (!recipe) return null;
                  
                  return (
                    <div
                      key={recipeId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '2px',
                        fontSize: '11px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '2px',
                        marginBottom: '2px'
                      }}
                    >
                      <span style={{ fontWeight: 'bold', color: '#1e3a8a' }}>
                        #{index + 1}
                      </span>
                      <span style={{ flex: 1 }}>{recipe.name}</span>
                      
                      <button
                        onClick={() => handleReorderRecipe(recipeId, 'up')}
                        disabled={index === 0}
                        style={{
                          padding: '1px 4px',
                          fontSize: '9px',
                          background: 'none',
                          border: '1px solid #cbd5e1',
                          borderRadius: '2px',
                          cursor: index === 0 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ↑
                      </button>
                      
                      <button
                        onClick={() => handleReorderRecipe(recipeId, 'down')}
                        disabled={index === config.priorityOrder.length - 1}
                        style={{
                          padding: '1px 4px',
                          fontSize: '9px',
                          background: 'none',
                          border: '1px solid #cbd5e1',
                          borderRadius: '2px',
                          cursor: index === config.priorityOrder.length - 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ↓
                      </button>
                      
                      <button
                        onClick={() => handleRemoveFromPriority(recipeId)}
                        style={{
                          padding: '1px 4px',
                          fontSize: '9px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '2px',
                          cursor: 'pointer'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                
                {/* Add to priority buttons */}
                <div style={{ marginTop: '8px' }}>
                  {config.selectedRecipes
                    .filter(id => !config.priorityOrder.includes(id))
                    .map(recipeId => {
                      const recipe = recipes.find(r => r.id === recipeId);
                      if (!recipe) return null;
                      
                      return (
                        <button
                          key={recipeId}
                          onClick={() => handleAddToPriority(recipeId)}
                          style={{
                            padding: '2px 4px',
                            fontSize: '9px',
                            backgroundColor: '#e5e7eb',
                            border: '1px solid #cbd5e1',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            marginRight: '4px',
                            marginBottom: '2px'
                          }}
                        >
                          + {recipe.name}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutoCanningControls;