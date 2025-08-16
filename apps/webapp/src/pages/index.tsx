import CustomConnectButton from '../components/CustomConnectButton';
import PaymentButton from '../components/PaymentButton';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

const Home: NextPage = () => {
  const [productPrice, setProductPrice] = useState<string>('$0.00');
  const [productTitle, setProductTitle] = useState<string>('Amazon Product');
  const [currentURL, setCurrentURL] = useState<string>('');
  const [priceNumber, setPriceNumber] = useState<number>(0);

  useEffect(() => {
    // Get price and title from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const price = urlParams.get('price');
    const title = urlParams.get('title');
    
    if (price) {
      const priceNum = parseFloat(price);
      setPriceNumber(priceNum);
      setProductPrice(`$${priceNum.toFixed(2)}`);
    }
    
    if (title) {
      setProductTitle(decodeURIComponent(title));
    }
    
    // Set the current URL
    setCurrentURL(window.location.href);
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>Amazon Crypto Checkout</title>
        <meta
          content="Complete your Amazon purchase with cryptocurrency"
          name="description"
        />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className={styles.main}>
        {/* Price Button - Centered above ConnectButton */}
        <div className={styles.priceButtonContainer}>
          <button className={styles.priceButton} title={productTitle}>
            <span className={styles.priceAmount}>{productPrice}</span>
            <span className={styles.priceLabel}>Product Price (USD)</span>
          </button>
        </div>
        
        {/* URL Display */}
        <div className={styles.urlDisplay}>
          <p className={styles.urlText}>{currentURL}</p>
        </div>
        
        {/* Custom Connect Button with full styling control */}
        <div className={styles.connectButtonContainer}>
          <CustomConnectButton className={styles.customConnectButton} />
        </div>
        
        {/* Payment Button - Execute transaction on Sepolia */}
        {priceNumber > 0 && (
          <div className={styles.paymentButtonContainer}>
            <PaymentButton 
              price={priceNumber} 
              className={styles.paymentButton}
            />
            
            {/* Sepolia Testnet Info */}
            <div style={{
              marginTop: '20px',
              padding: '15px',
              background: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '8px',
              fontSize: '14px',
              textAlign: 'center',
              maxWidth: '500px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#0c4a6e' }}>
                🧪 Sepolia Testnet
              </div>
              <div style={{ color: '#0c4a6e', lineHeight: '1.5' }}>
                Amazon prices are in USD and will be automatically converted to ETH using real-time exchange rates. 
                You'll need Sepolia test ETH to complete the transaction.
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#0369a1' }}>
                Get free test ETH from: <a 
                  href="https://sepoliafaucet.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#0369a1', textDecoration: 'underline' }}
                >
                  sepoliafaucet.com
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
