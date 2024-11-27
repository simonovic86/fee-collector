import { ethers } from 'ethers';
import { Logger, Retry } from '../utils';
import { ChainConfig } from '../config';
import { FeeCollectedEventModel, LastScannedBlockModel } from '../models';

/**
 * ABI for FeeCollector contract
 */
const FEE_COLLECTOR_ABI = [
  'event FeesCollected(address indexed token, address indexed integrator, uint256 integratorFee, uint256 lifiFee)',
];

/**
 * EventScanner class responsible for scanning and processing FeeCollector events from EVM chains
 * Handles block range scanning, event parsing, and database storage with retry mechanisms
 */
export class EventScanner {
  private readonly provider: ethers.providers.JsonRpcProvider;
  private readonly feeCollector: ethers.Contract;
  private readonly retry: Retry;
  private readonly logger: Logger;

  private isScanning = false;
  private shouldStop = false;
  private currentBlockRange: { start: number; end: number } | null = null;

  /**
   * Initializes a new instance of EventScanner
   * @param chainConfig - Configuration for the specific blockchain to scan
   */
  constructor(
    private readonly chainConfig: ChainConfig
  ) {
    this.provider = new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl);
    this.feeCollector = new ethers.Contract(
      chainConfig.feeCollectorAddress,
      FEE_COLLECTOR_ABI,
      this.provider
    );
    this.logger = new Logger(`EventScanner-${chainConfig.name}`);
    this.retry = new Retry(this.logger, {
      attempts: chainConfig.scanning.retryAttempts,
      delay: chainConfig.scanning.retryDelay
    });
  }

  /**
   * Starts the event scanning process
   * Initializes scanning state and begins processing events from the last scanned block
   * @throws Error if scanning fails to start or during processing
   */
  public async start(): Promise<void> {
    if (this.isScanning) {
      this.logger.info(`Scanner for ${this.chainConfig.name} is already running`);
      return;
    }

    this.isScanning = true;
    this.shouldStop = false;
    await this.scan();
  }

  /**
   * Gracefully stops the event scanning process
   * Waits for current block range to finish processing before stopping
   * @throws Error if shutdown process fails
   */
  public async stop(): Promise<void> {
    this.logger.info(`Stopping scanner for ${this.chainConfig.name}...`);
    this.shouldStop = true;

    // Wait for current block range to finish processing
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.isScanning && this.currentBlockRange) {
      if (Date.now() - startTime > maxWaitTime) {
        this.logger.warn(
          `Chain ${this.chainConfig.name} - Still processing blocks ` +
          `${this.currentBlockRange.start}-${this.currentBlockRange.end}. Waiting...`
        );
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.provider.removeAllListeners();
    this.currentBlockRange = null;
    this.logger.info(`Scanner for ${this.chainConfig.name} stopped`);
  }

  /**
   * Main scanning logic to process events in block ranges
   * Handles block range calculations, event querying, parsing, and storage
   * Includes retry mechanisms and error handling
   * @private
   */
  private async scan(): Promise<void> {
    try {
      let currentBlock: number;
      let latestBlock: number;

      const lastScannedBlock = await LastScannedBlockModel.findOne({
        chainId: this.chainConfig.chainId,
      });

      currentBlock = lastScannedBlock ?
        lastScannedBlock.blockNumber + 1 :
        this.chainConfig.startBlock;

      this.logger.info(
        `Starting scanner for chain ${this.chainConfig.name} (${this.chainConfig.chainId}) ` +
        `from block ${currentBlock.toLocaleString()}`
      );

      while (this.isScanning) {
        try {
          latestBlock = await this.retry.retryOperation(
            () => this.provider.getBlockNumber(),
            'getBlockNumber'
          );

          if (currentBlock > latestBlock) {
            if (this.shouldStop) break;
            this.logger.info(`Chain ${this.chainConfig.name} - Caught up with latest block, waiting...`);
            await new Promise(resolve =>
              setTimeout(resolve, this.chainConfig.scanning.pollingInterval)
            );
            continue;
          }

          const totalBlocks = latestBlock - currentBlock + 1;
          const blockRange = this.chainConfig.scanning?.blockRange || 5000;
          const endBlock = Math.min(currentBlock + blockRange - 1, latestBlock);

          this.currentBlockRange = { start: currentBlock, end: endBlock };
          this.logger.info(
            `Chain ${this.chainConfig.name} - Processing blocks from ${currentBlock.toLocaleString()} ` +
            `to ${endBlock.toLocaleString()} (${totalBlocks.toLocaleString()} blocks behind)`
          );

          const filter = this.feeCollector.filters.FeesCollected();
          const events = await this.retry.retryOperation(
            () => this.feeCollector.queryFilter(filter, currentBlock, endBlock),
            'queryFilter'
          );

          if (events.length > 0) {
            const parsedEvents = events.map(event => {
              const parsedLog = this.feeCollector.interface.parseLog(event);
              if (!parsedLog || !parsedLog.args) {
                throw new Error(`Failed to parse event log: ${event}`);
              }

              return {
                chainId: this.chainConfig.chainId,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash,
                token: ethers.utils.getAddress(parsedLog.args.token),
                integrator: ethers.utils.getAddress(parsedLog.args.integrator),
                integratorFee: parsedLog.args.integratorFee.toString(),
                lifiFee: parsedLog.args.lifiFee.toString(),
              };
            });

            try {
              await Promise.all(parsedEvents.map(event =>
                FeeCollectedEventModel.updateOne(
                  {
                    chainId: event.chainId,
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash
                  },
                  { $setOnInsert: event },
                  { upsert: true }
                )
              ));

              this.logger.info(
                `Chain ${this.chainConfig.name} - Saved ${events.length} events from blocks ` +
                `${currentBlock.toLocaleString()}-${endBlock.toLocaleString()}`
              );
            } catch (error) {
              this.logger.error(`Chain ${this.chainConfig.name} - Error saving events: ${error}`);
              throw error;
            }
          }

          if (this.shouldStop) {
            this.logger.info(`Chain ${this.chainConfig.name} - Stop requested, finishing current block range...`);
            break;
          }

          await LastScannedBlockModel.findOneAndUpdate(
            { chainId: this.chainConfig.chainId },
            { blockNumber: endBlock },
            { upsert: true }
          );

          currentBlock = endBlock + 1;
          this.currentBlockRange = null;

        } catch (error) {
          this.logger.error(
            `Chain ${this.chainConfig.name} - Error processing blocks ${currentBlock.toLocaleString()}: ${error}`
          );

          if (this.shouldStop) break;

          const waitTime = 10000;
          this.logger.info(`Chain ${this.chainConfig.name} - Waiting ${waitTime/1000} seconds before retrying...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

    } finally {
      this.isScanning = false;
      this.currentBlockRange = null;
      this.logger.info(`Chain ${this.chainConfig.name} - Scanner stopped`);
    }
  }
}
