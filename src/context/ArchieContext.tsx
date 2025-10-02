import { createContext, useState, useContext, useEffect } from 'react';

interface ArchieContextType {
  archieClicked: boolean;
  setArchieClicked: React.Dispatch<React.SetStateAction<boolean>>;
  archieReward: number;
  setArchieReward: React.Dispatch<React.SetStateAction<number>>;
  lastClickTime: number;
  setLastClickTime: React.Dispatch<React.SetStateAction<number>>;
  archieClickStreak: number;
  setArchieClickStreak: React.Dispatch<React.SetStateAction<number>>;
  handleArchieClick: () => void;
}

const STREAK_TIMEOUT = 30 * 1000; // 30 seconds to maintain a streak

const ArchieContext = createContext<ArchieContextType | undefined>(undefined);

export const ArchieProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [archieClicked, setArchieClicked] = useState(false);
  const [archieReward, setArchieReward] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [archieClickStreak, setArchieClickStreak] = useState(0);
  
  // Function to handle when Archie is clicked
  const handleArchieClick = () => {
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
    
    // Calculate reward with streak bonus
    const baseReward = 25; 
    const randomMultiplier = Math.random() * 0.5 + 0.75; // 0.75 to 1.25
    const streakMultiplier = Math.min(3, 1 + (newStreak - 1) * 0.5); // Max 3x bonus for streaks
    
    const reward = Math.floor(baseReward * randomMultiplier * streakMultiplier);
    
    // Set the reward (will be handled by the game context)
    setArchieReward(reward);
    
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
    } catch (error) {
      console.error('Failed to load Archie click streak:', error);
    }
  }, []);

  return (
    <ArchieContext.Provider value={{ 
      archieClicked, 
      setArchieClicked, 
      archieReward, 
      setArchieReward,
      lastClickTime,
      setLastClickTime,
      archieClickStreak,
      setArchieClickStreak,
      handleArchieClick
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