import { FeeCollectedEventModel } from '../../src/models';
import { setupTestDB, teardownTestDB, clearDatabase } from '../db';

describe('FeeCollectedEvent Model', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('should create a new event', async () => {
    const eventData = {
      chainId: 137,
      blockNumber: 1000000,
      transactionHash: '0x123',
      token: '0xtoken1',
      integrator: '0xintegrator1',
      integratorFee: '1000',
      lifiFee: '100',
      timestamp: new Date(),
    };

    const event = await FeeCollectedEventModel.create(eventData);
    expect(event).toBeDefined();
    expect(event.chainId).toBe(eventData.chainId);
    expect(event.blockNumber).toBe(eventData.blockNumber);
    expect(event.transactionHash).toBe(eventData.transactionHash);
  });

  it('should enforce required fields', async () => {
    const invalidEvent = {
      chainId: 137,
      // missing required fields
    };

    await expect(FeeCollectedEventModel.create(invalidEvent)).rejects.toThrow();
  });

  it('should handle duplicate events', async () => {
    const eventData = {
      chainId: 137,
      blockNumber: 1000000,
      transactionHash: '0x123',
      token: '0xtoken1',
      integrator: '0xintegrator1',
      integratorFee: '1000',
      lifiFee: '100',
      timestamp: new Date(),
    };

    await FeeCollectedEventModel.create(eventData);

    // MongoDB throws E11000 duplicate key error
    await expect(async () => {
      await FeeCollectedEventModel.create(eventData);
    }).rejects.toThrow(/E11000 duplicate key error/);
  });

  it('should query events by integrator', async () => {
    const events = [
      {
        chainId: 137,
        blockNumber: 1000000,
        transactionHash: '0x123',
        token: '0xtoken1',
        integrator: '0xintegrator1',
        integratorFee: '1000',
        lifiFee: '100',
        timestamp: new Date(),
      },
      {
        chainId: 137,
        blockNumber: 1000001,
        transactionHash: '0x456',
        token: '0xtoken2',
        integrator: '0xintegrator2',
        integratorFee: '2000',
        lifiFee: '200',
        timestamp: new Date(),
      },
    ];

    await FeeCollectedEventModel.create(events);

    const result = await FeeCollectedEventModel.find({ integrator: '0xintegrator1' });
    expect(result).toHaveLength(1);
    expect(result[0].integrator).toBe('0xintegrator1');
  });
});
