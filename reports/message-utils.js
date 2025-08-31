import { logger } from "../logger/index.js";

// Function to split long messages into chunks for Telegram (max 4096 characters)
export const splitMessageIntoChunks = (message, maxLength = 4000) => {
    const chunks = [];
    let currentChunk = '';
    
    // Split by lines to avoid breaking in the middle of a line
    const lines = message.split('\n');
    
    for (const line of lines) {
        // If adding this line would exceed the limit, start a new chunk
        if (currentChunk.length + line.length + 1 > maxLength) {
            if (currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            
            // If a single line is too long, split it
            if (line.length > maxLength) {
                let remainingLine = line;
                while (remainingLine.length > 0) {
                    const chunk = remainingLine.substring(0, maxLength);
                    chunks.push(chunk);
                    remainingLine = remainingLine.substring(maxLength);
                }
            } else {
                currentChunk = line;
            }
        } else {
            currentChunk += (currentChunk.length > 0 ? '\n' : '') + line;
        }
    }
    
    // Add the last chunk if it has content
    if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
};

// Function to send chunked messages to Telegram
export const sendChunkedMessage = async (bot, chatId, message, options = {}) => {
    const chunks = splitMessageIntoChunks(message);
    
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkInfo = chunks.length > 1 ? ` (${i + 1}/${chunks.length})` : '';
        
        try {
            await bot.sendMessage(chatId, chunk + chunkInfo, {
                disable_web_page_preview: true,
                ...options
            });
            
            // Add delay between chunks to avoid rate limiting
            if (i < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            logger.info(`Message chunk ${i + 1}/${chunks.length} sent to chat ${chatId}`);
        } catch (error) {
            logger.error(`Failed to send message chunk ${i + 1}/${chunks.length} to chat ${chatId}: ${error.message}`);
            throw error;
        }
    }
    
    return chunks.length;
};

