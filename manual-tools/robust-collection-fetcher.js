import { connectionManager } from "../database/connection-manager.js";
import { CollectionRepository } from "../database/repositories/collection-repository.js";
import { logger } from "../logger/index.js";
import axios from "axios";
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
    maxRetries: 5,
    retryDelay: 5000, // 5 seconds
    connectionTimeout: 30000, // 30 seconds
    progressFile: 'collection-progress.json',
    batchSize: 10, // Process devices in batches
    delayBetweenBatches: 2000 // 2 seconds between batches
};

// Progress tracking
class ProgressTracker {
    constructor(targetDate) {
        this.targetDate = targetDate;
        this.progressFile = path.join(process.cwd(), 'manual-tools', CONFIG.progressFile);
        this.progress = this.loadProgress();
    }

    loadProgress() {
        try {
            if (fs.existsSync(this.progressFile)) {
                const data = fs.readFileSync(this.progressFile, 'utf8');
                const progress = JSON.parse(data);
                
                // Only use progress if it's for the same date
                if (progress.targetDate === this.targetDate) {
                    console.log(`📋 Resuming from progress: ${progress.processedDevices.length}/${progress.totalDevices} devices`);
                    return progress;
                }
            }
        } catch (error) {
            console.log(`⚠️  Could not load progress file: ${error.message}`);
        }
        
        return {
            targetDate: this.targetDate,
            totalDevices: 0,
            processedDevices: [],
            successfulDevices: [],
            failedDevices: [],
            totalEntries: 0,
            startTime: new Date().toISOString(),
            lastUpdate: new Date().toISOString()
        };
    }

    saveProgress() {
        try {
            this.progress.lastUpdate = new Date().toISOString();
            fs.writeFileSync(this.progressFile, JSON.stringify(this.progress, null, 2));
        } catch (error) {
            console.log(`⚠️  Could not save progress: ${error.message}`);
        }
    }

    addProcessedDevice(deviceId, success = true, entries = 0) {
        this.progress.processedDevices.push(deviceId);
        if (success) {
            this.progress.successfulDevices.push(deviceId);
            this.progress.totalEntries += entries;
        } else {
            this.progress.failedDevices.push(deviceId);
        }
        this.saveProgress();
    }

    isDeviceProcessed(deviceId) {
        return this.progress.processedDevices.includes(deviceId);
    }

    getProgress() {
        const processed = this.progress.processedDevices.length;
        const total = this.progress.totalDevices;
        const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
        
        return {
            processed,
            total,
            percentage,
            successful: this.progress.successfulDevices.length,
            failed: this.progress.failedDevices.length,
            totalEntries: this.progress.totalEntries
        };
    }

    printProgress() {
        const progress = this.getProgress();
        console.log(`📊 Progress: ${progress.processed}/${progress.total} (${progress.percentage}%) - ✅ ${progress.successful} | ❌ ${progress.failed} | 📦 ${progress.totalEntries} entries`);
    }
}

// Connection health checker
class ConnectionHealthChecker {
    constructor() {
        this.lastCheck = 0;
        this.checkInterval = 60000; // Check every minute
    }

    async checkDatabaseConnection() {
        try {
            await sequelize.authenticate();
            return true;
        } catch (error) {
            console.log(`❌ Database connection failed: ${error.message}`);
            return false;
        }
    }

    async checkAPIConnection() {
        try {
            const response = await axios.post('https://soliton.net.ua/water/api/devices', {}, {
                timeout: 10000
            });
            return response.status === 200;
        } catch (error) {
            console.log(`❌ API connection failed: ${error.message}`);
            return false;
        }
    }

    async ensureConnections() {
        const now = Date.now();
        if (now - this.lastCheck < this.checkInterval) {
            return true; // Skip check if too recent
        }

        console.log('🔍 Checking connections...');
        
        const dbOk = await this.checkDatabaseConnection();
        const apiOk = await this.checkAPIConnection();
        
        this.lastCheck = now;
        
        if (!dbOk || !apiOk) {
            console.log('⚠️  Connection issues detected, will retry...');
            return false;
        }
        
        console.log('✅ All connections healthy');
        return true;
    }
}

// Robust collection fetcher
class RobustCollectionFetcher {
    constructor(targetDate) {
        this.targetDate = targetDate;
        this.progress = new ProgressTracker(targetDate);
        this.healthChecker = new ConnectionHealthChecker();
        this.isRunning = false;
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async fetchWithRetry(deviceId, deviceName, retryCount = 0) {
        for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
            try {
                console.log(`   🔍 Attempt ${attempt}/${CONFIG.maxRetries} for device ${deviceId}`);
                
                // Check connections before each attempt
                if (!(await this.healthChecker.ensureConnections())) {
                    console.log(`   ⏳ Waiting ${CONFIG.retryDelay}ms before retry...`);
                    await this.delay(CONFIG.retryDelay);
                    continue;
                }

                const response = await axios.post('https://soliton.net.ua/water/api/device_inkas.php', {
                    device_id: deviceId.toString(),
                    ds: this.targetDate,
                    de: this.targetDate
                }, {
                    timeout: CONFIG.connectionTimeout
                });

                const result = response.data;
                
                if (result.status === 'success') {
                    return result;
                } else {
                    console.log(`   ❌ API error: ${result.descr}`);
                    return { error: result.descr };
                }

            } catch (error) {
                console.log(`   ❌ Attempt ${attempt} failed: ${error.message}`);
                
                if (attempt < CONFIG.maxRetries) {
                    console.log(`   ⏳ Waiting ${CONFIG.retryDelay}ms before retry...`);
                    await this.delay(CONFIG.retryDelay);
                } else {
                    console.log(`   💀 All ${CONFIG.maxRetries} attempts failed for device ${deviceId}`);
                    return { error: `All attempts failed: ${error.message}` };
                }
            }
        }
    }

