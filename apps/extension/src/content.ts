// Amazon Crypto Checkout Extension - TypeScript version
// Content script that runs on Amazon pages

import { paymentModal } from './payment-modal';

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
    // Check if current page is an Amazon page
    isAmazonPage(): boolean {
      return window.location.hostname.includes('amazon');
    },

    // Handle crypto checkout
    handleCryptoCheckout(): void {
      console.log('Crypto checkout initiated');
      
      // Extract product information from Amazon page
      const productInfo = this.extractProductInfo();
      
      // Show payment modal
      paymentModal.show(productInfo);
    },

    // Extract product information from current Amazon page
    extractProductInfo() {
      const productTitle = this.getProductTitle();
      const productPrice = this.getProductPrice();
      const productImage = this.getProductImage();
      const amazonUrl = window.location.href;

      return {
        title: productTitle,
        price: productPrice,
        image: productImage,
        amazonUrl: amazonUrl
      };
    },

    // Get product title from Amazon page
    getProductTitle(): string {
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
            return price;
          }
        }
      }

      // Fallback: look for any price-like text
      const priceRegex = /\$(\d+(?:\.\d{2})?)/;
      const bodyText = document.body.textContent || '';
      const match = bodyText.match(priceRegex);
      if (match) {
        return parseFloat(match[1]);
      }

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
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = '#232F3E';
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
      // Look for checkout sections
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
          console.log('Crypto checkout button injected');
          break;
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

      // Wait for page to load
      setTimeout(() => {
        this.injectCryptoWalletOption();
        this.injectCheckoutButton();
      }, 1000);

      // Watch for dynamic content changes
      this.observePageChanges();
    },

    // Observe page changes for dynamic content
    observePageChanges(): void {
      const observer = new MutationObserver(() => {
        if (this.shouldReinject()) {
          setTimeout(() => {
            if (this.isAmazonPage()) {
              this.injectCryptoWalletOption();
              this.injectCheckoutButton();
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
             !document.getElementById('amazon-crypto-checkout-button');
    }
  };

  // Initialize the extension
  utils.init();
})();
