import { connectionManager, databaseService } from "../database/index.js";
import { CollectionRepository } from "../database/repositories/index.js";
import { logger } from "../logger/index.js";

// Function to generate monthly collection summary
export const generateMonthlySummary = async (year, month) => {
    try {
        // Ensure database connection is active
        const isConnected = await ensureConnection();
        if (!isConnected) {
            throw new Error('Database connection failed');
        }

        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;

        // Get all collection entries for the specified month
        const monthlyCollections = await Collection.findAll({
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

        if (monthlyCollections.length === 0) {
            return {
                hasData: false,
                message: `📊 **Місячний звіт з інкасації**\n\n📅 **Місяць:** ${month}/${year}\n\n❌ **Дані інкасації за цей місяць не знайдено**`
            };
        }

        // Group collections by collector
        const collectorGroups = {};
        let totalSum = 0;
        let totalBanknotes = 0;
        let totalCoins = 0;
        const uniqueDevices = new Set();
        const dailyTotals = {};
        const weeklyTotals = {};

        monthlyCollections.forEach(entry => {
            const collector = entry.collector_nik || 'Unknown';
            const deviceId = entry.device_id;
            const entryDate = entry.date.toISOString().split('T')[0];
            const weekNumber = Math.ceil(new Date(entryDate).getDate() / 7);
            
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

            if (!weeklyTotals[weekNumber]) {
                weeklyTotals[weekNumber] = {
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
            
            weeklyTotals[weekNumber].totalSum += parseFloat(entry.total_sum);
            weeklyTotals[weekNumber].entries += 1;
        });

        // Build the summary message
        let summaryMessage = `📊 **Місячний звіт з інкасації**\n\n`;
        summaryMessage += `📅 **Місяць:** ${month}/${year}\n`;
        summaryMessage += `📈 **Днів з даними:** ${Object.keys(dailyTotals).length}\n`;
        summaryMessage += `📊 **Тижнів з даними:** ${Object.keys(weeklyTotals).length}\n\n`;

        // Overall summary
        summaryMessage += `**Загальний підсумок:**\n`;
        summaryMessage += `Всього інкасацій: ${monthlyCollections.length}\n`;
        summaryMessage += `Всього апаратів: ${uniqueDevices.size}\n`;
        summaryMessage += `Всього купюр: ${totalBanknotes.toFixed(2)} грн\n`;
        summaryMessage += `Всього монет: ${totalCoins.toFixed(2)} грн\n`;
        summaryMessage += `**Загальна сума: ${totalSum.toFixed(2)} грн**\n\n`;

        // Weekly breakdown
        summaryMessage += `**Розподіл по тижнях:**\n`;
        Object.entries(weeklyTotals).sort().forEach(([week, data]) => {
            summaryMessage += `  **Тиждень ${week}:** ${data.entries} інкасацій, ${data.totalSum.toFixed(2)} грн\n`;
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
                totalCollections: monthlyCollections.length,
                totalDevices: uniqueDevices.size,
                totalSum: totalSum,
                totalBanknotes: totalBanknotes,
                totalCoins: totalCoins,
                collectors: Object.keys(collectorGroups).length,
                daysWithData: Object.keys(dailyTotals).length,
                weeksWithData: Object.keys(weeklyTotals).length
            }
        };

    } catch (error) {
        logger.error(`Error generating monthly summary for ${month}/${year}: ${error.message}`);
        throw error;
    }
};

