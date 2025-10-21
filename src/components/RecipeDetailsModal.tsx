import React from 'react';
import type { Recipe } from '../types/canning';

interface RecipeDetailsModalProps {
  recipe: Recipe | null;
  isVisible: boolean;
  onClose: () => void;
  onStartCanning: (recipeId: string) => void;
  veggies: Array<{name: string, stash: number, salePrice: number}>;
  canMake: boolean;
}

const RecipeDetailsModal: React.FC<RecipeDetailsModalProps> = ({
  recipe,
  isVisible,
  onClose,
  onStartCanning,
  veggies,
  canMake
}) => {
  if (!isVisible || !recipe) return null;

  const getRawValue = () => {
    return recipe.ingredients.reduce((total, ingredient) => {
      const veggie = veggies.find(v => v.name === ingredient.veggieName);
      return total + (veggie?.salePrice || 0) * ingredient.quantity;
    }, 0);
  };

  const getProfit = () => {
    const rawValue = getRawValue();
    return recipe.salePrice - rawValue;
  };

  const getProfitMargin = () => {
    const rawValue = getRawValue();
    if (rawValue === 0) return 0;
    return ((recipe.salePrice - rawValue) / rawValue) * 100;
  };

  const getMissingIngredients = () => {
    return recipe.ingredients.filter(ingredient => {
      const veggie = veggies.find(v => v.name === ingredient.veggieName);
      return !veggie || veggie.stash < ingredient.quantity;
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          borderBottom: '2px solid #f0f0f0',
          paddingBottom: '12px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            color: '#333'
          }}>
            {recipe.name}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#999',
              padding: '0',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
              e.currentTarget.style.color = '#666';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#999';
            }}
          >
            ×
          </button>
        </div>

        {/* Description */}
        <p style={{
          color: '#666',
          lineHeight: '1.4',
          marginBottom: '20px',
          fontStyle: 'italic'
        }}>
          {recipe.description}
        </p>

        {/* Ingredients */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            fontSize: '16px',
            color: '#333',
            marginBottom: '12px',
            borderBottom: '1px solid #e0e0e0',
            paddingBottom: '4px'
          }}>
            Ingredients Required:
          </h3>
          <div style={{ gap: '8px' }}>
            {recipe.ingredients.map((ingredient, index) => {
              const veggie = veggies.find(v => v.name === ingredient.veggieName);
              const hasEnough = veggie && veggie.stash >= ingredient.quantity;
              const available = veggie?.stash || 0;
              
              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: hasEnough ? '#f8fff8' : '#fff8f8',
                    border: `1px solid ${hasEnough ? '#d4edda' : '#f5c6cb'}`,
                    borderRadius: '6px',
                    marginBottom: '6px'
                  }}
                >
                  <span style={{
                    fontWeight: 'bold',
                    color: '#333'
                  }}>
                    {ingredient.veggieName} × {ingredient.quantity}
                  </span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      color: '#666'
                    }}>
                      (Have: {available})
                    </span>
                    <span style={{
                      fontSize: '18px',
                      color: hasEnough ? '#28a745' : '#dc3545'
                    }}>
                      {hasEnough ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Production Info */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            fontSize: '14px'
          }}>
            <div>
              <span style={{ color: '#666' }}>Processing Time:</span>
              <div style={{ fontWeight: 'bold', color: '#333' }}>
                {recipe.processingTime}s
              </div>
            </div>
            <div>
              <span style={{ color: '#666' }}>Sale Price:</span>
              <div style={{ fontWeight: 'bold', color: '#28a745' }}>
                ${recipe.salePrice.toFixed(2)}
              </div>
            </div>
            <div>
              <span style={{ color: '#666' }}>Raw Value:</span>
              <div style={{ fontWeight: 'bold', color: '#666' }}>
                ${getRawValue().toFixed(2)}
              </div>
            </div>
            <div>
              <span style={{ color: '#666' }}>Profit:</span>
              <div style={{ 
                fontWeight: 'bold', 
                color: getProfit() > 0 ? '#28a745' : '#dc3545' 
              }}>
                ${getProfit().toFixed(2)} ({getProfitMargin().toFixed(0)}%)
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        {recipe.timesCompleted > 0 && (
          <div style={{
            textAlign: 'center',
            padding: '8px',
            backgroundColor: '#e3f2fd',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '12px',
            color: '#1565c0'
          }}>
            Times Completed: {recipe.timesCompleted}
          </div>
        )}

        {/* Action Button */}
        <div style={{ textAlign: 'center' }}>
          {canMake ? (
            <button
              onClick={() => {
                onStartCanning(recipe.id);
                onClose();
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                minWidth: '150px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#218838';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#28a745';
              }}
            >
              Start Canning
            </button>
          ) : (
            <div>
              <button
                disabled
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#ccc',
                  color: '#666',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'not-allowed',
                  minWidth: '150px',
                  marginBottom: '8px'
                }}
              >
                Cannot Start
              </button>
              <div style={{
                fontSize: '12px',
                color: '#dc3545',
                fontWeight: 'bold'
              }}>
                {getMissingIngredients().length > 0 ? (
                  `Missing: ${getMissingIngredients().map(ing => ing.veggieName).join(', ')}`
                ) : (
                  'Check ingredients'
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeDetailsModal;