# Database Architecture - Water Vending Maintenance Bot

This directory contains the new database architecture that replaces the old global Sequelize connection pattern with a robust, connection-pooled system.

## 🏗️ Architecture Overview

### Components

1. **Connection Manager** (`connection-manager.js`) - Manages database connection pooling and lifecycle
2. **Database Service** (`database-service.js`) - Provides high-level database operations
3. **Repositories** (`repositories/`) - Domain-specific data access layers
4. **Configuration** (`config.js`) - Centralized database configuration

### Key Features

- ✅ **Connection Pooling** - Proper connection management with configurable pool sizes
- ✅ **Health Monitoring** - Automatic connection health checks and recovery
- ✅ **Transaction Support** - Full transaction support with retry logic
- ✅ **Error Handling** - Comprehensive error handling and logging
- ✅ **Repository Pattern** - Clean separation of data access logic
- ✅ **Type Safety** - Input validation and data sanitization

## 📁 File Structure

```
database/
├── connection-manager.js          # Core connection management
├── database-service.js            # High-level database operations
├── config.js                      # Database configuration
├── index.js                       # Main exports
├── migrate-to-new-architecture.js # Migration script
├── repositories/
│   ├── index.js                   # Repository exports
│   ├── base-repository.js         # Base repository class
│   ├── collection-repository.js   # Collection data operations
│   ├── worker-repository.js       # Worker management operations
│   └── maintenance-repository.js  # Maintenance task operations
└── README.md                      # This file
```

## 🚀 Quick Start

### 1. Initialize the New Architecture

```javascript
import { connectionManager, databaseService } from './database/index.js';

// Initialize connection manager
await connectionManager.initialize();

// Test connectivity
const isHealthy = await databaseService.healthCheck();
console.log('Database healthy:', isHealthy);
```

### 2. Use Repositories

```javascript
import { CollectionRepository, WorkerRepository } from './database/index.js';

const collectionRepo = new CollectionRepository();
const workerRepo = new WorkerRepository();

// Save collection data
await collectionRepo.saveCollectionData({
    device_id: 123,
    date: '2025-01-27',
    banknotes: 1000,
    coins: 500
});

// Get active workers
const workers = await workerRepo.getActiveWorkers();
```

### 3. Run Migration Script

```bash
# Test the new architecture
node database/migrate-to-new-architecture.js test

# Check database status
node database/migrate-to-new-architecture.js status
```

## 🔧 Configuration

### Environment Variables

```bash
# Database connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=water_vending_db
DB_USER=your_username
DB_PASSWORD=your_password

# Connection pool settings
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_ACQUIRE=60000
DB_POOL_IDLE=10000

# Health check settings
DB_HEALTH_CHECK_INTERVAL=30000
DB_HEALTH_CHECK_TIMEOUT=5000

# Logging
DB_LOGGING=false
```

### Configuration Files

- `config.js` - Centralized configuration management
- Environment-specific configs (development, production, test)
- Table configurations and indexes
- Backup and migration settings

## 📊 Repositories

### CollectionRepository

Handles all collection-related database operations:

```javascript
const collectionRepo = new CollectionRepository();

// Save collection data
await collectionRepo.saveCollectionData(data);

// Get data by date range
const data = await collectionRepo.getCollectionDataByDateRange('2025-01-01', '2025-01-31');

// Get summary by date
const summary = await collectionRepo.getCollectionSummaryByDate('2025-01-27');

// Check if data exists
const exists = await collectionRepo.checkDataExists(123, '2025-01-27');
```

### WorkerRepository

Manages worker data and operations:

```javascript
const workerRepo = new WorkerRepository();

// Get active workers
const workers = await workerRepo.getActiveWorkers();

// Get worker by chat ID
const worker = await workerRepo.getWorkerByChatId('123456789');

// Create new worker
await workerRepo.createWorker({
    name: 'John Doe',
    telegram_chat_id: '123456789',
    role: 'collector'
});
```

### MaintenanceRepository

Handles maintenance task operations:

