import { useState, useEffect } from 'react';

interface RandomIconProps {
  imagePath: string;
  minInterval: number; // Minimum time in ms before reappearing
  maxInterval?: number; // Optional: Maximum time in ms before reappearing (creates randomness)
  duration?: number; // Optional: How long the icon stays visible in ms
  reward?: () => void; // Optional: Function to call when clicked (e.g., give reward)
}

/**
 * RandomIcon - A component that displays a clickable icon at random positions
 * on the screen at random intervals.
 */
const RandomIcon: React.FC<RandomIconProps> = ({ 
  imagePath, 
  minInterval, 
  maxInterval = minInterval * 2, 
  duration = 10000, 
  reward = () => {} 
}) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Function to get a random position on screen (with margins)
  const getRandomPosition = () => {
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate safe area (80% of viewport to avoid edges)
    const safeWidth = viewportWidth * 0.8;
    const safeHeight = viewportHeight * 0.8;
    
    // Calculate offsets (10% on each side)
    const offsetX = viewportWidth * 0.1;
    const offsetY = viewportHeight * 0.1;
    
    return { 
      x: Math.floor(Math.random() * safeWidth) + offsetX, 
      y: Math.floor(Math.random() * safeHeight) + offsetY 
    };
  };
  
  // Handle icon click
  const handleClick = () => {
    setVisible(false);
    reward();
  };
  
  useEffect(() => {
    let appearanceTimer: number | null = null;
    let hideTimer: number | null = null;
    let isActive = true;
    
    const scheduleNextAppearance = () => {
      if (!isActive) return;
      
      // Calculate random interval within specified range
      const nextInterval = Math.random() * (maxInterval - minInterval) + minInterval;
      
        appearanceTimer = setTimeout(() => {
        if (!isActive) return;
        
        // Generate random position and show
        const newPosition = getRandomPosition();
        setPosition(newPosition);
        console.log('RandomIcon: Showing icon at position', newPosition);
        setVisible(true);        // Schedule hiding after duration
        hideTimer = setTimeout(() => {
          if (!isActive) return;
          setVisible(false);
          // Schedule next appearance
          scheduleNextAppearance();
        }, duration);
      }, nextInterval);
    };
    
    // Start the cycle with initial delay
    const initialDelay = Math.random() * (maxInterval - minInterval) + minInterval;
    appearanceTimer = setTimeout(() => {
      if (!isActive) return;
      
      const newPosition = getRandomPosition();
      setPosition(newPosition);
      console.log('RandomIcon: Initial show at position', newPosition);
      setVisible(true);
      
      hideTimer = setTimeout(() => {
        if (!isActive) return;
        setVisible(false);
        scheduleNextAppearance();
      }, duration);
    }, initialDelay);
    
    // Cleanup function
    return () => {
      isActive = false;
      if (appearanceTimer) clearTimeout(appearanceTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [minInterval, maxInterval, duration]);
  
  // Only render when visible
  if (!visible) return null;
  
  return (
    <div 
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: 'pointer',
        zIndex: 1000,
        animation: 'pop-in 0.3s ease-out',
      }}
      onClick={handleClick}
    >
      <img 
        src={imagePath} 
        alt="Random Icon" 
        className="random-icon"
        style={{
          width: '80px',
          height: '80px',
          objectFit: 'contain',
          filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))',
          transition: 'transform 0.2s, filter 0.3s',
          animation: 'bounce 1.2s infinite alternate ease-in-out',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.filter = 'drop-shadow(0 0 15px gold)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.filter = 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))';
        }}
      />
    </div>
  );
};

export default RandomIcon;