import { EventScanner } from '../../src/services';
import { FeeCollectedEventModel, LastScannedBlockModel } from '../../src/models';
import { ChainConfig } from '../../src/config';
import { setupTestDB, teardownTestDB, clearDatabase } from '../db';

// Increase timeout for all tests
jest.setTimeout(60000);

// Create mock implementations
const mockGetBlockNumber = jest.fn();
const mockGetBlock = jest.fn();
const mockRemoveAllListeners = jest.fn();
const mockQueryFilter = jest.fn();
const mockParseLog = jest.fn();

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    providers: {
      JsonRpcProvider: jest.fn().mockImplementation(() => ({
        getBlockNumber: mockGetBlockNumber,
        getBlock: mockGetBlock,
        removeAllListeners: mockRemoveAllListeners,
      })),
    },
    Contract: jest.fn().mockImplementation(() => ({
      filters: {
        FeesCollected: () => ({ topics: [] }),
      },
      queryFilter: mockQueryFilter,
      interface: {
        parseLog: mockParseLog,
      },
    })),
    utils: {
      getAddress: jest.fn().mockImplementation(address => address),
    },
  },
}));

const testConfig: ChainConfig = {
  chainId: 137,
  name: 'Polygon',
  rpcUrl: 'https://mock-rpc.com',
  feeCollectorAddress: '0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9',
  startBlock: 61500000,
  scanning: {
    blockRange: 5000,
    retryAttempts: 3,
    retryDelay: 100,
    pollingInterval: 5000,
  },
};

