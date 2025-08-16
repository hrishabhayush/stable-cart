// Popup script for Amazon Crypto Checkout Extension

document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on an Amazon page
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    const isAmazonPage = currentTab.url && currentTab.url.includes('amazon');
    
    const statusText = document.getElementById('status-text');
    
    if (statusText) {
      if (isAmazonPage) {
        statusText.textContent = 'Currently on Amazon. Navigate to a checkout page to see the crypto button.';
        statusText.style.color = '#28a745';
      } else {
        statusText.textContent = 'Navigate to Amazon to use this extension.';
        statusText.style.color = '#6c757d';
      }
    }
  });
}); 