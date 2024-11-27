import { validateConfig } from '../../src/config/validate';
import { config } from '../../src/config';
import { ChainConfig } from '../../src/config';

describe('Config Validation', () => {
  let originalChains: ChainConfig[];

  beforeEach(() => {
    originalChains = [...config.chains];
  });

  afterEach(() => {
    config.chains = originalChains;
  });

  it('should validate valid configuration', () => {
    expect(() => validateConfig()).not.toThrow();
  });

  it('should throw on missing chain configuration', () => {
    (config as any).chains = undefined;
    expect(() => validateConfig()).toThrow('No chains configured');
  });

  it('should throw on empty chains array', () => {
    config.chains = [];
    expect(() => validateConfig()).toThrow('No chains configured');
  });

  it('should throw on invalid RPC URL', () => {
    config.chains = [{
      ...config.chains[0],
      rpcUrl: '',
    }];
    expect(() => validateConfig()).toThrow('Invalid RPC URL');

    config.chains = [{
      ...config.chains[0],
      rpcUrl: 'invalid-url',
    }];
    expect(() => validateConfig()).toThrow('Invalid RPC URL');
  });

  it('should throw on invalid fee collector address', () => {
    config.chains = [{
      ...config.chains[0],
      feeCollectorAddress: 'invalid',
    }];
    expect(() => validateConfig()).toThrow('Invalid fee collector address');
  });

  it('should throw on invalid start block', () => {
    config.chains = [{
      ...config.chains[0],
      startBlock: -1,
    }];
    expect(() => validateConfig()).toThrow('Invalid start block');

    config.chains = [{
      ...config.chains[0],
      startBlock: undefined as any,
    }];
    expect(() => validateConfig()).toThrow('Invalid start block');
  });

  it('should throw on invalid scanning configuration', () => {
    config.chains = [{
      ...config.chains[0],
      scanning: {
        ...config.chains[0].scanning,
        blockRange: 0,
      },
    }];
    expect(() => validateConfig()).toThrow('Invalid block range');

    config.chains = [{
      ...config.chains[0],
      scanning: {
        blockRange: 5000,
        retryAttempts: 0,
        retryDelay: 1000,
        pollingInterval: 10000,
      },
    }];
    expect(() => validateConfig()).toThrow('Invalid retry attempts');

    config.chains = [{
      ...config.chains[0],
      scanning: {
        blockRange: 5000,
        retryAttempts: 3,
        retryDelay: 0,
        pollingInterval: 10000,
      },
    }];
    expect(() => validateConfig()).toThrow('Invalid retry delay');
  });
});
