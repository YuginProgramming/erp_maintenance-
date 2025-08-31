// Handle /report_previous_day command (send report for previous day)
export const handleReportPreviousDayCommand = (bot) => {
    bot.onText(/\/report_previous_day/, async (msg) => {
        const chatId = msg.chat.id;
        const { getPreviousDayDate, sendDailySummaryToTelegram } = await import('../reports/index.js');
        const previousDay = getPreviousDayDate();
        
        await bot.sendMessage(chatId, `📊 Генерація звіту інкасації за попередній день (${previousDay})...`);
        
        try {
            await sendDailySummaryToTelegram(bot, chatId, previousDay);
            await bot.sendMessage(chatId, '✅ Звіт за попередній день успішно надіслано');
        } catch (error) {
            await bot.sendMessage(chatId, `❌ Помилка надсилання звіту: ${error.message}`);
        }
    });
};

// Handle /report_previous_week command (send report for previous week)
export const handleReportPreviousWeekCommand = (bot) => {
    bot.onText(/\/report_previous_week/, async (msg) => {
        const chatId = msg.chat.id;
        const { getPreviousWeekRange, sendWeeklySummaryToTelegram } = await import('../reports/index.js');
        const { startDate, endDate } = getPreviousWeekRange();
        
        await bot.sendMessage(chatId, `📊 Генерація тижневого звіту інкасації за попередній тиждень (${startDate} - ${endDate})...`);
        
        try {
            await sendWeeklySummaryToTelegram(bot, chatId, startDate, endDate);
            await bot.sendMessage(chatId, '✅ Тижневий звіт успішно надіслано');
        } catch (error) {
            await bot.sendMessage(chatId, `❌ Помилка надсилання тижневого звіту: ${error.message}`);
        }
    });
};

// Handle /report_previous_month command (send report for previous month)
export const handleReportPreviousMonthCommand = (bot) => {
    bot.onText(/\/report_previous_month/, async (msg) => {
        const chatId = msg.chat.id;
        const { getPreviousMonth, sendMonthlySummaryToTelegram } = await import('../reports/index.js');
        const { year, month } = getPreviousMonth();
        
        await bot.sendMessage(chatId, `📊 Генерація місячного звіту інкасації за попередній місяць (${month}/${year})...`);
        
        try {
            await sendMonthlySummaryToTelegram(bot, chatId, year, month);
            await bot.sendMessage(chatId, '✅ Місячний звіт успішно надіслано');
        } catch (error) {
            await bot.sendMessage(chatId, `❌ Помилка надсилання місячного звіту: ${error.message}`);
        }
    });
};

// Handle /report_week command (send report for current week)
export const handleReportWeekCommand = (bot) => {
    bot.onText(/\/report_week/, async (msg) => {
        const chatId = msg.chat.id;
        const { sendWeeklySummaryToTelegram } = await import('../reports/index.js');
        
        // Calculate current week (Monday to Sunday)
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // Monday
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6); // Sunday
        
        const startDate = monday.toISOString().split('T')[0];
        const endDate = sunday.toISOString().split('T')[0];
        
        await bot.sendMessage(chatId, `📊 Генерація тижневого звіту інкасації за поточний тиждень (${startDate} - ${endDate})...`);
        
        try {
            await sendWeeklySummaryToTelegram(bot, chatId, startDate, endDate);
            await bot.sendMessage(chatId, '✅ Тижневий звіт успішно надіслано');
        } catch (error) {
            await bot.sendMessage(chatId, `❌ Помилка надсилання тижневого звіту: ${error.message}`);
        }
    });
};

// Handle /report_month command (send report for current month)
export const handleReportMonthCommand = (bot) => {
    bot.onText(/\/report_month/, async (msg) => {
        const chatId = msg.chat.id;
        const { sendMonthlySummaryToTelegram } = await import('../reports/index.js');
        
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1; // getMonth() returns 0-11
        
        await bot.sendMessage(chatId, `📊 Генерація місячного звіту інкасації за поточний місяць (${month}/${year})...`);
        
        try {
            await sendMonthlySummaryToTelegram(bot, chatId, year, month);
            await bot.sendMessage(chatId, '✅ Місячний звіт успішно надіслано');
        } catch (error) {
            await bot.sendMessage(chatId, `❌ Помилка надсилання місячного звіту: ${error.message}`);
        }
    });
};
