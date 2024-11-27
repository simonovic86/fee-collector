import dotenv from 'dotenv';
import path from 'path';

// Load environment variables as early as possible
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  feeCollectorAddress: string;
  startBlock: number;
  scanning: {
    blockRange: number;
    retryAttempts: number;
    retryDelay: number;
    pollingInterval: number;
  };
}

interface AppConfig {
  env: string;
  server: {
    enabled: boolean;
    port: number;
    corsOrigin: string;
  };
  database: {
    uri: string;
    options: {
      serverSelectionTimeoutMS: number;
      socketTimeoutMS: number;
    };
  };
  chains: ChainConfig[];
}

function parseEnvNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseEnvBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

function validateMongoUri(uri: string | undefined): string {
  const defaultUri = 'mongodb://localhost:27017/fee-collector';
  if (!uri) return defaultUri;

  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    return `mongodb://${uri}`;
  }

  return uri;
}

function parseChainConfigs(): ChainConfig[] {
  const chains: ChainConfig[] = [];

  // Parse chain-specific environment variables
  const chainIds = process.env.CHAIN_IDS?.split(',') || ['137']; // Default to Polygon

  chainIds.forEach(chainId => {
    const id = parseInt(chainId.trim(), 10);
    const prefix = `CHAIN_${chainId}_`;

    const chainConfig: ChainConfig = {
      chainId: id,
      name: process.env[`${prefix}NAME`] || `Chain ${id}`,
      rpcUrl: process.env[`${prefix}RPC_URL`] || '',
      feeCollectorAddress: process.env[`${prefix}FEE_COLLECTOR_ADDRESS`] || '',
      startBlock: parseEnvNumber(process.env[`${prefix}START_BLOCK`], 0),
      scanning: {
        blockRange: parseEnvNumber(process.env[`${prefix}BLOCK_RANGE`], 5000),
        retryAttempts: parseEnvNumber(process.env[`${prefix}RETRY_ATTEMPTS`], 3),
        retryDelay: parseEnvNumber(process.env[`${prefix}RETRY_DELAY`], 1000),
        pollingInterval: parseEnvNumber(process.env[`${prefix}POLLING_INTERVAL`], 10000),
      },
    };

    chains.push(chainConfig);
  });

  return chains;
}

export const config: AppConfig = {
  env: process.env.NODE_ENV || 'development',
  server: {
    enabled: parseEnvBoolean(process.env.ENABLE_API, true),
    port: parseEnvNumber(process.env.PORT, 3000),
    corsOrigin: process.env.CORS_ORIGIN || '*',
  },
  database: {
    uri: validateMongoUri(process.env.MONGODB_URI),
    options: {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },
  chains: parseChainConfigs(),
};

