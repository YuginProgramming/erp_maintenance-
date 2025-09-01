import { connectionManager, databaseService } from "../database/index.js";
import { CollectionRepository } from "../database/repositories/index.js";
import { logger } from "../logger/index.js";

// Function to generate daily collection summary
export const generateDailySummary = async (targetDate) => {
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

        // Create collection repository
        const collectionRepo = new CollectionRepository();

        // Get all collection entries for the specified date
        const dailyCollections = await collectionRepo.getCollectionDataByDateRange(targetDate, targetDate);

        if (dailyCollections.length === 0) {
            return {
                hasData: false,
                message: `📊 **Щоденний звіт з інкасації**\n\n📅 **Дата:** ${targetDate}\n\n❌ **Дані інкасації за цю дату не знайдено**`
            };
        }

        // Group collections by collector
        const collectorGroups = {};
        let totalSum = 0;
        let totalBanknotes = 0;
        let totalCoins = 0;
        const uniqueDevices = new Set();

        dailyCollections.forEach(entry => {
            const collector = entry.collector_nik || 'Unknown';
            const deviceId = entry.device_id;
            
            if (!collectorGroups[collector]) {
                collectorGroups[collector] = {
                    totalSum: 0,
                    totalBanknotes: 0,
                    totalCoins: 0,
                    devices: new Set(),
                    entries: []
                };
            }

            collectorGroups[collector].totalSum += parseFloat(entry.total_sum);
            collectorGroups[collector].totalBanknotes += parseFloat(entry.sum_banknotes);
            collectorGroups[collector].totalCoins += parseFloat(entry.sum_coins);
            collectorGroups[collector].devices.add(deviceId);
            collectorGroups[collector].entries.push(entry);

            totalSum += parseFloat(entry.total_sum);
            totalBanknotes += parseFloat(entry.sum_banknotes);
            totalCoins += parseFloat(entry.sum_coins);
            uniqueDevices.add(deviceId);
        });

        // Build the summary message
        let summaryMessage = `📊 **Щоденний звіт з інкасації**\n\n`;
        summaryMessage += `Дата: ${targetDate}\n`;
        summaryMessage += `Час інкасації: ${dailyCollections[0].date.toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' })} - ${dailyCollections[dailyCollections.length - 1].date.toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' })}\n\n`;

        // Overall summary
        summaryMessage += `**Загальний підсумок:**\n`;
        summaryMessage += `Всього інкасацій: ${dailyCollections.length}\n`;
        summaryMessage += `Всього апаратів: ${uniqueDevices.size}\n`;
        summaryMessage += `Всього купюр: ${totalBanknotes.toFixed(2)} грн\n`;
        summaryMessage += `Всього монет: ${totalCoins.toFixed(2)} грн\n`;
        summaryMessage += `**Загальна сума: ${totalSum.toFixed(2)} грн**\n\n`;

        // Collector breakdown
        summaryMessage += `**Розподіл за інкасаторами:**\n\n`;

        Object.entries(collectorGroups).forEach(([collector, data]) => {
            summaryMessage += `**${collector}:**\n`;
            summaryMessage += `  Інкасацій: ${data.entries.length}\n`;
            summaryMessage += `  Апаратів: ${data.devices.size} (ID: ${Array.from(data.devices).join(', ')})\n`;
            summaryMessage += `  Купюри: ${data.totalBanknotes.toFixed(2)} грн\n`;
            summaryMessage += `  Монети: ${data.totalCoins.toFixed(2)} грн\n`;
            summaryMessage += `  **Всього: ${data.totalSum.toFixed(2)} грн**\n\n`;
        });

        // Device details (only if not too many devices)
        if (uniqueDevices.size <= 20) {
            summaryMessage += `**Деталі по апаратах:**\n`;
            const deviceSummary = {};
            dailyCollections.forEach(entry => {
                const deviceId = entry.device_id;
                const deviceName = entry.machine;
                
                if (!deviceSummary[deviceId]) {
                    deviceSummary[deviceId] = {
                        name: deviceName,
                        totalSum: 0,
                        entries: 0
                    };
                }
                
                deviceSummary[deviceId].totalSum += parseFloat(entry.total_sum);
                deviceSummary[deviceId].entries += 1;
            });

            Object.entries(deviceSummary).forEach(([deviceId, data]) => {
                summaryMessage += `  **Апарат ${deviceId}** (${data.name}):\n`;
                summaryMessage += `    Інкасацій: ${data.entries}\n`;
                summaryMessage += `    Всього: ${data.totalSum.toFixed(2)} грн\n`;
            });
        }

        return {
            hasData: true,
            message: summaryMessage,
            stats: {
                totalCollections: dailyCollections.length,
                totalDevices: uniqueDevices.size,
                totalSum: totalSum,
                totalBanknotes: totalBanknotes,
                totalCoins: totalCoins,
                collectors: Object.keys(collectorGroups).length
            }
        };

    } catch (error) {
        logger.error(`Error generating daily summary for ${targetDate}: ${error.message}`);
        throw error;
    }
};

