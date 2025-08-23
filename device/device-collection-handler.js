import axios from "axios";
import { logger } from "../logger/index.js";

// Function to fetch device collection data from API
const fetchDeviceCollection = async (device_id, startDate, endDate) => {
    try {
        const url = 'https://soliton.net.ua/water/api/device_inkas.php';
        const requestData = {
            device_id: device_id.toString(),
            ds: startDate, // Format: '2024-02-01'
            de: endDate    // Format: '2024-02-15'
        };

        logger.info(`Fetching collection data for device ${device_id} from ${startDate} to ${endDate}`);
        
        const response = await axios.post(url, requestData);
        const result = response.data;

        if (result.status === 'success') {
            return result;
        } else {
            logger.error(`API error for device ${device_id}: ${result.descr}`);
            return { error: result.descr };
        }
    } catch (error) {
        logger.error(`Error fetching collection data for device ${device_id}: ${error.message}`);
        return { error: error.message };
    }
};

// Function to format collection data for Telegram message
const formatCollectionData = (collectionData) => {
    if (!collectionData || collectionData.error) {
        return `❌ **Error fetching collection data**\n\n${collectionData?.error || 'Unknown error'}`;
    }

    const { device_id, address, data } = collectionData;
    
    if (!data || data.length === 0) {
        return `📊 **Device Collection Report**\n\n` +
               `🖥️ **Device ID:** ${device_id}\n` +
               `📍 **Address:** ${address || 'Not specified'}\n\n` +
               `📋 **No collection data found for the specified period**`;
    }

    let message = `📊 **Device Collection Report**\n\n` +
                  `🖥️ **Device ID:** ${device_id}\n` +
                  `📍 **Address:** ${address || 'Not specified'}\n` +
                  `📅 **Period:** ${data.length} collection entries\n\n`;

    // Calculate totals
    let totalSum = 0;
    let totalBanknotes = 0;
    let totalCoins = 0;

    data.forEach(entry => {
        totalSum += parseFloat(entry.sum) || 0;
        totalBanknotes += parseFloat(entry.banknotes) || 0;
        totalCoins += parseFloat(entry.coins) || 0;
    });

    message += `💰 **Summary:**\n` +
               `💵 Total Sum: ${totalSum.toFixed(2)} грн\n` +
               `💳 Banknotes: ${totalBanknotes.toFixed(2)} грн\n` +
               `🪙 Coins: ${totalCoins.toFixed(2)} грн\n\n`;

    return message;
};

// Function to format individual collection entry
const formatCollectionEntry = (entry, index) => {
    const date = new Date(entry.date).toLocaleDateString('uk-UA');
    const sum = parseFloat(entry.sum) || 0;
    const banknotes = parseFloat(entry.banknotes) || 0;
    const coins = parseFloat(entry.coins) || 0;
    
    let message = `📅 **Collection Entry #${index + 1}**\n` +
                  `📆 Date: ${date}\n` +
                  `💳 Card ID: ${entry.card_id || 'N/A'}\n` +
                  `💰 Sum: ${sum.toFixed(2)} грн\n` +
                  `💵 Banknotes: ${banknotes.toFixed(2)} грн\n` +
                  `🪙 Coins: ${coins.toFixed(2)} грн\n`;
    
    if (entry.descr) {
        message += `📝 Description: ${entry.descr}\n`;
    }
    
    return message;
};

// Main function to send device collection data to Telegram
const sendDeviceCollectionToTelegram = async (bot, chatId, device_id, startDate, endDate) => {
    try {
        // Validate date format
        if (!validateDateFormat(startDate) || !validateDateFormat(endDate)) {
            await bot.sendMessage(chatId, '❌ **Invalid date format**\n\nPlease use YYYY-MM-DD format (e.g., 2025-06-01)');
            return;
        }

        // Validate date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start > end) {
            await bot.sendMessage(chatId, '❌ **Invalid date range**\n\nStart date must be before end date');
            return;
        }

        // Send loading message
        const loadingMsg = await bot.sendMessage(chatId, `📊 Fetching collection data for device ${device_id}...`);

        // Fetch collection data from API
        const collectionData = await fetchDeviceCollection(device_id, startDate, endDate);
        
        if (collectionData.error) {
            await bot.editMessageText(`❌ **Error fetching collection data**\n\n${collectionData.error}`, {
                chat_id: chatId,
                message_id: loadingMsg.message_id,
                parse_mode: 'Markdown'
            });
            return;
        }

        // Send summary first
        const summaryMessage = formatCollectionData(collectionData);
        await bot.editMessageText(summaryMessage, {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
        });

        // If there's collection data, send individual entries
        if (collectionData.data && collectionData.data.length > 0) {
            const MAX_ENTRIES_TO_SEND = 10; // Limit to prevent spam
            const entriesToSend = collectionData.data.slice(0, MAX_ENTRIES_TO_SEND);
            const hasMoreEntries = collectionData.data.length > MAX_ENTRIES_TO_SEND;

            // Send each collection entry as a separate message
            for (let i = 0; i < entriesToSend.length; i++) {
                const entry = entriesToSend[i];
                const entryMessage = formatCollectionEntry(entry, i);
                
                try {
                    await bot.sendMessage(chatId, entryMessage, { parse_mode: 'Markdown' });
                    
                    // Small delay to avoid rate limiting
                    if (i < entriesToSend.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                } catch (entryError) {
                    logger.error(`Error sending collection entry ${i} to chat ${chatId}: ${entryError.message}`);
                }
            }

            // Send completion message if there are more entries
            if (hasMoreEntries) {
                const remainingCount = collectionData.data.length - MAX_ENTRIES_TO_SEND;
                const completionMessage = `📋 **Note:** ${remainingCount} more collection entries available. Showing first ${MAX_ENTRIES_TO_SEND} to avoid spam.`;
                await bot.sendMessage(chatId, completionMessage, { parse_mode: 'Markdown' });
            }
        }

        logger.info(`Collection data sent to chat ${chatId} for device ${device_id}. Found ${collectionData.data?.length || 0} entries.`);

    } catch (error) {
        logger.error(`Error sending collection data to chat ${chatId}: ${error.message}`);
        
        try {
            await bot.sendMessage(chatId, '❌ Error fetching collection data. Please try again later.');
        } catch (sendError) {
            logger.error(`Failed to send error message to chat ${chatId}: ${sendError.message}`);
        }
    }
};

// Function to get collection data as JSON (for other uses)
const getDeviceCollection = async (device_id, startDate, endDate) => {
    return await fetchDeviceCollection(device_id, startDate, endDate);
};

// Helper function to validate date format
const validateDateFormat = (dateString) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
        return false;
    }
    
    const date = new Date(dateString);
    return !isNaN(date.getTime());
};

// Helper function to get default date range (last 7 days)
const getDefaultDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    
    return {
        startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD
        endDate: endDate.toISOString().split('T')[0]      // YYYY-MM-DD
    };
};

export {
    fetchDeviceCollection,
    formatCollectionData,
    formatCollectionEntry,
    sendDeviceCollectionToTelegram,
    getDeviceCollection,
    validateDateFormat,
    getDefaultDateRange
};
