import axios from "axios";
import { sequelize } from "./database/sequelize.js";
import { Collection } from "./database/maintenance-models.js";
import { logger } from "./logger/index.js";
import { sendDailySummaryToAllWorkers } from "./daily-collection-summary.js";

// Function to fetch all devices from API
const fetchAllDevices = async () => {
    try {
        const response = await axios.post('https://soliton.net.ua/water/api/devices');
        
        if (response.data && response.data.devices) {
            // All devices are considered active since there's no status field
            return response.data.devices;
        }
        
        return [];
    } catch (error) {
        logger.error(`Error fetching devices: ${error.message}`);
        return [];
    }
};

// Function to fetch collection data for a specific device and date
const fetchDeviceCollection = async (device_id, startDate, endDate) => {
    try {
        const url = 'https://soliton.net.ua/water/api/device_inkas.php';
        const requestData = {
            device_id: device_id.toString(),
            ds: startDate,
            de: endDate
        };

        logger.info(`Fetching collection data for device ${device_id} from ${startDate} to ${endDate}`);
        
        const response = await axios.post(url, requestData);
        const result = response.data;

        if (result.status === 'success') {
            return result;
        } else {
            logger.error(`API error for device ${device_id}: ${result.descr}`);
            return { error: result.descr };
        }
    } catch (error) {
        logger.error(`Error fetching collection data for device ${device_id}: ${error.message}`);
        return { error: error.message };
    }
};

// Function to extract collector information from description
const extractCollectorInfo = (descr) => {
    if (!descr) return { id: null, nik: null };
    
    // Try to decode the description (it might be encoded)
    let decodedDescr = descr;
    try {
        decodedDescr = decodeURIComponent(descr);
    } catch (e) {
        decodedDescr = descr;
    }
    
    // Extract collector info - format seems to be "Name - "
    const match = decodedDescr.match(/^(.+?)\s*-\s*$/);
    if (match) {
        const collectorName = match[1].trim();
        return {
            id: null,
            nik: collectorName
        };
    }
    
    return {
        id: null,
        nik: decodedDescr.trim() || null
    };
};

// Function to save collection data to database
const saveCollectionData = async (collectionData, deviceInfo) => {
    try {
        if (!collectionData.data || collectionData.data.length === 0) {
            logger.info(`No collection data for device ${deviceInfo.id}`);
            return 0;
        }

        let savedCount = 0;
        
        for (const entry of collectionData.data) {
            const collectorInfo = extractCollectorInfo(entry.descr);
            const sumBanknotes = parseFloat(entry.banknotes) || 0;
            const sumCoins = parseFloat(entry.coins) || 0;
            const totalSum = sumBanknotes + sumCoins;
            
            // Parse the date and convert to Kyiv time
            const collectionDate = new Date(entry.date);
            const kyivHour = collectionDate.getHours();
            const utcHour = kyivHour - 3; // Convert Kyiv time to UTC
            
            const kyivLocalDate = new Date(Date.UTC(
                collectionDate.getFullYear(),
                collectionDate.getMonth(),
                collectionDate.getDate(),
                utcHour,
                collectionDate.getMinutes(),
                collectionDate.getSeconds()
            ));
            
            // Check if this entry already exists to avoid duplicates
            const existingEntry = await Collection.findOne({
                where: {
                    date: kyivLocalDate,
                    device_id: deviceInfo.id,
                    sum_banknotes: sumBanknotes,
                    sum_coins: sumCoins
                }
            });
            
            if (existingEntry) {
                logger.info(`Entry already exists for device ${deviceInfo.id} at ${entry.date}`);
                continue;
            }
            
            // Create new collection entry
            await Collection.create({
                date: kyivLocalDate,
                sum_banknotes: sumBanknotes,
                sum_coins: sumCoins,
                total_sum: totalSum,
                note: entry.descr || null,
                machine: deviceInfo.name || `Device ${deviceInfo.id}`,
                collector_id: collectorInfo.id,
                collector_nik: collectorInfo.nik,
                device_id: deviceInfo.id
            });
            
            savedCount++;
            logger.info(`Saved collection entry for device ${deviceInfo.id}: ${sumBanknotes} грн banknotes, ${sumCoins} грн coins`);
        }
        
        return savedCount;
    } catch (error) {
        logger.error(`Error saving collection data for device ${deviceInfo.id}: ${error.message}`);
        throw error;
    }
};

