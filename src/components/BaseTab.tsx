import React from 'react';

interface BaseTabProps {
  isUnlocked: boolean;
  isLoading?: boolean;
  loadingMessage?: string;
  mainContent: React.ReactNode;
  sidebarContent?: React.ReactNode;
  sidebarStyle?: React.CSSProperties;
  mainContentStyle?: React.CSSProperties;
}

const BaseTab: React.FC<BaseTabProps> = ({
  isUnlocked,
  isLoading = false,
  loadingMessage = 'Loading...',
  mainContent,
  sidebarContent,
  sidebarStyle = {},
  mainContentStyle = {}
}) => {
  // Don't render if feature is not unlocked
  if (!isUnlocked) {
    return null;
  }

  // Show loading state if feature is unlocked but not ready
  if (isLoading) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        minHeight: '500px',
        minWidth: '1450px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p>{loadingMessage}</p>
      </div>
    );
  }

  // Default sidebar style - can be overridden
  const defaultSidebarStyle: React.CSSProperties = {
    width: '250px',
    borderRadius: '8px',
    padding: '1rem',
    height: 'fit-content',
    ...sidebarStyle
  };

  // Default main content style - can be overridden
  const defaultMainContentStyle: React.CSSProperties = {
    flex: 1,
    ...mainContentStyle
  };

  return (
    <div style={{ 
      display: 'flex', 
      gap: '2rem', 
      alignItems: 'flex-start', 
      minHeight: '800px', 
      minWidth: '1400px', 
      marginTop: '0' 
    }}>
      {/* Main Content */}
      <div style={defaultMainContentStyle}>
        {mainContent}
      </div>

      {/* Sidebar - only render if content is provided */}
      {sidebarContent && (
        <div style={defaultSidebarStyle}>
          {sidebarContent}
        </div>
      )}
    </div>
  );
};

export default BaseTab;