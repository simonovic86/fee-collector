import request from 'supertest';
import express from 'express';
import { FeeCollectedEventModel } from '../../../src/models';
import { setupTestDB, teardownTestDB, clearDatabase } from '../../db';
import { startServer, stopServer } from '../../../src/api';

describe('Events API', () => {
  let app: express.Application;

  beforeAll(async () => {
    await setupTestDB();
    app = await startServer();
  });

  afterAll(async () => {
    await stopServer();
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('GET /api/:chainId/events', () => {
    it('should return empty array when no events exist', async () => {
      const response = await request(app)
        .get('/api/137/events')
        .expect(200);

      expect(response.body).toEqual({
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      });
    });

    it('should return events for valid chain ID', async () => {
      // Create test event
      await FeeCollectedEventModel.create({
        chainId: 137,
        blockNumber: 1000000,
        transactionHash: '0x123',
        token: '0xtoken1',
        integrator: '0xintegrator1',
        integratorFee: '1000',
        lifiFee: '100',
        timestamp: new Date(),
      });

      const response = await request(app)
        .get('/api/137/events')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        chainId: 137,
        blockNumber: 1000000,
        transactionHash: '0x123',
        token: '0xtoken1',
        integrator: '0xintegrator1',
        integratorFee: '1000',
        lifiFee: '100',
      });
    });

    it('should filter events by integrator', async () => {
      // Create test events with checksummed addresses
      const integrator1 = '0x1234567890123456789012345678901234567890';
      const integrator2 = '0x0987654321098765432109876543210987654321';

      await FeeCollectedEventModel.create([
        {
          chainId: 137,
          blockNumber: 1000000,
          transactionHash: '0x123',
          token: '0xtoken1',
          integrator: integrator1,
          integratorFee: '1000',
          lifiFee: '100',
          timestamp: new Date(),
        },
        {
          chainId: 137,
          blockNumber: 1000001,
          transactionHash: '0x456',
          token: '0xtoken2',
          integrator: integrator2,
          integratorFee: '2000',
          lifiFee: '200',
          timestamp: new Date(),
        },
      ]);

      const response = await request(app)
        .get(`/api/137/events?integrator=${integrator1}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].integrator).toBe(integrator1);
    });

    it('should handle pagination correctly', async () => {
      // Create 15 test events
      const events = Array.from({ length: 15 }, (_, i) => ({
        chainId: 137,
        blockNumber: 1000000 + i,
        transactionHash: `0x${i}`,
        token: '0xtoken1',
        integrator: '0xintegrator1',
        integratorFee: '1000',
        lifiFee: '100',
        timestamp: new Date(),
      }));

      await FeeCollectedEventModel.create(events);

      const response = await request(app)
        .get('/api/137/events?page=2&limit=10')
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.pagination).toEqual({
        total: 15,
        page: 2,
        limit: 10,
        totalPages: 2,
      });
    });

    it('should handle invalid integrator address', async () => {
      const response = await request(app)
        .get('/api/137/events?integrator=invalid-address')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid integrator address format');
    });

    it('should handle invalid chain ID', async () => {
      const response = await request(app)
        .get('/api/invalid/events')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid chain ID');
    });
  });
});
