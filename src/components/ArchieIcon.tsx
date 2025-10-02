import { useEffect, useState } from 'react';
import RandomIcon from './RandomIcon';
import { useArchie } from '../context/ArchieContext';
import Toast from './Toast';

interface ArchieIconProps {
  setMoney: (value: React.SetStateAction<number>) => void;
}

const ARCHIE_COOLDOWN = 5 * 60 * 1000; // 5 minutes in milliseconds

const ArchieIcon: React.FC<ArchieIconProps> = ({ setMoney }) => {
  const { lastClickTime, handleArchieClick, archieReward, setArchieReward, archieClickStreak } = useArchie();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // When archieReward changes (i.e., Archie is clicked), add the reward to money
  useEffect(() => {
    if (archieReward > 0) {
      // Add the reward to player's money
      setMoney(prevMoney => prevMoney + archieReward);
      
      // Show toast notification with streak info
      const streakMessage = archieClickStreak > 1 ? ` (${archieClickStreak}x streak!)` : '';
      setToastMessage(`Found Archie! +$${archieReward}${streakMessage}`);
      setShowToast(true);
      
      // Reset the reward
      setArchieReward(0);
    }
  }, [archieReward, setMoney, setArchieReward]);
  
  // Check if cooldown has passed
  const currentTime = Date.now();
  const timeSinceLastClick = currentTime - lastClickTime;
  const canAppear = timeSinceLastClick >= ARCHIE_COOLDOWN;
  
  return (
    <>
      {canAppear && (
        <RandomIcon
          imagePath="./Archie.png"
          minInterval={30000} // 30 seconds minimum before appearing
          maxInterval={120000} // 2 minutes maximum before appearing
          duration={180000} // Stays visible for 3 minutes
          reward={handleArchieClick}
        />
      )}
      
      <Toast 
        message={toastMessage} 
        type="success" 
        visible={showToast} 
        duration={4000}
        onClose={() => setShowToast(false)} 
      />
    </>
  );
};

export default ArchieIcon;