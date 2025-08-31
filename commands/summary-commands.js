// Handle /summary command (show daily collection summary)
export const handleSummaryCommand = (bot) => {
    bot.onText(/\/summary(?:\s+(\d{4}-\d{2}-\d{2}))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const { getYesterdayDate, sendDailySummaryToTelegram } = await import('../reports/index.js');
        const targetDate = match[1] || getYesterdayDate(); // Default to yesterday if no date provided
        
        await bot.sendMessage(chatId, `📊 Генерація щоденного звіту інкасації для ${targetDate}...`);
        
        try {
            await sendDailySummaryToTelegram(bot, chatId, targetDate);
        } catch (error) {
            await bot.sendMessage(chatId, `❌ Помилка генерації звіту: ${error.message}`);
        }
    });
};

// Handle /summary_today command (show today's summary)
export const handleSummaryTodayCommand = (bot) => {
    bot.onText(/\/summary_today/, async (msg) => {
        const chatId = msg.chat.id;
        const { getTodayDate, sendDailySummaryToTelegram } = await import('../reports/index.js');
        const today = getTodayDate();
        
        await bot.sendMessage(chatId, `📊 Генерація сьогоднішнього звіту інкасації для ${today}...`);
        
        try {
            await sendDailySummaryToTelegram(bot, chatId, today);
        } catch (error) {
            await bot.sendMessage(chatId, `❌ Помилка генерації звіту: ${error.message}`);
        }
    });
};

// Handle /send_summary_all command (send summary to all workers)
export const handleSendSummaryAllCommand = (bot) => {
    bot.onText(/\/send_summary_all(?:\s+(\d{4}-\d{2}-\d{2}))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const { getYesterdayDate, sendDailySummaryToAllWorkers } = await import('../reports/index.js');
        const targetDate = match[1] || getYesterdayDate();
        
        await bot.sendMessage(chatId, `📊 Надсилання щоденного звіту інкасації для ${targetDate} всім працівникам...`);
        
        try {
            const result = await sendDailySummaryToAllWorkers(bot, targetDate);
            await bot.sendMessage(chatId, `✅ Звіт надіслано ${result.successfulSends}/${result.totalWorkers} працівникам успішно`);
        } catch (error) {
            await bot.sendMessage(chatId, `❌ Помилка надсилання звіту працівникам: ${error.message}`);
        }
    });
};

// Handle /force_summary command (force send summary for today)
export const handleForceSummaryCommand = (bot) => {
    bot.onText(/\/force_summary/, async (msg) => {
        const chatId = msg.chat.id;
        const { getTodayDate, sendDailySummaryToTelegram } = await import('../reports/index.js');
        const today = getTodayDate();
        
        await bot.sendMessage(chatId, '📊 Примусове надсилання щоденного звіту для сьогодні...');
        
        try {
            await sendDailySummaryToTelegram(bot, chatId, today);
            await bot.sendMessage(chatId, '✅ Щоденний звіт успішно надіслано');
        } catch (error) {
            await bot.sendMessage(chatId, `❌ Помилка надсилання звіту: ${error.message}`);
        }
    });
};
