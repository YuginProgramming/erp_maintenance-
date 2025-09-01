import { connectionManager } from "../database/connection-manager.js";
import { CollectionRepository } from "../database/repositories/collection-repository.js";
import { WorkerRepository } from "../database/repositories/worker-repository.js";
import { logger } from "../logger/index.js";
import { Op } from "sequelize";

// Project start date (when we first started working on this)
const PROJECT_START_DATE = '2025-08-20';

// Function to get all collection data from project start
const getAllCollectionData = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established');
        
        const collections = await Collection.findAll({
            where: {
                date: {
                    [Op.gte]: new Date(PROJECT_START_DATE)
                }
            },
            order: [['date', 'DESC']]
        });
        
        console.log(`\n📊 Collection Data Analysis (from ${PROJECT_START_DATE})`);
        console.log(`================================================`);
        console.log(`Total entries found: ${collections.length}`);
        
        if (collections.length === 0) {
            console.log('❌ No collection data found');
            return;
        }
        
        // Group by date
        const dataByDate = {};
        collections.forEach(entry => {
            const dateStr = entry.date.toISOString().split('T')[0];
            if (!dataByDate[dateStr]) {
                dataByDate[dateStr] = [];
            }
            dataByDate[dateStr].push(entry);
        });
        
        console.log(`\n📅 Data by Date:`);
        console.log(`===============`);
        
        Object.keys(dataByDate).sort().reverse().forEach(date => {
            const entries = dataByDate[date];
            const totalSum = entries.reduce((sum, entry) => sum + parseFloat(entry.total_sum), 0);
            const uniqueDevices = new Set(entries.map(e => e.device_id)).size;
            const collectors = new Set(entries.map(e => e.collector_nik).filter(c => c)).size;
            
            console.log(`\n📅 ${date}:`);
            console.log(`   📦 Entries: ${entries.length}`);
            console.log(`   🏪 Devices: ${uniqueDevices}`);
            console.log(`   👥 Collectors: ${collectors}`);
            console.log(`   💰 Total: ${totalSum.toFixed(2)} грн`);
            
            // Show device details
            const deviceSummary = {};
            entries.forEach(entry => {
                const deviceId = entry.device_id;
                if (!deviceSummary[deviceId]) {
                    deviceSummary[deviceId] = {
                        name: entry.machine,
                        totalSum: 0,
                        entries: 0
                    };
                }
                deviceSummary[deviceId].totalSum += parseFloat(entry.total_sum);
                deviceSummary[deviceId].entries += 1;
            });
            
            Object.entries(deviceSummary).forEach(([deviceId, data]) => {
                console.log(`      🏪 Device ${deviceId} (${data.name}): ${data.totalSum.toFixed(2)} грн (${data.entries} entries)`);
            });
        });
        
        // Overall statistics
        console.log(`\n📈 Overall Statistics:`);
        console.log(`=====================`);
        
        const totalSum = collections.reduce((sum, entry) => sum + parseFloat(entry.total_sum), 0);
        const totalBanknotes = collections.reduce((sum, entry) => sum + parseFloat(entry.sum_banknotes), 0);
        const totalCoins = collections.reduce((sum, entry) => sum + parseFloat(entry.sum_coins), 0);
        const uniqueDevices = new Set(collections.map(e => e.device_id)).size;
        const uniqueCollectors = new Set(collections.map(e => e.collector_nik).filter(c => c)).size;
        const dateRange = Object.keys(dataByDate).sort();
        
        console.log(`💰 Total Sum: ${totalSum.toFixed(2)} грн`);
        console.log(`💵 Total Banknotes: ${totalBanknotes.toFixed(2)} грн`);
        console.log(`🪙 Total Coins: ${totalCoins.toFixed(2)} грн`);
        console.log(`🏪 Unique Devices: ${uniqueDevices}`);
        console.log(`👥 Unique Collectors: ${uniqueCollectors}`);
        console.log(`📅 Date Range: ${dateRange[0]} to ${dateRange[dateRange.length - 1]}`);
        console.log(`📊 Average per day: ${(totalSum / dateRange.length).toFixed(2)} грн`);
        
        // Collector breakdown
        console.log(`\n👥 Collector Breakdown:`);
        console.log(`=====================`);
        
        const collectorStats = {};
        collections.forEach(entry => {
            const collector = entry.collector_nik || 'Unknown';
            if (!collectorStats[collector]) {
                collectorStats[collector] = {
                    totalSum: 0,
                    totalBanknotes: 0,
                    totalCoins: 0,
                    devices: new Set(),
                    entries: 0
                };
            }
            collectorStats[collector].totalSum += parseFloat(entry.total_sum);
            collectorStats[collector].totalBanknotes += parseFloat(entry.sum_banknotes);
            collectorStats[collector].totalCoins += parseFloat(entry.sum_coins);
            collectorStats[collector].devices.add(entry.device_id);
            collectorStats[collector].entries += 1;
        });
        
        Object.entries(collectorStats).forEach(([collector, stats]) => {
            console.log(`\n👤 ${collector}:`);
            console.log(`   📦 Entries: ${stats.entries}`);
            console.log(`   🏪 Devices: ${stats.devices.size}`);
            console.log(`   💵 Banknotes: ${stats.totalBanknotes.toFixed(2)} грн`);
            console.log(`   🪙 Coins: ${stats.totalCoins.toFixed(2)} грн`);
            console.log(`   💰 Total: ${stats.totalSum.toFixed(2)} грн`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connectionManager.shutdown();
        console.log('\n🔌 Database connection closed');
    }
};

// Function to check specific date
const checkSpecificDate = async (date) => {
    try {
        await sequelize.authenticate();
        console.log(`✅ Checking data for ${date}...`);
        
        const collections = await Collection.findAll({
            where: {
                date: {
                    [Op.between]: [
                        new Date(`${date} 00:00:00`),
                        new Date(`${date} 23:59:59`)
                    ]
                }
            },
            order: [['date', 'ASC']]
        });
        
        console.log(`\n📊 Collection Data for ${date}:`);
        console.log(`==============================`);
        console.log(`Total entries: ${collections.length}`);
        
        if (collections.length === 0) {
            console.log('❌ No data found for this date');
            return;
        }
        
        collections.forEach((entry, index) => {
            console.log(`\n📦 Entry ${index + 1}:`);
            console.log(`   🏪 Device: ${entry.device_id} (${entry.machine})`);
            console.log(`   👤 Collector: ${entry.collector_nik || 'Unknown'}`);
            console.log(`   💵 Banknotes: ${entry.sum_banknotes} грн`);
            console.log(`   🪙 Coins: ${entry.sum_coins} грн`);
            console.log(`   💰 Total: ${entry.total_sum} грн`);
            console.log(`   📝 Note: ${entry.note || 'None'}`);
            console.log(`   🕐 Time: ${entry.date.toLocaleString('en-US', { timeZone: 'Europe/Kiev' })}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connectionManager.shutdown();
    }
};

// Function to check workers
const checkWorkers = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Checking workers...');
        
        const workers = await Worker.findAll({
            order: [['name', 'ASC']]
        });
        
        console.log(`\n👥 Workers in Database:`);
        console.log(`======================`);
        console.log(`Total workers: ${workers.length}`);
        
        workers.forEach((worker, index) => {
            console.log(`\n👤 Worker ${index + 1}:`);
            console.log(`   📛 Name: ${worker.name}`);
            console.log(`   💬 Chat ID: ${worker.chat_id || 'Not set'}`);
            console.log(`   📱 Phone: ${worker.phone || 'Not set'}`);
            console.log(`   ✅ Active: ${worker.active ? 'Yes' : 'No'}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connectionManager.shutdown();
    }
};

// Main execution
const main = async () => {
    const args = process.argv.slice(2);
    
    console.log('🔍 Collection Data Inspector');
    console.log('============================\n');
    
    if (args.length === 0) {
        // Show all data from project start
        await getAllCollectionData();
    } else if (args[0] === 'date' && args[1]) {
        // Check specific date
        await checkSpecificDate(args[1]);
    } else if (args[0] === 'workers') {
        // Check workers
        await checkWorkers();
    } else {
        console.log('Usage:');
        console.log('  node check-collection-data.js                    - Show all data from project start');
        console.log('  node check-collection-data.js date 2025-08-23   - Check specific date');
        console.log('  node check-collection-data.js workers            - Check workers');
    }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { getAllCollectionData, checkSpecificDate, checkWorkers };
