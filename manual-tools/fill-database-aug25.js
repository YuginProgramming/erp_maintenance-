import { connectionManager } from "../database/connection-manager.js";
import { CollectionRepository } from "../database/repositories/collection-repository.js";
import { logger } from "../logger/index.js";
import axios from "axios";

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

// Function to fetch collection data for a specific device and date
const fetchDeviceCollection = async (device_id, startDate, endDate) => {
    try {
        const url = 'https://soliton.net.ua/water/api/device_inkas.php';
        const requestData = {
            device_id: device_id.toString(),
            ds: startDate,
            de: endDate
        };

        console.log(`   🔍 Fetching data for device ${device_id} from ${startDate} to ${endDate}`);
        
        const response = await axios.post(url, requestData);
        const result = response.data;

        if (result.status === 'success') {
            return result;
        } else {
            console.log(`   ❌ API error for device ${device_id}: ${result.descr}`);
            return { error: result.descr };
        }
    } catch (error) {
        console.log(`   ❌ Error fetching data for device ${device_id}: ${error.message}`);
        return { error: error.message };
    }
};

// Function to save collection data to database
const saveCollectionData = async (collectionData, deviceInfo) => {
    try {
        if (!collectionData.data || collectionData.data.length === 0) {
            console.log(`   ⚠️  No collection data for device ${deviceInfo.id}`);
            return 0;
        }

        let savedCount = 0;
        
        for (const entry of collectionData.data) {
            const sumBanknotes = parseFloat(entry.banknotes) || 0;
            const sumCoins = parseFloat(entry.coins) || 0;
            const totalSum = sumBanknotes + sumCoins;
            
            // Skip entries with zero sum (already collected)
            if (totalSum === 0) {
                console.log(`   ⏭️  Skipping zero-sum entry for device ${deviceInfo.id} (already collected)`);
                continue;
            }
            
            const collectorInfo = extractCollectorInfo(entry.descr);
            
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
            
            try {
                // Check if this entry already exists to avoid duplicates
                const existingEntry = await Collection.findOne({
                    where: {
                        date: kyivLocalDate,
                        device_id: deviceInfo.id.toString(),
                        sum_banknotes: sumBanknotes,
                        sum_coins: sumCoins
                    }
                });
                
                if (existingEntry) {
                    console.log(`   ⚠️  Entry already exists for device ${deviceInfo.id} at ${entry.date}`);
                    continue;
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
                console.log(`   ✅ Saved: ${sumBanknotes} грн banknotes, ${sumCoins} грн coins (${collectorInfo.nik || 'Unknown'})`);
                
            } catch (dbError) {
                console.log(`   ❌ Error saving entry for device ${deviceInfo.id}: ${dbError.message}`);
            }
        }
        
        return savedCount;
        
    } catch (error) {
        console.log(`   ❌ Error processing data for device ${deviceInfo.id}: ${error.message}`);
        return 0;
    }
};

// Main function to fill database for August 25, 2025
const fillDatabaseForAug25 = async () => {
    const targetDate = '2025-08-25';
    
    try {
        // Connect to database
        await sequelize.authenticate();
        console.log('✅ Database connection established');
        
        // Sync the Collection model
        await Collection.sync({ force: false });
        console.log('✅ Collection table synchronized');
        
        console.log(`\n📊 Filling database with collection data for ${targetDate}`);
        console.log('='.repeat(60));
        
        // Fetch all devices
        console.log('\n📱 Fetching all devices...');
        const devicesResponse = await axios.post('https://soliton.net.ua/water/api/devices');
        
        if (!devicesResponse.data || !devicesResponse.data.devices) {
            console.log('❌ No devices returned from API');
            return;
        }
        
        const devices = devicesResponse.data.devices;
        console.log(`✅ Found ${devices.length} devices`);
        
        let totalSaved = 0;
        let processedDevices = 0;
        let devicesWithData = 0;
        
        // Process each device
        for (const device of devices) {
            try {
                console.log(`\n🔍 Processing device ${device.id} - ${device.name || `Device ${device.id}`}`);
                
                const collectionData = await fetchDeviceCollection(device.id, targetDate, targetDate);
                
                if (collectionData.error) {
                    console.log(`   ❌ Error: ${collectionData.error}`);
                    continue;
                }
                
                const savedCount = await saveCollectionData(collectionData, device);
                totalSaved += savedCount;
                processedDevices++;
                
                if (savedCount > 0) {
                    devicesWithData++;
                }
                
                // Small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 300));
                
            } catch (deviceError) {
                console.log(`   ❌ Error processing device ${device.id}: ${deviceError.message}`);
            }
        }
        
        console.log('\n📊 Summary:');
        console.log('===========');
        console.log(`📅 Date: ${targetDate}`);
        console.log(`🏪 Devices processed: ${processedDevices}/${devices.length}`);
        console.log(`💰 Devices with data: ${devicesWithData}`);
        console.log(`📦 Total entries saved: ${totalSaved}`);
        
        if (totalSaved > 0) {
            console.log(`✅ Database successfully filled with ${totalSaved} collection entries`);
            console.log(`📊 You can now test the summary with: /summary ${targetDate}`);
        } else {
            console.log(`⚠️  No collection data found for ${targetDate}`);
            console.log(`💡 This might mean no collections happened on this date`);
        }
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    } finally {
        await connectionManager.shutdown();
        console.log('\n🔌 Database connection closed');
    }
};

// Run the function
fillDatabaseForAug25();
