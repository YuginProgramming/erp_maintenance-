import { sequelize, ensureConnection } from "../database/sequelize.js";
import { Worker } from "../database/maintenance-models.js";
import { logger } from "../logger/index.js";
import { Op } from "sequelize";
import { generateDailySummary } from "./daily-summary.js";
import { sendChunkedMessage } from "./message-utils.js";

// Function to send daily summary to all workers
export const sendDailySummaryToAllWorkers = async (bot, targetDate) => {
    try {
        logger.info(`Sending daily summary for ${targetDate} to all workers...`);
        
        // Ensure database connection is established
        const isConnected = await ensureConnection();
        if (!isConnected) {
            throw new Error('Database connection failed');
        }
        logger.info('Database connection established for summary');
        
        // Get all workers (since active field might be null, we'll include all)
        const workers = await Worker.findAll({
            where: {
                chat_id: {
                    [Op.not]: null
                }
            }
        });
        
        if (workers.length === 0) {
            logger.warn('No active workers found in database');
            return {
                totalWorkers: 0,
                successfulSends: 0,
                failedSends: 0
            };
        }
        
        logger.info(`Found ${workers.length} active workers to send summary to`);
        
        // Generate summary once
        const summary = await generateDailySummary(targetDate);
        
        let successfulSends = 0;
        let failedSends = 0;
        
        // Send to each worker
        for (const worker of workers) {
            try {
                // Send chunked message
                const chunksSent = await sendChunkedMessage(bot, worker.chat_id, summary.message);
                
                successfulSends++;
                logger.info(`Daily summary sent to worker ${worker.name} (${worker.chat_id}) for ${targetDate} in ${chunksSent} chunks`);
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                failedSends++;
                logger.error(`Failed to send summary to worker ${worker.name} (${worker.chat_id}): ${error.message}`);
            }
        }
        
        const result = {
            totalWorkers: workers.length,
            successfulSends,
            failedSends
        };
        
        logger.info(`Daily summary distribution completed: ${successfulSends}/${workers.length} successful sends`);
        
        return result;
        
    } catch (error) {
        logger.error(`Error sending daily summary to all workers: ${error.message}`);
        throw error;
    }
};

