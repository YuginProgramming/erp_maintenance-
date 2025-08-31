import axios from "axios";
import { logger } from "../logger/index.js";

// Function to extract collector information from description
const extractCollectorInfo = (descr) => {
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

// Function to fetch device collection data from database
const fetchDeviceCollection = async (device_id, startDate, endDate) => {
    try {
        const { sequelize, ensureConnection } = await import('../database/sequelize.js');
        const { Collection } = await import('../database/maintenance-models.js');
        const { Op } = await import('sequelize');
        
        await ensureConnection();
        
        logger.info(`Fetching collection data for device ${device_id} from ${startDate} to ${endDate}`);
        
        // Get device info (first record to get machine name)
        const deviceInfo = await Collection.findOne({
            where: { device_id: device_id },
            attributes: ['machine'],
            raw: true
        });
        
        // Get collection data
        const collections = await Collection.findAll({
            where: {
                device_id: device_id,
                date: {
                    [Op.between]: [startDate, endDate]
                }
            },
            order: [['date', 'DESC'], ['id', 'DESC']],
            raw: true
        });
        
        // Format data to match API response structure
        const formattedData = collections.map(collection => ({
            id: collection.id,
            date: collection.date,
            sum_banknotes: collection.sum_banknotes,
            sum_coins: collection.sum_coins,
            total_sum: collection.total_sum,
            note: collection.note,
            collector_id: collection.collector_id,
            collector_nik: collection.collector_nik
        }));
        
        return {
            status: 'success',
            device_id: device_id,
            address: deviceInfo?.machine || 'Не вказано',
            data: formattedData
        };
        
    } catch (error) {
        logger.error(`Error fetching collection data for device ${device_id}: ${error.message}`);
        return { error: error.message };
    }
};

// Function to format collection data for Telegram message
const formatCollectionData = (collectionData) => {
    if (!collectionData || collectionData.error) {
        return `❌ **Помилка отримання даних інкасації**\n\n${collectionData?.error || 'Невідома помилка'}`;
    }

    const { device_id, address, data } = collectionData;
    
    if (!data || data.length === 0) {
        return `📊 **Звіт з інкасації апарату**\n\n` +
               `ID апарату: ${device_id}\n` +
               `Адреса: ${address || 'Не вказано'}\n\n` +
               `Дані інкасації за вказаний період не знайдено`;
    }

    let message = `📊 **Звіт з інкасації апарату**\n\n` +
                  `ID апарату: ${device_id}\n` +
                  `Адреса: ${address || 'Не вказано'}\n` +
                  `Період: ${data.length} записів інкасації\n\n`;

    // Calculate totals
    let totalSum = 0;
    let totalBanknotes = 0;
    let totalCoins = 0;

    data.forEach(entry => {
        totalSum += parseFloat(entry.total_sum) || 0;
        totalBanknotes += parseFloat(entry.sum_banknotes) || 0;
        totalCoins += parseFloat(entry.sum_coins) || 0;
    });

    message += `**Підсумок:**\n` +
               `Загальна сума: ${totalSum.toFixed(2)} грн\n` +
               `Купюри: ${totalBanknotes.toFixed(2)} грн\n` +
               `Монети: ${totalCoins.toFixed(2)} грн\n\n`;

    return message;
};

// Function to format individual collection entry
const formatCollectionEntry = (entry, index) => {
    const date = new Date(entry.date).toLocaleDateString('uk-UA');
    const sum = parseFloat(entry.total_sum) || 0;
    const banknotes = parseFloat(entry.sum_banknotes) || 0;
    const coins = parseFloat(entry.sum_coins) || 0;
    
    let message = `📅 **Запис інкасації #${index + 1}**\n` +
                  `Дата: ${date}\n` +
                  `ID карти: ${entry.card_id || 'Н/Д'}\n` +
                  `Сума: ${sum.toFixed(2)} грн\n` +
                  `Купюри: ${banknotes.toFixed(2)} грн\n` +
                  `Монети: ${coins.toFixed(2)} грн\n`;
    
    if (entry.collector_nik) {
        message += `Інкасатор: ${entry.collector_nik}\n`;
    }
    
    if (entry.note) {
        message += `Опис: ${entry.note}\n`;
    }
    
    return message;
};

// Main function to send device collection data to Telegram
const sendDeviceCollectionToTelegram = async (bot, chatId, device_id, startDate, endDate) => {
    try {
        // Validate date format
        if (!validateDateFormat(startDate) || !validateDateFormat(endDate)) {
            await bot.sendMessage(chatId, '❌ **Неправильний формат дати**\n\nВикористовуйте формат YYYY-MM-DD (наприклад, 2025-06-01)');
            return;
        }

        // Validate date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start > end) {
            await bot.sendMessage(chatId, '❌ **Неправильний діапазон дат**\n\nДата початку повинна бути раніше дати кінця');
            return;
        }

        // Send loading message
        const loadingMsg = await bot.sendMessage(chatId, `📊 Отримання даних інкасації для апарату ${device_id}...`);

        // Fetch collection data from API
        const collectionData = await fetchDeviceCollection(device_id, startDate, endDate);
        
        if (collectionData.error) {
            await bot.editMessageText(`❌ **Помилка отримання даних інкасації**\n\n${collectionData.error}`, {
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
                const completionMessage = `📋 **Примітка:** Ще ${remainingCount} записів інкасації доступно. Показано перші ${MAX_ENTRIES_TO_SEND} щоб уникнути спаму.`;
                await bot.sendMessage(chatId, completionMessage, { parse_mode: 'Markdown' });
            }
        }

        logger.info(`Collection data sent to chat ${chatId} for device ${device_id}. Found ${collectionData.data?.length || 0} entries.`);

            } catch (error) {
            logger.error(`Error sending collection data to chat ${chatId}: ${error.message}`);
            
            try {
                await bot.sendMessage(chatId, '❌ Помилка отримання даних інкасації. Спробуйте ще раз пізніше.');
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
