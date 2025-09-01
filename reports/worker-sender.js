import { connectionManager, databaseService } from "../database/index.js";
import { WorkerRepository } from "../database/repositories/index.js";
import { logger } from "../logger/index.js";
import { generateDailySummary } from "./daily-summary.js";
import { sendChunkedMessage } from "./message-utils.js";

// Function to send daily summary to all workers
export const sendDailySummaryToAllWorkers = async (bot, targetDate) => {
    try {
        logger.info(`Sending daily summary for ${targetDate} to all workers...`);
        
        // Initialize connection manager if not already initialized
        if (!connectionManager.initialized) {
            await connectionManager.initialize();
        }
        
        // Check database health
        const isHealthy = await databaseService.healthCheck();
        if (!isHealthy) {
            throw new Error('Database connection is not healthy');
        }
        logger.info('Database connection established and healthy for summary');
        
        // Create worker repository
        const workerRepo = new WorkerRepository();
        
        // Get all workers with valid chat IDs
        const workers = await workerRepo.executeCustomQuery(`
            SELECT * FROM workers 
            WHERE chat_id IS NOT NULL 
            AND active = true
            ORDER BY name ASC
        `);
        
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

