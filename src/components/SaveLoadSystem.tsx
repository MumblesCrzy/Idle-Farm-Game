import { useRef } from 'react';
import { validateCanningImport, saveGameStateWithCanning } from '../utils/saveSystem';
import type { Veggie } from '../types/game';
import type { CanningState } from '../types/canning';
import styles from './SaveLoadSystem.module.css';

interface SaveLoadSystemProps {
  // Current game state to export
  veggies: Veggie[];
  money: number;
  experience: number;
  knowledge: number;
  activeVeggie: number | null;
  day: number;
  globalAutoPurchaseTimer: number;
  greenhouseOwned: boolean;
  heirloomOwned: boolean;
  autoSellOwned: boolean;
  almanacLevel: number;
  almanacCost: number;
  maxPlots: number;
  farmTier: number;
  irrigationOwned: boolean;
  currentWeather: string;
  canningState: CanningState;
  christmasEventState?: any; // ChristmasEventState
  permanentBonuses?: string[];
  
  // Function to reset the game
  resetGame: () => void;
  
  // Render props pattern for UI customization
  children: (handlers: {
    handleExportSave: () => void;
    handleImportSave: () => void;
    handleResetGame: () => void;
  }) => React.ReactNode;
}

const SaveLoadSystem: React.FC<SaveLoadSystemProps> = ({
  veggies,
  money,
  experience,
  knowledge,
  activeVeggie,
  day,
  globalAutoPurchaseTimer,
  greenhouseOwned,
  heirloomOwned,
  autoSellOwned,
  almanacLevel,
  almanacCost,
  maxPlots,
  farmTier,
  irrigationOwned,
  currentWeather,
  canningState,
  christmasEventState,
  permanentBonuses,
  resetGame,
  children
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Returns a serializable snapshot of the current game state
  const getSerializableGameState = () => ({
    veggies,
    money,
    experience,
    knowledge,
    activeVeggie,
    day,
    globalAutoPurchaseTimer,
    greenhouseOwned,
    heirloomOwned,
    autoSellOwned,
    almanacLevel,
    almanacCost,
    maxPlots,
    farmTier,
    irrigationOwned,
    currentWeather,
    canningState,
    christmasEventState,
    permanentBonuses,
    // Optionally add a version for future compatibility
    saveVersion: 2
  });

  // Export save handler
  const handleExportSave = () => {
    const saveData = getSerializableGameState();
    // Add timestamp and format filename
    const date = new Date();
    const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
    const filename = `farm-idle-save_${timestamp}.json`;
    
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import save handler: triggers file input
  const handleImportSave = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // File input change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        // Validate and migrate data with canning support
        if (!validateCanningImport(data)) {
          alert("Invalid save file format.");
          return;
        }
        
        // Save the imported data to localStorage
        saveGameStateWithCanning(data);
        
        // Reload the page to reinitialize all systems with imported data
        alert("Save imported successfully! The page will reload to apply all changes.");
        window.location.reload();
        
      } catch (error) {
        console.error('Import: Error during import:', error);
        alert("Failed to import save file.");
      }
    };
    reader.readAsText(file);
  };

  // Reset game handler for UI button or logic
  const handleResetGame = () => {
    if (window.confirm('Are you sure you want to reset your game? This will erase all progress!')) {
      resetGame();
    }
  };

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        className={styles.hiddenInput} 
        onChange={handleFileChange} 
        accept=".json"
      />
      {children({
        handleExportSave,
        handleImportSave,
        handleResetGame
      })}
    </>
  );
};

export default SaveLoadSystem;
