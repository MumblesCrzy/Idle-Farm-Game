import React, { memo } from 'react';
import BaseTab from './BaseTab';
import CanningPanel from './CanningPanel';
import CanningUpgradesPanel from './CanningUpgradesPanel';
import styles from './CanningTab.module.css';

interface CanningTabProps {
  canningState: any;
  canningUnlocked: boolean;
  veggies: any;
  money: number;
  knowledge: number;
  heirloomOwned: boolean;
  startCanning: (recipeId: string) => boolean;
  canMakeRecipe: (recipe: any) => boolean;
  purchaseUpgrade: (upgradeId: string) => boolean;
  toggleAutoCanning: () => void;
  recipeFilter: 'all' | 'available' | 'simple' | 'complex' | 'gourmet' | 'honey' | 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'tier5';
  recipeSort: 'name' | 'profit' | 'time' | 'difficulty';
  onRecipeFilterChange: (filter: 'all' | 'available' | 'simple' | 'complex' | 'gourmet' | 'honey' | 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'tier5') => void;
  onRecipeSortChange: (sort: 'name' | 'profit' | 'time' | 'difficulty') => void;
}

const CanningTab: React.FC<CanningTabProps> = memo(({
  canningState,
  canningUnlocked,
  veggies,
  money,
  knowledge,
  heirloomOwned,
  startCanning,
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
    <div className={styles.container}>
      <div className={styles.content}>
        <CanningPanel
          canningState={canningState}
          veggies={veggies}
          heirloomOwned={heirloomOwned}
          onStartCanning={startCanning}
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
      <h2 className={styles.title}>Upgrades</h2>
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
});

CanningTab.displayName = 'CanningTab';

export default CanningTab;