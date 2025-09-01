import { BaseRepository } from './base-repository.js';
import { logger } from '../../logger/index.js';

/**
 * Worker Repository
 * Handles all worker-related database operations
 */
export class WorkerRepository extends BaseRepository {
    constructor() {
        super('workers');
    }

    /**
     * Get all active workers
     */
    async getActiveWorkers() {
        try {
            const results = await this.findAll({ active: true }, { 
                orderBy: 'name',
                orderDirection: 'ASC'
            });
            
            logger.debug(`Retrieved ${results.length} active workers`);
            return results;
        } catch (error) {
            logger.error('Failed to get active workers:', error);
            throw error;
        }
    }

    /**
     * Get worker by Telegram chat ID
     */
    async getWorkerByChatId(chatId) {
        try {
            const result = await this.findOne({ chat_id: chatId });
            
            if (result) {
                logger.debug(`Found worker with chat ID ${chatId}: ${result.name}`);
            } else {
                logger.debug(`No worker found with chat ID ${chatId}`);
            }
            
            return result;
        } catch (error) {
            logger.error('Failed to get worker by chat ID:', { chatId, error: error.message });
            throw error;
        }
    }

    /**
     * Get worker by name
     */
    async getWorkerByName(name) {
        try {
            const result = await this.findOne({ name });
            
            if (result) {
                logger.debug(`Found worker with name: ${name}`);
            } else {
                logger.debug(`No worker found with name: ${name}`);
            }
            
            return result;
        } catch (error) {
            logger.error('Failed to get worker by name:', { name, error: error.message });
            throw error;
        }
    }

    /**
     * Create a new worker
     */
    async createWorker(workerData) {
        try {
            // Validate required fields
            this.validateData(workerData, ['name', 'telegram_chat_id']);
            
            // Sanitize data to match actual database schema
            const data = this.sanitizeData({
                name: workerData.name,
                chat_id: workerData.telegram_chat_id,
                active: workerData.active !== undefined ? workerData.active : true,
                phone: workerData.phone || null,
                dialoguestatus: workerData.dialoguestatus || null
            });

            const result = await this.create(data);
            logger.info(`Created new worker: ${result.name} (ID: ${result.id})`);
            
            return result;
        } catch (error) {
            logger.error('Failed to create worker:', { workerData, error: error.message });
            throw error;
        }
    }

    /**
     * Update worker information
     */
    async updateWorker(workerId, updateData) {
        try {
            // Sanitize data
            const data = this.sanitizeData({
                ...updateData,
                updated_at: new Date()
            });

            const result = await this.update(workerId, data);
            
            if (result) {
                logger.info(`Updated worker ${workerId}: ${result.name}`);
            } else {
                logger.warn(`No worker found to update with ID: ${workerId}`);
            }
            
            return result;
        } catch (error) {
            logger.error('Failed to update worker:', { workerId, updateData, error: error.message });
            throw error;
        }
    }

    /**
     * Activate/deactivate a worker
     */
    async setWorkerActive(workerId, active) {
        try {
            const result = await this.update(workerId, { 
                active, 
                updated_at: new Date() 
            });
            
            if (result) {
                logger.info(`Set worker ${workerId} active status to: ${active}`);
            } else {
                logger.warn(`No worker found to update with ID: ${workerId}`);
            }
            
            return result;
        } catch (error) {
            logger.error('Failed to set worker active status:', { workerId, active, error: error.message });
            throw error;
        }
    }

    /**
     * Get workers by role
     */
    async getWorkersByRole(role) {
        try {
            const results = await this.findAll({ role, active: true }, { 
                orderBy: 'name',
                orderDirection: 'ASC'
            });
            
            logger.debug(`Retrieved ${results.length} active workers with role: ${role}`);
            return results;
        } catch (error) {
            logger.error('Failed to get workers by role:', { role, error: error.message });
            throw error;
        }
    }

    /**
     * Search workers by name or other criteria
     */
    async searchWorkers(searchTerm, options = {}) {
        try {
            const query = `
                SELECT * FROM ${this.tableName} 
                WHERE (
                    name ILIKE :searchTerm 
                    OR telegram_chat_id::text ILIKE :searchTerm
                    OR phone ILIKE :searchTerm
                    OR email ILIKE :searchTerm
                )
                ${options.activeOnly ? 'AND active = true' : ''}
                ORDER BY name ASC
                ${options.limit ? `LIMIT ${options.limit}` : ''}
            `;
            
            const results = await this.db.executeQuery(query, [`%${searchTerm}%`]);
            logger.debug(`Found ${results.length} workers matching search term: ${searchTerm}`);
            
            return results;
        } catch (error) {
            logger.error('Failed to search workers:', { searchTerm, error: error.message });
            throw error;
        }
    }

