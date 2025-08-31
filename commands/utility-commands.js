// Handle /help command
export const handleHelpCommand = (bot) => {
    bot.onText(/\/help/, async (msg) => {
        const chatId = msg.chat.id;
        
        const helpMessage = `🤖 **Водяний бот - Довідка**\n\n` +
            `**Основні команди:**\n` +
            `/start - Запуск бота\n` +
            `/help - Показ цього повідомлення допомоги\n` +
            `/status - Показ статусу системи\n` +
            `/test_db - Тест підключення до бази даних\n` +
            `/alerts - Показ термінових сповіщень\n` +
            `/devices - Показ активних апаратів з API\n` +
            `/collection - Показ звіту інкасації всіх апаратів (з вибором періоду)\n` +
            `/collection [device_id] - Показ даних інкасації для конкретного апарату (з вибором періоду)\n` +
            `/collection [device_id] [start_date] [end_date] - Показ даних інкасації з власним діапазоном дат\n` +
            `/fetch_daily - Ручний запуск щоденного збору даних інкасації\n` +
            `/summary - Показ щоденного звіту інкасації за вчора\n` +
            `/summary [YYYY-MM-DD] - Показ щоденного звіту інкасації для конкретної дати\n` +
            `/summary_today - Показ сьогоднішнього звіту інкасації\n` +
            `/send_summary_all - Надсилання щоденного звіту всім працівникам\n` +
            `/check_data - Перевірка даних інкасації за вчора\n` +
            `/check_data [YYYY-MM-DD] - Перевірка даних інкасації для конкретної дати\n` +
            `/data_availability - Показ наявності даних інкасації за останні 60 днів\n` +
            `/devices_list - Показ списку всіх апаратів в базі даних\n` +
            `/completeness_check - Ручний запуск перевірки повноти бази даних (попередні 30 днів)\n` +
            `/force_summary - Примусове надсилання щоденного звіту для сьогодні\n` +
            `/report_previous_day - Показ звіту інкасації за попередній день\n` +
            `/report_previous_week - Показ тижневого звіту інкасації за попередній тиждень\n` +
            `/report_previous_month - Показ місячного звіту інкасації за попередній місяць\n` +
            `/report_week - Показ тижневого звіту інкасації за поточний тиждень\n` +
            `/report_month - Показ місячного звіту інкасації за поточний місяць\n` +
            `/help - Показ цього повідомлення допомоги\n\n` +
            `**Приклади інкасації:**\n` +
            `/collection - Звіт інкасації всіх апаратів (з вибором періоду)\n` +
            `/collection 164 - Апарат 164 (з вибором періоду)\n` +
            `/collection 164 2025-06-01 2025-06-30 - Апарат 164 з власним діапазоном дат\n\n` +
            `**Приклади звітів:**\n` +
            `/summary 2025-06-15 - Звіт за 15 червня 2025\n` +
            `/send_summary_all 2025-06-15 - Надіслати звіт за 15 червня всім працівникам\n\n` +
            `💡 **Поради:**\n` +
            `• Використовуйте inline кнопки для швидкого доступу до даних\n` +
            `• Дати вказуйте у форматі YYYY-MM-DD\n` +
            `• Бот автоматично збирає дані щодня о 8:00 за київським часом`;
        
        await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });
};

// Handle /start command
export const handleStartCommand = (bot) => {
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const welcomeMessage = `🤖 **Водяний бот запущений!**\n\n` +
            `Ласкаво просимо до системи управління водяними апаратами!\n\n` +
            `📊 **Основні можливості:**\n` +
            `• Перегляд даних інкасації\n` +
            `• Генерація звітів\n` +
            `• Моніторинг апаратів\n` +
            `• Автоматичні сповіщення\n\n` +
            `💡 Використовуйте /help для перегляду всіх команд`;
        
        await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });
};

// Handle /test_db command
export const handleTestDbCommand = (bot) => {
    bot.onText(/\/test_db/, async (msg) => {
        const chatId = msg.chat.id;
        await bot.sendMessage(chatId, '🔍 Тестування підключення до бази даних...');
        
        try {
            const { ensureConnection } = await import('../database/sequelize.js');
            const success = await ensureConnection();
            
            if (success) {
                await bot.sendMessage(chatId, '✅ Підключення до бази даних успішне!');
            } else {
                await bot.sendMessage(chatId, '❌ Помилка підключення до бази даних');
            }
        } catch (error) {
            await bot.sendMessage(chatId, `❌ Помилка тестування бази даних: ${error.message}`);
        }
    });
};

// Handle /status command
export const handleStatusCommand = (bot) => {
    bot.onText(/\/status/, async (msg) => {
        const chatId = msg.chat.id;
        
        const statusMessage = `📊 Статус системи\n\n` +
            `🤖 Бот: ✅ Активний\n` +
            `📅 Останнє оновлення: ${new Date().toLocaleString('en-US')}\n` +
            `⏰ Наступний збір даних: 8:00 завтра (Київ)\n` +
            `📊 Наступний звіт: 8:00 завтра (Київ)\n` +
            `🔄 Перевірка повноти: 13:00 завтра (Київ)\n\n` +
            `💡 Використовуйте /test_db для перевірки підключення до бази даних`;
        
        await bot.sendMessage(chatId, statusMessage);
    });
};
