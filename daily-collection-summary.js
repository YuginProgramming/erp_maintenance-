import { sequelize } from "./database/sequelize.js";
import { Collection, Worker } from "./database/maintenance-models.js";
import { logger } from "./logger/index.js";
import { Op } from "sequelize";

// Function to generate daily collection summary
const generateDailySummary = async (targetDate) => {
    try {
        // Get all collection entries for the specified date
        const dailyCollections = await Collection.findAll({
            where: {
                date: {
                    [Op.between]: [
                        new Date(`${targetDate} 00:00:00`),
                        new Date(`${targetDate} 23:59:59`)
                    ]
                }
            },
            order: [['date', 'ASC']]
        });

        if (dailyCollections.length === 0) {
            return {
                hasData: false,
                message: `📊 **Daily Collection Summary**\n\n📅 **Date:** ${targetDate}\n\n❌ **No collection data found for this date**`
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
        let summaryMessage = `📊 **Daily Collection Summary**\n\n`;
        summaryMessage += `📅 **Date:** ${targetDate}\n`;
        summaryMessage += `🕐 **Collection Time:** ${dailyCollections[0].date.toLocaleString('en-US', { timeZone: 'Europe/Kiev' })} - ${dailyCollections[dailyCollections.length - 1].date.toLocaleString('en-US', { timeZone: 'Europe/Kiev' })}\n\n`;

        // Overall summary
        summaryMessage += `💰 **Overall Summary:**\n`;
        summaryMessage += `📦 Total Collections: ${dailyCollections.length}\n`;
        summaryMessage += `🏪 Total Devices: ${uniqueDevices.size}\n`;
        summaryMessage += `💵 Total Banknotes: ${totalBanknotes.toFixed(2)} грн\n`;
        summaryMessage += `🪙 Total Coins: ${totalCoins.toFixed(2)} грн\n`;
        summaryMessage += `💎 **Total Sum: ${totalSum.toFixed(2)} грн**\n\n`;

        // Collector breakdown
        summaryMessage += `👥 **Collector Breakdown:**\n\n`;

        Object.entries(collectorGroups).forEach(([collector, data]) => {
            summaryMessage += `**${collector}:**\n`;
            summaryMessage += `  📦 Collections: ${data.entries.length}\n`;
            summaryMessage += `  🏪 Devices: ${data.devices.size} (IDs: ${Array.from(data.devices).join(', ')})\n`;
            summaryMessage += `  💵 Banknotes: ${data.totalBanknotes.toFixed(2)} грн\n`;
            summaryMessage += `  🪙 Coins: ${data.totalCoins.toFixed(2)} грн\n`;
            summaryMessage += `  💎 **Total: ${data.totalSum.toFixed(2)} грн**\n\n`;
        });

        // Device details
        summaryMessage += `🏪 **Device Details:**\n`;
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
            summaryMessage += `  📱 **Device ${deviceId}** (${data.name}):\n`;
            summaryMessage += `    📦 Collections: ${data.entries}\n`;
            summaryMessage += `    💎 Total: ${data.totalSum.toFixed(2)} грн\n`;
        });

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

// Function to send daily summary to a single Telegram chat
const sendDailySummaryToTelegram = async (bot, chatId, targetDate) => {
    try {
        logger.info(`Generating daily summary for ${targetDate} and sending to chat ${chatId}`);
        
        const summary = await generateDailySummary(targetDate);
        
        if (summary.hasData) {
            await bot.sendMessage(chatId, summary.message, { 
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
            
            logger.info(`Daily summary sent to chat ${chatId} for ${targetDate}`);
            logger.info(`Summary stats: ${summary.stats.totalCollections} collections, ${summary.stats.totalDevices} devices, ${summary.stats.totalSum.toFixed(2)} грн total`);
            
            return summary.stats;
        } else {
            await bot.sendMessage(chatId, summary.message, { 
                parse_mode: 'Markdown' 
            });
            
            logger.info(`No data summary sent to chat ${chatId} for ${targetDate}`);
            return null;
        }
        
    } catch (error) {
        logger.error(`Error sending daily summary to Telegram: ${error.message}`);
        
        try {
            await bot.sendMessage(chatId, `❌ **Error generating daily summary**\n\n${error.message}`);
        } catch (sendError) {
            logger.error(`Failed to send error message to chat ${chatId}: ${sendError.message}`);
        }
        
        throw error;
    }
};

// Function to send daily summary to all workers
const sendDailySummaryToAllWorkers = async (bot, targetDate) => {
    try {
        logger.info(`Sending daily summary for ${targetDate} to all workers...`);
        
        // Get all workers (since active field might be null, we'll include all)
        const workers = await Worker.findAll({
            where: {
                chat_id: {
                    [Op.not]: null
                }
            }
        });
        
        if (workers.length === 0) {
            logger.warn('No active workers found in database');
            return {
                totalWorkers: 0,
                successfulSends: 0,
                failedSends: 0
            };
        }
        
        logger.info(`Found ${workers.length} active workers to send summary to`);
        
        // Generate summary once
        const summary = await generateDailySummary(targetDate);
        
        let successfulSends = 0;
        let failedSends = 0;
        
        // Send to each worker
        for (const worker of workers) {
            try {
                if (summary.hasData) {
                    await bot.sendMessage(worker.chat_id, summary.message, { 
                        parse_mode: 'Markdown',
                        disable_web_page_preview: true
                    });
                } else {
                    await bot.sendMessage(worker.chat_id, summary.message, { 
                        parse_mode: 'Markdown' 
                    });
                }
                
                successfulSends++;
                logger.info(`Daily summary sent to worker ${worker.name} (${worker.chat_id}) for ${targetDate}`);
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                failedSends++;
                logger.error(`Failed to send summary to worker ${worker.name} (${worker.chat_id}): ${error.message}`);
            }
        }
        
        const result = {
            totalWorkers: workers.length,
            successfulSends,
            failedSends
        };
        
        logger.info(`Daily summary distribution completed: ${successfulSends}/${workers.length} successful sends`);
        
        return result;
        
    } catch (error) {
        logger.error(`Error sending daily summary to all workers: ${error.message}`);
        throw error;
    }
};

// Function to get yesterday's date in YYYY-MM-DD format
const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
};

// Function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
};

export {
    generateDailySummary,
    sendDailySummaryToTelegram,
    sendDailySummaryToAllWorkers,
    getYesterdayDate,
    getTodayDate
};
