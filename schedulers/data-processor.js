import { CollectionRepository } from "../database/repositories/collection-repository.js";
import { logger } from "../logger/index.js";
import { cleanNumericString, sanitizeCollectionEntry, logSanitizationIssue } from "../utils/data-sanitizer.js";

// Function to extract collector information from description
export const extractCollectorInfo = (descr) => {
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

// Function to save collection data to database
export const saveCollectionData = async (collectionData, deviceInfo) => {
    try {
        if (!collectionData.data || collectionData.data.length === 0) {
            logger.info(`No collection data for device ${deviceInfo.id}`);
            return 0;
        }

        let savedCount = 0;
        
        for (const entry of collectionData.data) {
            // Sanitize the entry data to handle malformed numeric values
            const sanitizedEntry = sanitizeCollectionEntry(entry);
            
            // Log any sanitization issues for monitoring
            if (entry.banknotes !== sanitizedEntry.banknotes.toString()) {
                logSanitizationIssue(entry.banknotes, sanitizedEntry.banknotes, `Device ${deviceInfo.id} banknotes`);
            }
            if (entry.coins !== sanitizedEntry.coins.toString()) {
                logSanitizationIssue(entry.coins, sanitizedEntry.coins, `Device ${deviceInfo.id} coins`);
            }
            
            // Skip entries with zero sum (already collected)
            const sumBanknotes = sanitizedEntry.banknotes;
            const sumCoins = sanitizedEntry.coins;
            const totalSum = sumBanknotes + sumCoins;
            
            if (totalSum === 0) {
                logger.info(`Skipping zero-sum entry for device ${deviceInfo.id} (already collected)`);
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
                logger.info(`Saved collection entry for device ${deviceInfo.id}: ${sumBanknotes} грн banknotes, ${sumCoins} грн coins`);
                
            } catch (dbError) {
                logger.error(`Error saving collection entry for device ${deviceInfo.id}: ${dbError.message}`);
            }
        }
        
        return savedCount;
        
    } catch (error) {
        logger.error(`Error processing collection data for device ${deviceInfo.id}: ${error.message}`);
        return 0;
    }
};

