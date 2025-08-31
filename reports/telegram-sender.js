import { logger } from "../logger/index.js";
import { sendChunkedMessage } from "./message-utils.js";
import { generateDailySummary } from "./daily-summary.js";
import { generateWeeklySummary } from "./weekly-summary.js";
import { generateMonthlySummary } from "./monthly-summary.js";

// Function to send daily summary to a single Telegram chat
export const sendDailySummaryToTelegram = async (bot, chatId, targetDate) => {
    try {
        logger.info(`Generating daily summary for ${targetDate} and sending to chat ${chatId}`);
        
        const summary = await generateDailySummary(targetDate);
        
        // Send chunked message
        const chunksSent = await sendChunkedMessage(bot, chatId, summary.message);
        
        if (summary.hasData) {
            logger.info(`Daily summary sent to chat ${chatId} for ${targetDate} in ${chunksSent} chunks`);
            logger.info(`Summary stats: ${summary.stats.totalCollections} collections, ${summary.stats.totalDevices} devices, ${summary.stats.totalSum.toFixed(2)} грн total`);
            return summary.stats;
        } else {
            logger.info(`No data summary sent to chat ${chatId} for ${targetDate}`);
            return null;
        }
        
    } catch (error) {
        logger.error(`Error sending daily summary to Telegram: ${error.message}`);
        
        try {
            await bot.sendMessage(chatId, `❌ **Помилка генерації щоденного звіту**\n\n${error.message}`);
        } catch (sendError) {
            logger.error(`Failed to send error message to chat ${chatId}: ${sendError.message}`);
        }
        
        throw error;
    }
};

// Function to send weekly summary to a single Telegram chat
export const sendWeeklySummaryToTelegram = async (bot, chatId, startDate, endDate) => {
    try {
        logger.info(`Generating weekly summary for ${startDate}-${endDate} and sending to chat ${chatId}`);
        
        const summary = await generateWeeklySummary(startDate, endDate);
        
        // Send chunked message
        const chunksSent = await sendChunkedMessage(bot, chatId, summary.message);
        
        if (summary.hasData) {
            logger.info(`Weekly summary sent to chat ${chatId} for ${startDate}-${endDate} in ${chunksSent} chunks`);
            logger.info(`Summary stats: ${summary.stats.totalCollections} collections, ${summary.stats.totalDevices} devices, ${summary.stats.totalSum.toFixed(2)} грн total`);
            return summary.stats;
        } else {
            logger.info(`No data weekly summary sent to chat ${chatId} for ${startDate}-${endDate}`);
            return null;
        }
        
    } catch (error) {
        logger.error(`Error sending weekly summary to Telegram: ${error.message}`);
        
        try {
            await bot.sendMessage(chatId, `❌ **Помилка генерації тижневого звіту**\n\n${error.message}`);
        } catch (sendError) {
            logger.error(`Failed to send error message to chat ${chatId}: ${sendError.message}`);
        }
        
        throw error;
    }
};

// Function to send monthly summary to a single Telegram chat
export const sendMonthlySummaryToTelegram = async (bot, chatId, year, month) => {
    try {
        logger.info(`Generating monthly summary for ${month}/${year} and sending to chat ${chatId}`);
        
        const summary = await generateMonthlySummary(year, month);
        
        // Send chunked message
        const chunksSent = await sendChunkedMessage(bot, chatId, summary.message);
        
        if (summary.hasData) {
            logger.info(`Monthly summary sent to chat ${chatId} for ${month}/${year} in ${chunksSent} chunks`);
            logger.info(`Summary stats: ${summary.stats.totalCollections} collections, ${summary.stats.totalDevices} devices, ${summary.stats.totalSum.toFixed(2)} грн total`);
            return summary.stats;
        } else {
            logger.info(`No data monthly summary sent to chat ${chatId} for ${month}/${year}`);
            return null;
        }
        
    } catch (error) {
        logger.error(`Error sending monthly summary to Telegram: ${error.message}`);
        
        try {
            await bot.sendMessage(chatId, `❌ **Помилка генерації місячного звіту**\n\n${error.message}`);
        } catch (sendError) {
            logger.error(`Failed to send error message to chat ${chatId}: ${sendError.message}`);
        }
        
        throw error;
    }
};

