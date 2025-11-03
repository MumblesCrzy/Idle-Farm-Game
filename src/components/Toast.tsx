import { useEffect, memo } from 'react';
import './Toast.css';

interface ToastProps {
  message: string;
  duration?: number; // Duration in milliseconds
  type?: 'success' | 'error' | 'info';
  visible: boolean;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = memo(({ 
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
    <div className={`toast toast-${type} ${visible ? 'show' : ''}`} onClick={onClose}>
      <div className="toast-content">
        <span className="toast-icon">
          {type === 'success' && '✓'}
          {type === 'error' && '✗'}
          {type === 'info' && 'ℹ️'}
        </span>
        <span className="toast-message">{message}</span>
      </div>
      <div className="toast-progress">
        <div className="toast-progress-bar" style={{ animationDuration: `${duration}ms` }} />
      </div>
    </div>
  );
});

Toast.displayName = 'Toast';

export default Toast;