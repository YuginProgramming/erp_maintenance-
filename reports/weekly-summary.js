import { connectionManager, databaseService } from "../database/index.js";
import { CollectionRepository } from "../database/repositories/index.js";
import { logger } from "../logger/index.js";

// Function to generate weekly collection summary
export const generateWeeklySummary = async (startDate, endDate) => {
    try {
        // Ensure database connection is active
        const isConnected = await ensureConnection();
        if (!isConnected) {
            throw new Error('Database connection failed');
        }

        // Get all collection entries for the specified date range
        const weeklyCollections = await Collection.findAll({
            where: {
                date: {
                    [Op.between]: [
                        new Date(`${startDate} 00:00:00`),
                        new Date(`${endDate} 23:59:59`)
                    ]
                }
            },
            order: [['date', 'ASC']]
        });

        if (weeklyCollections.length === 0) {
            return {
                hasData: false,
                message: `📊 **Тижневий звіт з інкасації**\n\n📅 **Період:** ${startDate} - ${endDate}\n\n❌ **Дані інкасації за цей період не знайдено**`
            };
        }

        // Group collections by collector
        const collectorGroups = {};
        let totalSum = 0;
        let totalBanknotes = 0;
        let totalCoins = 0;
        const uniqueDevices = new Set();
        const dailyTotals = {};

        weeklyCollections.forEach(entry => {
            const collector = entry.collector_nik || 'Unknown';
            const deviceId = entry.device_id;
            const entryDate = entry.date.toISOString().split('T')[0];
            
            if (!collectorGroups[collector]) {
                collectorGroups[collector] = {
                    totalSum: 0,
                    totalBanknotes: 0,
                    totalCoins: 0,
                    devices: new Set(),
                    entries: []
                };
            }

            if (!dailyTotals[entryDate]) {
                dailyTotals[entryDate] = {
                    totalSum: 0,
                    entries: 0
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
            
            dailyTotals[entryDate].totalSum += parseFloat(entry.total_sum);
            dailyTotals[entryDate].entries += 1;
        });

        // Build the summary message
        let summaryMessage = `📊 **Тижневий звіт з інкасації**\n\n`;
        summaryMessage += `📅 **Період:** ${startDate} - ${endDate}\n`;
        summaryMessage += `📈 **Днів з даними:** ${Object.keys(dailyTotals).length}\n\n`;

        // Overall summary
        summaryMessage += `**Загальний підсумок:**\n`;
        summaryMessage += `Всього інкасацій: ${weeklyCollections.length}\n`;
        summaryMessage += `Всього апаратів: ${uniqueDevices.size}\n`;
        summaryMessage += `Всього купюр: ${totalBanknotes.toFixed(2)} грн\n`;
        summaryMessage += `Всього монет: ${totalCoins.toFixed(2)} грн\n`;
        summaryMessage += `**Загальна сума: ${totalSum.toFixed(2)} грн**\n\n`;

        // Daily breakdown
        summaryMessage += `**Розподіл по днях:**\n`;
        Object.entries(dailyTotals).sort().forEach(([date, data]) => {
            summaryMessage += `  **${date}:** ${data.entries} інкасацій, ${data.totalSum.toFixed(2)} грн\n`;
        });
        summaryMessage += '\n';

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

        return {
            hasData: true,
            message: summaryMessage,
            stats: {
                totalCollections: weeklyCollections.length,
                totalDevices: uniqueDevices.size,
                totalSum: totalSum,
                totalBanknotes: totalBanknotes,
                totalCoins: totalCoins,
                collectors: Object.keys(collectorGroups).length,
                daysWithData: Object.keys(dailyTotals).length
            }
        };

    } catch (error) {
        logger.error(`Error generating weekly summary for ${startDate}-${endDate}: ${error.message}`);
        throw error;
    }
};

