import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

/**
 * Game Flags Context
 * Manages global game state flags like reset status and achievement blocking
 * Replaces module-level flags for better testability
 */

interface GameFlagsContextType {
  justReset: boolean;
  setJustReset: (value: boolean) => void;
  blockAchievementChecks: boolean;
  setBlockAchievementChecks: (value: boolean) => void;
}

const GameFlagsContext = createContext<GameFlagsContextType | null>(null);

export function useGameFlags() {
  const context = useContext(GameFlagsContext);
  if (!context) {
    throw new Error('useGameFlags must be used within GameFlagsProvider');
  }
  return context;
}

interface GameFlagsProviderProps {
  children: ReactNode;
}

export function GameFlagsProvider({ children }: GameFlagsProviderProps) {
  const [justReset, setJustReset] = useState(false);
  const [blockAchievementChecks, setBlockAchievementChecks] = useState(false);
  
  const value: GameFlagsContextType = {
    justReset,
    setJustReset: useCallback((value: boolean) => setJustReset(value), []),
    blockAchievementChecks,
    setBlockAchievementChecks: useCallback((value: boolean) => setBlockAchievementChecks(value), []),
  };
  
  return (
    <GameFlagsContext.Provider value={value}>
      {children}
    </GameFlagsContext.Provider>
  );
}