// Function to get yesterday's date in YYYY-MM-DD format
const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
};

// Main function to fetch and save daily collection data
const fetchDailyCollectionData = async () => {
    try {
        // Connect to database
        await sequelize.authenticate();
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
    } finally {
        await sequelize.close();
        logger.info('Database connection closed');
    }
};

// Function to schedule the daily collection fetch at 2 PM Kyiv time
const scheduleDailyCollection = () => {
    const scheduleNextCollectionRun = () => {
        const now = new Date();
        const kyivTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Kiev" }));
        
        // Set target time to 2 PM Kyiv time
        const targetTime = new Date(kyivTime);
        targetTime.setHours(14, 0, 0, 0); // 2 PM
        
        // If it's already past 2 PM today, schedule for tomorrow
        if (kyivTime >= targetTime) {
            targetTime.setDate(targetTime.getDate() + 1);
        }
        
        const timeUntilNextRun = targetTime.getTime() - kyivTime.getTime();
        
        logger.info(`Next daily collection fetch scheduled for: ${targetTime.toLocaleString('en-US', { timeZone: 'Europe/Kiev' })}`);
        logger.info(`Time until next run: ${Math.floor(timeUntilNextRun / 1000 / 60)} minutes`);
        
        setTimeout(async () => {
            logger.info('Starting scheduled daily collection data fetch...');
            try {
                await fetchDailyCollectionData();
                logger.info('Daily collection data fetch completed successfully');
            } catch (error) {
                logger.error('Daily collection data fetch failed:', error);
            }
            
            // Schedule the next run
            scheduleNextCollectionRun();
        }, timeUntilNextRun);
    };
    
    // Start the collection scheduling
    scheduleNextCollectionRun();
    
    logger.info('Daily collection scheduler started');
};

// Function to schedule the daily summary at 8 AM Kyiv time
const scheduleDailySummary = () => {
    const scheduleNextSummaryRun = () => {
        const now = new Date();
        const kyivTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Kiev" }));
        
        // Set target time to 8 AM Kyiv time
        const targetTime = new Date(kyivTime);
        targetTime.setHours(8, 0, 0, 0); // 8 AM
        
        // If it's already past 8 AM today, schedule for tomorrow
        if (kyivTime >= targetTime) {
            targetTime.setDate(targetTime.getDate() + 1);
        }
        
        const timeUntilNextRun = targetTime.getTime() - kyivTime.getTime();
        
        logger.info(`Next daily summary scheduled for: ${targetTime.toLocaleString('en-US', { timeZone: 'Europe/Kiev' })}`);
        logger.info(`Time until next run: ${Math.floor(timeUntilNextRun / 1000 / 60)} minutes`);
        
        setTimeout(async () => {
            logger.info('Starting scheduled daily summary...');
            try {
                const yesterday = getYesterdayDate();
                if (global.bot) {
                    const result = await sendDailySummaryToAllWorkers(global.bot, yesterday);
                    logger.info(`Daily summary sent to ${result.successfulSends}/${result.totalWorkers} workers successfully`);
                } else {
                    logger.warn('Bot not available for summary');
                }
            } catch (error) {
                logger.error('Daily summary failed:', error);
            }
            
            // Schedule the next run
            scheduleNextSummaryRun();
        }, timeUntilNextRun);
    };
    
    // Start the summary scheduling
    scheduleNextSummaryRun();
    
    logger.info('Daily summary scheduler started');
};

// Export functions for manual use
export {
    fetchDailyCollectionData,
    scheduleDailyCollection,
    scheduleDailySummary
};

// If this file is run directly, start the scheduler
if (import.meta.url === `file://${process.argv[1]}`) {
    scheduleDailyCollection();
    scheduleDailySummary();
}
