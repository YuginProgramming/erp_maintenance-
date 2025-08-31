import { logger } from "../logger/index.js";
import { fetchDailyCollectionData } from "./collection-fetcher.js";
import { sendDailySummaryToAllWorkers } from "../reports/worker-sender.js";

// Function to schedule the daily collection fetch at 8 AM Kyiv time
export const scheduleDailyCollection = () => {
    const scheduleNextCollectionRun = () => {
        const now = new Date();
        const kyivTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Kiev" }));
        
        // Set target time to 8 AM Kyiv time (changed from 2 PM)
        const targetTime = new Date(kyivTime);
        targetTime.setHours(8, 0, 0, 0); // 8 AM
        
        // If it's already past 8 AM today, schedule for tomorrow
        if (kyivTime >= targetTime) {
            targetTime.setDate(targetTime.getDate() + 1);
        }
        
        const timeUntilNextRun = targetTime.getTime() - kyivTime.getTime();
        
        logger.info(`Next daily collection fetch scheduled for: ${targetTime.toLocaleString('en-US', { timeZone: 'Europe/Kiev' })}`);
        logger.info(`Time until next run: ${Math.floor(timeUntilNextRun / 1000 / 60)} minutes`);
        
        setTimeout(async () => {
            logger.info('Starting scheduled daily collection data fetch...');
            try {
                await fetchDailyCollectionData();
                logger.info('Daily collection data fetch completed successfully');
            } catch (error) {
                logger.error('Daily collection data fetch failed:', error);
                // Notify admin of failure
                if (global.bot) {
                    try {
                        const adminChatId = process.env.DEFAULT_CHAT_ID || '269694206';
                        await global.bot.sendMessage(adminChatId, `❌ **Помилка щоденного збору даних інкасації**\n\n**Помилка:** ${error.message}\n\n⏰ Час: ${new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' })}`);
                    } catch (notifyError) {
                        logger.error(`Failed to notify admin of collection failure: ${notifyError.message}`);
                    }
                }
            }
            
            // Schedule the next run
            scheduleNextCollectionRun();
        }, timeUntilNextRun);
    };
    
    // Start the collection scheduling
    scheduleNextCollectionRun();
    
    logger.info('Daily collection scheduler started');
};

// Function to schedule the daily summary at 8 AM Kyiv time
export const scheduleDailySummary = () => {
    const scheduleNextSummaryRun = () => {
        const now = new Date();
        const kyivTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Kiev" }));
        
        // Set target time to 8 AM Kyiv time
        const targetTime = new Date(kyivTime);
        targetTime.setHours(8, 0, 0, 0); // 8 AM
        
        // If it's already past 8 AM today, schedule for tomorrow
        if (kyivTime >= targetTime) {
            targetTime.setDate(targetTime.getDate() + 1);
        }
        
        const timeUntilNextRun = targetTime.getTime() - kyivTime.getTime();
        
        logger.info(`Next daily summary scheduled for: ${targetTime.toLocaleString('en-US', { timeZone: 'Europe/Kiev' })}`);
        logger.info(`Time until next run: ${Math.floor(timeUntilNextRun / 1000 / 60)} minutes`);
        
        setTimeout(async () => {
            logger.info('Starting scheduled daily summary...');
            try {
                const { getYesterdayDate } = await import('../reports/date-utils.js');
                const yesterday = getYesterdayDate();
                if (global.bot) {
                    const result = await sendDailySummaryToAllWorkers(global.bot, yesterday);
                    logger.info(`Daily summary sent to ${result.successfulSends}/${result.totalWorkers} workers successfully`);
                    
                    // Notify admin of summary results
                    try {
                        const adminChatId = process.env.DEFAULT_CHAT_ID || '269694206';
                        await global.bot.sendMessage(adminChatId, `📊 **Щоденний звіт інкасації завершено**\n\n**Дата:** ${yesterday}\n**Успішно надіслано:** ${result.successfulSends}/${result.totalWorkers} працівникам\n\n⏰ Час: ${new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' })}`);
                    } catch (notifyError) {
                        logger.error(`Failed to notify admin of summary completion: ${notifyError.message}`);
                    }
                } else {
                    logger.warn('Bot not available for summary');
                }
            } catch (error) {
                logger.error('Daily summary failed:', error);
                // Notify admin of failure
                if (global.bot) {
                    try {
                        const adminChatId = process.env.DEFAULT_CHAT_ID || '269694206';
                        await global.bot.sendMessage(adminChatId, `❌ **Помилка щоденного звіту інкасації**\n\n**Помилка:** ${error.message}\n\n⏰ Час: ${new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' })}`);
                    } catch (notifyError) {
                        logger.error(`Failed to notify admin of summary failure: ${notifyError.message}`);
                    }
                }
            }
            
            // Schedule the next run
            scheduleNextSummaryRun();
        }, timeUntilNextRun);
    };
    
    // Start the summary scheduling
    scheduleNextSummaryRun();
    
    logger.info('Daily summary scheduler started');
};
