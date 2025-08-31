import { sequelize, ensureConnection } from "../database/sequelize.js";
import { Collection } from "../database/maintenance-models.js";
import { logger } from "../logger/index.js";
import { Op } from "sequelize";

// Function to check current collection data for debugging
export const checkCurrentCollectionData = async (targetDate) => {
    try {
        const isConnected = await ensureConnection();
        if (!isConnected) {
            throw new Error('Database connection failed');
        }
        
        const collections = await Collection.findAll({
            where: {
                date: {
                    [Op.between]: [
                        new Date(`${targetDate} 00:00:00`),
                        new Date(`${targetDate} 23:59:59`)
                    ]
                }
            },
            order: [['date', 'ASC']]
        });
        
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

