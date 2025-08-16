export function findPaymentMethodsSection(): HTMLElement | null {
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
  const sections = document.querySelectorAll('div, section');
  for (const section of sections) {
    if (section.textContent && section.textContent.includes('Other payment methods')) {
      return section as HTMLElement;
    }
  }
  
  return null;
}

export function findPaymentMethodDropdown(): HTMLElement | null {
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
      return dropdown as HTMLElement;
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
      return dropdown as HTMLElement;
    }
  }
  
  return null;
}

export function findChangeButton(): HTMLElement | null {
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
      return button as HTMLElement;
    }
  }
  
  // Look for elements containing "Change" text
  const elements = document.querySelectorAll('*');
  for (const element of elements) {
    if (element.textContent && element.textContent.trim() === 'Change' && 
        (element.tagName === 'BUTTON' || element.tagName === 'A' || element.onclick)) {
      return element as HTMLElement;
    }
  }
  
  return null;
} 