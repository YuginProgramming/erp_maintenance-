import { connectionManager, databaseService } from "../database/index.js";
import { CollectionRepository } from "../database/repositories/index.js";
import { logger } from "../logger/index.js";
import { fetchAllDevices, fetchDeviceCollection } from "./api-client.js";
import { saveCollectionData } from "./data-processor.js";

// Function to get yesterday's date in YYYY-MM-DD format
export const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
};

// Function to save collection data using the new repository
const saveCollectionDataWithRepository = async (collectionData, device, collectionRepo) => {
    let savedCount = 0;
    
    try {
        if (collectionData.data && Array.isArray(collectionData.data)) {
            for (const entry of collectionData.data) {
                // Check if data already exists
                const exists = await collectionRepo.checkDataExists(device.id, entry.date);
                if (exists) {
                    logger.debug(`Collection data already exists for device ${device.id} on ${entry.date}, skipping`);
                    continue;
                }
                
                // Prepare data for saving
                const dataToSave = {
                    device_id: device.id,
                    date: entry.date,
                    banknotes: entry.banknotes || 0,
                    coins: entry.coins || 0,
                    collector_id: entry.collector_id || null,
                    collector_nik: entry.collector_nik || null,
                    description: entry.description || null
                };
                
                // Save using repository
                await collectionRepo.saveCollectionData(dataToSave);
                savedCount++;
                
                logger.debug(`Saved collection entry for device ${device.id}: ${entry.banknotes} грн banknotes, ${entry.coins} грн coins`);
            }
        }
        
        return savedCount;
    } catch (error) {
        logger.error(`Error saving collection data for device ${device.id}:`, error);
        throw error;
    }
};

// Main function to fetch and save daily collection data
export const fetchDailyCollectionData = async () => {
    try {
        // Initialize connection manager if not already initialized
        if (!connectionManager.initialized) {
            await connectionManager.initialize();
        }
        
        // Check database health
        const isHealthy = await databaseService.healthCheck();
        if (!isHealthy) {
            throw new Error('Database connection is not healthy');
        }
        logger.info('Database connection established and healthy');
        
        // Create collection repository
        const collectionRepo = new CollectionRepository();
        logger.info('Collection repository initialized');
        
        // Get yesterday's date
        const yesterday = getYesterdayDate();
        logger.info(`Fetching collection data for ${yesterday}`);
        
        // Fetch all active devices
        const devices = await fetchAllDevices();
        logger.info(`Found ${devices.length} active devices`);
        
        if (devices.length === 0) {
            logger.warn('No active devices found');
            return;
        }
        
        let totalSaved = 0;
        let processedDevices = 0;
        
        // Process each device
        for (const device of devices) {
            try {
                logger.info(`Processing device ${device.id} - ${device.name || `Device ${device.id}`}`);
                
                const collectionData = await fetchDeviceCollection(device.id, yesterday, yesterday);
                
                if (collectionData.error) {
                    logger.error(`Error fetching data for device ${device.id}: ${collectionData.error}`);
                    continue;
                }
                
                // Use the new repository to save collection data
                const savedCount = await saveCollectionDataWithRepository(collectionData, device, collectionRepo);
                totalSaved += savedCount;
                processedDevices++;
                
                // Small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 300));
                
            } catch (deviceError) {
                logger.error(`Error processing device ${device.id}: ${deviceError.message}`);
            }
        }
        
        logger.info(`Daily collection data fetch completed!`);
        logger.info(`Processed devices: ${processedDevices}/${devices.length}`);
        logger.info(`Total entries saved: ${totalSaved}`);
        logger.info('📊 Daily summary will be sent tomorrow at 8 AM Kyiv time');
        
    } catch (error) {
        logger.error(`Error during daily collection data fetch: ${error.message}`);
        throw error;
    }
};

