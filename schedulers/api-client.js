import axios from "axios";
import { logger } from "../logger/index.js";

// Function to fetch all devices from API
export const fetchAllDevices = async () => {
    try {
        const response = await axios.post('https://soliton.net.ua/water/api/devices');
        
        if (response.data && response.data.devices) {
            // All devices are considered active since there's no status field
            return response.data.devices;
        }
        
        return [];
    } catch (error) {
        logger.error(`Error fetching devices: ${error.message}`);
        return [];
    }
};

// Function to fetch collection data for a specific device and date
export const fetchDeviceCollection = async (device_id, startDate, endDate) => {
    try {
        const url = 'https://soliton.net.ua/water/api/device_inkas.php';
        const requestData = {
            device_id: device_id.toString(),
            ds: startDate,
            de: endDate
        };

        logger.info(`Fetching collection data for device ${device_id} from ${startDate} to ${endDate}`);
        
        const response = await axios.post(url, requestData);
        const result = response.data;

        if (result.status === 'success') {
            return result;
        } else {
            logger.error(`API error for device ${device_id}: ${result.descr}`);
            return { error: result.descr };
        }
    } catch (error) {
        logger.error(`Error fetching collection data for device ${device_id}: ${error.message}`);
        return { error: error.message };
    }
};

