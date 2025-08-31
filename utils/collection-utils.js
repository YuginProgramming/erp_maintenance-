import { logger } from '../logger/index.js';

// Function to send collection summary for all devices
export const sendAllDevicesCollectionSummary = async (bot, chatId, startDate, endDate, period) => {
    try {
        const { sequelize, ensureConnection } = await import('../database/sequelize.js');
        const { Collection } = await import('../database/maintenance-models.js');
        const { Op } = await import('sequelize');
        
        await ensureConnection();
        
        // Get all collections for the period
        const collections = await Collection.findAll({
            where: {
                date: {
                    [Op.between]: [startDate, endDate]
                }
            },
            order: [['date', 'DESC'], ['device_id', 'ASC']],
            raw: true
        });
        
        if (collections.length === 0) {
            await bot.sendMessage(chatId, `📊 **Звіт інкасації за ${period === 'day' ? 'сьогодні' : period === 'week' ? 'останні 7 днів' : 'останні 30 днів'}**\n\n❌ Дані інкасації за вказаний період не знайдено`);
            return;
        }
        
        // Calculate totals
        let totalSum = 0;
        let totalBanknotes = 0;
        let totalCoins = 0;
        const deviceCounts = {};
        const deviceTotals = {};
        
        collections.forEach(collection => {
            const deviceId = collection.device_id;
            const amount = parseFloat(collection.total_sum) || 0;
            const banknotes = parseFloat(collection.sum_banknotes) || 0;
            const coins = parseFloat(collection.sum_coins) || 0;
            
            totalSum += amount;
            totalBanknotes += banknotes;
            totalCoins += coins;
            
            // Count records per device
            deviceCounts[deviceId] = (deviceCounts[deviceId] || 0) + 1;
            
            // Sum totals per device
            if (!deviceTotals[deviceId]) {
                deviceTotals[deviceId] = { sum: 0, banknotes: 0, coins: 0 };
            }
            deviceTotals[deviceId].sum += amount;
            deviceTotals[deviceId].banknotes += banknotes;
            deviceTotals[deviceId].coins += coins;
        });
        
        // Create summary message
        const periodText = period === 'day' ? 'сьогодні' : period === 'week' ? 'останні 7 днів' : 'останні 30 днів';
        let message = `📊 **Звіт інкасації за ${periodText}**\n\n`;
        message += `📅 Період: ${startDate} - ${endDate}\n`;
        message += `📱 Апаратів з даними: ${Object.keys(deviceCounts).length}\n`;
        message += `📋 Всього записів: ${collections.length}\n\n`;
        
        message += `💰 **Загальний підсумок:**\n`;
        message += `Загальна сума: ${totalSum.toFixed(2)} грн\n`;
        message += `Купюри: ${totalBanknotes.toFixed(2)} грн\n`;
        message += `Монети: ${totalCoins.toFixed(2)} грн\n\n`;
        
        // Show top 10 devices by total amount
        const sortedDevices = Object.entries(deviceTotals)
            .sort(([,a], [,b]) => b.sum - a.sum)
            .slice(0, 10);
        
        message += `🏆 **Топ-10 апаратів за сумою:**\n`;
        sortedDevices.forEach(([deviceId, totals], index) => {
            message += `${index + 1}. Апарат ${deviceId}: ${totals.sum.toFixed(2)} грн (${deviceCounts[deviceId]} записів)\n`;
        });
        
        if (Object.keys(deviceTotals).length > 10) {
            message += `\n... та ще ${Object.keys(deviceTotals).length - 10} апаратів`;
        }
        
        await bot.sendMessage(chatId, message);
        
    } catch (error) {
        logger.error(`Error sending all devices collection summary: ${error.message}`);
        await bot.sendMessage(chatId, `❌ Помилка генерації звіту: ${error.message}`);
    }
};
