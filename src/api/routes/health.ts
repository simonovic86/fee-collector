import express from 'express';
import { ethers } from 'ethers';
import { Logger } from '../../utils';
import { config } from '../../config';
import { databaseService } from '../../services';

const router = express.Router();
const logger = new Logger('HealthAPI');

type HealthStatus = 'ok' | 'error';

interface ServiceHealth {
  status: HealthStatus;
}

interface DatabaseHealth extends ServiceHealth {
  connected: boolean;
}

interface ChainHealth extends ServiceHealth {
  name: string;
  latestBlock?: number;
  error?: string;
}

interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: string;
  version: string;
  services: {
    api: ServiceHealth;
    database: DatabaseHealth;
    chains: {
      [chainId: number]: ChainHealth;
    };
  };
}

/**
 * Checks MongoDB connection status using database service
 */
async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  try {
    const isConnected = databaseService.isConnectedToDatabase();
    return {
      status: isConnected ? 'ok' : 'error',
      connected: isConnected,
    };
  } catch (error) {
    logger.error(`Database health check failed: ${error}`);
    return {
      status: 'error',
      connected: false,
    };
  }
}

/**
 * Checks RPC connection status for each chain
 */
async function checkChainsHealth(): Promise<{ [chainId: number]: ChainHealth }> {
  const chainStatuses: { [chainId: number]: ChainHealth } = {};

  await Promise.all(
    config.chains.map(async (chain) => {
      try {
        const provider = new ethers.providers.JsonRpcProvider(chain.rpcUrl);
        const latestBlock = await provider.getBlockNumber();

        chainStatuses[chain.chainId] = {
          status: 'ok',
          name: chain.name,
          latestBlock,
        };
      } catch (error) {
        logger.error(`Chain ${chain.name} health check failed: ${error}`);
        chainStatuses[chain.chainId] = {
          status: 'error',
          name: chain.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );

  return chainStatuses;
}

router.get('/', async (req, res) => {
  try {
    const [dbHealth, chainHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkChainsHealth(),
    ]);

    const healthStatus: HealthCheckResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        api: {
          status: 'ok',
        },
        database: dbHealth,
        chains: chainHealth,
      },
    };

    // Determine overall status
    if (dbHealth.status === 'error' || 
        Object.values(chainHealth).some(chain => chain.status === 'error')) {
      healthStatus.status = 'error';
    }

    // Set appropriate status code
    const statusCode = healthStatus.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(healthStatus);

  } catch (error) {
    logger.error(`Health check failed: ${error}`);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

export default router; 