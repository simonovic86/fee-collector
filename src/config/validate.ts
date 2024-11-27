import { config } from './index';
import { ethers } from 'ethers';

export function validateConfig(): void {
  // Validate chains array exists and is not empty
  if (!config.chains || !Array.isArray(config.chains) || config.chains.length === 0) {
    throw new Error('No chains configured');
  }

  // Validate each chain configuration
  for (const chain of config.chains) {
    // Validate RPC URL
    if (!chain.rpcUrl || typeof chain.rpcUrl !== 'string') {
      throw new Error('Invalid RPC URL');
    }

    if (!chain.rpcUrl.startsWith('http')) {
      throw new Error('Invalid RPC URL');
    }

    // Validate fee collector address
    if (!chain.feeCollectorAddress || typeof chain.feeCollectorAddress !== 'string') {
      throw new Error('Invalid fee collector address');
    }

    try {
      ethers.utils.getAddress(chain.feeCollectorAddress);
    } catch {
      throw new Error('Invalid fee collector address');
    }

    // Validate start block
    if (!chain.startBlock || typeof chain.startBlock !== 'number' || chain.startBlock < 0 || isNaN(chain.startBlock)) {
      throw new Error('Invalid start block');
    }

    // Validate scanning configuration
    if (!chain.scanning || typeof chain.scanning !== 'object') {
      throw new Error('Invalid scanning configuration');
    }

    // Validate scanning.blockRange
    if (!chain.scanning.blockRange || typeof chain.scanning.blockRange !== 'number' || chain.scanning.blockRange <= 0) {
      throw new Error('Invalid block range');
    }

    // Validate scanning.retryAttempts
    if (!chain.scanning.retryAttempts || typeof chain.scanning.retryAttempts !== 'number' || chain.scanning.retryAttempts <= 0) {
      throw new Error('Invalid retry attempts');
    }

    // Validate scanning.retryDelay
    if (!chain.scanning.retryDelay || typeof chain.scanning.retryDelay !== 'number' || chain.scanning.retryDelay <= 0) {
      throw new Error('Invalid retry delay');
    }

    // Validate scanning.pollingInterval
    if (!chain.scanning.pollingInterval || 
        typeof chain.scanning.pollingInterval !== 'number' || 
        chain.scanning.pollingInterval <= 0) {
      throw new Error('Invalid polling interval');
    }
  }
} 