export function createCryptoWalletRow(): HTMLDivElement {
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
    handleCryptoWalletSelection();
  });

  row.appendChild(icon);
  row.appendChild(text);
  row.appendChild(radio);

  return row;
}

function handleCryptoWalletSelection() {
  console.log('Crypto wallet payment method selected');
  
  // You can implement your crypto wallet integration logic here
  // For example:
  // - Connect to user's crypto wallet
  // - Show available cryptocurrencies
  // - Display wallet balance
  // - Initiate payment process
  
  alert('Crypto wallet payment method selected!');
} 