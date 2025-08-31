import { sequelize, ensureConnection } from "../database/sequelize.js";
import { Collection } from "../database/maintenance-models.js";
import { logger } from "../logger/index.js";
import { fetchAllDevices, fetchDeviceCollection } from "./api-client.js";
import { saveCollectionData } from "./data-processor.js";

// Function to get yesterday's date in YYYY-MM-DD format
export const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
};

// Main function to fetch and save daily collection data
export const fetchDailyCollectionData = async () => {
    try {
        // Connect to database
        const isConnected = await ensureConnection();
        if (!isConnected) {
            throw new Error('Database connection failed');
        }
        logger.info('Database connection established');
        
        // Sync the Collection model
        await Collection.sync({ force: false });
        logger.info('Collection table synchronized');
        
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
                
                const savedCount = await saveCollectionData(collectionData, device);
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

