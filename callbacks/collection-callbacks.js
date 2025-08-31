import { sendDeviceCollectionToTelegram } from '../device/device-collection-handler.js';
import { sendAllDevicesCollectionSummary } from '../utils/collection-utils.js';

// Handle inline button callbacks for collection periods
export const handleCollectionCallbacks = (bot) => {
    bot.on('callback_query', async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;
        
        if (data.startsWith('collection_')) {
            const parts = data.split('_');
            const deviceId = parts[1];
            const period = parts[2];
            
            let startDate, endDate;
            const today = new Date();
            
            switch (period) {
                case 'day':
                    // Today (current day)
                    startDate = today.toISOString().split('T')[0];
                    endDate = today.toISOString().split('T')[0];
                    break;
                case 'week':
                    // Current week (last 7 days including today)
                    const weekAgo = new Date(today);
                    weekAgo.setDate(today.getDate() - 6); // Last 7 days including today
                    startDate = weekAgo.toISOString().split('T')[0];
                    endDate = today.toISOString().split('T')[0];
                    break;
                case 'month':
                    // Current month (last 30 days including today)
                    const monthAgo = new Date(today);
                    monthAgo.setDate(today.getDate() - 29); // Last 30 days including today
                    startDate = monthAgo.toISOString().split('T')[0];
                    endDate = today.toISOString().split('T')[0];
                    break;
                default:
                    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Невідомий період' });
                    return;
            }
            
            // Answer the callback query
            await bot.answerCallbackQuery(callbackQuery.id, { text: `📊 Завантаження даних за ${period === 'day' ? 'сьогодні' : period === 'week' ? 'останні 7 днів' : 'останні 30 днів'}...` });
            
            if (deviceId === 'all') {
                // Generate summary for all devices
                await sendAllDevicesCollectionSummary(bot, chatId, startDate, endDate, period);
            } else {
                // Send the collection data for specific device
                await sendDeviceCollectionToTelegram(bot, chatId, deviceId, startDate, endDate);
            }
        }
    });
};
