import axios from "axios";
import { bot } from "./app.js";
// import { phrases } from "./language_ua.js";
// import { createNewBonus } from "./models/achievements.js";
import { logger } from "./logger/index.js";
// import { findUserByChatId } from "./models/users.js";

const waterPrice = 1.5;

const getCardData = async (user_id, card_id) => {
    const url = 'https://soliton.net.ua/water/api/card/query/index.php'; 
    const requestData = {
        user_id,
        card_id,
    };
        
    const response = await axios.post(url, requestData);
    const card = response.data.card;
    return card;
}

const checkBalanceChange = async (chatId, user_id, card_id) => {
    const currentBalance = await getCardData(user_id, card_id);
    const beforeWater = currentBalance.WaterQty;
        setTimeout(async () => {
            const balance = await getCardData(user_id, card_id);
            console.log(balance)
            const afterWater = balance.WaterQty;
            console.log(beforeWater)
            if (beforeWater !== afterWater) {
    
                const balanceChange = afterWater - beforeWater;
    
                sendResult(chatId, balanceChange, balance.Discount);
    
            } else {
                setTimeout(async () => {
                    const balance = await getCardData(user_id, card_id);
                    const afterWater = balance.WaterQty;
    
                    if (beforeWater !== afterWater) {
    
                        const balanceChange = afterWater - beforeWater;
    
                        sendResult(chatId, balanceChange, balance.Discount);
    
                    } else {
    
                        // bot.sendMessage(chatId, phrases.bonusNotificationCardError);

                        logger.warn(`id користувача ${chatId} не завершив оплату  ${user_id, card_id}`)
                    }

                }, 60000 * 2);
            }

        }, 60000 * 2);    
    
};

const checkBalanceChangeForCardPayment = async (chatId, user_id, card_id) => {
    const checkInterval = 10000; // Інтервал перевірки - 10 секунд
    const maxAttempts = 30; // Максимальна кількість спроб (5 хвилин)

    const currentBalance = await getCardData(user_id, card_id);
    const beforeWater = currentBalance.WaterQty;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));

        const balance = await getCardData(user_id, card_id);
        const afterWater = balance.WaterQty;

        if (beforeWater !== afterWater) {
            const balanceChange = afterWater - beforeWater;
            sendResult(chatId, balanceChange, balance.Discount);
            return (balanceChange/10).toFixed(2); // Успішно завершено
        }
    }

    // Якщо цикл завершився без успіху
    // bot.sendMessage(chatId, phrases.bonusNotificationCardError);
    logger.warn(`id користувача ${chatId} не завершив оплату ${user_id}, ${card_id}`);
    return false; // Заключний блок
};


const sendResult = async (chatId, balanceChange, discount) => {    

    if (balanceChange > 0) {

        const liters = (balanceChange / 10).toFixed(2);   

        const bonusAmount = (liters * (discount/100)).toFixed(2);

        const totalWithoutBonus = (liters - bonusAmount);
        
        const litersPrice = (totalWithoutBonus * waterPrice).toFixed(0); 
        
        // const userData = await findUserByChatId(chatId);

        logger.info(`Внесено: ${litersPrice} грн, куплено: ${liters} літра.`)

        // bot.sendMessage(chatId, phrases.bonusNotificationCard(totalWithoutBonus, litersPrice, bonusAmount, waterPrice, liters));
    
    };
}

export {
    getCardData,
    checkBalanceChange,
    checkBalanceChangeForCardPayment
}
        
    

