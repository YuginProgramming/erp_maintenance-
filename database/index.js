// Export database connection manager
export { connectionManager } from './connection-manager.js';

// Export database service
export { databaseService } from './database-service.js';

// Export all repositories
export * from './repositories/index.js';

// Export configuration
export { 
    databaseConfig, 
    validateDatabaseConfig, 
    getDatabaseConnectionString,
    getDatabaseConfigForEnvironment,
    tableConfigs,
    migrationConfig,
    backupConfig
} from './config.js';

// Legacy export removed - use new architecture instead
