import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Database Configuration
 * Centralized configuration for database connections and settings
 */
export const databaseConfig = {
    // Connection settings
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dialect: 'postgres',

    // Connection pool settings
    pool: {
        max: parseInt(process.env.DB_POOL_MAX) || 20,           // Maximum connections
        min: parseInt(process.env.DB_POOL_MIN) || 5,            // Minimum connections
        acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 60000, // Max time to get connection (60s)
        idle: parseInt(process.env.DB_POOL_IDLE) || 10000,      // Max idle time (10s)
        evict: parseInt(process.env.DB_POOL_EVICT) || 1000,     // Eviction check interval (1s)
        handleDisconnects: true                                 // Auto-reconnect on disconnect
    },

    // Retry settings
    retry: {
        max: parseInt(process.env.DB_RETRY_MAX) || 3,           // Maximum retry attempts
        timeout: parseInt(process.env.DB_RETRY_TIMEOUT) || 5000 // Retry timeout (5s)
    },

    // Connection timeout settings
    dialectOptions: {
        connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT) || 30000,  // Connection timeout (30s)
        requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT) || 30000   // Request timeout (30s)
    },

    // Logging settings
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,

    // Health check settings
    healthCheck: {
        interval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL) || 30000,  // Health check interval (30s)
        timeout: parseInt(process.env.DB_HEALTH_CHECK_TIMEOUT) || 5000      // Health check timeout (5s)
    },

    // Performance settings
    performance: {
        queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000,      // Query timeout (30s)
        transactionTimeout: parseInt(process.env.DB_TRANSACTION_TIMEOUT) || 60000, // Transaction timeout (60s)
        maxRetries: parseInt(process.env.DB_MAX_RETRIES) || 3               // Max retries for failed operations
    }
};

/**
 * Validate database configuration
 */
export const validateDatabaseConfig = () => {
    const required = ['database', 'username', 'password', 'host'];
    const missing = required.filter(key => !databaseConfig[key]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required database configuration: ${missing.join(', ')}`);
    }

    // Validate numeric values
    const numericFields = ['port', 'pool.max', 'pool.min', 'pool.acquire', 'pool.idle', 'pool.evict'];
    for (const field of numericFields) {
        const value = field.split('.').reduce((obj, key) => obj[key], databaseConfig);
        if (isNaN(value) || value < 0) {
            throw new Error(`Invalid database configuration for ${field}: ${value}`);
        }
    }

    return true;
};

/**
 * Get database connection string
 */
export const getDatabaseConnectionString = () => {
    const { host, port, database, username, password } = databaseConfig;
    return `postgresql://${username}:${password}@${host}:${port}/${database}`;
};

/**
 * Get database configuration for specific environment
 */
export const getDatabaseConfigForEnvironment = (environment = 'development') => {
    const baseConfig = { ...databaseConfig };
    
    switch (environment) {
        case 'production':
            return {
                ...baseConfig,
                pool: {
                    ...baseConfig.pool,
                    max: 50,        // Higher pool size for production
                    min: 10,        // Higher minimum connections
                    acquire: 120000, // Longer acquire timeout
                    idle: 30000     // Longer idle timeout
                },
                logging: false,     // Disable logging in production
                healthCheck: {
                    ...baseConfig.healthCheck,
                    interval: 60000 // Less frequent health checks
                }
            };
            
        case 'test':
            return {
                ...baseConfig,
                database: `${baseConfig.database}_test`, // Use test database
                pool: {
                    ...baseConfig.pool,
                    max: 5,         // Smaller pool for tests
                    min: 1,         // Minimal connections
                    acquire: 30000, // Shorter acquire timeout
                    idle: 5000      // Shorter idle timeout
                },
                logging: false,     // Disable logging in tests
                healthCheck: {
                    ...baseConfig.healthCheck,
                    interval: 10000 // More frequent health checks
                }
            };
            
        case 'development':
        default:
            return baseConfig;
    }
};

/**
 * Database table configurations
 */
export const tableConfigs = {
    collections: {
        name: 'collections',
        indexes: [
            { columns: ['device_id', 'date'], unique: false },
            { columns: ['date'], unique: false },
            { columns: ['collector_nik'], unique: false },
            { columns: ['created_at'], unique: false }
        ]
    },
    workers: {
        name: 'workers',
        indexes: [
            { columns: ['telegram_chat_id'], unique: true },
            { columns: ['name'], unique: true },
            { columns: ['active'], unique: false },
            { columns: ['role'], unique: false }
        ]
    },
    devices: {
        name: 'devices',
        indexes: [
            { columns: ['id'], unique: true },
            { columns: ['name'], unique: false },
            { columns: ['active'], unique: false }
        ]
    }
};

/**
 * Database migration settings
 */
export const migrationConfig = {
    directory: './database/migrations',
    tableName: 'sequelize_meta',
    schema: 'public'
};

/**
 * Backup configuration
 */
export const backupConfig = {
    enabled: process.env.DB_BACKUP_ENABLED === 'true',
    schedule: process.env.DB_BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    retention: parseInt(process.env.DB_BACKUP_RETENTION) || 30, // Keep 30 days
    directory: process.env.DB_BACKUP_DIRECTORY || './backups'
};

export default databaseConfig;
