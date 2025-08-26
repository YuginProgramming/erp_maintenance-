import { sequelize } from "../database/sequelize.js";
import { Collection } from "../database/maintenance-models.js";
import { logger } from "../logger/index.js";
import { Op } from "sequelize";
import axios from "axios";

// Function to check if daily collection was attempted for specific dates
const checkDailyCollectionAttempts = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established');
        
        // Check for missing dates
        const missingDates = ['2025-08-21', '2025-08-22', '2025-08-24', '2025-08-25', '2025-08-26'];
        
        console.log('\n🔍 Checking missing dates for collection data:');
        console.log('===============================================');
        
        for (const date of missingDates) {
            const collections = await Collection.findAll({
                where: {
                    date: {
                        [Op.between]: [
                            new Date(`${date} 00:00:00`),
                            new Date(`${date} 23:59:59`)
                        ]
                    }
                }
            });
            
            console.log(`\n📅 ${date}: ${collections.length} entries found`);
            
            if (collections.length === 0) {
                console.log(`   ❌ No collection data for ${date}`);
            } else {
                collections.forEach(entry => {
                    console.log(`   ✅ Device ${entry.device_id}: ${entry.total_sum} грн`);
                });
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
};

// Function to test API connectivity for specific dates
const testAPIConnectivity = async () => {
    console.log('\n🌐 Testing API connectivity for missing dates:');
    console.log('=============================================');
    
    const testDates = ['2025-08-21', '2025-08-22', '2025-08-24', '2025-08-25', '2025-08-26'];
    const testDeviceId = '164'; // Use a known device
    
    for (const date of testDates) {
        try {
            console.log(`\n🔍 Testing API for ${date} (Device ${testDeviceId}):`);
            
            const url = 'https://soliton.net.ua/water/api/device_inkas.php';
            const requestData = {
                device_id: testDeviceId,
                ds: date,
                de: date
            };
            
            const response = await axios.post(url, requestData);
            const result = response.data;
            
            if (result.status === 'success') {
                if (result.data && result.data.length > 0) {
                    console.log(`   ✅ API returned ${result.data.length} entries`);
                    result.data.forEach((entry, index) => {
                        console.log(`      Entry ${index + 1}: ${entry.sum} грн (${entry.descr || 'No description'})`);
                    });
                } else {
                    console.log(`   ⚠️  API returned success but no data for ${date}`);
                }
            } else {
                console.log(`   ❌ API error: ${result.descr}`);
            }
            
            // Small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.log(`   ❌ API request failed: ${error.message}`);
        }
    }
};

// Function to check if devices exist and are accessible
const checkDeviceAccessibility = async () => {
    console.log('\n🏪 Checking device accessibility:');
    console.log('===============================');
    
    try {
        // Get all devices from API
        const response = await axios.post('https://soliton.net.ua/water/api/devices');
        
        if (response.data && response.data.devices) {
            const devices = response.data.devices;
            console.log(`✅ Found ${devices.length} devices in API`);
            
            // Check a few specific devices that should have data
            const testDevices = ['164', '123', '178', '326'];
            
            for (const deviceId of testDevices) {
                const device = devices.find(d => d.id.toString() === deviceId);
                if (device) {
                    console.log(`   ✅ Device ${deviceId}: ${device.name || 'No name'}`);
                } else {
                    console.log(`   ❌ Device ${deviceId}: Not found in API`);
                }
            }
        } else {
            console.log('❌ No devices returned from API');
        }
        
    } catch (error) {
        console.log(`❌ Error fetching devices: ${error.message}`);
    }
};

// Function to simulate daily collection for a specific date
const simulateDailyCollection = async (targetDate) => {
    console.log(`\n🧪 Simulating daily collection for ${targetDate}:`);
    console.log('===============================================');
    
    try {
        // Get all devices
        const response = await axios.post('https://soliton.net.ua/water/api/devices');
        
        if (!response.data || !response.data.devices) {
            console.log('❌ No devices returned from API');
            return;
        }
        
        const devices = response.data.devices;
        console.log(`📊 Processing ${devices.length} devices for ${targetDate}`);
        
        let totalFound = 0;
        let totalSaved = 0;
        
        // Test first 5 devices to avoid overwhelming the API
        const testDevices = devices.slice(0, 5);
        
        for (const device of testDevices) {
            try {
                console.log(`\n🔍 Testing device ${device.id} - ${device.name || `Device ${device.id}`}`);
                
                const collectionResponse = await axios.post('https://soliton.net.ua/water/api/device_inkas.php', {
                    device_id: device.id.toString(),
                    ds: targetDate,
                    de: targetDate
                });
                
                const result = collectionResponse.data;
                
                if (result.status === 'success' && result.data && result.data.length > 0) {
                    console.log(`   ✅ Found ${result.data.length} collection entries`);
                    totalFound += result.data.length;
                    
                    // Check if this data is already in database
                    const existingData = await Collection.findAll({
                        where: {
                            device_id: device.id.toString(),
                            date: {
                                [Op.between]: [
                                    new Date(`${targetDate} 00:00:00`),
                                    new Date(`${targetDate} 23:59:59`)
                                ]
                            }
                        }
                    });
                    
                    console.log(`   💾 Already in database: ${existingData.length} entries`);
                    totalSaved += existingData.length;
                    
                } else {
                    console.log(`   ⚠️  No collection data for device ${device.id}`);
                }
                
                // Small delay
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (deviceError) {
                console.log(`   ❌ Error testing device ${device.id}: ${deviceError.message}`);
            }
        }
        
        console.log(`\n📊 Summary for ${targetDate}:`);
        console.log(`   🔍 Total entries found in API: ${totalFound}`);
        console.log(`   💾 Total entries in database: ${totalSaved}`);
        
    } catch (error) {
        console.log(`❌ Error in simulation: ${error.message}`);
    }
};

// Main execution
const main = async () => {
    const args = process.argv.slice(2);
    
    console.log('🔍 Daily Collection Diagnostic Tool');
    console.log('===================================\n');
    
    if (args.length === 0) {
        // Run all diagnostics
        await checkDailyCollectionAttempts();
        await testAPIConnectivity();
        await checkDeviceAccessibility();
    } else if (args[0] === 'simulate' && args[1]) {
        // Simulate collection for specific date
        await simulateDailyCollection(args[1]);
    } else {
        console.log('Usage:');
        console.log('  node diagnose-daily-collection.js                    - Run all diagnostics');
        console.log('  node diagnose-daily-collection.js simulate 2025-08-25 - Simulate collection for specific date');
    }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { checkDailyCollectionAttempts, testAPIConnectivity, checkDeviceAccessibility, simulateDailyCollection };
