import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChatWidget } from '../components/Chat/ChatWidget';
import '../index.css'; // Ensure styles are included

/**
 * BritSync BritC Widget Loader
 * This script initializes the AI assistant widget on any external website.
 */

const initBritCWidget = () => {
  // 1. Create container if it doesn't exist
  const containerId = 'britsync-britc-widget';
  let container = document.getElementById(containerId);
  
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    document.body.appendChild(container);
  }

  // 2. Get configuration from window object if provided
  const config = (window as Window & { BritCConfig?: { businessName: string } }).BritCConfig || {
    businessName: 'BritSync Partner'
  };

  // 3. Render the widget
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ChatWidget businessName={config.businessName} />
    </React.StrictMode>
  );

  console.log('🚀 BritSync BritC Widget initialized');
};

// Auto-initialize when script loads
if (document.readyState === 'complete') {
  initBritCWidget();
} else {
  window.addEventListener('load', initBritCWidget);
}
