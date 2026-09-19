import { CollectionRepository } from "../database/repositories/collection-repository.js";
import { logger } from "../logger/index.js";
import { saveMergedCollectionVisits } from "../utils/collection-visit-merge.js";

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

        const collectionRepo = new CollectionRepository();
        const savedCount = await saveMergedCollectionVisits({
            collectionData,
            device: deviceInfo,
            collectionRepo,
            extractCollector: extractCollectorInfo,
        });
        if (savedCount > 0) {
            logger.info(`Saved ${savedCount} collection visit(s) for device ${deviceInfo.id}`);
        }
        return savedCount;
    } catch (error) {
        logger.error(`Error processing collection data for device ${deviceInfo.id}: ${error.message}`);
        return 0;
    }
};

