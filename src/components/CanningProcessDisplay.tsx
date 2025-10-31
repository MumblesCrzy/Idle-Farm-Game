import React from 'react';
import ProgressBar from './ProgressBar';
import type { CanningProcess, Recipe } from '../types/canning';

interface CanningProcessDisplayProps {
  processes: CanningProcess[];
  recipes: Recipe[];
  onCollect: (processIndex: number) => void;
  maxSimultaneousProcesses?: number;
}

const CanningProcessDisplay: React.FC<CanningProcessDisplayProps> = ({
  processes,
  recipes,
  onCollect,
  maxSimultaneousProcesses
}) => {
  return (
    <div style={{ 
      margin: '6px 0',
      maxWidth: '1400px', // Limit overall width
      maxHeight: '300px', // Limit overall height
      overflowY: 'auto' // Scroll if needed
    }}>
      <h3 style={{ 
        margin: '0 0 8px 0',
        fontSize: '13px',
        color: '#aaa',
        borderBottom: '2px solid #4CAF50',
        paddingBottom: '2px'
      }}>
        Active Processes ({processes.length}/{maxSimultaneousProcesses})
      </h3>
      
      {processes.length === 0 ? (
        <div style={{
          padding: '12px',
          textAlign: 'center',
          color: '#888',
          backgroundColor: '#f9f9f9',
          borderRadius: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
            <img src="./Canning.png" alt="Canning" style={{ width: '16px', height: '16px' }} />
          </div>
          <div style={{ fontSize: '12px' }}>No active canning processes</div>
          <div style={{ fontSize: '10px', marginTop: '2px' }}>
            Select a recipe above to start canning!
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '6px',
          alignItems: 'start'
        }}>
          {processes.map((process, index) => {
            const recipe = recipes.find(r => r.id === process.recipeId);
            if (!recipe) return null;

            const totalTime = process.totalTime;
            const elapsed = totalTime - process.remainingTime;
            const progressPercent = (elapsed / totalTime) * 100;

            const isCompleted = process.completed || process.remainingTime <= 0;

            return (
              <div
                key={index}
                style={{
                  border: `1px solid ${isCompleted ? '#4CAF50' : '#ddd'}`,
                  borderRadius: '4px',
                  padding: '6px',
                  backgroundColor: isCompleted ? '#f8fff8' : '#fff',
                  transition: 'all 0.2s ease',
                  fontSize: '11px',
                  minHeight: '60px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Recipe name - truncated */}
                <div style={{
                  fontWeight: 'bold',
                  fontSize: '12px',
                  color: isCompleted ? '#4CAF50' : '#333',
                  marginBottom: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {recipe.name}
                </div>

                {/* Ingredients - abbreviated */}
                {/* <div style={{
                  fontSize: '10px',
                  color: '#666',
                  marginBottom: '4px',
                  opacity: 0.8
                }}>
                  {ingredientSummary}
                </div> */}

                {/* Progress bar - compact */}
                <div style={{ 
                  position: 'relative', 
                  width: '100%', 
                  height: '12px',
                  marginBottom: '4px'
                }}>
                  <ProgressBar
                    value={progressPercent}
                    max={100}
                    height={12}
                    color={isCompleted ? '#4CAF50' : '#2196F3'}
                  />
                </div>

                {/* Status/Action - compact */}
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 'auto'
                }}>
                  {isCompleted ? (
                    <button
                      onClick={() => onCollect(index)}
                      style={{
                        padding: '2px 6px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        animation: 'pulse 2s infinite',
                        width: '100%'
                      }}
                    >
                      Collect ${recipe.salePrice.toFixed(2)}
                    </button>
                  ) : (
                    <div style={{ 
                      fontSize: '10px', 
                      color: '#666',
                      textAlign: 'center',
                      width: '100%'
                    }}>
                      {process.remainingTime}s ({Math.floor(progressPercent)}%)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
          100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
        }
      `}</style>
    </div>
  );
};

export default CanningProcessDisplay;