import { LastScannedBlockModel } from '../../src/models';
import { setupTestDB, teardownTestDB, clearDatabase } from '../db';

describe('LastScannedBlock Model', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('should create a new last scanned block', async () => {
    const blockData = {
      chainId: 137,
      blockNumber: 1000000,
    };

    const block = await LastScannedBlockModel.create(blockData);
    expect(block.chainId).toBe(blockData.chainId);
    expect(block.blockNumber).toBe(blockData.blockNumber);
  });

  it('should update existing block', async () => {
    const blockData = {
      chainId: 137,
      blockNumber: 1000000,
    };

    await LastScannedBlockModel.create(blockData);

    const updatedBlock = await LastScannedBlockModel.findOneAndUpdate(
      { chainId: 137 },
      { blockNumber: 1000001 },
      { new: true }
    );

    expect(updatedBlock?.blockNumber).toBe(1000001);
  });

  it('should enforce required fields', async () => {
    const invalidBlock = {
      chainId: 137,
      // missing blockNumber
    };

    await expect(LastScannedBlockModel.create(invalidBlock)).rejects.toThrow();
  });

  it('should handle multiple chains', async () => {
    const blocks = [
      { chainId: 137, blockNumber: 1000000 },
      { chainId: 1, blockNumber: 2000000 },
    ];

    await LastScannedBlockModel.create(blocks);

    const savedBlocks = await LastScannedBlockModel.find().sort({ chainId: 1 });
    expect(savedBlocks).toHaveLength(2);
    expect(savedBlocks[0].chainId).toBe(1);
    expect(savedBlocks[1].chainId).toBe(137);
  });
});
