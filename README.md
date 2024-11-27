Fee Collector Event Scanner
===========================

A production-ready TypeScript service that scans and stores FeeCollector contract events from EVM chains, with a REST API for querying collected fees by integrator.

Features
--------

🔍 Multi-chain event scanning with parallel processing  
💾 MongoDB storage with Typegoose models  
🔄 Automatic resume from last scanned block  
🌐 REST API with pagination and filtering  
🐳 Docker support for easy deployment  
✅ Comprehensive test coverage  
🚀 Production-ready error handling and logging

Architecture
------------

### Event Scanner

*   Scans blockchain events in configurable block ranges
*   Implements retry mechanisms for network failures
*   Maintains scanning state per chain
*   Handles graceful shutdown

### Database Layer

*   Uses MongoDB with Typegoose for type safety
*   Implements optimized indexes for queries
*   Prevents duplicate events through unique constraints
*   Tracks last scanned block per chain

### REST API

*   Provides paginated access to stored events
*   Supports filtering by integrator address
*   Implements proper error handling and validation
*   CORS support with configurable origins

Prerequisites
-------------

*   Node.js 18+
*   MongoDB 5+
*   Docker (optional)

Installation
------------

    # Clone the repository
    git clone https://github.com/simonovic86/fee-collector.git
    cd fee-collector
    
    # Install dependencies
    npm install
    
    # Build the project
    npm run build

Configuration
-------------

Create a `.env` file in the project root:

    # Node environment
    NODE_ENV=production
    
    # API configuration
    ENABLE_API=true
    PORT=3000
    CORS_ORIGIN=*
    
    # MongoDB configuration
    MONGODB_URI=mongodb://localhost:27017/fee-collector
    
    # Chain configuration
    CHAIN_IDS=137,1  # Comma-separated chain IDs
    
    # Polygon configuration example
    CHAIN_137_NAME=Polygon
    CHAIN_137_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/{API_KEY}
    CHAIN_137_FEE_COLLECTOR_ADDRESS=0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9
    CHAIN_137_START_BLOCK=61500000
    CHAIN_137_BLOCK_RANGE=5000
    CHAIN_137_RETRY_ATTEMPTS=3
    CHAIN_137_RETRY_DELAY=1000
    CHAIN_137_POLLING_INTERVAL=10000

    # Ethereum configuration example
    CHAIN_1_NAME=Polygon
    CHAIN_1_RPC_URL=CHAIN_1_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/{API_KEY}
    CHAIN_1_FEE_COLLECTOR_ADDRESS=0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9
    CHAIN_1_START_BLOCK=21267961
    CHAIN_1_BLOCK_RANGE=5000
    CHAIN_1_RETRY_ATTEMPTS=3
    CHAIN_1_RETRY_DELAY=1000
    CHAIN_1_POLLING_INTERVAL=10000

Running the Service
-------------------

### Development Mode

    npm run dev

### Production Mode

    npm run build
    npm start

### Docker Deployment

    docker-compose up --build

Note: MongoDB Express is included in the Docker Compose file for easy database management.

API Endpoints
-------------

### Get Events

    GET /api/:chainId/events

Query Parameters:

*   `page` (optional): Page number (default: 1)
*   `limit` (optional): Items per page (default: 10, max: 100)
*   `integrator` (optional): Ethereum address to filter by integrator

Response:

    {
      "data": [
        {
          "chainId": 137,
          "blockNumber": 61500100,
          "transactionHash": "0x...",
          "token": "0x...",
          "integrator": "0x...",
          "integratorFee": "1000",
          "lifiFee": "100"
        }
      ],
      "pagination": {
        "total": 100,
        "page": 1,
        "limit": 10,
        "totalPages": 10
      }
    }

### Get Health

    GET /health

Response:

    {
        "status": "ok",
        "timestamp": "2024-11-27T13:03:15.176Z",
        "version": "1.0.0",
        "services": {
            "api": {
                "status": "ok"
            },
            "database": {
                "status": "ok",
                "connected": true
            },
            "chains": {
                "1": {
                    "status": "ok",
                    "name": "Ethereum",
                    "latestBlock": 21279262
                },
                "137": {
                    "status": "ok",
                    "name": "Polygon",
                    "latestBlock": 64793616
                }
            }
        }
    }

Testing
-------

    # Run all tests
    npm test
    
    # Run tests with coverage
    npm run test:coverage
    
    # Run tests in watch mode
    npm run test:watch

Error Handling
--------------

The service implements comprehensive error handling:

*   Network failures with configurable retries
*   Database connection issues
*   Invalid blockchain responses
*   Malformed event data
*   API input validation

Monitoring
----------

Logging is implemented using Pino logger with the following levels:

*   `error`: Critical failures requiring immediate attention
*   `warn`: Non-critical issues that might need investigation
*   `info`: General operational information
*   `debug`: Detailed debugging information

Performance Considerations
--------------------------

*   Configurable block range scanning
*   Database indexing for optimal query performance
*   Connection pooling for database operations
*   Parallel processing of multiple chains
*   Configurable polling intervals

Contributing
------------

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'add amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

License
-------

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Next Steps and Future Improvements
----------------------------------

1.  **Monitoring & Metrics**
  *   Implement Prometheus metrics
  *   Add health check endpoints
  *   Chain-specific performance monitoring
2.  **Performance Optimization**
  *   Smart batch sizing based on block content
  *   RPC request rate limiting
  *   Adaptive polling intervals
3.  **Additional Features**
  *   Historical data backfilling
  *   Cross-chain analytics endpoints
  *   WebSocket updates for real-time events