describe('EventScanner', () => {
  let scanner: EventScanner;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGetBlockNumber.mockResolvedValue(61500100);
    mockGetBlock.mockResolvedValue({
      number: 61500100,
      timestamp: Math.floor(Date.now() / 1000),
      hash: '0xmockhash',
      parentHash: '0xmockparenthash',
      nonce: '0x0',
      transactions: [],
    });
    mockQueryFilter.mockResolvedValue([]);

    await clearDatabase();
    scanner = new EventScanner(testConfig);
  });

  afterEach(async () => {
    if (scanner) {
      await scanner.stop();
    }
  });

  /**
   * Tests basic event scanning and processing
   * Verifies events are correctly saved to database
   */
  it('should scan blocks and process events', async () => {
    // Setup mock event data
    const mockEvent = {
      blockNumber: 61500100,
      transactionHash: '0x123',
      args: {
        token: '0xtoken1',
        integrator: '0xintegrator1',
        integratorFee: { toString: () => '1000' },
        lifiFee: { toString: () => '100' },
      },
    };

    // Setup mock responses
    mockQueryFilter.mockResolvedValueOnce([mockEvent]);
    mockParseLog.mockReturnValueOnce({ args: mockEvent.args });

    // Start scanner
    const scanPromise = scanner.start();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await scanner.stop();
    await scanPromise;

    // Verify events were saved
    const savedEvents = await FeeCollectedEventModel.find().lean();
    expect(savedEvents).toHaveLength(1);
    expect(savedEvents[0]).toMatchObject({
      chainId: testConfig.chainId,
      blockNumber: 61500100,
      transactionHash: '0x123',
      token: '0xtoken1',
      integrator: '0xintegrator1',
      integratorFee: '1000',
      lifiFee: '100',
    });
  });

  /**
   * Tests handling of duplicate events
   * Verifies no duplicate entries are created in database
   */
  it('should handle duplicate events gracefully', async () => {
    const mockEvent = {
      blockNumber: 61500100,
      transactionHash: '0x123',
      args: {
        token: '0xtoken1',
        integrator: '0xintegrator1',
        integratorFee: { toString: () => '1000' },
        lifiFee: { toString: () => '100' },
      },
    };

    // Create initial event
    await FeeCollectedEventModel.create({
      chainId: testConfig.chainId,
      blockNumber: mockEvent.blockNumber,
      transactionHash: mockEvent.transactionHash,
      token: mockEvent.args.token,
      integrator: mockEvent.args.integrator,
      integratorFee: mockEvent.args.integratorFee.toString(),
      lifiFee: mockEvent.args.lifiFee.toString(),
      timestamp: new Date(),
    });

    mockQueryFilter.mockResolvedValueOnce([mockEvent]);
    mockParseLog.mockReturnValueOnce({ args: mockEvent.args });

    const scanPromise = scanner.start();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await scanner.stop();
    await scanPromise;

    const savedEvents = await FeeCollectedEventModel.find({
      chainId: testConfig.chainId,
      blockNumber: mockEvent.blockNumber,
      transactionHash: mockEvent.transactionHash,
    }).lean();

    expect(savedEvents).toHaveLength(1);
  });

  /**
   * Tests empty block handling
   * Verifies scanner continues operation when no events are found
   */
  it('should handle empty blocks gracefully', async () => {
    mockGetBlockNumber.mockResolvedValue(61505000);
    mockQueryFilter.mockResolvedValue([]);

    const scanPromise = scanner.start();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await scanner.stop();
    await scanPromise;

    const savedEvents = await FeeCollectedEventModel.find().lean();
    expect(savedEvents).toHaveLength(0);
  });

  it('should handle multiple events in the same block', async () => {
    const mockEvents = [
      {
        blockNumber: 61500100,
        transactionHash: '0x123',
        args: {
          token: '0xtoken1',
          integrator: '0xintegrator1',
          integratorFee: { toString: () => '1000' },
          lifiFee: { toString: () => '100' },
        },
      },
      {
        blockNumber: 61500100,
        transactionHash: '0x456',
        args: {
          token: '0xtoken2',
          integrator: '0xintegrator2',
          integratorFee: { toString: () => '2000' },
          lifiFee: { toString: () => '200' },
        },
      },
    ];

    mockQueryFilter.mockResolvedValueOnce(mockEvents);
    mockEvents.forEach(event => {
      mockParseLog.mockReturnValueOnce({ args: event.args });
    });

    const scanPromise = scanner.start();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await scanner.stop();
    await scanPromise;

    const savedEvents = await FeeCollectedEventModel.find()
      .sort({ transactionHash: 1 })
      .lean();

    expect(savedEvents).toHaveLength(2);
    expect(savedEvents[0].transactionHash).toBe('0x123');
    expect(savedEvents[1].transactionHash).toBe('0x456');

    expect(savedEvents[0]).toMatchObject({
      chainId: testConfig.chainId,
      blockNumber: 61500100,
      token: '0xtoken1',
      integrator: '0xintegrator1',
      integratorFee: '1000',
      lifiFee: '100',
    });

    expect(savedEvents[1]).toMatchObject({
      chainId: testConfig.chainId,
      blockNumber: 61500100,
      token: '0xtoken2',
      integrator: '0xintegrator2',
      integratorFee: '2000',
      lifiFee: '200',
    });
  });

  it('should update last scanned block', async () => {
    mockGetBlockNumber.mockResolvedValue(61505000);
    mockQueryFilter.mockResolvedValue([]);

    const scanPromise = scanner.start();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await scanner.stop();
    await scanPromise;

    const lastScanned = await LastScannedBlockModel.findOne({
      chainId: testConfig.chainId,
    });
    expect(lastScanned).toBeTruthy();
    expect(lastScanned!.blockNumber).toBe(61505000);
  });

  it('should handle network errors and retry', async () => {
    let attempts = 0;
    mockGetBlockNumber.mockImplementation(() => {
      attempts++;
      if (attempts <= 2) {
        throw new Error('Network error');
      }
      return Promise.resolve(61500100);
    });

    const scanPromise = scanner.start();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await scanner.stop();
    await scanPromise;

    expect(attempts).toBeGreaterThanOrEqual(3);
  });

  it('should not start if already running', async () => {
    let scannerRunning = false;

    mockGetBlockNumber.mockImplementation(async () => {
      if (!scannerRunning) {
        scannerRunning = true;
        await new Promise(resolve => setTimeout(resolve, 500));
        return 61500100;
      }
      return 61500100;
    });

    const firstStart = scanner.start();
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for scanner to start

    const secondStart = scanner.start();
    await secondStart; // Second start should return immediately

    await scanner.stop();
    await firstStart;

    expect(mockGetBlockNumber).toHaveBeenCalledTimes(1);
  }, 5000); // Reduced timeout

  it('should handle malformed event data', async () => {
    const mockEvent = {
      blockNumber: 61500100,
      transactionHash: '0x123',
      args: null, // Malformed data
    };

    mockQueryFilter.mockResolvedValueOnce([mockEvent]);
    mockParseLog.mockReturnValueOnce({ args: null });

    const scanPromise = scanner.start();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await scanner.stop();
    await scanPromise;

    const savedEvents = await FeeCollectedEventModel.find().lean();
    expect(savedEvents).toHaveLength(0);
  });

  it('should handle block retrieval errors', async () => {
    mockGetBlock.mockRejectedValueOnce(new Error('Block not found'));
    mockQueryFilter.mockResolvedValueOnce([]);

    const scanPromise = scanner.start();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await scanner.stop();
    await scanPromise;

    const savedEvents = await FeeCollectedEventModel.find().lean();
    expect(savedEvents).toHaveLength(0);
  });

  it('should respect block range limits', async () => {
    mockGetBlockNumber.mockResolvedValue(61510000);
    mockQueryFilter.mockResolvedValue([]);

    const scanPromise = scanner.start();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await scanner.stop();
    await scanPromise;

    const calls = mockQueryFilter.mock.calls;
    calls.forEach(call => {
      const [_, fromBlock, toBlock] = call;
      expect(Number(toBlock) - Number(fromBlock) + 1).toBeLessThanOrEqual(testConfig.scanning.blockRange);
    });
  });

  it('should update last scanned block after each range', async () => {
    mockGetBlockNumber.mockResolvedValue(61510000);
    mockQueryFilter.mockResolvedValue([]);

    const scanPromise = scanner.start();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await scanner.stop();
    await scanPromise;

    const lastScanned = await LastScannedBlockModel.findOne({
      chainId: testConfig.chainId,
    }).sort({ blockNumber: -1 });

    expect(lastScanned).toBeTruthy();
    expect(lastScanned!.blockNumber).toBeLessThanOrEqual(61510000);
  });
});
