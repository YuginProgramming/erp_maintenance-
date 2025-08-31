import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from './logger/index.js';

// Import command handlers
import { 
    handleCollectionCommand, 
    handleCollectionWithDateRange, 
    handleFetchDailyCommand, 
    handleCheckDataCommand 
} from './commands/collection-commands.js';

import { 
    handleSummaryCommand, 
    handleSummaryTodayCommand, 
    handleSendSummaryAllCommand, 
    handleForceSummaryCommand 
} from './commands/summary-commands.js';

import { 
    handleReportPreviousDayCommand, 
    handleReportPreviousWeekCommand, 
    handleReportPreviousMonthCommand, 
    handleReportWeekCommand, 
    handleReportMonthCommand 
} from './commands/report-commands.js';

import { 
    handleHelpCommand, 
    handleStartCommand, 
    handleTestDbCommand, 
    handleStatusCommand 
} from './commands/utility-commands.js';

import { 
    handleDataAvailabilityCommand, 
    handleDevicesListCommand, 
    handleCompletenessCheckCommand 
} from './commands/data-commands.js';

// Import callback handlers
import { handleCollectionCallbacks } from './callbacks/collection-callbacks.js';

// Import schedulers
import { scheduleDailyCollection, scheduleDailySummary } from './schedulers/index.js';

// Import database completeness checker
import { scheduleDailyCompletenessCheck } from './database-completeness-checker.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Bot configuration
const token = process.env.TELEGRAM_BOT_TOKEN;
const DEFAULT_CHAT_ID = process.env.DEFAULT_CHAT_ID;

if (!token) {
    logger.error('TELEGRAM_BOT_TOKEN is not set in environment variables');
    process.exit(1);
}

// Create bot instance
const bot = new TelegramBot(token, { polling: true });

// Bot startup
console.log('🤖 Telegram Bot is starting...');

// Register all command handlers
const registerCommands = () => {
    // Collection commands
    handleCollectionCommand(bot);
    handleCollectionWithDateRange(bot);
    handleFetchDailyCommand(bot);
    handleCheckDataCommand(bot);
    
    // Summary commands
    handleSummaryCommand(bot);
    handleSummaryTodayCommand(bot);
    handleSendSummaryAllCommand(bot);
    handleForceSummaryCommand(bot);
    
    // Report commands
    handleReportPreviousDayCommand(bot);
    handleReportPreviousWeekCommand(bot);
    handleReportPreviousMonthCommand(bot);
    handleReportWeekCommand(bot);
    handleReportMonthCommand(bot);
    
    // Utility commands
    handleHelpCommand(bot);
    handleStartCommand(bot);
    handleTestDbCommand(bot);
    handleStatusCommand(bot);
    
    // Data commands
    handleDataAvailabilityCommand(bot);
    handleDevicesListCommand(bot);
    handleCompletenessCheckCommand(bot);
    
    // Callback handlers
    handleCollectionCallbacks(bot);
};

// Start schedulers
const startSchedulers = () => {
    console.log('🕐 Starting daily collection scheduler...');
    scheduleDailyCollection();
    console.log('✅ Daily collection scheduler started (runs at 8 AM Kyiv time)');
    
    console.log('📊 Starting daily summary scheduler...');
    scheduleDailySummary();
    console.log('✅ Daily summary scheduler started (runs at 8 AM Kyiv time)');
    
    console.log('🔄 Starting daily completeness check scheduler...');
    scheduleDailyCompletenessCheck();
    console.log('✅ Daily completeness check scheduler started (runs at 1 PM Kyiv time)');
};

// Error handling
bot.on('error', (error) => {
    logger.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
    logger.error('Polling error:', error);
});

// Bot conflict detection
let isRunning = false;
bot.on('polling_error', (error) => {
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        if (isRunning) {
            console.log('❌ Bot conflict detected: Another instance is running');
            console.log('💡 Solution: Stop other bot instances and restart this one');
            console.log('💡 You can use: pkill -f "node app.js" to stop all instances');
            
            setTimeout(() => {
                console.log('🔄 Attempting to restart bot in 10 seconds...');
            }, 10000);
        }
    }
});

// Initialize bot
const initializeBot = async () => {
    try {
        isRunning = true;
        
        // Register all commands
        registerCommands();
        
        // Start schedulers
        startSchedulers();
        
        console.log('📱 Bot is now running. Press Ctrl+C to stop.');
        
    } catch (error) {
        logger.error('Error initializing bot:', error);
        process.exit(1);
    }
};

// Start the bot
initializeBot();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down bot...');
    isRunning = false;
    
    try {
        await bot.stopPolling();
        console.log('✅ Bot stopped successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Error stopping bot:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    isRunning = false;
    
    try {
        await bot.stopPolling();
        console.log('✅ Bot stopped successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Error stopping bot:', error);
        process.exit(1);
    }
});
