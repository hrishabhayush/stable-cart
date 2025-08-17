// Amazon Crypto Checkout Extension - TypeScript version
// Content script that runs on Amazon pages

import { paymentModal } from './payment-modal';
import { giftCardHandler } from './gift-card-handler';

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    // Payment methods section selectors
    paymentMethodsSelectors: [
      '[data-testid="payment-method-selector"]',
      '.payment-method-selector',
      '#payment-method-selector',
      '[data-feature-id="payment-method-selector"]',
      '.payment-methods-section',
      '#payment-methods-section'
    ],
    // Button styling to match Amazon's "Place your order" button
    buttonStyles: {
      backgroundColor: '#232F3E',
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '24px',
      fontSize: '12px',
      fontWeight: '400',
      padding: '12px 12px 12px 12px',
      cursor: 'pointer',
      textAlign: 'center',
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      marginBottom: '16px',
      marginTop: '18px',
      height: '34px',
      transition: 'all 0.3s ease',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    },
    // Second button styling (same as first but separate)
    secondButtonStyles: {
      backgroundColor: '#232F3E',
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '24px',
      fontSize: '12px',
      fontWeight: '400',
      padding: '12px 12px 12px 12px',
      cursor: 'pointer',
      textAlign: 'center',
      textDecoration: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      width: '201px',
      height: '34px',
      transition: 'all 0.3s ease',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    }
  };

  // Utility functions
  const utils = {
    // Check if current page is an Amazon page
    isAmazonPage(): boolean {
      return window.location.hostname.includes('amazon');
    },

    // Handle crypto checkout
    handleCryptoCheckout(): void {
      console.log('Crypto checkout initiated');
      
      try {
        // Extract product information from Amazon page
        const productInfo = this.extractProductInfo();
        console.log('Product info extracted:', productInfo);
        
        // Open extension popup instead of modal
        this.openExtensionPopup(productInfo);
      } catch (error) {
        console.error('Error in handleCryptoCheckout:', error);
      }
    },

    // Open extension popup interface
    openExtensionPopup(productInfo: any): void {
      console.log('Opening extension popup...');
      
      // Store product info in chrome storage so popup can access it
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ 
          stablecart_product_info: productInfo 
        }, () => {
          console.log('Product info stored in chrome storage');
        });
      } else {
        // Fallback to localStorage if chrome storage not available
        localStorage.setItem('stablecart_product_info', JSON.stringify(productInfo));
        console.log('Product info stored in localStorage (fallback)');
      }
      
      // Add loading state to checkout buttons
      this.setCheckoutButtonsLoadingState(true);
      
      // Start monitoring popup state
      this.startPopupMonitoring();
      
      // Send message to background script to open popup
      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'openPopup',
          productInfo: productInfo
        });
      } else {
        console.log('Chrome runtime not available, opening popup manually');
        // Fallback: open popup in new window if chrome runtime not available
        this.openPopupInNewWindow(productInfo);
      }
    },

    // Start monitoring popup state
    startPopupMonitoring(): void {
      // Check if popup is still open every 200ms
      const checkInterval = setInterval(() => {
        // Check if popup is still open
        const isPopupOpen = this.isPopupOpen();
        
        if (!isPopupOpen) {
          // Popup is closed, restore button state and stop monitoring
          this.setCheckoutButtonsLoadingState(false);
          clearInterval(checkInterval);
        }
      }, 200);
      
      // Store the interval ID to clear it if needed
      (window as any).popupCheckInterval = checkInterval;
    },

    // Check if popup is currently open
    isPopupOpen(): boolean {
      // Check for various popup indicators
      const popupSelectors = [
        '[data-testid="popup"]',
        '.popup',
        '[role="dialog"]',
        '[id*="popup"]',
        '[class*="popup"]'
      ];
      
      for (const selector of popupSelectors) {
        const elements = document.querySelectorAll(selector);
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          const style = window.getComputedStyle(el);
          if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
            return true;
          }
        }
      }
      
      return false;
    },

    // Set checkout buttons loading state
    setCheckoutButtonsLoadingState(isLoading: boolean): void {
      const buttons = [
        document.getElementById('amazon-crypto-checkout-button'),
        document.getElementById('amazon-crypto-checkout-button-2')
      ];
      
      buttons.forEach(button => {
        if (button) {
          if (isLoading) {
            // Add loading state
            button.style.opacity = '0.6';
            button.style.cursor = 'not-allowed';
            (button as HTMLButtonElement).disabled = true;
            
            // Add animated dots
            const originalText = button.textContent;
            button.setAttribute('data-original-text', originalText || '');
            button.innerHTML = '<span class="loading-dots">...</span>';
            
            // Add CSS for animated dots
            if (!document.getElementById('loading-dots-style')) {
              const style = document.createElement('style');
              style.id = 'loading-dots-style';
              style.textContent = `
                .loading-dots {
                  display: inline-block;
                  font-size: 16px;
                  letter-spacing: 2px;
                }
                
                .loading-dots::after {
                  content: '...';
                  animation: loadingDots 2s ease-in-out infinite;
                  display: inline-block;
                }
                
                @keyframes loadingDots {
                  0%, 100% {
                    transform: translateY(0px);
                  }
                  25% {
                    transform: translateY(-4px);
                  }
                  50% {
                    transform: translateY(0px);
                  }
                  75% {
                    transform: translateY(4px);
                  }
                }
              `;
              document.head.appendChild(style);
            }
          } else {
            // Restore normal state
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            (button as HTMLButtonElement).disabled = false;
            
            // Restore original text
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
              button.textContent = originalText;
            }
          }
        }
      });
    },

    // Check if popup is open and restore button state if closed
    checkPopupState(): void {
      // Listen for popup close events
      const checkPopupClosed = () => {
        // Check if popup is still open by looking for popup elements
        const popupElements = document.querySelectorAll('[id*="popup"], [class*="popup"]');
        const isPopupOpen = Array.from(popupElements).some(el => {
          const computedStyle = window.getComputedStyle(el);
          return computedStyle.display !== 'none' && 
                 computedStyle.visibility !== 'hidden' &&
                 computedStyle.opacity !== '0';
        });
        
        // Also check if the extension popup is still open
        const extensionPopup = document.querySelector('[data-testid="popup"], .popup, [role="dialog"]');
        const isExtensionPopupOpen = extensionPopup && 
                                   window.getComputedStyle(extensionPopup).display !== 'none';
        
        if (!isPopupOpen && !isExtensionPopupOpen) {
          // Popup is closed, restore button state
          this.setCheckoutButtonsLoadingState(false);
          return; // Stop checking
        }
        
        // Continue checking
        setTimeout(checkPopupClosed, 300);
      };
      
      // Start checking after a short delay
      setTimeout(checkPopupClosed, 500);
    },

    // Fallback: open popup in new window
    openPopupInNewWindow(productInfo: any): void {
      const popupUrl = chrome.runtime.getURL('popup.html');
      const popupWindow = window.open(
        popupUrl,
        'stablecart_popup',
        'width=400,height=600,scrollbars=yes,resizable=yes'
      );
      
      if (popupWindow) {
        // Focus the popup window
        popupWindow.focus();
      } else {
        console.error('Failed to open popup window');
      }
    },

    // Get product quantity from Amazon page
    getProductQuantity(): number {
      const quantitySelector = '#lineItemQuantity_bWlxOi8vZG9jdW1lbnQ6MS4wL09yZGVyaW5nL2FtYXpvbjoxLjAvTGluZUl0ZW06MS4wLzUyY2RiOGY1LWM1OGUtNDFhMi1hODJlLTNhN2M4YjkyZTRkZg\\=\\= > div.a-declarative > span:nth-child(2)';
      const quantityElement = document.querySelector(quantitySelector);
      
      if (quantityElement?.textContent) {
        const quantityText = quantityElement.textContent.trim();
        console.log('Found quantity:', quantityText);
        
        // Extract numeric value from quantity text (e.g., "1" -> 1)
        const quantityMatch = quantityText.match(/(\d+)/);
        if (quantityMatch) {
          const quantity = parseInt(quantityMatch[1], 10);
          if (!isNaN(quantity) && quantity > 0) {
            console.log('Successfully extracted quantity:', quantity);
            return quantity;
          }
        }
      }

      console.log('No quantity found, using default quantity 1');
      return 1; // Default quantity
    },

    // Extract product information from current Amazon page
    extractProductInfo() {
      const productTitle = this.getProductTitle();
      const productPrice = this.getProductPrice();
      const productQuantity = this.getProductQuantity();
      const productImage = this.getProductImage();
      const amazonUrl = window.location.href;

      return {
        title: productTitle,
        price: productPrice,
        quantity: productQuantity,
        image: productImage,
        amazonUrl: amazonUrl
      };
    },

    // Get product title from Amazon page
    getProductTitle(): string {
      // First, try the specific selector for checkout item title
      const titleSelector = '#bWlxOi8vZG9jdW1lbnQ6MS4wL09yZGVyaW5nL2FtYXpvbjoxLjAvTGluZUl0ZW06MS4wLzcyNDNjYTBhLWViMGMtNGI2Ny04YzlkLWEwZGQ2MjI2NDM4ZQ\\=\\= > div > span > div.a-row.a-spacing-base.product-image-description-row > div.a-column.a-span8.product-description-column.a-span-last > span';
      const titleElement = document.querySelector(titleSelector);
      
      if (titleElement?.textContent) {
        const title = titleElement.textContent.trim();
        console.log('Found title using specific selector:', title);
        return title;
      }

      // Fallback to other selectors if the specific one doesn't work
      const selectors = [
        '#productTitle',
        'h1[data-automation-id="product-title"]',
        '.product-title',
        'h1.a-size-large',
        '[data-testid="product-title"]'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
          return element.textContent.trim();
        }
      }

      return 'Amazon Product';
    },

    // Get product price from Amazon page
    getProductPrice(): number {
      // First, check if there are gift cards or deductions (look for line item 7)
      const giftCardSelector = '#subtotals-marketplace-table > li:nth-child(6) > span > div > div.order-summary-line-definition';
      const giftCardElement = document.querySelector(giftCardSelector);
      
      // If gift card/deduction exists, use line 7 for total
      if (giftCardElement?.textContent) {
        const totalText = giftCardElement.textContent.trim();
        console.log('Found total with gift cards/deductions:', totalText);
        
        // Extract numeric value from total text (e.g., "$13.65" -> 13.65)
        const totalMatch = totalText.match(/[\$£€]?([\d,]+\.?\d*)/);
        if (totalMatch) {
          const total = parseFloat(totalMatch[1].replace(/,/g, ''));
          if (!isNaN(total) && total > 0) {
            console.log('Successfully extracted total with deductions:', total);
            return total;
          }
        }
      }

      // If no gift cards/deductions, use the standard subtotal (line 4)
      const subtotalSelector = '#subtotals-marketplace-table > li:nth-child(4) > span > div > div.order-summary-line-definition';
      const subtotalElement = document.querySelector(subtotalSelector);
      
      if (subtotalElement?.textContent) {
        const priceText = subtotalElement.textContent.trim();
        console.log('Found price in subtotals table (no deductions):', priceText);
        
        // Extract numeric value from price text (e.g., "$13.65" -> 13.65)
        const priceMatch = priceText.match(/[\$£€]?([\d,]+\.?\d*)/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1].replace(/,/g, ''));
          if (!isNaN(price) && price > 0) {
            console.log('Successfully extracted price (no deductions):', price);
            return price;
          }
        }
      }

      // Fallback to other selectors if the specific ones don't work
      const selectors = [
        '.a-price .a-offscreen',
        '[data-testid="price"] .a-offscreen',
        '.a-price-whole',
        '.a-price-fraction',
        '#corePrice_feature_div .a-price .a-offscreen',
        '.a-price.a-text-price.a-size-medium.apexPriceToPay .a-offscreen'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
          const priceText = element.textContent.replace(/[^0-9.]/g, '');
          const price = parseFloat(priceText);
          if (!isNaN(price) && price > 0) {
            console.log('Found price using fallback selector:', selector, '->', price);
            return price;
          }
        }
      }

      // Final fallback: look for any price-like text
      const priceRegex = /\$(\d+(?:\.\d{2})?)/;
      const bodyText = document.body.textContent || '';
      const match = bodyText.match(priceRegex);
      if (match) {
        const price = parseFloat(match[1]);
        console.log('Found price using regex fallback:', price);
        return price;
      }

      console.log('No price found, using default fallback price');
      return 9.99; // Default fallback price
    },

    // Get product image from Amazon page
    getProductImage(): string | undefined {
      const selectors = [
        '#landingImage',
        '[data-testid="product-image"] img',
        '.a-dynamic-image',
        '#ebooksImgBlkFront img',
        '.itemPhoto img'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLImageElement;
        if (element?.src) {
          return element.src;
        }
      }

      return undefined;
    },

    // Find payment methods section
    findPaymentMethodsSection(): HTMLElement | null {
      const paymentMethodsSelectors = [
        '[data-testid="payment-method-selector"]',
        '.payment-method-selector',
        '#payment-method-selector',
        '[data-feature-id="payment-method-selector"]',
        '.payment-methods-section',
        '#payment-methods-section'
      ];
      
      for (const selector of paymentMethodsSelectors) {
        const section = document.querySelector(selector);
        if (section) return section as HTMLElement;
      }
      
      // Fallback: look for sections containing "Other payment methods" text
      const sections = Array.from(document.querySelectorAll('div, section'));
      for (const section of sections) {
        if (section.textContent && section.textContent.includes('Other payment methods')) {
          return section as HTMLElement;
        }
      }
      
      return null;
    },

    // Create crypto wallet payment method row
    createCryptoWalletRow(): HTMLElement {
      const row = document.createElement('div');
      row.id = 'amazon-crypto-wallet-row';
      row.style.cssText = `
        display: flex;
        align-items: center;
        padding: 12px 16px;
        border: 1px solid #d5d9d9;
        border-radius: 8px;
        margin: 8px 0;
        background-color: #ffffff;
        cursor: pointer;
        transition: all 0.2s ease;
        width: 100%;
        box-sizing: border-box;
      `;

      // Add hover effect
      row.addEventListener('mouseenter', () => {
        row.style.borderColor = '#232F3E';
        row.style.backgroundColor = '#f8f9fa';
      });
      
      row.addEventListener('mouseleave', () => {
        row.style.borderColor = '#d5d9d9';
        row.style.backgroundColor = '#ffffff';
      });

      // Create crypto icon
      const icon = document.createElement('div');
      icon.innerHTML = '₿';
      icon.style.cssText = `
        width: 24px;
        height: 24px;
        background: #232F3E;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
        margin-right: 12px;
        flex-shrink: 0;
      `;

      // Create text content
      const text = document.createElement('div');
      text.style.cssText = `
        flex: 1;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        min-width: 0;
      `;
      
      const title = document.createElement('div');
      title.textContent = 'Checkout with crypto wallet';
      title.style.cssText = `
        font-weight: 600;
        color: #232F3E;
        font-size: 14px;
        margin-bottom: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      `;
      
      const subtitle = document.createElement('div');
      subtitle.textContent = 'Pay with Bitcoin, Ethereum, and other cryptocurrencies';
      subtitle.style.cssText = `
        color: #6c757d;
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      `;
      
      text.appendChild(title);
      text.appendChild(subtitle);

      // Create radio button
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'payment-method';
      radio.id = 'crypto-wallet-radio';
      radio.style.cssText = `
        margin-left: 12px;
        transform: scale(1.2);
        flex-shrink: 0;
      `;

      // Add click handler
      row.addEventListener('click', (e) => {
        if (e.target !== radio) {
          radio.checked = true;
        }
        this.handleCryptoCheckout();
      });

      row.appendChild(icon);
      row.appendChild(text);
      row.appendChild(radio);

      return row;
    },

    // Inject crypto wallet option into payment methods
    injectCryptoWalletOption(): void {
      const paymentSection = this.findPaymentMethodsSection();
      if (paymentSection && !document.getElementById('amazon-crypto-wallet-row')) {
        const cryptoRow = this.createCryptoWalletRow();
        paymentSection.appendChild(cryptoRow);
        console.log('Crypto wallet option injected');
      }
    },

    // Create crypto checkout button
    createCryptoButton(): HTMLElement {
      const button = document.createElement('button');
      button.textContent = 'Checkout with crypto';
      button.id = 'amazon-crypto-checkout-button';
      
      // Apply button styles
      Object.assign(button.style, CONFIG.buttonStyles);

      // Add hover effect
      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = '#1a2532';
        button.style.transform = 'translateY(-1px)';
        button.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = CONFIG.buttonStyles.backgroundColor;
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
      });

      // Add click handler
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleCryptoCheckout();
      });

      // Add test automation button (right-click for testing)
      button.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        console.log('🧪 Test automation triggered via right-click');
        this.testAutomation();
      });

      // Add test payment detection button (middle-click for testing)
      button.addEventListener('auxclick', (e) => {
        if (e.button === 1) { // Middle mouse button
          e.preventDefault();
          console.log('🧪 Test payment detection triggered via middle-click');
          this.testPaymentDetection();
        }
      });

      return button;
    },

    // Create second crypto checkout button (separate styling)
    createSecondCryptoButton(): HTMLElement {
      const button = document.createElement('button');
      button.textContent = 'Checkout with crypto';
      button.id = 'amazon-crypto-checkout-button-2';
      
      // Apply second button styles
      Object.assign(button.style, CONFIG.secondButtonStyles);

      // Add hover effect
      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = '#1a2532';
        button.style.transform = 'translateY(-1px)';
        button.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = CONFIG.secondButtonStyles.backgroundColor;
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
      });

      // Add click handler
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleCryptoCheckout();
      });

      // Add test automation button (right-click for testing)
      button.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        console.log('🧪 Test automation triggered via right-click');
        this.testAutomation();
      });

      // Add test payment detection button (middle-click for testing)
      button.addEventListener('auxclick', (e) => {
        if (e.button === 1) { // Middle mouse button
          e.preventDefault();
          console.log('🧪 Test payment detection triggered via middle-click');
          this.testPaymentDetection();
        }
      });

      return button;
    },

    // Inject checkout button into page
    injectCheckoutButton(): void {
      // Look for the specific subtotals section
      const subtotalsSelector = '#subtotals > div > div';
      const subtotalsSection = document.querySelector(subtotalsSelector);
      
      if (subtotalsSection && !document.getElementById('amazon-crypto-checkout-button')) {
        const button = this.createCryptoButton();
        
        // Insert the button before the subtotals section
        subtotalsSection.parentElement?.insertBefore(button, subtotalsSection);
        console.log('Crypto checkout button injected above subtotals');
        return;
      }
      
      // Fallback: look for other checkout sections if subtotals not found
      const checkoutSelectors = [
        '#checkout-pyo-button-block',
        '#subtotals',
        '.payment-methods-section',
        '[data-testid="checkout-button"]'
      ];

      for (const selector of checkoutSelectors) {
        const section = document.querySelector(selector);
        if (section && !document.getElementById('amazon-crypto-checkout-button')) {
          const button = this.createCryptoButton();
          section.appendChild(button);
          console.log('Crypto checkout button injected (fallback)');
          break;
        }
      }
    },

    // Inject second checkout button between specific selectors
    injectSecondCheckoutButton(): void {
      // Look for the specific checkout button block selectors
      const leftSelector = '#checkout-pyo-button-block > div > div.a-column.a-span12.a-spacing-base.a-ws-span3.a-ws-spacing-none.pyo-block-inline-container-left';
      const rightSelector = '#checkout-pyo-button-block > div > div.a-column.a-span12.a-spacing-none.a-ws-span9.a-ws-spacing-none.pyo-block-inline-container-right.a-span-last.a-ws-span-last';
      
      const leftSection = document.querySelector(leftSelector);
      const rightSection = document.querySelector(rightSelector);
      
      if (leftSection && rightSection && !document.getElementById('amazon-crypto-checkout-button-2')) {
        const button = this.createSecondCryptoButton();
        
        // Create a container div for the button
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
          display: inline-block;
          margin: 0;
          width: auto;
        `;
        buttonContainer.appendChild(button);
        
        // Insert the button container between the left and right sections
        const parentElement = leftSection.parentElement;
        if (parentElement) {
          // Find the index of the right section to insert before it
          const rightIndex = Array.from(parentElement.children).indexOf(rightSection);
          parentElement.insertBefore(buttonContainer, parentElement.children[rightIndex]);
          console.log('Second crypto checkout button injected between checkout sections');
        }
      }
    },

    // Main function to run the extension
    init(): void {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.run());
      } else {
        this.run();
      }
    },

    // Main execution function
    run(): void {
      if (!this.isAmazonPage()) return;

      console.log('🚀 Extension main execution started');

      // Always start payment success listener first (most important)
      console.log('🔍 Starting payment success listener immediately...');
      this.startPaymentSuccessListener();
      console.log('✅ Payment success listener started');

      // Wait for page to load, then inject UI elements
      setTimeout(() => {
        console.log('⏰ Page load timeout completed, injecting elements...');
        this.injectCryptoWalletOption();
        this.injectCheckoutButton();
        this.injectSecondCheckoutButton();
      }, 1000);

      // Watch for dynamic content changes
      this.observePageChanges();
      
      // Listen for popup state changes
      this.listenForPopupStateChanges();
    },

    // Listen for popup state changes via storage
    listenForPopupStateChanges(): void {
      // Listen for changes in localStorage to detect popup close
      window.addEventListener('storage', (e) => {
        if (e.key === 'stablecart_popup_closed') {
          // Popup was closed, restore button state
          this.setCheckoutButtonsLoadingState(false);
        }
      });
      
      // Listen for messages from background script
      if (chrome && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          if (message.action === 'popupClosed') {
            console.log('Popup closed message received');
            this.setCheckoutButtonsLoadingState(false);
          }
        });
      }
      
      // Listen for window focus/blur events to detect popup close
      window.addEventListener('blur', () => {
        // When window loses focus, check if popup is still open
        setTimeout(() => {
          this.checkPopupState();
        }, 100);
      });
      
      // Also check periodically for popup state
      this.checkPopupState();
    },

    // Observe page changes for dynamic content
    observePageChanges(): void {
      const observer = new MutationObserver(() => {
        if (this.shouldReinject()) {
          setTimeout(() => {
            if (this.isAmazonPage()) {
              this.injectCryptoWalletOption();
              this.injectCheckoutButton();
              this.injectSecondCheckoutButton(); // Added this line
            }
          }, 500);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    },

    // Check if we need to inject elements again
    shouldReinject(): boolean {
      return !document.getElementById('amazon-crypto-wallet-row') ||
             !document.getElementById('amazon-crypto-checkout-button') ||
             !document.getElementById('amazon-crypto-checkout-button-2');
    },

    // Gift Card Automation - Your Bookmark JavaScript
    async executeGiftCardAutomation(orderId?: string): Promise<boolean> {
      try {
        console.log('🎁 Amazon Gift Card Automation Starting...');
        
        // Get real gift card codes from backend instead of generating random ones
        let giftCardCodes: string[] = [];
        if (orderId && orderId !== 'test-order-123') {
          try {
            console.log(' Fetching real gift card codes from backend...');
            const response = await fetch(`http://localhost:3001/api/checkout-sessions/${orderId}/gift-codes`);
            if (response.ok) {
              const data = await response.json();
              giftCardCodes = data.giftCodes.map((gc: any) => gc.code);
              console.log(`✅ Retrieved ${giftCardCodes.length} real gift card codes`);
            } else {
              console.log('⚠️ Failed to get gift card codes from backend, falling back to test mode');
            }
          } catch (error) {
            console.log('⚠️ Error fetching gift card codes, falling back to test mode:', error);
          }
        }
        
        // Fallback to test mode if no real codes available
        if (giftCardCodes.length === 0) {
          console.log('🧪 Test mode: Using random gift card code');
          giftCardCodes = [this.generateGiftCardCode()];
        }
        
        const giftCardCode = giftCardCodes[0];
        console.log(`🎁 Using gift card code: ${giftCardCode}`);
        
        // Find the gift card input field
        const giftCardInput = document.querySelector('input[name="ppw-claimCode"]') as HTMLInputElement;
        if (!giftCardInput) {
          console.log('❌ Gift card input not found. Make sure you\'re on checkout page and gift card section is expanded.');
          return false;
        }
        console.log('✅ Found gift card input field');
        
        // Find the apply button
        const applyButton = document.querySelector('input[name="ppw-claimCodeApplyPressed"]') as HTMLInputElement;
        if (!applyButton) {
          console.log('❌ Apply button not found. Make sure gift card section is expanded.');
          return false;
        }
        console.log('✅ Found apply button');
        
        // Find the checkout button
        const checkoutButton = document.querySelector('#checkout-primary-continue-button-id') as HTMLButtonElement;
        if (!checkoutButton) {
          console.log('❌ Checkout button not found. Make sure you\'re on checkout page.');
          return false;
        }
        console.log('✅ Found checkout button');
        
        // Fill in the gift card code
        console.log('📝 Filling in gift card code...');
        giftCardInput.focus();
        giftCardInput.select();
        giftCardInput.value = giftCardCode;
        giftCardInput.dispatchEvent(new Event('input', { bubbles: true }));
        giftCardInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('✅ Gift card code entered');
        
        // Wait a moment before clicking apply
        await this.delay(1000);
        
        // Click the apply button
        console.log('🖱️ Clicking apply button...');
        applyButton.click();
        console.log('✅ Apply button clicked');
        
        // Wait for gift card to apply
        await this.delay(3000);
        
        // Check if gift card was applied successfully
        const successMessage = document.querySelector('.a-alert-success, .a-alert-content, [data-testid="gift-card-success"]');
        const errorMessage = document.querySelector('.a-alert-error, .a-alert-warning, [data-testid="gift-card-error"]');
        
        if (successMessage) {
          console.log('✅ Gift card applied successfully!');
          console.log('Message:', successMessage.textContent?.trim());
        } else if (errorMessage) {
          console.log('❌ Gift card application failed:');
          console.log('Error:', errorMessage.textContent?.trim());
          return false;
        } else {
          console.log('⚠️ Gift card application status unclear');
        }
        
        // Click the checkout button
        console.log('🛒 Clicking checkout button...');
        checkoutButton.click();
        console.log('✅ Checkout button clicked');
        console.log('🎉 Automation completed!');
        
        return true;
        
      } catch (error) {
        console.error('💥 Error during automation:', error);
        return false;
      }
    },

    // Payment Success Listener - Automatically triggers automation
    startPaymentSuccessListener(): void {
      console.log('🔍 Starting payment success listener...');
      
      // Listen for payment success messages from webapp
      window.addEventListener('message', (event) => {
        console.log('📨 Message received:', event.origin, event.data);
        
        // Check if this is a payment success message from any origin
        if (event.data && event.data.type === 'PAYMENT_SUCCESS') {
          console.log('💰 Payment success detected! Transaction:', event.data.transactionHash);
          this.handlePaymentSuccess(event.data);
          return;
        }

        // Also check for payment success in the data object
        if (event.data && event.data.data && event.data.data.type === 'PAYMENT_SUCCESS') {
          console.log('💰 Payment success detected in nested data! Transaction:', event.data.data.transactionHash);
          this.handlePaymentSuccess(event.data.data);
          return;
        }

        // Log other messages for debugging but don't ignore them
        if (event.data && typeof event.data === 'object') {
          console.log('📨 Message data:', event.data);
        }
      });

      // Listen for storage changes (primary method for cross-tab communication)
      window.addEventListener('storage', (e) => {
        console.log('💾 Storage change detected:', e.key, e.newValue);
        if (e.key === 'stablecart_payment_success') {
          try {
            const paymentData = JSON.parse(e.newValue || '{}');
            if (paymentData.type === 'PAYMENT_SUCCESS' && paymentData.timestamp) {
              console.log('💰 Payment success detected via storage event!', paymentData);
              this.handlePaymentSuccess(paymentData);
            }
          } catch (error) {
            console.error('❌ Error parsing storage event data:', error);
          }
        }
      });

      // Also listen for storage changes in the same tab (for direct communication)
      const originalSetItem = localStorage.setItem;
      const originalRemoveItem = localStorage.removeItem;
      
      // Override localStorage.setItem to catch local changes
      localStorage.setItem = function(key, value) {
        if (key === 'stablecart_payment_success') {
          try {
            const paymentData = JSON.parse(value as string);
            if (paymentData.type === 'PAYMENT_SUCCESS' && paymentData.timestamp) {
              console.log('💰 Payment success detected via local storage change!', paymentData);
              // Dispatch a custom event to trigger the handler
              window.dispatchEvent(new CustomEvent('stablecart_payment_success', { detail: paymentData }));
            }
          } catch (error) {
            console.error('❌ Error parsing local storage data:', error);
          }
        }
        return originalSetItem.call(this, key, value);
      };
      
      // Listen for custom payment success events
      window.addEventListener('stablecart_payment_success', (event: any) => {
        console.log('💰 Payment success detected via custom event!', event.detail);
        this.handlePaymentSuccess(event.detail);
      });

      // Poll for payment success (additional fallback)
      this.startPaymentPolling();
      
      // Check for existing payment data immediately
      this.checkForExistingPaymentData();
      
      // Add keyboard shortcut for testing (Ctrl+Shift+A)
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
          console.log('🧪 Keyboard shortcut triggered: Ctrl+Shift+A');
          this.testPaymentDetection();
        }
      });
    },

    // Handle payment success
    async handlePaymentSuccess(paymentData: any): Promise<void> {
      try {
        console.log('🚀 Processing payment success, starting automation...');
        
        // Show success notification
        this.showPaymentSuccessNotification(paymentData.transactionHash);
        
        // Wait a moment for page to be ready
        await this.delay(2000);
        
        // Execute gift card automation
        const success = await this.executeGiftCardAutomation(paymentData.orderId || 'unknown');
        
        if (success) {
          console.log('🎉 Complete automation flow successful!');
          this.showSuccessNotification('Gift card automation completed successfully!');
        } else {
          console.log('❌ Automation failed, showing error');
          this.showAutomationError('Gift card automation failed');
        }
        
      } catch (error) {
        console.error('💥 Error handling payment success:', error);
        this.showAutomationError('Failed to process payment success');
      }
    },

    // Start payment polling (fallback method)
    startPaymentPolling(): void {
      console.log('🔄 Starting payment polling every 3 seconds...');
      
      // Check for payment success every 3 seconds
      setInterval(async () => {
        try {
          // Method 1: Check local localStorage
          const paymentData = localStorage.getItem('stablecart_payment_success');
          if (paymentData) {
            const parsed = JSON.parse(paymentData);
            if (parsed.timestamp && Date.now() - parsed.timestamp < 30000) { // Within 30 seconds
              console.log('💰 Payment success detected via local polling!', parsed);
              localStorage.removeItem('stablecart_payment_success'); // Clear after use
              await this.handlePaymentSuccess(parsed);
              return;
            }
          }

          // Method 2: Check sessionStorage
          const sessionPaymentData = sessionStorage.getItem('stablecart_payment_success');
          if (sessionPaymentData) {
            const parsed = JSON.parse(sessionPaymentData);
            if (parsed.timestamp && Date.now() - parsed.timestamp < 30000) {
              console.log('💰 Payment success detected via session polling!', parsed);
              sessionStorage.removeItem('stablecart_payment_success');
              await this.handlePaymentSuccess(parsed);
              return;
            }
          }

          // Method 3: Check for any recent payment data in multiple storage locations
          const allKeys = Object.keys(localStorage);
          const paymentKeys = allKeys.filter(key => key.includes('stablecart') && key.includes('payment'));
          
          for (const key of paymentKeys) {
            try {
              const data = localStorage.getItem(key);
              if (data) {
                const parsed = JSON.parse(data);
                if (parsed.timestamp && Date.now() - parsed.timestamp < 30000) {
                  console.log('💰 Payment success detected via key search!', key, parsed);
                  localStorage.removeItem(key);
                  await this.handlePaymentSuccess(parsed);
                  return;
                }
              }
            } catch (e) {
              console.log('⚠️ Error parsing payment data from key:', key, e);
            }
          }

        } catch (error) {
          console.error('❌ Error in payment polling:', error);
        }
      }, 3000); // Check every 3 seconds for faster response
      
      console.log('✅ Payment polling started with enhanced detection');
    },

    // Show payment success notification
    showPaymentSuccessNotification(txHash: string): void {
      const successDiv = document.createElement('div');
      successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 300px;
      `;
      successDiv.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">💰 Payment Successful!</div>
        <div style="font-size: 12px; opacity: 0.9;">Starting gift card automation...</div>
        <div style="font-size: 10px; opacity: 0.7; margin-top: 4px;">TX: ${txHash.slice(0, 8)}...${txHash.slice(-6)}</div>
      `;

      document.body.appendChild(successDiv);
      setTimeout(() => successDiv.remove(), 8000);
    },

    // Show success notification
    showSuccessNotification(message: string): void {
      const successDiv = document.createElement('div');
      successDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      `;
      successDiv.textContent = message;

      document.body.appendChild(successDiv);
      setTimeout(() => successDiv.remove(), 5000);
    },

    // Show automation error to user
    showAutomationError(message: string): void {
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      `;
      errorDiv.textContent = `Automation Error: ${message}`;

      document.body.appendChild(errorDiv);
      setTimeout(() => errorDiv.remove(), 5000);
    },

    // Utility delay function
    delay(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Generate a random gift card code (for test mode)
    generateGiftCardCode(): string {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 10; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      return code;
    },

    // Test automation (manual trigger for testing)
    testAutomation(): void {
      console.log('🧪 Testing gift card automation...');
      this.executeGiftCardAutomation('test-order-123');
    },

    // Check for existing payment data immediately
    checkForExistingPaymentData(): void {
      console.log('🔍 Checking for existing payment data...');
      
      try {
        // Check localStorage
        const paymentData = localStorage.getItem('stablecart_payment_success');
        if (paymentData) {
          const parsed = JSON.parse(paymentData);
          if (parsed.timestamp && Date.now() - parsed.timestamp < 30000) { // Within 30 seconds
            console.log('💰 Found existing payment data in localStorage:', parsed);
            localStorage.removeItem('stablecart_payment_success'); // Clear after use
            this.handlePaymentSuccess(parsed);
            return;
          }
        }

        // Check sessionStorage
        const sessionPaymentData = sessionStorage.getItem('stablecart_payment_success');
        if (sessionPaymentData) {
          const parsed = JSON.parse(sessionPaymentData);
          if (parsed.timestamp && Date.now() - parsed.timestamp < 30000) {
            console.log('💰 Found existing payment data in sessionStorage:', parsed);
            sessionStorage.removeItem('stablecart_payment_success');
            this.handlePaymentSuccess(parsed);
            return;
          }
        }

        console.log('📭 No existing payment data found');
      } catch (error) {
        console.error('❌ Error checking existing payment data:', error);
      }
    },

    // Test function to simulate payment success (for testing automation)
    testPaymentDetection(): void {
      console.log('🧪 Testing payment detection...');
      
      const testPaymentData = {
        type: 'PAYMENT_SUCCESS',
        transactionHash: '0x' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        timestamp: Date.now(),
        orderId: `test-order-${Date.now()}`
      };
      
      // Store test payment data in localStorage
      localStorage.setItem('stablecart_payment_success', JSON.stringify(testPaymentData));
      console.log('✅ Test payment data stored:', testPaymentData);
      
      // Show notification
      this.showPaymentSuccessNotification(testPaymentData.transactionHash);
      
      // Automatically trigger automation after a short delay
      setTimeout(async () => {
        console.log('🚀 Auto-triggering automation from test...');
        await this.handlePaymentSuccess(testPaymentData);
      }, 1000);
    }
  };

      // Initialize the extension
    utils.init();
    
    // Initialize gift card handler
    giftCardHandler.init();
  })();
