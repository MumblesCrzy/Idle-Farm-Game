import { useRef, useState, useCallback, type FC, type ReactNode, type ChangeEvent } from 'react';
import { validateCanningImport, saveGameStateWithCanning } from '../utils/saveSystem';
import { validateSaveData } from '../utils/validation';
import type { Veggie } from '../types/game';
import type { CanningState } from '../types/canning';
import type { BeeState } from '../types/bees';
import styles from './SaveLoadSystem.module.css';

/** Loading states for async operations */
export interface LoadingStates {
  isExporting: boolean;
  isImporting: boolean;
  isResetting: boolean;
}

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
  beeState?: BeeState | null;
  christmasEventState?: any; // ChristmasEventState
  permanentBonuses?: string[];
  
  // Function to reset the game
  resetGame: () => void;
  
  // Render props pattern for UI customization
  children: (handlers: {
    handleExportSave: () => void;
    handleImportSave: () => void;
    handleResetGame: () => void;
    loadingStates: LoadingStates;
  }) => ReactNode;
}

const SaveLoadSystem: FC<SaveLoadSystemProps> = ({
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
  beeState,
  christmasEventState,
  permanentBonuses,
  resetGame,
  children
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Track import errors for console logging (state available for future UI display)
  const [, setImportError] = useState<string | null>(null);
  
  // Loading states for async operations
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    isExporting: false,
    isImporting: false,
    isResetting: false
  });

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
    beeState: beeState || undefined,
    christmasEventState,
    permanentBonuses,
    // Optionally add a version for future compatibility
    saveVersion: 2
  });

  // Export save handler
  const handleExportSave = useCallback(() => {
    setLoadingStates(prev => ({ ...prev, isExporting: true }));
    
    // Use setTimeout to allow the UI to update before the synchronous work
    setTimeout(() => {
      try {
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
      } finally {
        setLoadingStates(prev => ({ ...prev, isExporting: false }));
      }
    }, 50);
  }, [
    veggies, money, experience, knowledge, activeVeggie, day,
    globalAutoPurchaseTimer, greenhouseOwned, heirloomOwned, autoSellOwned,
    almanacLevel, almanacCost, maxPlots, farmTier, irrigationOwned,
    currentWeather, canningState, beeState, christmasEventState, permanentBonuses
  ]);

  // Import save handler: triggers file input
  const handleImportSave = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, []);

  // File input change handler
  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Clear previous errors and set loading state
    setImportError(null);
    setLoadingStates(prev => ({ ...prev, isImporting: true }));
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawData = event.target?.result as string;
        
        // Check file is not empty
        if (!rawData || rawData.trim() === '') {
          setImportError('The save file is empty.');
          alert('The save file is empty.');
          setLoadingStates(prev => ({ ...prev, isImporting: false }));
          return;
        }
        
        let data: unknown;
        try {
          data = JSON.parse(rawData);
        } catch (parseError) {
          setImportError('Invalid JSON format. The save file may be corrupted.');
          alert('Invalid JSON format. The save file may be corrupted.');
          setLoadingStates(prev => ({ ...prev, isImporting: false }));
          return;
        }
        
        // Run comprehensive validation
        const validationResult = validateSaveData(data);
        
        if (!validationResult.valid) {
          const errorMessage = `Save validation failed:\n\n${validationResult.errors.join('\n')}`;
          setImportError(errorMessage);
          alert(errorMessage);
          setLoadingStates(prev => ({ ...prev, isImporting: false }));
          return;
        }
        
        // Show warnings if any
        if (validationResult.warnings.length > 0) {
          console.warn('Save import warnings:', validationResult.warnings);
        }
        
        // Also run legacy validation for backward compatibility
        if (!validateCanningImport(data)) {
          setImportError('Invalid save file format (legacy validation failed).');
          alert('Invalid save file format.');
          setLoadingStates(prev => ({ ...prev, isImporting: false }));
          return;
        }
        
        // Save the imported data to localStorage
        saveGameStateWithCanning(data);
        
        // Reload the page to reinitialize all systems with imported data
        // Note: isImporting stays true since page will reload
        const warningText = validationResult.warnings.length > 0 
          ? `\n\nNote: ${validationResult.warnings.join('. ')}`
          : '';
        alert(`Save imported successfully! The page will reload to apply all changes.${warningText}`);
        window.location.reload();
        
      } catch (error) {
        console.error('Import: Error during import:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setImportError(`Failed to import save file: ${errorMessage}`);
        alert('Failed to import save file. Check console for details.');
        setLoadingStates(prev => ({ ...prev, isImporting: false }));
      }
    };
    
    reader.onerror = () => {
      setImportError('Failed to read the file. Please try again.');
      alert('Failed to read the file. Please try again.');
      setLoadingStates(prev => ({ ...prev, isImporting: false }));
    };
    
    reader.readAsText(file);
  }, []);

  // Reset game handler for UI button or logic
  const handleResetGame = useCallback(() => {
    if (window.confirm('Are you sure you want to reset your game? This will erase all progress!')) {
      setLoadingStates(prev => ({ ...prev, isResetting: true }));
      // Small delay to show loading state before reset
      setTimeout(() => {
        resetGame();
        // Note: isResetting stays true since resetGame typically causes page reload/state reset
      }, 100);
    }
  }, [resetGame]);

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
        handleResetGame,
        loadingStates
      })}
    </>
  );
};

export default SaveLoadSystem;
