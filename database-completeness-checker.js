import { sequelize } from "./database/sequelize.js";
import { Collection } from "./database/maintenance-models.js";
import { logger } from "./logger/index.js";
import axios from "axios";

// Configuration
const CONFIG = {
    daysToCheck: 30,
    maxRetries: 3,
    retryDelay: 2000,
    connectionTimeout: 30000,
    delayBetweenDevices: 500,
    delayBetweenDates: 1000,
    batchSize: 5 // Process dates in batches
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
    
    // Handle specific encoding issues
    if (decodedDescr === 'Р†РіРѕСЂ' || decodedDescr.includes('Р†РіРѕСЂ')) {
        return {
            id: 'Kirk',
            nik: 'Kirk'
        };
    }
    
    // Handle Р"РјРёС‚СЂРѕ encoding issue
    if (decodedDescr === 'Р"РјРёС‚СЂРѕ' || decodedDescr.includes('Р"РјРёС‚СЂРѕ')) {
        return {
            id: 'Anna',
            nik: 'Anna'
        };
    }
    
    // Handle Ігор - leave as is (proper Ukrainian text)
    if (decodedDescr === 'Ігор' || decodedDescr.includes('Ігор')) {
        return {
            id: 'Ігор',
            nik: 'Ігор'
        };
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

// Function to fetch device collection data with retry
const fetchDeviceCollectionWithRetry = async (deviceId, targetDate, retryCount = 0) => {
    for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
        try {
            const response = await axios.post('https://soliton.net.ua/water/api/device_inkas.php', {
                device_id: deviceId.toString(),
                ds: targetDate,
                de: targetDate
            }, {
                timeout: CONFIG.connectionTimeout
            });

            const result = response.data;
            
            if (result.status === 'success') {
                return result;
            } else {
                logger.warn(`API error for device ${deviceId} on ${targetDate}: ${result.descr}`);
                return { error: result.descr };
            }

        } catch (error) {
            logger.warn(`Attempt ${attempt} failed for device ${deviceId} on ${targetDate}: ${error.message}`);
            
            if (attempt < CONFIG.maxRetries) {
                await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
            } else {
                logger.error(`All ${CONFIG.maxRetries} attempts failed for device ${deviceId} on ${targetDate}`);
                return { error: `All attempts failed: ${error.message}` };
            }
        }
    }
};

// Function to save collection data to database
const saveCollectionData = async (collectionData, deviceInfo, targetDate) => {
    try {
        if (!collectionData.data || collectionData.data.length === 0) {
            return 0;
        }

        let savedCount = 0;
        
        for (const entry of collectionData.data) {
            const sumBanknotes = parseFloat(entry.banknotes) || 0;
            const sumCoins = parseFloat(entry.coins) || 0;
            const totalSum = sumBanknotes + sumCoins;
            
            // Skip zero-sum entries
            if (totalSum === 0) {
                continue;
            }
            
            const collectorInfo = extractCollectorInfo(entry.descr);
            
            // Parse date and convert to Kyiv time
            const collectionDate = new Date(entry.date);
            const kyivHour = collectionDate.getHours();
            const utcHour = kyivHour - 3;
            
            const kyivLocalDate = new Date(Date.UTC(
                collectionDate.getFullYear(),
                collectionDate.getMonth(),
                collectionDate.getDate(),
                utcHour,
                collectionDate.getMinutes(),
                collectionDate.getSeconds()
            ));
            
            try {
                // Check for existing entry
                const existingEntry = await Collection.findOne({
                    where: {
                        date: kyivLocalDate,
                        device_id: deviceInfo.id.toString(),
                        sum_banknotes: sumBanknotes,
                        sum_coins: sumCoins
                    }
                });
                
                if (existingEntry) {
                    continue; // Skip if already exists
                }
                
                await Collection.create({
                    date: kyivLocalDate,
                    sum_banknotes: sumBanknotes,
                    sum_coins: sumCoins,
                    total_sum: totalSum,
                    note: entry.descr || null,
                    machine: deviceInfo.name || `Device ${deviceInfo.id}`,
                    collector_id: collectorInfo.id,
                    collector_nik: collectorInfo.nik,
                    device_id: deviceInfo.id.toString()
                });
                
                savedCount++;
                
            } catch (dbError) {
                logger.error(`Database error for device ${deviceInfo.id} on ${targetDate}: ${dbError.message}`);
            }
        }
        
        return savedCount;
        
    } catch (error) {
        logger.error(`Error processing data for device ${deviceInfo.id} on ${targetDate}: ${error.message}`);
        return 0;
    }
};

// Function to check if date has collection data
const checkDateHasData = async (targetDate) => {
    try {
        const count = await Collection.count({
            where: {
                date: {
                    [require('sequelize').Op.between]: [
                        new Date(`${targetDate} 00:00:00`),
                        new Date(`${targetDate} 23:59:59`)
                    ]
                }
            }
        });
        
        return count > 0;
    } catch (error) {
        logger.error(`Error checking data for ${targetDate}: ${error.message}`);
        return false;
    }
};

// Function to get list of dates to check
const getDatesToCheck = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= CONFIG.daysToCheck; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
    }
    
    return dates;
};

