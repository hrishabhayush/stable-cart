// Amazon Crypto Checkout Extension
// Content script that runs on Amazon pages

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
    // Button styling to match Amazon's design
    buttonStyles: {
      backgroundColor: '#232F3E',
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      padding: '8px 16px',
      cursor: 'pointer',
      textAlign: 'center',
      textDecoration: 'none',
      display: 'inline-block',
      marginTop: '8px',
      transition: 'background-color 0.2s ease'
    }
  };

  // Utility functions
  const utils = {
    // Check if current page is an Amazon page (simplified check)
    isAmazonPage() {
      return window.location.hostname.includes('amazon');
    },

    // Find payment methods section
    findPaymentMethodsSection() {
      for (const selector of CONFIG.paymentMethodsSelectors) {
        const section = document.querySelector(selector);
        if (section) return section;
      }
      
      // Fallback: look for sections containing "Other payment methods" text
      const sections = document.querySelectorAll('div, section');
      for (const section of sections) {
        if (section.textContent && section.textContent.includes('Other payment methods')) {
          return section;
        }
      }
      
      return null;
    },

    // Find payment method dropdown
    findPaymentMethodDropdown() {
      // Look for common dropdown selectors
      const dropdownSelectors = [
        '[data-testid="payment-method-dropdown"]',
        '.payment-method-dropdown',
        '#payment-method-dropdown',
        '[data-feature-id="payment-method-dropdown"]',
        '.payment-dropdown',
        '#payment-dropdown',
        // Look for dropdowns that appear after clicking "Change"
        '[role="listbox"]',
        '[aria-expanded="true"]',
        '.dropdown-content',
        '.dropdown-menu',
        '.payment-options-dropdown'
      ];
      
      for (const selector of dropdownSelectors) {
        const dropdown = document.querySelector(selector);
        if (dropdown && dropdown.offsetParent !== null) { // Check if visible
          return dropdown;
        }
      }
      
      // Look for dropdowns in the DOM that might be hidden
      const allDropdowns = document.querySelectorAll('[class*="dropdown"], [class*="menu"], [role="listbox"]');
      for (const dropdown of allDropdowns) {
        if (dropdown.textContent && (
          dropdown.textContent.includes('payment') || 
          dropdown.textContent.includes('method') ||
          dropdown.textContent.includes('card') ||
          dropdown.textContent.includes('visa') ||
          dropdown.textContent.includes('mastercard')
        )) {
          return dropdown;
        }
      }
      
      return null;
    },

    // Find "Change" button in payment method section
    findChangeButton() {
      const changeSelectors = [
        'button:contains("Change")',
        'a:contains("Change")',
        '[data-testid*="change"]',
        '[data-feature-id*="change"]',
        '.change-button',
        '#change-button'
      ];
      
      // Look for buttons with "Change" text
      const buttons = document.querySelectorAll('button, a');
      for (const button of buttons) {
        if (button.textContent && button.textContent.trim() === 'Change') {
          return button;
        }
      }
      
      // Look for elements containing "Change" text
      const elements = document.querySelectorAll('*');
      for (const element of elements) {
        if (element.textContent && element.textContent.trim() === 'Change' && 
            (element.tagName === 'BUTTON' || element.tagName === 'A' || element.onclick)) {
          return element;
        }
      }
      
      return null;
    },

    // This function is no longer needed - we only inject into specific selectors
    // getComputedStyles(element) { },

    // This function is no longer needed - we only inject into specific selectors
    // createCryptoButton(originalButton) { },

    // Create crypto wallet payment method row
    createCryptoWalletRow() {
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
        this.handleCryptoWalletSelection();
      });

      row.appendChild(icon);
      row.appendChild(text);
      row.appendChild(radio);

      return row;
    },

    // Handle crypto checkout button click
    handleCryptoCheckout() {
      // You can implement your crypto checkout logic here
      console.log('Crypto checkout initiated');
      
      // Example: Show a modal or redirect to crypto payment
      alert('Crypto checkout feature coming soon!');
      
      // You could also:
      // - Open a popup with crypto payment options
      // - Redirect to a crypto payment processor
      // - Show QR codes for different cryptocurrencies
      // - Integrate with wallet extensions
    },

    // Handle crypto wallet selection
    handleCryptoWalletSelection() {
      console.log('Crypto wallet payment method selected');
      
      // You can implement your crypto wallet integration logic here
      // For example:
      // - Connect to user's crypto wallet
      // - Show available cryptocurrencies
      // - Display wallet balance
      // - Initiate payment process
      
      alert('Crypto wallet payment method selected!');
    },

    // Inject crypto wallet option into payment method dropdown
    injectCryptoWalletOption() {
      // First, try to find an existing dropdown
      let dropdown = this.findPaymentMethodDropdown();
      
      if (dropdown) {
        // Check if already injected
        if (dropdown.querySelector('#amazon-crypto-wallet-row')) return;
        
        const cryptoRow = this.createCryptoWalletRow();
        dropdown.appendChild(cryptoRow);
        console.log('Crypto wallet option injected into existing payment dropdown');
        return;
      }
      
      // If no dropdown found, set up observer for when "Change" button is clicked
      this.setupChangeButtonObserver();
    },

    // Inject crypto wallet option into specific payment portal selector
    injectCryptoWalletIntoPaymentPortal() {
      const paymentPortal = document.querySelector('#pp-3MOczW-93 > div > div > div > div.a-row.a-spacing-mini.pmts-portal-component.pmts-portal-components-pp-3MOczW-8 > div');
      if (!paymentPortal) return;

      // Check if already injected
      if (paymentPortal.querySelector('#amazon-crypto-wallet-portal')) return;

      const cryptoRow = this.createCryptoWalletRow();
      cryptoRow.id = 'amazon-crypto-wallet-portal';
      
      // Insert at the end of the payment portal
      paymentPortal.appendChild(cryptoRow);
      console.log('Crypto wallet option injected into payment portal selector');
    },

    // Inject checkout button into specific checkout block selector
    injectCryptoButtonIntoCheckoutBlock() {
      const checkoutBlock = document.querySelector('#checkout-pyo-button-block > div');
      if (!checkoutBlock) return;

      // Check if already injected
      if (checkoutBlock.querySelector('#amazon-crypto-checkout-checkout-block')) return;

      // Create a crypto button that matches the checkout block styling
      const cryptoButton = document.createElement('button');
      cryptoButton.textContent = 'Checkout with crypto';
      cryptoButton.id = 'amazon-crypto-checkout-checkout-block';
      
      // Style to match checkout block buttons
      Object.assign(cryptoButton.style, {
        backgroundColor: '#232F3E',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        padding: '8px 16px',
        cursor: 'pointer',
        textAlign: 'center',
        textDecoration: 'none',
        display: 'inline-block',
        marginTop: '8px',
        marginLeft: '8px',
        transition: 'background-color 0.2s ease',
        width: 'auto',
        minWidth: '140px'
      });

      // Add hover effect
      cryptoButton.addEventListener('mouseenter', () => {
        cryptoButton.style.backgroundColor = '#1a2532';
      });
      
      cryptoButton.addEventListener('mouseleave', () => {
        cryptoButton.style.backgroundColor = '#232F3E';
      });

      // Add click handler
      cryptoButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleCryptoCheckout();
      });

      // Insert at the end of the checkout block
      checkoutBlock.appendChild(cryptoButton);
      console.log('Crypto checkout button injected into checkout block selector');
    },

    // Inject checkout button above subtotals
    injectCryptoButtonAboveSubtotals() {
      const subtotalsDiv = document.querySelector('#subtotals > div > div');
      if (!subtotalsDiv) return;

      // Check if already injected
      if (subtotalsDiv.parentNode.querySelector('#amazon-crypto-checkout-above-subtotals')) return;

      // Find the Place your order button to copy its styling
      const placeOrderButton = document.querySelector('#submitOrderButtonId') || 
                               document.querySelector('input[name="placeYourOrder1"]') ||
                               document.querySelector('input[name="placeYourOrder2"]') ||
                               document.querySelector('button[data-feature-id="place-order-button"]');
      
      // Create a crypto button with Amazon blue styling
      const cryptoButton = document.createElement('button');
      cryptoButton.textContent = 'Checkout with crypto';
      cryptoButton.id = 'amazon-crypto-checkout-above-subtotals';
      
      // Get the computed styles from the Place your order button
      let buttonWidth = 'auto';
      let buttonHeight = 'auto';
      let buttonFontSize = '14px';
      let buttonFontWeight = '500';
      let buttonPadding = '8px 16px';
      let buttonBorderRadius = '8px';
      
      if (placeOrderButton) {
        const computedStyles = window.getComputedStyle(placeOrderButton);
        buttonWidth = computedStyles.width;
        buttonHeight = computedStyles.height;
        buttonFontSize = computedStyles.fontSize;
        buttonFontWeight = computedStyles.fontWeight;
        buttonPadding = computedStyles.padding;
        buttonBorderRadius = computedStyles.borderRadius;
      }
      
      // Style with Amazon blue color and matching dimensions
      Object.assign(cryptoButton.style, {
        backgroundColor: '#232F3E',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: buttonBorderRadius,
        fontSize: buttonFontSize,
        fontWeight: buttonFontWeight,
        padding: buttonPadding,
        cursor: 'pointer',
        textAlign: 'center',
        textDecoration: 'none',
        display: 'block',
        marginTop: '16px',
        marginBottom: '16px',
        marginLeft: '0',
        transition: 'background-color 0.2s ease',
        width: buttonWidth,
        height: buttonHeight,
        lineHeight: 'normal',
        fontFamily: 'inherit'
      });

      // Add hover effect
      cryptoButton.addEventListener('mouseenter', () => {
        cryptoButton.style.backgroundColor = '#1a2532';
      });
      
      cryptoButton.addEventListener('mouseleave', () => {
        cryptoButton.style.backgroundColor = '#232F3E';
      });

      // Add click handler
      cryptoButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleCryptoCheckout();
      });

      // Insert above the subtotals section
      subtotalsDiv.parentNode.insertBefore(cryptoButton, subtotalsDiv);
      console.log('Crypto checkout button injected above subtotals');
    },

    // Inject checkout button between checkout block containers
    injectCryptoButtonBetweenCheckoutContainers() {
      const leftContainer = document.querySelector('#checkout-pyo-button-block > div > div.a-column.a-span12.a-spacing-base.a-ws-span3.a-ws-spacing-none.pyo-block-inline-container-left');
      const rightContainer = document.querySelector('#checkout-pyo-button-block > div > div.a-column.a-span12.a-spacing-none.a-ws-span9.a-ws-spacing-none.pyo-block-inline-container-right.a-span-last.a-ws-span-last');
      
      if (!leftContainer || !rightContainer) return;

      // Check if already injected
      if (document.getElementById('amazon-crypto-checkout-between-containers')) return;

      // Create a completely separate crypto button component
      const cryptoButton = document.createElement('button');
      cryptoButton.textContent = 'Checkout with crypto';
      cryptoButton.id = 'amazon-crypto-checkout-between-containers';
      
      // Get the width from the left container to match exactly
      const leftContainerStyles = window.getComputedStyle(leftContainer);
      const leftContainerWidth = leftContainerStyles.width;
      
      // Style with Amazon blue color and left container width
      Object.assign(cryptoButton.style, {
        backgroundColor: '#232F3E',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '32px',
        fontSize: '14px',
        fontWeight: '400',
        padding: '8px 16px',
        cursor: 'pointer',
        textAlign: 'center',
        textDecoration: 'none',
        display: 'block',
        margin: '8px 0',
        marginLeft: '16px',
        marginRight: 'auto',
        transition: 'background-color 0.2s ease',
        width: leftContainerWidth,
        height: 'auto',
        lineHeight: 'normal',
        fontFamily: 'inherit',
        position: 'relative',
        left: '0'
      });

      // Add hover effect
      cryptoButton.addEventListener('mouseenter', () => {
        cryptoButton.style.backgroundColor = '#1a2532';
      });
      
      cryptoButton.addEventListener('mouseleave', () => {
        cryptoButton.style.backgroundColor = '#232F3E';
      });

      // Add click handler
      cryptoButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleCryptoCheckout();
      });

      // Insert between the left and right containers, positioned more to the left
      const parentContainer = leftContainer.parentNode;
      parentContainer.insertBefore(cryptoButton, rightContainer);
      console.log('Separate crypto checkout button injected between checkout containers');
    },

    // Inject crypto wallet option above payment portal trigger row
    injectCryptoWalletAbovePaymentPortalTrigger() {
      const paymentPortalTrigger = document.querySelector('#pp-cSMMTs-93 > div > div > div > div.a-row.a-spacing-medium.apx-add-pm-trigger-row.pmts-portal-component.pmts-portal-components-pp-cSMMTs-62');
      if (!paymentPortalTrigger) return;

      // Check if already injected
      if (paymentPortalTrigger.parentNode.querySelector('#amazon-crypto-wallet-above-trigger')) return;

      const cryptoRow = this.createCryptoWalletRow();
      cryptoRow.id = 'amazon-crypto-wallet-above-trigger';
      
      // Insert above the payment portal trigger row
      paymentPortalTrigger.parentNode.insertBefore(cryptoRow, paymentPortalTrigger);
      console.log('Crypto wallet option injected above payment portal trigger row');
    },

    // Set up observer for Change button clicks
    setupChangeButtonObserver() {
      // Look for Change button
      const changeButton = this.findChangeButton();
      if (!changeButton) return;
      
      // Add click listener to Change button
      changeButton.addEventListener('click', () => {
        // Wait for dropdown to appear
        setTimeout(() => {
          this.injectIntoNewDropdown();
        }, 300);
      });
      
      // Also observe for dynamic content changes
      this.observeForDropdowns();
    },

    // Inject into newly created dropdown
    injectIntoNewDropdown() {
      const dropdown = this.findPaymentMethodDropdown();
      if (!dropdown) return;
      
      // Check if already injected
      if (dropdown.querySelector('#amazon-crypto-wallet-row')) return;
      
      const cryptoRow = this.createCryptoWalletRow();
      
      // Try to insert at the top of the dropdown for better visibility
      if (dropdown.firstChild) {
        dropdown.insertBefore(cryptoRow, dropdown.firstChild);
      } else {
        dropdown.appendChild(cryptoRow);
      }
      
      console.log('Crypto wallet option injected into new payment dropdown');
    },

    // Observe for dropdown creation
    observeForDropdowns() {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check if any new dropdowns were added
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (this.isPaymentDropdown(node) || this.containsPaymentDropdown(node)) {
                  setTimeout(() => {
                    this.injectIntoNewDropdown();
                  }, 100);
                }
              }
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    },

    // Check if element is a payment dropdown
    isPaymentDropdown(element) {
      if (!element || !element.classList) return false;
      
      const classNames = Array.from(element.classList).join(' ').toLowerCase();
      const textContent = element.textContent ? element.textContent.toLowerCase() : '';
      
      return classNames.includes('dropdown') || 
             classNames.includes('menu') ||
             classNames.includes('payment') ||
             textContent.includes('payment') ||
             textContent.includes('method') ||
             element.getAttribute('role') === 'listbox';
    },

    // Check if element contains a payment dropdown
    containsPaymentDropdown(element) {
      if (!element.querySelectorAll) return false;
      
      const dropdowns = element.querySelectorAll('[class*="dropdown"], [class*="menu"], [role="listbox"]');
      return dropdowns.length > 0;
    },

    // This function is no longer needed - we only inject into specific selectors
    // injectCryptoButton() { },

    // Main function to run the extension
    init() {
      // Wait for page to fully load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.run());
      } else {
        this.run();
      }
    },

    // Main execution function
    run() {
      // Check if this is an Amazon page
      if (!this.isAmazonPage()) return;

      // Wait a bit for dynamic content to load
      setTimeout(() => {
        this.injectCryptoWalletOption();
        this.injectCryptoWalletIntoPaymentPortal();
        this.injectCryptoButtonAboveSubtotals();
        this.injectCryptoButtonBetweenCheckoutContainers();
        this.injectCryptoWalletAbovePaymentPortalTrigger();
      }, 1000);

      // Also watch for dynamic content changes
      this.observePageChanges();
    },

    // Observe page changes for dynamic content
    observePageChanges() {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check if we need to inject the button again
            if (this.shouldReinjectButtons()) {
              setTimeout(() => {
                  if (this.isAmazonPage()) {
                    this.injectCryptoWalletOption();
                    this.injectCryptoWalletIntoPaymentPortal();
                    this.injectCryptoButtonAboveSubtotals();
                    this.injectCryptoButtonBetweenCheckoutContainers();
                    this.injectCryptoWalletAbovePaymentPortalTrigger();
                }
              }, 500);
            }
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    },

    // Check if we need to inject the button again
    shouldReinjectButtons() {
      return !document.getElementById('amazon-crypto-wallet-row') ||
             !document.getElementById('amazon-crypto-wallet-portal') ||
             !document.getElementById('amazon-crypto-checkout-bottom-inline') ||
             !document.getElementById('amazon-crypto-checkout-above-subtotals') ||
             !document.getElementById('amazon-crypto-checkout-between-containers') ||
             !document.getElementById('amazon-crypto-wallet-above-trigger');
    }
  };

  // Initialize the extension
  utils.init();

})(); 