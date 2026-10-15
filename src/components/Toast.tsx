import { useEffect, memo, type FC } from 'react';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  duration?: number; // Duration in milliseconds
  type?: 'success' | 'error' | 'info';
  visible: boolean;
  onClose: () => void;
}

const Toast: FC<ToastProps> = memo(({
  message, 
  duration = 3000, 
  type = 'success', 
  visible, 
  onClose 
}) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);
  
  if (!visible) return null;
  
  return (
    <div className={`${styles.toast} ${styles[type]} ${styles.show}`} onClick={onClose}>
      <div className={styles.content}>
        <span className={styles.icon}>
          {type === 'success' && '✓'}
          {type === 'error' && '✗'}
          {type === 'info' && 'ℹ️'}
        </span>
        <span className={styles.message}>{message}</span>
      </div>
      <div className={styles.progress}>
        <div className={styles.progressBar} style={{ animationDuration: `${duration}ms` }} />
      </div>
    </div>
  );
});

Toast.displayName = 'Toast';

export default Toast;