    /**
     * Get worker statistics
     */
    async getWorkerStatistics() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_workers,
                    COUNT(CASE WHEN active = true THEN 1 END) as active_workers,
                    COUNT(CASE WHEN active = false THEN 1 END) as inactive_workers
                FROM ${this.tableName}
            `;
            
            const result = await this.db.executeQueryOne(query);
            logger.debug('Retrieved worker statistics');
            
            return result;
        } catch (error) {
            logger.error('Failed to get worker statistics:', error);
            throw error;
        }
    }

    /**
     * Get workers with their collection statistics
     */
    async getWorkersWithCollectionStats(startDate, endDate) {
        try {
            const query = `
                SELECT 
                    w.*,
                    COUNT(c.id) as collection_count,
                    SUM(c.sum_banknotes + c.sum_coins) as total_collected,
                    MAX(c.date) as last_collection_date
                FROM ${this.tableName} w
                LEFT JOIN collections c ON w.name = c.collector_nik 
                    AND c.date BETWEEN :startDate AND :endDate
                WHERE w.active = true
                GROUP BY w.id, w.name, w.chat_id, w.phone, w.active, w.dialoguestatus
                ORDER BY total_collected DESC NULLS LAST, w.name ASC
            `;
            
            const results = await this.db.executeQuery(query, { startDate, endDate });
            logger.debug(`Retrieved ${results.length} workers with collection statistics`);
            
            return results;
        } catch (error) {
            logger.error('Failed to get workers with collection stats:', { 
                startDate, 
                endDate, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Bulk update worker status
     */
    async bulkUpdateWorkerStatus(workerIds, active) {
        if (!workerIds || workerIds.length === 0) {
            return [];
        }

        try {
            const placeholders = workerIds.map((_, index) => `:workerId${index}`).join(',');
            const query = `
                UPDATE ${this.tableName} 
                SET active = :active, updated_at = :updatedAt
                WHERE id IN (${placeholders})
                RETURNING *
            `;
            
            const params = [...workerIds, active, new Date()];
            const results = await this.db.executeQuery(query, params);
            
            logger.info(`Bulk updated ${results.length} workers active status to: ${active}`);
            return results;
        } catch (error) {
            logger.error('Failed to bulk update worker status:', { 
                workerIds: workerIds.length, 
                active, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get workers who haven't collected in a specified period
     */
    async getInactiveCollectors(daysSinceLastCollection = 7) {
        try {
            const query = `
                SELECT 
                    w.*,
                    MAX(c.date) as last_collection_date,
                    EXTRACT(DAYS FROM (CURRENT_DATE - MAX(c.date))) as days_since_last_collection
                FROM ${this.tableName} w
                LEFT JOIN collections c ON w.name = c.collector_nik
                WHERE w.active = true
                GROUP BY w.id, w.name, w.chat_id, w.phone, w.active, w.dialoguestatus
                HAVING MAX(c.date) IS NULL 
                OR EXTRACT(DAYS FROM (CURRENT_DATE - MAX(c.date))) > :daysSinceLastCollection
                ORDER BY days_since_last_collection DESC NULLS FIRST
            `;
            
            const results = await this.db.executeQuery(query, { daysSinceLastCollection });
            logger.debug(`Found ${results.length} inactive collectors (no collection in ${daysSinceLastCollection} days)`);
            
            return results;
        } catch (error) {
            logger.error('Failed to get inactive collectors:', { 
                daysSinceLastCollection, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Delete worker (soft delete by setting active to false)
     */
    async deleteWorker(workerId) {
        try {
            const result = await this.setWorkerActive(workerId, false);
            logger.info(`Soft deleted worker ${workerId}`);
            return result;
        } catch (error) {
            logger.error('Failed to delete worker:', { workerId, error: error.message });
            throw error;
        }
    }

    /**
     * Hard delete worker (permanent removal)
     */
    async hardDeleteWorker(workerId) {
        try {
            const result = await this.delete(workerId);
            logger.info(`Hard deleted worker ${workerId}`);
            return result;
        } catch (error) {
            logger.error('Failed to hard delete worker:', { workerId, error: error.message });
            throw error;
        }
    }
}
