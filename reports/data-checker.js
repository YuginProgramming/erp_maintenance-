import { connectionManager } from "../database/connection-manager.js";
import { CollectionRepository } from "../database/repositories/collection-repository.js";
import { logger } from "../logger/index.js";

// Function to check current collection data for debugging
export const checkCurrentCollectionData = async (targetDate) => {
    try {
        await connectionManager.initialize();
        const isConnected = true;
        if (!isConnected) {
            throw new Error('Database connection failed');
        }
        
        const collectionRepo = new CollectionRepository();
        const startDate = new Date(`${targetDate} 00:00:00`);
        const endDate = new Date(`${targetDate} 23:59:59`);
        const collections = await collectionRepo.getCollectionDataByDateRange(startDate, endDate);
        
        logger.info(`Found ${collections.length} collection entries for ${targetDate}`);
        
        if (collections.length > 0) {
            collections.forEach((entry, index) => {
                logger.info(`Entry ${index + 1}: Device ${entry.device_id} (${entry.machine}) - ${entry.total_sum} грн by ${entry.collector_nik || 'Unknown'}`);
            });
        }
        
        return collections;
    } catch (error) {
        logger.error(`Error checking collection data: ${error.message}`);
        return [];
    }
};

