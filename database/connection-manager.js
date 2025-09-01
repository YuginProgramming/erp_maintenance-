import { Sequelize } from 'sequelize';
import { logger } from '../logger/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Database Connection Manager
 * Manages connection pooling and lifecycle for the application
 */
class DatabaseConnectionManager {
    constructor() {
        this.pool = null;
        this.healthCheckInterval = null;
        this.isHealthy = false;
        this.initialized = false;
        this.config = {
            database: process.env.DB_NAME,
            username: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 5432,
            dialect: 'postgres',
            logging: (msg) => logger.debug('Sequelize:', msg),
            pool: {
                max: 20,                    // Maximum connections
                min: 5,                     // Minimum connections
                acquire: 60000,             // Maximum time to get connection (60s)
                idle: 10000,                // Maximum idle time (10s)
                evict: 1000,                // Eviction check interval (1s)
                handleDisconnects: true     // Auto-reconnect on disconnect
            },
            retry: {
                max: 3,                     // Maximum retry attempts
                timeout: 5000               // Retry timeout (5s)
            },
            dialectOptions: {
                connectTimeout: 30000,      // Connection timeout (30s)
                requestTimeout: 30000       // Request timeout (30s)
            }
        };
    }

    /**
     * Initialize the connection manager
     */
    async initialize() {
        if (this.initialized) {
            logger.warn('Database connection manager already initialized');
            return;
        }

        try {
            logger.info('Initializing database connection manager...');
            
            // Validate required environment variables
            this.validateConfig();
            
            // Create Sequelize instance with connection pool
            this.pool = new Sequelize(this.config);
            
            // Test the connection
            await this.pool.authenticate();
            
            this.isHealthy = true;
            this.initialized = true;
            
            // Start health monitoring
            this.startHealthCheck();
            
            logger.info('Database connection manager initialized successfully');
            logger.info(`Connection pool configured: max=${this.config.pool.max}, min=${this.config.pool.min}`);
            
        } catch (error) {
            logger.error('Failed to initialize database connection manager:', error);
            logger.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            this.isHealthy = false;
            this.initialized = false;
            throw new Error(`Database initialization failed: ${error.message}`);
        }
    }

    /**
     * Validate configuration
     */
    validateConfig() {
        const required = ['database', 'username', 'password', 'host'];
        const missing = required.filter(key => !this.config[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required database configuration: ${missing.join(', ')}`);
        }
    }

    /**
     * Get a database connection from the pool
     */
    async getConnection() {
        if (!this.initialized) {
            throw new Error('Database connection manager not initialized');
        }
        
        if (!this.isHealthy) {
            throw new Error('Database connection manager is not healthy');
        }
        
        try {
            // Test connection health
            await this.pool.authenticate();
            return this.pool;
        } catch (error) {
            logger.error('Failed to get database connection:', error);
            this.isHealthy = false;
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }

    /**
     * Perform health check on the database connection
     */
    async healthCheck() {
        if (!this.pool) {
            this.isHealthy = false;
            return false;
        }

        try {
            await this.pool.authenticate();
            this.isHealthy = true;
            return true;
        } catch (error) {
            logger.error('Database health check failed:', error);
            this.isHealthy = false;
            return false;
        }
    }

    /**
     * Start periodic health checks
     */
    startHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        this.healthCheckInterval = setInterval(async () => {
            const wasHealthy = this.isHealthy;
            const isHealthy = await this.healthCheck();
            
            if (wasHealthy && !isHealthy) {
                logger.error('Database health check failed - connection lost');
            } else if (!wasHealthy && isHealthy) {
                logger.info('Database health check passed - connection restored');
            }
        }, 30000); // Check every 30 seconds

        logger.info('Database health monitoring started');
    }

    /**
     * Stop health monitoring
     */
    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
            logger.info('Database health monitoring stopped');
        }
    }

    /**
     * Get connection pool status
     */
    getPoolStatus() {
        if (!this.pool) {
            return {
                initialized: false,
                healthy: false,
                pool: null
            };
        }

        return {
            initialized: this.initialized,
            healthy: this.isHealthy,
            pool: {
                max: this.config.pool.max,
                min: this.config.pool.min,
                // Note: Sequelize doesn't expose real-time pool stats
                // This would need to be implemented with custom monitoring
            }
        };
    }

    /**
     * Gracefully shutdown the connection manager
     */
    async shutdown() {
        logger.info('Shutting down database connection manager...');
        
        try {
            // Stop health monitoring
            this.stopHealthCheck();
            
            // Close the connection pool
            if (this.pool) {
                await this.pool.close();
                this.pool = null;
            }
            
            this.isHealthy = false;
            this.initialized = false;
            
            logger.info('Database connection manager shut down successfully');
        } catch (error) {
            logger.error('Error during database connection manager shutdown:', error);
            throw error;
        }
    }

    /**
     * Force reconnection (useful for recovery)
     */
    async reconnect() {
        logger.info('Forcing database reconnection...');
        
        try {
            // Shutdown current connection
            await this.shutdown();
            
            // Reinitialize
            await this.initialize();
            
            logger.info('Database reconnection completed successfully');
        } catch (error) {
            logger.error('Database reconnection failed:', error);
            throw error;
        }
    }
}

// Create singleton instance
export const connectionManager = new DatabaseConnectionManager();

// Don't auto-initialize on module load - let the application control initialization
// connectionManager.initialize().catch(error => {
//     logger.error('Failed to initialize connection manager on startup:', error);
// });

// Graceful shutdown on process termination
process.on('SIGINT', async () => {
    await connectionManager.shutdown();
});

process.on('SIGTERM', async () => {
    await connectionManager.shutdown();
});

export default connectionManager;
