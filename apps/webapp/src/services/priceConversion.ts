// Price Conversion Service
export interface PriceData {
    usd: number;
    eth: number;
    ethUsdPrice: number;
    gasEstimate?: string; // Estimated gas fee in ETH
    lastUpdated: Date;
  }
  
  class PriceConversionService {
    private priceData: PriceData | null = null;
    private lastFetchTime: number = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  
    // Get ETH price in USD from CoinGecko API
    private async fetchETHPrice(): Promise<number> {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.ethereum.usd;
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
        // Return fallback price if API fails
        return 3000; // Fallback ETH price in USD
      }
    }
  
    // Convert USD to ETH
    private usdToEth(usdAmount: number, ethUsdPrice: number): number {
      return usdAmount / ethUsdPrice;
    }
  
    // Get cached or fresh price data
    async getPriceData(): Promise<PriceData> {
      const now = Date.now();
      
      // Return cached data if it's still valid
      if (this.priceData && (now - this.lastFetchTime) < this.CACHE_DURATION) {
        return this.priceData;
      }
  
      // Fetch fresh price data
      const ethUsdPrice = await this.fetchETHPrice();
      
      this.priceData = {
        usd: 0, // Will be set when converting specific amounts
        eth: 0, // Will be set when converting specific amounts
        ethUsdPrice,
        lastUpdated: new Date()
      };
      
      this.lastFetchTime = now;
      return this.priceData;
    }
  
      // Convert USD amount to ETH
  async convertUsdToEth(usdAmount: number): Promise<PriceData> {
    const priceData = await this.getPriceData();
    
    const ethAmount = this.usdToEth(usdAmount, priceData.ethUsdPrice);
    const gasEstimate = '~$0.01'; // Fixed gas estimate for display
    
    return {
      ...priceData,
      usd: usdAmount,
      eth: ethAmount,
      gasEstimate
    };
  }
  
    // Format ETH amount for display
    formatEthAmount(ethAmount: number): string {
      if (ethAmount < 0.001) {
        return `${(ethAmount * 1000).toFixed(3)} mETH`;
      } else if (ethAmount < 1) {
        return `${ethAmount.toFixed(4)} ETH`;
      } else {
        return `${ethAmount.toFixed(4)} ETH`;
      }
    }
  
    // Format USD amount for display
    formatUsdAmount(usdAmount: number): string {
      return `$${usdAmount.toFixed(2)}`;
    }
  
    // Get price display string
    getPriceDisplay(usdAmount: number, ethAmount: number): string {
      return `${this.formatUsdAmount(usdAmount)} (${this.formatEthAmount(ethAmount)})`;
    }
  }
  
  // Export singleton instance
  export const priceConversionService = new PriceConversionService(); 