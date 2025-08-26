import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { handleMaintenanceCommand, handleMachinesCommand, handleAlertsCommand } from './handlers/maintenance-handler.js';
import { sendDeviceListToTelegram } from './device/device-handler.js';
import { sendDeviceCollectionToTelegram, getDefaultDateRange } from './device/device-collection-handler.js';
import { scheduleDailyCollection, scheduleDailySummary, fetchDailyCollectionData } from './daily-collection-scheduler.js';
import { sendDailySummaryToTelegram, sendDailySummaryToAllWorkers, getYesterdayDate, getTodayDate, checkCurrentCollectionData } from './daily-collection-summary.js';
import { scheduleDailyCompletenessCheck, checkAndFillMissingData } from './database-completeness-checker.js';

dotenv.config();

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize bot with your token
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Simple in-memory storage for users
const users = new Map();

// Set bot commands
bot.setMyCommands([
    { command: '/maintenance', description: 'Show maintenance tasks' },
    { command: '/machines', description: 'Show machine status' },
    { command: '/alerts', description: 'Show urgent alerts' },
    { command: '/devices', description: 'Show active devices from API' },
    { command: '/collection', description: 'Show device collection data' },
    { command: '/help', description: 'Show help information' }
]);

// Handle /maintenance command
bot.onText(/\/maintenance/, async (msg) => {
    const chatId = msg.chat.id;
    await handleMaintenanceCommand(bot, chatId);
});

// Handle /machines command
bot.onText(/\/machines/, async (msg) => {
    const chatId = msg.chat.id;
    await handleMachinesCommand(bot, chatId);
});

// Handle /alerts command
bot.onText(/\/alerts/, async (msg) => {
    const chatId = msg.chat.id;
    await handleAlertsCommand(bot, chatId);
});

// Handle /devices command
bot.onText(/\/devices/, async (msg) => {
    const chatId = msg.chat.id;
    await sendDeviceListToTelegram(bot, chatId);
});

// Handle /collection command with parameters
bot.onText(/\/collection(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const { startDate, endDate } = getDefaultDateRange();
    
    // If device ID is provided, use it; otherwise use default
    const deviceId = match[1] || '164'; // Default to device 164 (Бандери, 69)
    
    await sendDeviceCollectionToTelegram(bot, chatId, deviceId, startDate, endDate);
});

// Handle /collection with date range: /collection 164 2025-06-01 2025-06-30
bot.onText(/\/collection\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{4}-\d{2}-\d{2})/, async (msg, match) => {
    const chatId = msg.chat.id;
    const deviceId = match[1];
    const startDate = match[2];
    const endDate = match[3];
    
    await sendDeviceCollectionToTelegram(bot, chatId, deviceId, startDate, endDate);
});

// Handle /fetch_daily command (manual trigger for daily collection fetch)
bot.onText(/\/fetch_daily/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '🔄 Запуск ручного щоденного збору даних інкасації...');
    
    try {
        await fetchDailyCollectionData();
        await bot.sendMessage(chatId, '✅ Щоденний збір даних інкасації успішно завершено!');
    } catch (error) {
        await bot.sendMessage(chatId, `❌ Помилка під час щоденного збору даних: ${error.message}`);
    }
});

// Handle /summary command (show daily collection summary)
bot.onText(/\/summary(?:\s+(\d{4}-\d{2}-\d{2}))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const targetDate = match[1] || getYesterdayDate(); // Default to yesterday if no date provided
    
    await bot.sendMessage(chatId, `📊 Генерація щоденного звіту інкасації для ${targetDate}...`);
    
    try {
        await sendDailySummaryToTelegram(bot, chatId, targetDate);
    } catch (error) {
        await bot.sendMessage(chatId, `❌ Помилка генерації звіту: ${error.message}`);
    }
});

// Handle /summary_today command (show today's summary)
bot.onText(/\/summary_today/, async (msg) => {
    const chatId = msg.chat.id;
    const today = getTodayDate();
    
    await bot.sendMessage(chatId, `📊 Генерація сьогоднішнього звіту інкасації для ${today}...`);
    
    try {
        await sendDailySummaryToTelegram(bot, chatId, today);
    } catch (error) {
        await bot.sendMessage(chatId, `❌ Помилка генерації звіту: ${error.message}`);
    }
});

// Handle /send_summary_all command (send summary to all workers)
bot.onText(/\/send_summary_all(?:\s+(\d{4}-\d{2}-\d{2}))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const targetDate = match[1] || getYesterdayDate();
    
    await bot.sendMessage(chatId, `📊 Надсилання щоденного звіту інкасації для ${targetDate} всім працівникам...`);
    
    try {
        const result = await sendDailySummaryToAllWorkers(bot, targetDate);
        await bot.sendMessage(chatId, `✅ Звіт надіслано ${result.successfulSends}/${result.totalWorkers} працівникам успішно`);
    } catch (error) {
        await bot.sendMessage(chatId, `❌ Помилка надсилання звіту працівникам: ${error.message}`);
    }
});