// Function to process a single date
const processDate = async (targetDate, devices) => {
    logger.info(`🔍 Processing date: ${targetDate}`);
    
    // Check if date already has data
    const hasData = await checkDateHasData(targetDate);
    if (hasData) {
        logger.info(`✅ Date ${targetDate} already has collection data, skipping`);
        return { date: targetDate, status: 'skipped', reason: 'has_data' };
    }
    
    logger.info(`📊 Date ${targetDate} has no data, fetching from API...`);
    
    let totalSaved = 0;
    let processedDevices = 0;
    let devicesWithData = 0;
    
    // Process devices in batches
    for (let i = 0; i < devices.length; i += CONFIG.batchSize) {
        const batch = devices.slice(i, i + CONFIG.batchSize);
        
        await Promise.all(batch.map(async (device) => {
            try {
                const collectionData = await fetchDeviceCollectionWithRetry(device.id, targetDate);
                
                if (collectionData.error) {
                    logger.warn(`❌ Error fetching data for device ${device.id} on ${targetDate}: ${collectionData.error}`);
                    return;
                }
                
                const savedCount = await saveCollectionData(collectionData, device, targetDate);
                totalSaved += savedCount;
                processedDevices++;
                
                if (savedCount > 0) {
                    devicesWithData++;
                    logger.info(`✅ Device ${device.id}: saved ${savedCount} entries for ${targetDate}`);
                }
                
                // Small delay between devices
                await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenDevices));
                
            } catch (error) {
                logger.error(`❌ Error processing device ${device.id} for ${targetDate}: ${error.message}`);
            }
        }));
        
        // Delay between batches
        if (i + CONFIG.batchSize < devices.length) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenDates));
        }
    }
    
    logger.info(`📊 Date ${targetDate} completed: ${processedDevices} devices processed, ${devicesWithData} with data, ${totalSaved} entries saved`);
    
    return {
        date: targetDate,
        status: 'completed',
        processedDevices,
        devicesWithData,
        totalSaved
    };
};

// Main function to check and fill missing data
const checkAndFillMissingData = async () => {
    const startTime = new Date();
    logger.info('🔄 Starting database completeness check...');
    
    try {
        // Connect to database
        await sequelize.authenticate();
        logger.info('✅ Database connection established');
        
        // Sync the Collection model
        await Collection.sync({ force: false });
        logger.info('✅ Collection table synchronized');
        
        // Get all devices
        logger.info('📱 Fetching all devices...');
        const devicesResponse = await axios.post('https://soliton.net.ua/water/api/devices', {}, {
            timeout: CONFIG.connectionTimeout
        });
        
        if (!devicesResponse.data || !devicesResponse.data.devices) {
            throw new Error('No devices returned from API');
        }
        
        const devices = devicesResponse.data.devices;
        logger.info(`✅ Found ${devices.length} devices`);
        
        // Get dates to check
        const datesToCheck = getDatesToCheck();
        logger.info(`📅 Checking ${datesToCheck.length} dates: ${datesToCheck[0]} to ${datesToCheck[datesToCheck.length - 1]}`);
        
        const results = [];
        let totalProcessed = 0;
        let totalSaved = 0;
        let skippedDates = 0;
        
        // Process each date
        for (const targetDate of datesToCheck) {
            const result = await processDate(targetDate, devices);
            results.push(result);
            
            if (result.status === 'completed') {
                totalProcessed++;
                totalSaved += result.totalSaved;
            } else if (result.status === 'skipped') {
                skippedDates++;
            }
            
            // Small delay between dates
            await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenDates));
        }
        
        const endTime = new Date();
        const duration = Math.round((endTime - startTime) / 1000);
        
        // Final summary
        logger.info('📊 Database Completeness Check - Final Summary:');
        logger.info('================================================');
        logger.info(`⏱️  Duration: ${duration} seconds`);
        logger.info(`📅 Dates checked: ${datesToCheck.length}`);
        logger.info(`✅ Dates processed: ${totalProcessed}`);
        logger.info(`⏭️  Dates skipped: ${skippedDates}`);
        logger.info(`📦 Total entries saved: ${totalSaved}`);
        logger.info(`🏪 Devices per date: ${devices.length}`);
        
        // Log detailed results
        const datesWithData = results.filter(r => r.status === 'completed' && r.totalSaved > 0);
        if (datesWithData.length > 0) {
            logger.info('📋 Dates with new data:');
            datesWithData.forEach(result => {
                logger.info(`  ${result.date}: ${result.totalSaved} entries from ${result.devicesWithData} devices`);
            });
        }
        
        return {
            success: true,
            duration,
            datesChecked: datesToCheck.length,
            datesProcessed: totalProcessed,
            datesSkipped: skippedDates,
            totalSaved,
            results
        };
        
    } catch (error) {
        logger.error(`❌ Fatal error during completeness check: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    } finally {
        await sequelize.close();
        logger.info('🔌 Database connection closed');
    }
};

// Function to schedule daily completeness check
const scheduleDailyCompletenessCheck = () => {
    const scheduleNextRun = () => {
        const now = new Date();
        const kyivTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Kiev" }));
        
        // Set target time to 1 PM Kyiv time
        const targetTime = new Date(kyivTime);
        targetTime.setHours(13, 0, 0, 0); // 1 PM
        
        // If it's already past 1 PM today, schedule for tomorrow
        if (kyivTime >= targetTime) {
            targetTime.setDate(targetTime.getDate() + 1);
        }
        
        const delay = targetTime.getTime() - now.getTime();
        
        logger.info(`⏰ Next completeness check scheduled for: ${targetTime.toLocaleString('en-US', { timeZone: 'Europe/Kiev' })}`);
        logger.info(`⏳ Will run in ${Math.round(delay / 1000 / 60)} minutes`);
        
        setTimeout(async () => {
            logger.info('🔄 Running scheduled database completeness check...');
            await checkAndFillMissingData();
            
            // Schedule next run
            scheduleNextRun();
        }, delay);
    };
    
    // Start scheduling
    scheduleNextRun();
};

// Export functions
export {
    checkAndFillMissingData,
    scheduleDailyCompletenessCheck
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    checkAndFillMissingData();
}