    async saveCollectionData(collectionData, deviceInfo) {
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
                
                const collectorInfo = this.extractCollectorInfo(entry.descr);
                
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
                    console.log(`   ❌ Database error for device ${deviceInfo.id}: ${dbError.message}`);
                }
            }
            
            return savedCount;
            
        } catch (error) {
            console.log(`   ❌ Error processing data for device ${deviceInfo.id}: ${error.message}`);
            return 0;
        }
    }

    extractCollectorInfo(descr) {
        if (!descr) return { id: null, nik: null };
        
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
    }

    async processDevice(device) {
        if (this.progress.isDeviceProcessed(device.id)) {
            console.log(`   ⏭️  Device ${device.id} already processed, skipping`);
            return;
        }

        console.log(`\n🔍 Processing device ${device.id} - ${device.name || `Device ${device.id}`}`);
        
        try {
            const collectionData = await this.fetchWithRetry(device.id, device.name);
            
            if (collectionData.error) {
                console.log(`   ❌ Failed: ${collectionData.error}`);
                this.progress.addProcessedDevice(device.id, false);
                return;
            }
            
            const savedCount = await this.saveCollectionData(collectionData, device);
            
            if (savedCount > 0) {
                console.log(`   ✅ Saved ${savedCount} entries`);
                this.progress.addProcessedDevice(device.id, true, savedCount);
            } else {
                console.log(`   ⚠️  No data to save`);
                this.progress.addProcessedDevice(device.id, true, 0);
            }
            
        } catch (error) {
            console.log(`   ❌ Error processing device ${device.id}: ${error.message}`);
            this.progress.addProcessedDevice(device.id, false);
        }
    }

    async processBatch(devices, startIndex) {
        const endIndex = Math.min(startIndex + CONFIG.batchSize, devices.length);
        const batch = devices.slice(startIndex, endIndex);
        
        console.log(`\n📦 Processing batch ${Math.floor(startIndex / CONFIG.batchSize) + 1}: devices ${startIndex + 1}-${endIndex}`);
        
        for (const device of batch) {
            if (!this.isRunning) {
                console.log('🛑 Process stopped by user');
                return false;
            }
            
            await this.processDevice(device);
            this.progress.printProgress();
            
            // Small delay between devices
            await this.delay(300);
        }
        
        // Delay between batches
        if (endIndex < devices.length) {
            console.log(`⏳ Waiting ${CONFIG.delayBetweenBatches}ms before next batch...`);
            await this.delay(CONFIG.delayBetweenBatches);
        }
        
        return true;
    }

    async start() {
        if (this.isRunning) {
            console.log('⚠️  Process already running');
            return;
        }

        this.isRunning = true;
        
        try {
            // Connect to database
            await sequelize.authenticate();
            console.log('✅ Database connection established');
            
            // Sync the Collection model
            await Collection.sync({ force: false });
            console.log('✅ Collection table synchronized');
            
            // Fetch all devices
            console.log('\n📱 Fetching all devices...');
            const devicesResponse = await axios.post('https://soliton.net.ua/water/api/devices', {}, {
                timeout: CONFIG.connectionTimeout
            });
            
            if (!devicesResponse.data || !devicesResponse.data.devices) {
                throw new Error('No devices returned from API');
            }
            
            const devices = devicesResponse.data.devices;
            this.progress.totalDevices = devices.length;
            console.log(`✅ Found ${devices.length} devices`);
            
            console.log(`\n📊 Starting robust collection fetch for ${this.targetDate}`);
            console.log('='.repeat(60));
            
            // Process devices in batches
            for (let i = 0; i < devices.length; i += CONFIG.batchSize) {
                if (!this.isRunning) {
                    break;
                }
                
                const success = await this.processBatch(devices, i);
                if (!success) {
                    break;
                }
            }
            
            // Final summary
            const finalProgress = this.progress.getProgress();
            console.log('\n📊 Final Summary:');
            console.log('================');
            console.log(`📅 Date: ${this.targetDate}`);
            console.log(`🏪 Devices processed: ${finalProgress.processed}/${finalProgress.total}`);
            console.log(`✅ Successful: ${finalProgress.successful}`);
            console.log(`❌ Failed: ${finalProgress.failed}`);
            console.log(`📦 Total entries saved: ${finalProgress.totalEntries}`);
            
            if (finalProgress.processed === finalProgress.total) {
                console.log('🎉 All devices processed successfully!');
            } else {
                console.log(`⚠️  ${finalProgress.total - finalProgress.processed} devices remaining`);
            }
            
        } catch (error) {
            console.error(`❌ Fatal error: ${error.message}`);
        } finally {
            this.isRunning = false;
            await connectionManager.shutdown();
            console.log('\n🔌 Database connection closed');
        }
    }

    stop() {
        this.isRunning = false;
        console.log('🛑 Stopping process...');
    }
}

// Main execution
const main = async () => {
    const args = process.argv.slice(2);
    const targetDate = args[0] || '2025-08-25';
    
    console.log('🛡️  Robust Collection Fetcher');
    console.log('============================\n');
    
    const fetcher = new RobustCollectionFetcher(targetDate);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Received SIGINT, stopping gracefully...');
        fetcher.stop();
    });
    
    process.on('SIGTERM', () => {
        console.log('\n🛑 Received SIGTERM, stopping gracefully...');
        fetcher.stop();
    });
    
    await fetcher.start();
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { RobustCollectionFetcher };