```javascript
const maintenanceRepo = new MaintenanceRepository();

// Get all tasks
const tasks = await maintenanceRepo.getAllMaintenanceTasks();

// Get overdue tasks
const overdue = await maintenanceRepo.getOverdueMaintenanceTasks();

// Create new task
await maintenanceRepo.createMaintenanceTask({
    device_id: 123,
    task_type: 'filter_replacement',
    description: 'Replace water filter',
    priority: 'high'
});
```

## 🔄 Migration from Old Architecture

### Phase 1: Foundation (Current)
- ✅ New database infrastructure created
- ✅ Connection manager with pooling
- ✅ Repository pattern implemented
- ✅ Comprehensive testing framework

### Phase 2: Migration (Next)
- 🔄 Update existing code to use new repositories
- 🔄 Replace global sequelize imports
- 🔄 Update schedulers and command handlers

### Phase 3: Cleanup (Future)
- ⏳ Remove old sequelize.js global connection
- ⏳ Remove all sequelize.close() calls
- ⏳ Clean up unused imports

## 🧪 Testing

### Running Tests

```bash
# Run all database tests
npm test tests/database/

# Run specific test file
npm test tests/database/connection-manager.test.js
```

### Test Coverage

- Connection manager initialization and health checks
- Repository data validation and sanitization
- Error handling and edge cases
- Transaction support and rollback scenarios

## 📈 Monitoring

### Health Checks

The connection manager automatically performs health checks every 30 seconds:

```javascript
// Manual health check
const isHealthy = await connectionManager.healthCheck();

// Get connection status
const status = connectionManager.getPoolStatus();
```

### Logging

All database operations are logged with appropriate levels:

- `DEBUG` - Query execution details
- `INFO` - Successful operations
- `WARN` - Non-critical issues
- `ERROR` - Failed operations

## 🚨 Error Handling

### Connection Errors

- Automatic reconnection on connection loss
- Retry logic with exponential backoff
- Graceful degradation when database is unavailable

### Transaction Errors

- Automatic rollback on transaction failure
- Retry logic for transient failures
- Comprehensive error logging

### Validation Errors

- Input validation before database operations
- Data sanitization to prevent injection attacks
- Clear error messages for debugging

## 🔒 Security

### Data Sanitization

- Automatic sanitization of all input data
- SQL injection prevention
- Date format validation and conversion

### Connection Security

- Encrypted connections (SSL/TLS)
- Connection timeout protection
- Pool size limits to prevent resource exhaustion

## 📚 Best Practices

### Repository Usage

1. **Always use repositories** instead of direct database access
2. **Validate input data** before database operations
3. **Handle errors gracefully** with proper logging
4. **Use transactions** for multi-step operations

### Connection Management

1. **Don't close connections manually** - the connection manager handles this
2. **Use health checks** to monitor database status
3. **Configure appropriate pool sizes** for your workload
4. **Monitor connection usage** to prevent exhaustion

### Performance

1. **Use appropriate indexes** for your queries
2. **Batch operations** when possible
3. **Monitor query performance** and optimize slow queries
4. **Use connection pooling** to reduce connection overhead

## 🆘 Troubleshooting

### Common Issues

1. **Connection Pool Exhaustion**
   - Increase `DB_POOL_MAX` setting
   - Check for connection leaks
   - Monitor connection usage

2. **Health Check Failures**
   - Verify database connectivity
   - Check network connectivity
   - Review database logs

3. **Transaction Failures**
   - Check for deadlocks
   - Verify transaction timeout settings
   - Review error logs for specific failures

### Debug Mode

Enable debug logging to see detailed database operations:

```bash
DB_LOGGING=true node your-app.js
```

## 📞 Support

For issues or questions about the database architecture:

1. Check the logs for error details
2. Review the configuration settings
3. Test with the migration script
4. Consult the troubleshooting guide above

---

**Version**: 1.0  
**Last Updated**: 2025-01-27  
**Status**: Phase 1 Complete - Ready for Migration
