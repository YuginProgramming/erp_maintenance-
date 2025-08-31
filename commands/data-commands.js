// Handle /data_availability command to show what data is available
export const handleDataAvailabilityCommand = (bot) => {
    bot.onText(/\/data_availability/, async (msg) => {
        const chatId = msg.chat.id;
        
        await bot.sendMessage(chatId, '🔍 Перевірка наявності даних інкасації...');
        
        try {
            const { sequelize, ensureConnection } = await import('../database/sequelize.js');
            const { Collection } = await import('../database/maintenance-models.js');
            const { Op } = await import('sequelize');
            
            await ensureConnection();
            
            // Get the last 60 days of data availability
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
            
            const collections = await Collection.findAll({
                where: {
                    date: {
                        [Op.gte]: sixtyDaysAgo.toISOString().split('T')[0]
                    }
                },
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('date')), 'date'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: [sequelize.fn('DATE', sequelize.col('date'))],
                order: [[sequelize.fn('DATE', sequelize.col('date')), 'DESC']],
                raw: true
            });
            
            if (collections.length === 0) {
                await bot.sendMessage(chatId, '❌ Дані інкасації за останні 60 днів не знайдено');
            } else {
                let message = '📊 **Наявність даних інкасації за останні 60 днів:**\n\n';
                collections.slice(0, 20).forEach(collection => {
                    message += `📅 ${collection.date}: ${collection.count} записів\n`;
                });
                
                if (collections.length > 20) {
                    message += `\n... та ще ${collections.length - 20} днів з даними`;
                }
                
                await bot.sendMessage(chatId, message);
            }
        } catch (error) {
            await bot.sendMessage(chatId, `❌ Помилка перевірки наявності даних: ${error.message}`);
        }
    });
};

// Handle /devices_list command to show all devices in database
export const handleDevicesListCommand = (bot) => {
    bot.onText(/\/devices_list/, async (msg) => {
        const chatId = msg.chat.id;
        
        await bot.sendMessage(chatId, '📱 Отримання списку всіх апаратів...');
        
        try {
            const { sequelize, ensureConnection } = await import('../database/sequelize.js');
            const { Collection } = await import('../database/maintenance-models.js');
            const { Op } = await import('sequelize');
            
            await ensureConnection();
            
            const devices = await Collection.findAll({
                attributes: [
                    [sequelize.fn('DISTINCT', sequelize.col('device_id')), 'device_id'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'record_count']
                ],
                where: {
                    device_id: {
                        [Op.not]: null
                    }
                },
                group: ['device_id'],
                order: [['device_id', 'ASC']],
                raw: true
            });
            
            if (devices.length === 0) {
                await bot.sendMessage(chatId, '❌ Не знайдено жодного апарату в базі даних');
                return;
            }
            
            let message = '📱 **Список всіх апаратів в базі даних:**\n\n';
            devices.forEach((device, index) => {
                message += `${index + 1}. Апарат ${device.device_id} - ${device.record_count} записів\n`;
            });
            
            message += `\n💡 Використовуйте команду /collection [ID] для перегляду даних конкретного апарату`;
            
            await bot.sendMessage(chatId, message);
            
        } catch (error) {
            await bot.sendMessage(chatId, `❌ Помилка отримання списку апаратів: ${error.message}`);
        }
    });
};

// Handle /completeness_check command (manual trigger for database completeness check)
export const handleCompletenessCheckCommand = (bot) => {
    bot.onText(/\/completeness_check/, async (msg) => {
        const chatId = msg.chat.id;
        await bot.sendMessage(chatId, '🔄 Запуск ручної перевірки повноти бази даних (попередні 30 днів)...');
        
        try {
            const { checkAndFillMissingData } = await import('../database-completeness-checker.js');
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
};
