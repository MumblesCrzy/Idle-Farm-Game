import React from 'react';
import BaseTab from './BaseTab';
import CanningPanel from './CanningPanel';
import CanningUpgradesPanel from './CanningUpgradesPanel';

interface CanningTabProps {
  canningState: any;
  canningUnlocked: boolean;
  veggies: any;
  money: number;
  knowledge: number;
  startCanning: (recipeId: string) => boolean;
  completeCanning: (processIndex: number) => void;
  canMakeRecipe: (recipe: any) => boolean;
  purchaseUpgrade: (upgradeId: string) => boolean;
  toggleAutoCanning: () => void;
  recipeFilter: 'all' | 'available' | 'simple' | 'complex' | 'gourmet';
  recipeSort: 'name' | 'profit' | 'time' | 'difficulty';
  onRecipeFilterChange: (filter: 'all' | 'available' | 'simple' | 'complex' | 'gourmet') => void;
  onRecipeSortChange: (sort: 'name' | 'profit' | 'time' | 'difficulty') => void;
}

const CanningTab: React.FC<CanningTabProps> = ({
  canningState,
  canningUnlocked,
  veggies,
  money,
  knowledge,
  startCanning,
  completeCanning,
  canMakeRecipe,
  purchaseUpgrade,
  toggleAutoCanning,
  recipeFilter,
  recipeSort,
  onRecipeFilterChange,
  onRecipeSortChange
}) => {
  // Main canning content
  const mainContent = (
    <div style={{ height: '20px', marginBottom: '.75rem', display: 'flex', flexDirection: 'column' }}>
      {/* <h2 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <img src="./Canning.png" alt="Canning" style={{ width: '24px', height: '24px' }} />
        Canning System
      </h2> */}
      <div style={{ flex: 1 }}>
        <CanningPanel
          canningState={canningState}
          veggies={veggies}
          onStartCanning={startCanning}
          onCollectCanning={completeCanning}
          canMakeRecipe={canMakeRecipe}
          recipeFilter={recipeFilter}
          recipeSort={recipeSort}
          onRecipeFilterChange={onRecipeFilterChange}
          onRecipeSortChange={onRecipeSortChange}
        />
      </div>
    </div>
  );

  // Canning upgrades sidebar
  const sidebarContent = (
    <>
      <h2 style={{ textAlign: 'center', color: '#700e01', marginBottom: '1rem' }}>Upgrades</h2>
      <CanningUpgradesPanel
        upgrades={canningState?.upgrades}
        money={money}
        knowledge={knowledge}
        onPurchaseUpgrade={purchaseUpgrade}
        canningState={canningState}
        onToggleAutoCanning={toggleAutoCanning}
      />
    </>
  );

  // Custom sidebar styling for canning tab
  const sidebarStyle = {
    background: '#ff8503',
    border: '1px solid #e68900',
    boxShadow: '0 2px 8px rgba(255, 152, 0, 0.3)'
  };

  return (
    <BaseTab
      isUnlocked={canningUnlocked}
      isLoading={canningUnlocked && !canningState}
      loadingMessage="Loading canning system..."
      mainContent={mainContent}
      sidebarContent={sidebarContent}
      sidebarStyle={sidebarStyle}
    />
  );
};

export default CanningTab;