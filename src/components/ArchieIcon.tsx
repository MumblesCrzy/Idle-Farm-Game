import { useEffect, useState } from 'react';
import RandomIcon from './RandomIcon';
import { useArchie } from '../context/ArchieContext';
import Toast from './Toast';
import { SPECIAL_ARCHIE, SPECIAL_ARCHIE_PINECONES } from '../config/assetPaths';

interface ArchieIconProps {
  setMoney: (value: React.SetStateAction<number>) => void;
  money: number;
  experience: number;
  totalPlotsUsed: number;
  isChristmasEventActive?: boolean;
  christmasTreesSold?: number;
  earnCheer?: (amount: number) => void;
}

const ARCHIE_COOLDOWN = 5 * 60 * 1000; // 5 minutes in milliseconds

const ArchieIcon: React.FC<ArchieIconProps> = ({ 
  setMoney, 
  money, 
  experience, 
  totalPlotsUsed, 
  isChristmasEventActive = false,
  christmasTreesSold = 0,
  earnCheer
}) => {
  const { lastClickTime, handleArchieClick, handleArchieAppear, archieReward, setArchieReward, archieClickStreak, archieCheerReward, setArchieCheerReward } = useArchie();
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
  }, [archieReward, setMoney, setArchieReward, archieClickStreak]);
  
  // When archieCheerReward changes (during Christmas event), add Holiday Cheer
  useEffect(() => {
    if (archieCheerReward > 0 && earnCheer) {
      // Add the reward to Holiday Cheer
      earnCheer(archieCheerReward);
      
      // Show toast notification with streak info
      const streakMessage = archieClickStreak > 1 ? ` (${archieClickStreak}x streak!)` : '';
      setToastMessage(`Found Archie! +${archieCheerReward} Holiday Cheer${streakMessage} 🎄`);
      setShowToast(true);
      
      // Reset the reward
      setArchieCheerReward(0);
    }
  }, [archieCheerReward, earnCheer, setArchieCheerReward, archieClickStreak]);
  
  // Check if cooldown has passed
  const currentTime = Date.now();
  const timeSinceLastClick = currentTime - lastClickTime;
  const canAppear = timeSinceLastClick >= ARCHIE_COOLDOWN;

  // Use pinecones image during Christmas event, otherwise use default Archie
  const archieImage = isChristmasEventActive ? SPECIAL_ARCHIE_PINECONES : SPECIAL_ARCHIE;
  
  return (
    <>
      {canAppear && (
        <RandomIcon
          imagePath={archieImage}
          minInterval={30000} // 30 seconds minimum before appearing
          maxInterval={120000} // 2 minutes maximum before appearing
          duration={180000} // Stays visible for 3 minutes
          reward={() => handleArchieClick({ 
            money, 
            experience, 
            totalPlotsUsed, 
            isChristmasEventActive,
            christmasTreesSold 
          })}
          onAppear={handleArchieAppear}
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