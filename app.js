import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { handleMaintenanceCommand, handleMachinesCommand, handleAlertsCommand } from './maintenance-handler.js';

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

// Handle /help command
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
🔧 **Water Vending Machine Maintenance Bot**

**Available Commands:**
/maintenance - View all maintenance tasks
/machines - Check machine status and water levels
/alerts - Show urgent maintenance alerts
/help - Show this help message

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
