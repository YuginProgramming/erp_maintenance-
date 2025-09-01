import { connectionManager } from './connection-manager.js';
import { logger } from '../logger/index.js';

/**
 * Database Service Layer
 * Provides high-level database operations with proper connection management
 */
class DatabaseService {
    constructor() {
        this.connectionManager = connectionManager;
    }

    /**
     * Execute a raw SQL query
     */
    async executeQuery(query, params = []) {
        const startTime = Date.now();
        
        try {
            const connection = await this.connectionManager.getConnection();
            
            const result = await connection.query(query, {
                replacements: params,
                type: connection.QueryTypes.SELECT
            });
            
            const duration = Date.now() - startTime;
            logger.debug(`Query executed successfully in ${duration}ms`, { 
                query: query.substring(0, 100) + '...', 
                paramCount: params.length 
            });
            
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Database query failed:', { 
                query: query.substring(0, 100) + '...', 
                params, 
                duration,
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Execute a raw SQL query that returns a single result
     */
    async executeQueryOne(query, params = []) {
        const results = await this.executeQuery(query, params);
        return results[0] || null;
    }

    /**
     * Execute a raw SQL query for data modification (INSERT, UPDATE, DELETE)
     */
    async executeUpdate(query, params = []) {
        const startTime = Date.now();
        
        try {
            const connection = await this.connectionManager.getConnection();
            
            const result = await connection.query(query, {
                replacements: params,
                type: connection.QueryTypes.UPDATE
            });
            
            const duration = Date.now() - startTime;
            logger.debug(`Update query executed successfully in ${duration}ms`, { 
                query: query.substring(0, 100) + '...', 
                paramCount: params.length,
                affectedRows: result[1] 
            });
            
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Database update failed:', { 
                query: query.substring(0, 100) + '...', 
                params, 
                duration,
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Execute multiple operations in a transaction
     */
    async executeTransaction(operations) {
        const startTime = Date.now();
        
        try {
            const connection = await this.connectionManager.getConnection();
            const transaction = await connection.transaction();
            
            logger.debug('Starting database transaction', { operationCount: operations.length });
            
            const results = [];
            for (let i = 0; i < operations.length; i++) {
                const operation = operations[i];
                try {
                    const result = await operation(transaction);
                    results.push(result);
                    logger.debug(`Transaction operation ${i + 1}/${operations.length} completed`);
                } catch (error) {
                    logger.error(`Transaction operation ${i + 1}/${operations.length} failed:`, error);
                    throw error;
                }
            }
            
            await transaction.commit();
            
            const duration = Date.now() - startTime;
            logger.info(`Transaction completed successfully in ${duration}ms`, { 
                operationCount: operations.length,
                resultsCount: results.length 
            });
            
            return results;
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Database transaction failed:', { 
                operationCount: operations.length,
                duration,
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Execute a transaction with automatic retry on failure
     */
    async executeTransactionWithRetry(operations, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.executeTransaction(operations);
            } catch (error) {
                lastError = error;
                logger.warn(`Transaction attempt ${attempt}/${maxRetries} failed:`, error.message);
                
                if (attempt < maxRetries) {
                    // Wait before retry (exponential backoff)
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        logger.error(`Transaction failed after ${maxRetries} attempts`);
        throw lastError;
    }

    /**
     * Check database connectivity
     */
    async healthCheck() {
        try {
            const result = await this.executeQueryOne('SELECT 1 as health_check');
            return result && result.health_check === 1;
        } catch (error) {
            logger.error('Database health check failed:', error);
            return false;
        }
    }

    /**
     * Get database connection status
     */
    getConnectionStatus() {
        return this.connectionManager.getPoolStatus();
    }

    /**
     * Force reconnection
     */
    async reconnect() {
        return await this.connectionManager.reconnect();
    }

    /**
     * Execute a batch of queries
     */
    async executeBatch(queries) {
        const startTime = Date.now();
        const results = [];
        
        logger.debug(`Executing batch of ${queries.length} queries`);
        
        for (let i = 0; i < queries.length; i++) {
            const { query, params = [] } = queries[i];
            
            try {
                const result = await this.executeQuery(query, params);
                results.push({ success: true, result, index: i });
                logger.debug(`Batch query ${i + 1}/${queries.length} completed`);
            } catch (error) {
                results.push({ success: false, error: error.message, index: i });
                logger.error(`Batch query ${i + 1}/${queries.length} failed:`, error);
                
                // Decide whether to continue or stop on first error
                // For now, we'll continue and collect all results
            }
        }
        
        const duration = Date.now() - startTime;
        const successCount = results.filter(r => r.success).length;
        
        logger.info(`Batch execution completed in ${duration}ms`, { 
            total: queries.length,
            successful: successCount,
            failed: queries.length - successCount 
        });
        
        return results;
    }

    /**
     * Execute a query with timeout
     */
    async executeQueryWithTimeout(query, params = [], timeoutMs = 30000) {
        return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Query timeout after ${timeoutMs}ms`));
            }, timeoutMs);
            
            try {
                const result = await this.executeQuery(query, params);
                clearTimeout(timeout);
                resolve(result);
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }
}

// Create singleton instance
export const databaseService = new DatabaseService();

export default databaseService;
