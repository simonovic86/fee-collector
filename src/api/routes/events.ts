import express from 'express';
import { ethers } from 'ethers';
import { FeeCollectedEventModel } from '../../models';
import { Logger } from '../../utils';

const router = express.Router();
const logger = new Logger('EventsAPI');

/**
 * Express router for handling FeeCollector event queries
 * Provides paginated access to stored events with optional integrator filtering
 */

/**
 * GET /:chainId/events
 * Retrieves fee collection events for a specific chain with pagination
 * @param chainId - The ID of the blockchain to query
 * @query page - Page number for pagination (default: 1)
 * @query limit - Number of items per page (default: 10, max: 100)
 * @query integrator - Optional Ethereum address to filter events by integrator
 * @returns Paginated list of fee collection events
 */
router.get('/:chainId/events', async (req, res) => {
  try {
    const chainId = parseInt(req.params.chainId, 10);
    if (isNaN(chainId)) {
      return res.status(400).json({ error: 'Invalid chain ID' });
    }

    const { page = '1', limit = '10', integrator } = req.query;

    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit as string, 10) || 1, 1), 100);

    const query: Record<string, any> = { chainId };

    if (integrator) {
      try {
        query.integrator = ethers.utils.getAddress(integrator as string);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid integrator address format' });
      }
    }

    try {
      const [total, events] = await Promise.all([
        FeeCollectedEventModel.countDocuments(query),
        FeeCollectedEventModel.find(query)
          .sort({ timestamp: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean(),
      ]);

      const totalPages = Math.ceil(total / limitNum);

      res.json({
        data: events,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
        },
      });
    } catch (error) {
      logger.error(`Error fetching events: ${error}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  } catch (error) {
    logger.error(`Error processing request: ${error}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
