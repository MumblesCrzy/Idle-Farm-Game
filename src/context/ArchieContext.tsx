import { createContext, useState, useContext, useEffect } from 'react';

interface ArchieContextType {
  archieClicked: boolean;
  setArchieClicked: React.Dispatch<React.SetStateAction<boolean>>;
  archieReward: number;
  setArchieReward: React.Dispatch<React.SetStateAction<number>>;
  archieCheerReward: number;
  setArchieCheerReward: React.Dispatch<React.SetStateAction<number>>;
  lastClickTime: number;
  setLastClickTime: React.Dispatch<React.SetStateAction<number>>;
  archieClickStreak: number;
  setArchieClickStreak: React.Dispatch<React.SetStateAction<number>>;
  soundEnabled: boolean;
  setSoundEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  archieAppearance: 'default' | 'reindeer' | 'sweater' | 'pinecones';
  setArchieAppearance: React.Dispatch<React.SetStateAction<'default' | 'reindeer' | 'sweater' | 'pinecones'>>;
  handleArchieClick: (gameState?: { 
    money: number; 
    experience: number; 
    totalPlotsUsed: number;
    isChristmasEventActive?: boolean;
    christmasTreesSold?: number;
  }) => void;
  handleArchieAppear: () => void;
}

const STREAK_TIMEOUT = 30 * 10000; // 300 seconds to maintain a streak

const ArchieContext = createContext<ArchieContextType | undefined>(undefined);

