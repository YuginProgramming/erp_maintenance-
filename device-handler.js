import axios from "axios";
import { logger } from "./logger/index.js";

// Configuration
const MAX_DEVICES_TO_SEND = 20; // Limit to prevent spam

// Function to fetch all devices from the API
const fetchDevices = async () => {
    try {
        const response = await axios.get('https://soliton.net.ua/water/api/devices');
        const result = response.data;

        if (result.status === 'success' && result.devices) {
            return result.devices;
        } else {
            logger.error('Failed to fetch devices from API');
            return null;
        }
    } catch (error) {
        logger.error(`Error fetching devices: ${error.message}`);
        return null;
    }
};

// Function to filter active devices (devices with coordinates are considered active)
const filterActiveDevices = (devices) => {
    if (!devices || !Array.isArray(devices)) {
        return [];
    }
    
    return devices.filter(device => 
        device.lat !== null && 
        device.lon !== null && 
        device.lat !== "" && 
        device.lon !== ""
    );
};

// Function to format a single device for Telegram message
const formatSingleDevice = (device, index) => {
    const deviceNumber = index + 1;
    const status = device.lat && device.lon ? "🟢 Active" : "🔴 Inactive";
    
    let message = `📱 **Device #${deviceNumber}**\n`;
    message += `**${device.name}**\n`;
    message += `ID: \`${device.id}\`\n`;
    message += `Status: ${status}\n`;
    
    if (device.lat && device.lon) {
        message += `📍 Location: ${device.lat}, ${device.lon}\n`;
    }
    
    return message;
};

// Function to format device summary for Telegram message
const formatDeviceSummary = (activeCount, totalCount) => {
    return `📱 **Device Summary**\n\n🟢 Active Devices: ${activeCount}\n📊 Total Devices: ${totalCount}\n\n💬 Sending device details...`;
};

// Main function to send device list to Telegram (each device as separate message)
const sendDeviceListToTelegram = async (bot, chatId) => {
    try {
        // Send loading message
        const loadingMsg = await bot.sendMessage(chatId, '📱 Fetching active devices...');

        // Fetch devices from API
        const allDevices = await fetchDevices();
        
        if (!allDevices) {
            await bot.editMessageText('❌ Failed to fetch devices from API. Please try again later.', {
                chat_id: chatId,
                message_id: loadingMsg.message_id
            });
            return;
        }

        // Filter active devices
        const activeDevices = filterActiveDevices(allDevices);
        
        if (activeDevices.length === 0) {
            await bot.editMessageText('❌ No active devices found.', {
                chat_id: chatId,
                message_id: loadingMsg.message_id
            });
            return;
        }

        // Send summary first
        const summaryMessage = formatDeviceSummary(activeDevices.length, allDevices.length);
        await bot.editMessageText(summaryMessage, {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
        });

        // Limit the number of devices to send to avoid spam
        const devicesToSend = activeDevices.slice(0, MAX_DEVICES_TO_SEND);
        const hasMoreDevices = activeDevices.length > MAX_DEVICES_TO_SEND;
        
        // Send each device as a separate message with small delay to avoid rate limiting
        for (let i = 0; i < devicesToSend.length; i++) {
            const device = devicesToSend[i];
            const deviceMessage = formatSingleDevice(device, i);
            
            try {
                await bot.sendMessage(chatId, deviceMessage, { parse_mode: 'Markdown' });
                
                // Small delay to avoid hitting Telegram rate limits (20 messages per minute for groups)
                if (i < devicesToSend.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
                }
            } catch (deviceError) {
                logger.error(`Error sending device ${device.id} to chat ${chatId}: ${deviceError.message}`);
                // Continue with next device even if one fails
            }
        }

        // Send completion message
        let completionMessage = `✅ **Complete!** Sent details for ${devicesToSend.length} active devices.`;
        if (hasMoreDevices) {
            const remainingCount = activeDevices.length - MAX_DEVICES_TO_SEND;
            completionMessage += `\n\n📋 **Note:** ${remainingCount} more devices available. Showing first ${MAX_DEVICES_TO_SEND} to avoid spam.`;
        }
        await bot.sendMessage(chatId, completionMessage, { parse_mode: 'Markdown' });

        logger.info(`Device list sent to chat ${chatId}. Sent ${devicesToSend.length} out of ${activeDevices.length} active devices (total ${allDevices.length}) as separate messages.`);

    } catch (error) {
        logger.error(`Error sending device list to chat ${chatId}: ${error.message}`);
        
        // Try to send error message
        try {
            await bot.sendMessage(chatId, '❌ Error fetching device list. Please try again later.');
        } catch (sendError) {
            logger.error(`Failed to send error message to chat ${chatId}: ${sendError.message}`);
        }
    }
};

// Function to get device list as JSON (for other uses)
const getDeviceList = async () => {
    const allDevices = await fetchDevices();
    if (!allDevices) {
        return [];
    }
    
    return filterActiveDevices(allDevices);
};

export {
    fetchDevices,
    filterActiveDevices,
    formatSingleDevice,
    formatDeviceSummary,
    sendDeviceListToTelegram,
    getDeviceList
};
