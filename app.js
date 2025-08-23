import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { handleMaintenanceCommand, handleMachinesCommand, handleAlertsCommand } from './maintenance-handler.js';
import { sendDeviceListToTelegram } from './device-handler.js';
import { sendDeviceCollectionToTelegram, getDefaultDateRange } from './device-collection-handler.js';

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

// Handle /help command
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
🔧 **Water Vending Machine Maintenance Bot**

**Available Commands:**
/maintenance - View all maintenance tasks
/machines - Check machine status and water levels
/alerts - Show urgent maintenance alerts
/devices - Show active devices from API
/collection - Show device collection data (last 7 days)
/collection [device_id] - Show collection data for specific device
/collection [device_id] [start_date] [end_date] - Show collection data with custom date range
/help - Show this help message

**Collection Examples:**
/collection - Default device (last 7 days)
/collection 164 - Device 164 (last 7 days)
/collection 164 2025-06-01 2025-06-30 - Device 164 with custom date range

**Features:**
• Maintenance task tracking
• Machine status monitoring
• Water quality alerts
• Technician assignment
• Filter replacement scheduling
• Emergency repair notifications

**Maintenance Types:**
🔧 Filter Replacement
🧹 System Cleaning
💧 Water Quality Test
🔨 Equipment Repair
🛡️ Preventive Maintenance
🚨 Emergency Repair

Need technical support? Contact the maintenance team.
    `;

    await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Error handling
bot.on('error', (error) => {
    console.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

// Start the bot
console.log('🤖 Telegram Bot is starting...');
console.log('📱 Bot is now running. Press Ctrl+C to stop.');

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping bot...');
    bot.stopPolling();
    process.exit(0);
});

export default bot;