export const ArchieProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [archieClicked, setArchieClicked] = useState(false);
  const [archieReward, setArchieReward] = useState(0);
  const [archieCheerReward, setArchieCheerReward] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [archieClickStreak, setArchieClickStreak] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [archieAppearance, setArchieAppearance] = useState<'default' | 'reindeer' | 'sweater' | 'pinecones'>('default');

  // Shared function to play Archie sound
  const playArchieSound = () => {
    if (soundEnabled) {
      try {
        const archieSound = new Audio('./Archie Bark.mp3');
        archieSound.volume = 0.4; // 40% volume - friendly but not overwhelming
        
        // Add more robust error handling
        archieSound.addEventListener('canplaythrough', () => {
          console.log('ArchieContext: Audio ready to play');
        });
        
        archieSound.addEventListener('error', (e) => {
          console.warn('ArchieContext: Audio failed to load:', e);
        });
        
        archieSound.play().catch((error) => {
          console.warn('ArchieContext: Audio play failed (this is normal if autoplay is restricted):', error);
        });
      } catch (error) {
        console.warn('ArchieContext: Audio initialization failed:', error);
      }
    } else {
      console.log('ArchieContext: Sound disabled, skipping audio');
    }
  };

  // Function to handle when Archie appears on screen
  const handleArchieAppear = () => {
    playArchieSound();
  };
  
  // Function to handle when Archie is clicked
  const handleArchieClick = (gameState?: { 
    money: number; 
    experience: number; 
    totalPlotsUsed: number;
    isChristmasEventActive?: boolean;
    christmasTreesSold?: number;
  }) => {
    // Record the time of click
    const currentTime = Date.now();
    
    // Check if this click is part of a streak (within 30 seconds of previous click)
    let newStreak = 1; // Default to 1 (first click)
    if (currentTime - lastClickTime <= STREAK_TIMEOUT) {
      newStreak = archieClickStreak + 1;
    }
    setArchieClickStreak(newStreak);
    
    // Update last click time
    setLastClickTime(currentTime);
    
    // Calculate money reward (always given)
    let baseReward = 50; // Higher base for better late-game rewards
    
    if (gameState) {
      // Progressive scaling factors based on game state
      const moneyFactor = Math.max(1, Math.log10(Math.max(1, gameState.money / 50))); // Logarithmic money scaling
      const experienceFactor = Math.max(1, Math.log10(Math.max(1, gameState.experience / 10))); // Experience scaling  
      const plotsFactor = Math.max(1, Math.sqrt(gameState.totalPlotsUsed / 2)); // Plots progression factor (starts at 4 base plots)
      
      // Combine factors for progressive scaling (improved scaling for late game)
      // Formula: $50 base × money factor × experience factor × plots factor × 0.8 scaling
      baseReward = Math.max(50, Math.floor(50 * moneyFactor * experienceFactor * plotsFactor * 0.8));
      
      // Intelligent cap: 5-20% of current money, minimum $1000, maximum $25000
      const dynamicCap = Math.max(1000, Math.min(25000, gameState.money * 0.20));
      baseReward = Math.min(baseReward, dynamicCap);
    }
    
    const randomMultiplier = Math.random() * 0.5 + 0.75; // 0.75 to 1.25
    const streakMultiplier = Math.min(3, 1 + (newStreak - 1) * 0.5); // Max 3x bonus for streaks
    
    const reward = Math.floor(baseReward * randomMultiplier * streakMultiplier);
    
    // Always set the money reward
    setArchieReward(reward);
    
    // Additionally, if Christmas event is active, give Holiday Cheer
    if (gameState?.isChristmasEventActive && gameState?.christmasTreesSold !== undefined) {
      // Calculate Holiday Cheer reward based on trees sold
      const baseCheer = 10; // Base reward
      const treesFactor = Math.max(1, Math.log10(Math.max(1, gameState.christmasTreesSold + 1))); // Logarithmic scaling
      
      let cheerReward = Math.floor(baseCheer * treesFactor * 5); // 5x multiplier for decent rewards
      
      // Cap between 10 and 500 Holiday Cheer
      cheerReward = Math.max(10, Math.min(500, cheerReward));
      
      const finalCheerReward = Math.floor(cheerReward * randomMultiplier * streakMultiplier);
      
      // Set the Holiday Cheer reward
      setArchieCheerReward(finalCheerReward);
    }
    
    // Play click sound
    playArchieSound();
    
    // Mark as clicked
    setArchieClicked(true);
    
    // Save to localStorage to persist the timestamp
    try {
      localStorage.setItem('archieLastClickTime', currentTime.toString());
      localStorage.setItem('archieClickStreak', newStreak.toString());
    } catch (error) {
      console.error('Failed to save Archie click time:', error);
    }
  };

  // When component mounts, try to load last click time from localStorage
  useEffect(() => {
    try {
      const savedTime = localStorage.getItem('archieLastClickTime');
      if (savedTime) {
        setLastClickTime(parseInt(savedTime, 10));
      }
    } catch (error) {
      console.error('Failed to load Archie click time:', error);
    }
  }, []);
  
  // Load streak from localStorage when component mounts
  useEffect(() => {
    try {
      const savedStreak = localStorage.getItem('archieClickStreak');
      if (savedStreak) {
        setArchieClickStreak(parseInt(savedStreak, 10));
      }
      
      // Reset streak if it's been too long since last click
      const savedTime = localStorage.getItem('archieLastClickTime');
      if (savedTime) {
        const lastTime = parseInt(savedTime, 10);
        if (Date.now() - lastTime > STREAK_TIMEOUT) {
          setArchieClickStreak(0);
        }
      }
      
      // Load sound setting
      const savedSoundSetting = localStorage.getItem('archieSoundEnabled');
      if (savedSoundSetting !== null) {
        setSoundEnabled(savedSoundSetting === 'true');
      }
      
      // Load appearance setting
      const savedAppearance = localStorage.getItem('archieAppearance');
      if (savedAppearance && ['default', 'reindeer', 'sweater', 'pinecones'].includes(savedAppearance)) {
        setArchieAppearance(savedAppearance as 'default' | 'reindeer' | 'sweater' | 'pinecones');
      }
    } catch (error) {
      console.error('Failed to load Archie settings:', error);
    }
  }, []);

  // Save sound setting when it changes
  useEffect(() => {
    try {
      localStorage.setItem('archieSoundEnabled', soundEnabled.toString());
    } catch (error) {
      console.error('Failed to save Sound Effects setting:', error);
    }
  }, [soundEnabled]);
  
  // Save appearance setting when it changes
  useEffect(() => {
    try {
      localStorage.setItem('archieAppearance', archieAppearance);
    } catch (error) {
      console.error('Failed to save Archie appearance setting:', error);
    }
  }, [archieAppearance]);

  return (
    <ArchieContext.Provider value={{ 
      archieClicked, 
      setArchieClicked, 
      archieReward, 
      setArchieReward,
      archieCheerReward,
      setArchieCheerReward,
      lastClickTime,
      setLastClickTime,
      archieClickStreak,
      setArchieClickStreak,
      soundEnabled,
      setSoundEnabled,
      archieAppearance,
      setArchieAppearance,
      handleArchieClick,
      handleArchieAppear
    }}>
      {children}
    </ArchieContext.Provider>
  );
};

export const useArchie = () => {
  const context = useContext(ArchieContext);
  if (!context) {
    throw new Error('useArchie must be used within an ArchieProvider');
  }
  return context;
};