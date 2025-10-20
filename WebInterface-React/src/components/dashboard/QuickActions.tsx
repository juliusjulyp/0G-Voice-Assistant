import React, { useRef } from 'react';
import { apiService } from '../../services/api';
import { ActivityItem } from '../../types';

interface QuickActionsProps {
  addActivity: (activity: Omit<ActivityItem, 'id'>) => void;
  notificationHook: {
    addNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  };
}

const QuickActions: React.FC<QuickActionsProps> = ({
  addActivity,
  notificationHook
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConnectWallet = async () => {
    notificationHook.addNotification('Connecting wallet...', 'info');
    
    try {
      const result = await apiService.initializeUser();
      if (result.success) {
        notificationHook.addNotification('Wallet connected successfully', 'success');
        addActivity({
          type: 'network',
          text: 'Wallet connected',
          time: 'Just now',
          icon: 'fas fa-wallet'
        });
      }
    } catch (error) {
      notificationHook.addNotification('Failed to connect wallet', 'error');
    }
  };

  const handleCheckBalance = async () => {
    notificationHook.addNotification('Checking balance...', 'info');
    
    try {
      const result = await apiService.getBalance();
      if (result.success) {
        const balance = (result.data as { balance?: string })?.balance || '0';
        notificationHook.addNotification(`Balance: ${balance} 0G`, 'success');
        addActivity({
          type: 'network',
          text: `Balance checked: ${balance} 0G`,
          time: 'Just now',
          icon: 'fas fa-coins'
        });
      }
    } catch (error) {
      notificationHook.addNotification('Failed to check balance', 'error');
    }
  };

  const handleUploadToStorage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    notificationHook.addNotification('Uploading to 0G Storage...', 'info');

    try {
      const result = await apiService.uploadFile(file);
      if (result.success) {
        notificationHook.addNotification('File uploaded successfully', 'success');
        addActivity({
          type: 'storage',
          text: `File uploaded: ${file.name}`,
          time: 'Just now',
          icon: 'fas fa-upload'
        });
      }
    } catch (error) {
      notificationHook.addNotification('Upload failed', 'error');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeployContract = () => {
    notificationHook.addNotification('Contract deployment feature coming soon!', 'info');
  };

  return (
    <div className="quick-actions">
      <h3>Quick Actions</h3>
      <div className="actions-grid">
        <button className="action-btn" onClick={handleConnectWallet}>
          <i className="fas fa-wallet"></i>
          Connect Wallet
        </button>
        
        <button className="action-btn" onClick={handleCheckBalance}>
          <i className="fas fa-coins"></i>
          Check Balance
        </button>
        
        <button className="action-btn" onClick={handleUploadToStorage}>
          <i className="fas fa-upload"></i>
          Upload to Storage
        </button>
        
        <button className="action-btn" onClick={handleDeployContract}>
          <i className="fas fa-rocket"></i>
          Deploy Contract
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default QuickActions;