import { BaseRepository } from './base-repository.js';
import { logger } from '../../logger/index.js';
import { cleanNumericString } from '../../utils/data-sanitizer.js';

/**
 * Collection Repository
 * Handles all collection-related database operations
 */
export class CollectionRepository extends BaseRepository {
    constructor() {
        super('collections');
    }

    /**
     * Save collection data to database
     */
    async saveCollectionData(collectionData) {
        try {
            // Validate required fields
            this.validateData(collectionData, ['device_id', 'date']);
            
            // Sanitize data to match actual database schema and clean malformed numeric values
            const sanitizedBanknotes = cleanNumericString(collectionData.banknotes);
            const sanitizedCoins = cleanNumericString(collectionData.coins);
            const sanitizedTotal = cleanNumericString(collectionData.total_sum);
            
            const data = this.sanitizeData({
                device_id: collectionData.device_id,
                date: collectionData.date,
                sum_banknotes: sanitizedBanknotes,
                sum_coins: sanitizedCoins,
                total_sum: sanitizedTotal || (sanitizedBanknotes + sanitizedCoins),
                note: collectionData.description || null,
                machine: collectionData.machine || `Device ${collectionData.device_id}`,
                collector_id: collectionData.collector_id || null,
                collector_nik: collectionData.collector_nik || null,
                created_at: new Date(),
                updated_at: new Date()
            });

            const result = await this.create(data);
            logger.debug(`Saved collection data for device ${collectionData.device_id} on ${collectionData.date}`);
            
            return result;
        } catch (error) {
            logger.error('Failed to save collection data:', { 
                collectionData, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get collection data by date range
     */
    async getCollectionDataByDateRange(startDate, endDate, options = {}) {
        try {
            const query = `
                SELECT * FROM ${this.tableName} 
                WHERE date BETWEEN :startDate AND :endDate 
                ORDER BY date DESC, device_id ASC
            `;
            
            const results = await this.db.executeQuery(query, { startDate, endDate });
            logger.debug(`Retrieved ${results.length} collection records for date range ${startDate} to ${endDate}`);
            
            return results;
        } catch (error) {
            logger.error('Failed to get collection data by date range:', { 
                startDate, 
                endDate, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get collection data by device and date range
     */
    async getCollectionDataByDevice(deviceId, startDate, endDate) {
        try {
            const query = `
                SELECT * FROM ${this.tableName} 
                WHERE device_id = :deviceId 
                AND date BETWEEN :startDate AND :endDate 
                ORDER BY date DESC
            `;
            
            const results = await this.db.executeQuery(query, { deviceId, startDate, endDate });
            logger.debug(`Retrieved ${results.length} collection records for device ${deviceId} from ${startDate} to ${endDate}`);
            
            return results;
        } catch (error) {
            logger.error('Failed to get collection data by device:', { 
                deviceId, 
                startDate, 
                endDate, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get collection summary by date
     */
    async getCollectionSummaryByDate(date) {
        try {
            const query = `
                SELECT 
                    device_id,
                    SUM(sum_banknotes) as total_banknotes,
                    SUM(sum_coins) as total_coins,
                    COUNT(*) as collection_count,
                    MAX(updated_at) as last_collection_time
                FROM ${this.tableName} 
                WHERE date = :date 
                GROUP BY device_id
                ORDER BY device_id
            `;
            
            const results = await this.db.executeQuery(query, { date });
            logger.debug(`Retrieved collection summary for ${results.length} devices on ${date}`);
            
            return results;
        } catch (error) {
            logger.error('Failed to get collection summary by date:', { 
                date, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Check if collection data exists for a device on a specific date
     */
    async checkDataExists(deviceId, date) {
        try {
            const query = `
                SELECT COUNT(*) as count 
                FROM ${this.tableName} 
                WHERE device_id = :deviceId AND DATE(date) = :date
            `;
            
            const result = await this.db.executeQueryOne(query, { deviceId, date });
            const exists = result && result.count > 0;
            
            logger.debug(`Collection data exists for device ${deviceId} on ${date}: ${exists}`);
            return exists;
        } catch (error) {
            logger.error('Failed to check if collection data exists:', { 
                deviceId, 
                date, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get collection data by collector
     */
    async getCollectionDataByCollector(collectorNik, startDate, endDate) {
        try {
            const query = `
                SELECT 
                    c.*,
                    d.name as device_name
                FROM ${this.tableName} c
                LEFT JOIN devices d ON c.device_id = d.id
                WHERE c.collector_nik = :collectorNik 
                AND c.date BETWEEN :startDate AND :endDate 
                ORDER BY c.date DESC, c.device_id ASC
            `;
            
            const results = await this.db.executeQuery(query, { collectorNik, startDate, endDate });
            logger.debug(`Retrieved ${results.length} collection records for collector ${collectorNik} from ${startDate} to ${endDate}`);
            
            return results;
        } catch (error) {
            logger.error('Failed to get collection data by collector:', { 
                collectorNik, 
                startDate, 
                endDate, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get collection statistics for a date range
     */
    async getCollectionStatistics(startDate, endDate) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_collections,
                    COUNT(DISTINCT device_id) as devices_with_collections,
                    SUM(sum_banknotes) as total_banknotes,
                    SUM(sum_coins) as total_coins,
                    SUM(total_sum) as total_amount,
                    COUNT(DISTINCT collector_nik) as unique_collectors,
                    AVG(total_sum) as average_collection_amount
                FROM ${this.tableName} 
                WHERE date BETWEEN :startDate AND :endDate
            `;
            
            const result = await this.db.executeQueryOne(query, { startDate, endDate });
            logger.debug(`Retrieved collection statistics for date range ${startDate} to ${endDate}`);
            
            return result;
        } catch (error) {
            logger.error('Failed to get collection statistics:', { 
                startDate, 
                endDate, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get devices with missing collection data for a date
     */
    async getDevicesWithMissingData(date, deviceIds) {
        try {
            if (!deviceIds || deviceIds.length === 0) {
                return [];
            }

            const placeholders = deviceIds.map((_, index) => `:deviceId${index}`).join(',');
            const query = `
                SELECT d.id, d.name
                FROM devices d
                WHERE d.id IN (${placeholders})
                AND d.id NOT IN (
                    SELECT DISTINCT device_id 
                    FROM ${this.tableName} 
                    WHERE date = :date
                )
                ORDER BY d.id
            `;
            
            const params = {};
            deviceIds.forEach((id, index) => {
                params[`deviceId${index}`] = id;
            });
            params.date = date;
            
            const results = await this.db.executeQuery(query, params);
            logger.debug(`Found ${results.length} devices with missing collection data for ${date}`);
            
            return results;
        } catch (error) {
            logger.error('Failed to get devices with missing data:', { 
                date, 
                deviceIds: deviceIds?.length, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Bulk insert collection data
     */
    async bulkInsertCollectionData(collectionDataArray) {
        if (!collectionDataArray || collectionDataArray.length === 0) {
            return [];
        }

        try {
            const operations = collectionDataArray.map(data => async (transaction) => {
                const sanitizedData = this.sanitizeData({
                    device_id: data.device_id,
                    date: data.date,
                    banknotes: data.banknotes || 0,
                    coins: data.coins || 0,
                    collector_id: data.collector_id || null,
                    collector_nik: data.collector_nik || null,
                    description: data.description || null,
                    created_at: new Date(),
                    updated_at: new Date()
                });

                const columns = Object.keys(sanitizedData).join(', ');
                const placeholders = Object.keys(sanitizedData).map((_, index) => `:param${index}`).join(', ');
                const values = Object.values(sanitizedData);
                
                const query = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
                return await transaction.query(query, {
                    replacements: values,
                    type: transaction.QueryTypes.SELECT
                });
            });

            const results = await this.executeTransaction(operations);
            logger.info(`Bulk inserted ${results.length} collection records`);
            
            return results;
        } catch (error) {
            logger.error('Failed to bulk insert collection data:', { 
                count: collectionDataArray.length, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Delete collection data for a specific date range
     */
    async deleteCollectionDataByDateRange(startDate, endDate) {
        try {
            const query = `
                DELETE FROM ${this.tableName} 
                WHERE date BETWEEN :startDate AND :endDate 
                RETURNING *
            `;
            
            const results = await this.db.executeQuery(query, { startDate, endDate });
            logger.info(`Deleted ${results.length} collection records for date range ${startDate} to ${endDate}`);
            
            return results;
        } catch (error) {
            logger.error('Failed to delete collection data by date range:', { 
                startDate, 
                endDate, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get recent collection activity
     */
    async getRecentCollectionActivity(limit = 50) {
        try {
            const query = `
                SELECT 
                    c.*,
                    d.name as device_name
                FROM ${this.tableName} c
                LEFT JOIN devices d ON c.device_id = d.id
                ORDER BY c.created_at DESC
                LIMIT :limit
            `;
            
            const results = await this.db.executeQuery(query, { limit });
            logger.debug(`Retrieved ${results.length} recent collection activities`);
            
            return results;
        } catch (error) {
            logger.error('Failed to get recent collection activity:', { 
                limit, 
                error: error.message 
            });
            throw error;
        }
    }
}
