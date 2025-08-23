import axios from "axios";  
import { logger } from "../logger/index.js";

const activateDevice = async (device_id, card_id, phone) => {
    try {
        const response = await axios.post('https://soliton.net.ua/water/api/card/send/index.php/card/send/index.php',
            {
                device_id,
                card_id
            }
        )
        const result = response.data;

        console.log(result)

        switch (result.status) {
            case 'success': 
               
                return true;

            case 'error':
                switch (result.descr) {
                    case 'no card id':
                        logger.info(`Cannt activate device ${device_id}. No card id. Phone ${phone}`);
                        return false;
                    case 'no device id':
                        logger.info(`Card ${card_id} cannt activate device. No device id. Phone ${phone}`);
                        return false;
                    case 'database error':
                        logger.info(`Card ${card_id} cannt activate device ${device_id}. Database error. Phone ${phone}`);
                        return false;
                }
                
        }
    } catch (error) {
        logger.warn(`Card ${card_id} cannt activate device ${device_id}`)
        return false;
    }
     
}

export default activateDevice;