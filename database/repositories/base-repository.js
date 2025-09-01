import { databaseService } from '../database-service.js';
import { logger } from '../../logger/index.js';

/**
 * Base Repository Class
 * Provides common database operations for all repositories
 */
export class BaseRepository {
    constructor(tableName) {
        this.tableName = tableName;
        this.db = databaseService;
    }

    /**
     * Find a record by ID
     */
    async findById(id) {
        const query = `SELECT * FROM ${this.tableName} WHERE id = :id LIMIT 1`;
        const result = await this.db.executeQueryOne(query, { id });
        
        if (result) {
            logger.debug(`Found ${this.tableName} record with id: ${id}`);
        } else {
            logger.debug(`No ${this.tableName} record found with id: ${id}`);
        }
        
        return result;
    }

    /**
     * Find all records with optional filters
     */
    async findAll(filters = {}, options = {}) {
        let query = `SELECT * FROM ${this.tableName}`;
        const params = {};
        
        // Build WHERE clause from filters
        if (Object.keys(filters).length > 0) {
            const conditions = Object.keys(filters).map((key, index) => {
                params[key] = filters[key];
                return `${key} = :${key}`;
            }).join(' AND ');
            
            query += ` WHERE ${conditions}`;
        }
        
        // Add ORDER BY clause
        if (options.orderBy) {
            query += ` ORDER BY ${options.orderBy}`;
            if (options.orderDirection) {
                query += ` ${options.orderDirection.toUpperCase()}`;
            }
        }
        
        // Add LIMIT clause
        if (options.limit) {
            query += ` LIMIT ${options.limit}`;
        }
        
        // Add OFFSET clause
        if (options.offset) {
            query += ` OFFSET ${options.offset}`;
        }
        
        const results = await this.db.executeQuery(query, params);
        logger.debug(`Found ${results.length} ${this.tableName} records`);
        
        return results;
    }

    /**
     * Find one record with filters
     */
    async findOne(filters = {}) {
        const results = await this.findAll(filters, { limit: 1 });
        return results[0] || null;
    }

    /**
     * Count records with optional filters
     */
    async count(filters = {}) {
        let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        const params = {};
        
        if (Object.keys(filters).length > 0) {
            const conditions = Object.keys(filters).map((key, index) => {
                params[key] = filters[key];
                return `${key} = :${key}`;
            }).join(' AND ');
            
            query += ` WHERE ${conditions}`;
        }
        
        const result = await this.db.executeQueryOne(query, params);
        return result ? result.count : 0;
    }

    /**
     * Create a new record
     */
    async create(data) {
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(key => `:${key}`).join(', ');
        
        const query = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
        const result = await this.db.executeQueryOne(query, data);
        
        logger.info(`Created new ${this.tableName} record with id: ${result.id}`);
        return result;
    }

    /**
     * Update a record by ID
     */
    async update(id, data) {
        const setClause = Object.keys(data).map(key => `${key} = :${key}`).join(', ');
        
        const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = :id RETURNING *`;
        const params = { ...data, id };
        const result = await this.db.executeQueryOne(query, params);
        
        if (result) {
            logger.info(`Updated ${this.tableName} record with id: ${id}`);
        } else {
            logger.warn(`No ${this.tableName} record found to update with id: ${id}`);
        }
        
        return result;
    }

    /**
     * Update multiple records with filters
     */
    async updateMany(filters, data) {
        const setClause = Object.keys(data).map(key => `${key} = :set_${key}`).join(', ');
        const whereClause = Object.keys(filters).map(key => `${key} = :where_${key}`).join(' AND ');
        
        const params = {};
        Object.keys(data).forEach(key => {
            params[`set_${key}`] = data[key];
        });
        Object.keys(filters).forEach(key => {
            params[`where_${key}`] = filters[key];
        });
        
        const query = `UPDATE ${this.tableName} SET ${setClause} WHERE ${whereClause} RETURNING *`;
        const results = await this.db.executeQuery(query, params);
        
        logger.info(`Updated ${results.length} ${this.tableName} records`);
        return results;
    }

    /**
     * Delete a record by ID
     */
    async delete(id) {
        const query = `DELETE FROM ${this.tableName} WHERE id = :id RETURNING *`;
        const result = await this.db.executeQueryOne(query, { id });
        
        if (result) {
            logger.info(`Deleted ${this.tableName} record with id: ${id}`);
        } else {
            logger.warn(`No ${this.tableName} record found to delete with id: ${id}`);
        }
        
        return result;
    }

    /**
     * Delete multiple records with filters
     */
    async deleteMany(filters) {
        const whereClause = Object.keys(filters).map(key => `${key} = :${key}`).join(' AND ');
        
        const query = `DELETE FROM ${this.tableName} WHERE ${whereClause} RETURNING *`;
        const results = await this.db.executeQuery(query, filters);
        
        logger.info(`Deleted ${results.length} ${this.tableName} records`);
        return results;
    }

    /**
     * Check if a record exists
     */
    async exists(filters) {
        const count = await this.count(filters);
        return count > 0;
    }

    /**
     * Find records with pagination
     */
    async findPaginated(filters = {}, page = 1, limit = 10, options = {}) {
        const offset = (page - 1) * limit;
        const results = await this.findAll(filters, { 
            ...options, 
            limit, 
            offset 
        });
        
        const total = await this.count(filters);
        const totalPages = Math.ceil(total / limit);
        
        return {
            data: results,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }

    /**
     * Execute a custom query
     */
    async executeCustomQuery(query, params = {}) {
        return await this.db.executeQuery(query, params);
    }

    /**
     * Execute a custom query that returns one result
     */
    async executeCustomQueryOne(query, params = {}) {
        return await this.db.executeQueryOne(query, params);
    }

    /**
     * Execute multiple operations in a transaction
     */
    async executeTransaction(operations) {
        return await this.db.executeTransaction(operations);
    }

    /**
     * Get table name
     */
    getTableName() {
        return this.tableName;
    }

    /**
     * Validate data before database operations
     */
    validateData(data, requiredFields = []) {
        const errors = [];
        
        // Check required fields
        for (const field of requiredFields) {
            if (!(field in data) || data[field] === null || data[field] === undefined) {
                errors.push(`Field '${field}' is required`);
            }
        }
        
        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }
        
        return true;
    }

    /**
     * Sanitize data for database operations
     */
    sanitizeData(data) {
        const sanitized = {};
        
        for (const [key, value] of Object.entries(data)) {
            // Remove undefined values
            if (value !== undefined) {
                // Convert dates to ISO strings
                if (value instanceof Date) {
                    sanitized[key] = value.toISOString();
                } else {
                    sanitized[key] = value;
                }
            }
        }
        
        return sanitized;
    }
}
