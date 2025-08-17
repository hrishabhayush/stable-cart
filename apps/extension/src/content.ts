// Amazon Crypto Checkout Extension - TypeScript version
// Content script that runs on Amazon pages

import { paymentModal } from './payment-modal';
import { giftCardHandler } from './gift-card-handler';
import { PaymentMonitor } from './payment-monitor';

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
        
        // Start monitoring for payment when user returns
        this.startPaymentMonitoring();
      } catch (error) {
        console.error('Error in handleCryptoCheckout:', error);
      }
    },

    // Start payment monitoring when user returns from payment webapp
    startPaymentMonitoring(): void {
      console.log('🔍 Setting up simplified payment monitoring (20 second auto-trigger)...');
      
      // Set up a listener for when user returns to Amazon (window focus)
      const handleWindowFocus = () => {
        console.log('👁️ Window focused - user returned to Amazon');
        
        // Check if we have a wallet address or payment completion signal
        const storedWalletAddress = localStorage.getItem('stablecart_user_wallet');
        const paymentCompleted = localStorage.getItem('stablecart_payment_completed');
        
        if (storedWalletAddress || paymentCompleted) {
          console.log('💰 Payment webapp was visited, starting 20-second countdown...');
          
          this.showCountdownMessage();
          
          // Trigger gift card automation immediately
          setTimeout(() => {
            this.triggerGiftCardAutomation();
          }, 100); // Just a tiny delay to show the message
          
          // Clean up
          localStorage.removeItem('stablecart_user_wallet');
          localStorage.removeItem('stablecart_payment_completed');
          
          // Remove this event listener since we only need it once
          window.removeEventListener('focus', handleWindowFocus);
        } else {
          console.log('ℹ️ No payment signals found in storage');
        }
      };

      // Listen for window focus (when user returns to Amazon)
      window.addEventListener('focus', handleWindowFocus);
      
      // Also listen for storage changes (in case payment webapp sets wallet address)
      window.addEventListener('storage', (e) => {
        if (e.key === 'stablecart_payment_completed' && e.newValue === 'true') {
          console.log('💳 Payment completion signal received via storage');
          
          this.showCountdownMessage();
          
          // Trigger gift card automation immediately
          setTimeout(() => {
            this.triggerGiftCardAutomation();
          }, 100); // Just a tiny delay to show the message
          
          // Clean up
          localStorage.removeItem('stablecart_user_wallet');
          localStorage.removeItem('stablecart_payment_completed');
        }
      });
    },

    // Show processing message to user
    showCountdownMessage(): void {
      const messageDiv = document.createElement('div');
      messageDiv.id = 'stablecart-countdown';
      messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #007bff;
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 300px;
        text-align: center;
      `;
      
      messageDiv.innerHTML = `
        <div style="margin-bottom: 8px;">🎁 Payment detected!</div>
        <div style="font-size: 14px;">Applying gift cards now...</div>
      `;
      
      document.body.appendChild(messageDiv);
    },

    // Trigger gift card automation directly
    triggerGiftCardAutomation(): void {
      console.log('🎁 Triggering gift card automation (simplified version)...');
      
      try {
        // Create automation data with mock gift codes
        const automationData = {
          type: 'GIFT_CARD_AUTOMATION',
          sessionId: `session_${Date.now()}`,
          amazonUrl: window.location.href,
          giftCodes: [
            {
              code: 'DEMO-GIFT-CODE-001',
              denomination: 1, // $0.01 in cents
              status: 'ACTIVE'
            }
          ],
          totalAmount: 0.01,
          transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`, // Mock hash
          timestamp: Date.now()
        };

        console.log('🎯 Sending automation data:', automationData);

        // Store in localStorage for gift card handler to pick up
        localStorage.setItem('stablecart_gift_card_automation', JSON.stringify(automationData));

        // Also dispatch custom event
        window.dispatchEvent(new CustomEvent('giftCardAutomation', {
          detail: automationData
        }));

        // Also try postMessage
        window.postMessage(automationData, '*');

        console.log('✅ Gift card automation triggered successfully!');
        
        // Update countdown message
        const messageDiv = document.getElementById('stablecart-countdown');
        if (messageDiv) {
          messageDiv.style.background = '#28a745';
          messageDiv.innerHTML = `
            <div style="margin-bottom: 8px;">✅ Gift cards activated!</div>
            <div style="font-size: 14px;">Check your cart for applied gift cards</div>
          `;
          
          setTimeout(() => {
            if (messageDiv.parentNode) {
              messageDiv.parentNode.removeChild(messageDiv);
            }
          }, 5000);
        }

      } catch (error) {
        console.error('❌ Error triggering gift card automation:', error);
        
        const messageDiv = document.getElementById('stablecart-countdown');
        if (messageDiv) {
          messageDiv.style.background = '#dc3545';
          messageDiv.innerHTML = `
            <div style="margin-bottom: 8px;">❌ Automation failed</div>
            <div style="font-size: 14px;">Please try again or contact support</div>
          `;
        }
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
      this.setupMessageListener();
    },

    // Listen for messages from extension popup
    setupMessageListener(): void {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'SIMULATE_PAYMENT_COMPLETE') {
          console.log('🧪 Received test payment message from popup:', message);
          
          // Set the localStorage flags that would be set by the payment webapp
          localStorage.setItem('stablecart_user_wallet', message.walletAddress);
          localStorage.setItem('stablecart_payment_completed', 'true');
          
          // Trigger the countdown immediately
          this.showCountdownMessage();
          
          // Trigger gift card automation immediately
          setTimeout(() => {
            this.triggerGiftCardAutomation();
          }, 100); // Just a tiny delay to show the message
          
          sendResponse({success: true});
        }
      });
    },

    // Main execution function
    run(): void {
      if (!this.isAmazonPage()) return;

      // Wait for page to load
      setTimeout(() => {
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
    }
  };

  // Initialize the extension
  utils.init();
  
  // Initialize gift card handler
  giftCardHandler.init();
  console.log('🎁 Gift card automation initialized');
})();