// Handle /check_data command to debug collection data
bot.onText(/\/check_data(?:\s+(\d{4}-\d{2}-\d{2}))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const targetDate = match[1] || getYesterdayDate();
    
    await bot.sendMessage(chatId, `🔍 Перевірка даних інкасації для ${targetDate}...`);
    
    try {
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

// Handle /completeness_check command (manual trigger for database completeness check)
bot.onText(/\/completeness_check/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '🔄 Запуск ручної перевірки повноти бази даних (попередні 30 днів)...');
    
    try {
        const result = await checkAndFillMissingData();
        if (result.success) {
            await bot.sendMessage(chatId, `✅ **Перевірка повноти бази даних завершена!**\n\nРезультати:\n• Тривалість: ${result.duration}с\n• Перевірено дат: ${result.datesChecked}\n• Оброблено дат: ${result.datesProcessed}\n• Пропущено дат: ${result.datesSkipped}\n• Всього записів збережено: ${result.totalSaved}`);
        } else {
            await bot.sendMessage(chatId, `❌ Помилка під час перевірки повноти: ${result.error}`);
        }
    } catch (error) {
        await bot.sendMessage(chatId, `❌ Помилка під час перевірки повноти: ${error.message}`);
    }
});

// Handle /help command
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
🔧 **Бот обслуговування автоматів з водою**

**Доступні команди:**
/maintenance - Перегляд всіх завдань обслуговування
/machines - Перевірка статусу машин та рівня води
/alerts - Показ термінових сповіщень
/devices - Показ активних апаратів з API
/collection - Показ даних інкасації апарату (останні 7 днів)
/collection [device_id] - Показ даних інкасації для конкретного апарату
/collection [device_id] [start_date] [end_date] - Показ даних інкасації з власним діапазоном дат
/fetch_daily - Ручний запуск щоденного збору даних інкасації
/summary - Показ вчорашнього звіту інкасації
/summary [YYYY-MM-DD] - Показ звіту інкасації для конкретної дати
/summary_today - Показ сьогоднішнього звіту інкасації
/send_summary_all - Надсилання звіту всім працівникам
/send_summary_all [YYYY-MM-DD] - Надсилання звіту всім працівникам для конкретної дати
/check_data - Перевірка даних інкасації за вчора
/check_data [YYYY-MM-DD] - Перевірка даних інкасації для конкретної дати
/completeness_check - Ручний запуск перевірки повноти бази даних (попередні 30 днів)
/help - Показ цього повідомлення допомоги

**Приклади інкасації:**
/collection - Апарат за замовчуванням (останні 7 днів)
/collection 164 - Апарат 164 (останні 7 днів)
/collection 164 2025-06-01 2025-06-30 - Апарат 164 з власним діапазоном дат

**Функції:**
• Відстеження завдань обслуговування
• Моніторинг статусу машин
• Сповіщення про якість води
• Призначення техніків
• Планування заміни фільтрів
• Сповіщення про аварійний ремонт
• Автоматизація щоденного збору даних інкасації (8:00 за київським часом)
• Щоденні звіти інкасації (8:00 за київським часом) з розподілом за інкасаторами
• Перевірки повноти бази даних (13:00 за київським часом) - забезпечує відсутність пропущених даних

**Типи обслуговування:**
🔧 Заміна фільтра
🧹 Очищення системи
💧 Тест якості води
🔨 Ремонт обладнання
🛡️ Профілактичне обслуговування
🚨 Аварійний ремонт

Потрібна технічна підтримка? Зверніться до команди обслуговування.
    `;

    await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Error handling
bot.on('error', (error) => {
    console.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
    if (error.code === 'ETELEGRAM' && error.response && error.response.body && error.response.body.description && error.response.body.description.includes('Conflict')) {
        console.error('❌ Bot conflict detected: Another instance is running');
        console.error('💡 Solution: Stop other bot instances and restart this one');
        console.error('💡 You can use: pkill -f "node app.js" to stop all instances');
        
        // Optionally exit the process after a delay
        setTimeout(() => {
            console.log('🔄 Attempting to restart bot in 10 seconds...');
        }, 10000);
    } else {
        console.error('Polling error:', error);
    }
});

// Start the bot
console.log('🤖 Telegram Bot is starting...');
console.log('📱 Bot is now running. Press Ctrl+C to stop.');

// Set up global bot and default chat ID for daily scheduler
global.bot = bot;
global.defaultChatId = process.env.DEFAULT_CHAT_ID || '269694206'; // Default chat ID for summaries

// Start the daily collection scheduler
console.log('🕐 Starting daily collection scheduler...');
scheduleDailyCollection();
console.log('✅ Daily collection scheduler started (runs at 8 AM Kyiv time)');

// Start the daily summary scheduler
console.log('📊 Starting daily summary scheduler...');
scheduleDailySummary();
console.log('✅ Daily summary scheduler started (runs at 8 AM Kyiv time)');

// Start the daily completeness check scheduler
console.log('🔄 Starting daily completeness check scheduler...');
scheduleDailyCompletenessCheck();
console.log('✅ Daily completeness check scheduler started (runs at 1 PM Kyiv time)');

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping bot...');
    bot.stopPolling();
    process.exit(0);
});

export default bot;
