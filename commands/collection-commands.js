import { sendDeviceCollectionToTelegram } from '../device/device-collection-handler.js';
import { sendAllDevicesCollectionSummary } from '../utils/collection-utils.js';

// Handle /collection command with time period buttons
export const handleCollectionCommand = (bot) => {
    bot.onText(/\/collection(?:\s+(\d+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const deviceId = match[1]; // If device ID is provided, use it
        
        if (deviceId) {
            // If specific device is provided, show period buttons for that device
            const inlineKeyboard = {
                inline_keyboard: [
                    [
                        { text: '📅 Сьогодні', callback_data: `collection_${deviceId}_day` },
                        { text: '📊 Останні 7 днів', callback_data: `collection_${deviceId}_week` }
                    ],
                    [
                        { text: '📈 Останні 30 днів', callback_data: `collection_${deviceId}_month` }
                    ]
                ]
            };
            
            await bot.sendMessage(chatId, 
                `🔍 Виберіть період для даних інкасації апарату ${deviceId}:`, 
                { reply_markup: inlineKeyboard }
            );
        } else {
            // If no device specified, show time period buttons for ALL devices
            const inlineKeyboard = {
                inline_keyboard: [
                    [
                        { text: '📅 Сьогодні', callback_data: 'collection_all_day' },
                        { text: '📊 Останні 7 днів', callback_data: 'collection_all_week' }
                    ],
                    [
                        { text: '📈 Останні 30 днів', callback_data: 'collection_all_month' }
                    ]
                ]
            };
            
            await bot.sendMessage(chatId, 
                `🔍 Виберіть період для даних інкасації ВСІХ апаратів:`, 
                { reply_markup: inlineKeyboard }
            );
        }
    });
};

// Handle /collection with date range: /collection 164 2025-06-01 2025-06-30
export const handleCollectionWithDateRange = (bot) => {
    bot.onText(/\/collection\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{4}-\d{2}-\d{2})/, async (msg, match) => {
        const chatId = msg.chat.id;
        const deviceId = match[1];
        const startDate = match[2];
        const endDate = match[3];
        
        await sendDeviceCollectionToTelegram(bot, chatId, deviceId, startDate, endDate);
    });
};

// Handle /fetch_daily command (manual trigger for daily collection fetch)
export const handleFetchDailyCommand = (bot) => {
    bot.onText(/\/fetch_daily/, async (msg) => {
        const chatId = msg.chat.id;
        await bot.sendMessage(chatId, '🔄 Запуск ручного щоденного збору даних інкасації...');
        
        try {
            const { fetchDailyCollectionData } = await import('../schedulers/index.js');
            await fetchDailyCollectionData();
            await bot.sendMessage(chatId, '✅ Щоденний збір даних інкасації успішно завершено!');
        } catch (error) {
            await bot.sendMessage(chatId, `❌ Помилка під час щоденного збору даних: ${error.message}`);
        }
    });
};

// Handle /check_data command to debug collection data
export const handleCheckDataCommand = (bot) => {
    bot.onText(/\/check_data(?:\s+(\d{4}-\d{2}-\d{2}))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const { getYesterdayDate } = await import('../reports/index.js');
        const targetDate = match[1] || getYesterdayDate();
        
        await bot.sendMessage(chatId, `🔍 Перевірка даних інкасації для ${targetDate}...`);
        
        try {
            const { checkCurrentCollectionData } = await import('../reports/index.js');
            const collections = await checkCurrentCollectionData(targetDate);
            if (collections.length === 0) {
                await bot.sendMessage(chatId, `❌ Дані інкасації для ${targetDate} не знайдено`);
            } else {
                await bot.sendMessage(chatId, `✅ Знайдено ${collections.length} записів інкасації для ${targetDate}`);
            }
        } catch (error) {
            await bot.sendMessage(chatId, `❌ Помилка перевірки даних: ${error.message}`);
        }
    });
};
