// Background script for StableCart Chrome Extension
// Handles popup opening and other background tasks

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);
  
  if (message.action === 'openPopup') {
    console.log('Opening popup with product info:', message.productInfo);
    
    // Store product info in chrome storage for popup access
    chrome.storage.local.set({ 
      stablecart_product_info: message.productInfo 
    }, () => {
      console.log('Product info stored in chrome storage');
    });
    
    // Open the popup programmatically
    chrome.action.openPopup();
    
    sendResponse({ success: true });
  }
  
  return true; // Keep message channel open for async response
});

// Listen for popup close events
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    port.onDisconnect.addListener(() => {
      console.log('Popup disconnected, notifying content script');
      // Notify content script that popup is closed
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'popupClosed' });
        }
      });
    });
  }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('StableCart extension installed');
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('StableCart extension started');
}); 