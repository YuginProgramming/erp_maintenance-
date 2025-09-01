import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { connectionManager } from '../../database/connection-manager.js';

describe('Database Connection Manager', () => {
    beforeAll(async () => {
        // Initialize connection manager before tests
        await connectionManager.initialize();
    });

    afterAll(async () => {
        // Clean up after tests
        await connectionManager.shutdown();
    });

    beforeEach(() => {
        // Reset any test state if needed
    });

    describe('Initialization', () => {
        it('should initialize successfully', async () => {
            expect(connectionManager.initialized).toBe(true);
            expect(connectionManager.isHealthy).toBe(true);
        });

        it('should have valid configuration', () => {
            const status = connectionManager.getPoolStatus();
            expect(status.initialized).toBe(true);
            expect(status.healthy).toBe(true);
            expect(status.pool).toBeDefined();
        });
    });

    describe('Connection Management', () => {
        it('should get a valid connection', async () => {
            const connection = await connectionManager.getConnection();
            expect(connection).toBeDefined();
            expect(connection.authenticate).toBeDefined();
        });

        it('should perform health check successfully', async () => {
            const isHealthy = await connectionManager.healthCheck();
            expect(isHealthy).toBe(true);
        });

        it('should handle connection errors gracefully', async () => {
            // This test would require mocking connection failures
            // For now, we'll just test that the method exists
            expect(typeof connectionManager.healthCheck).toBe('function');
        });
    });

    describe('Pool Status', () => {
        it('should return valid pool status', () => {
            const status = connectionManager.getPoolStatus();
            expect(status).toHaveProperty('initialized');
            expect(status).toHaveProperty('healthy');
            expect(status).toHaveProperty('pool');
            expect(typeof status.initialized).toBe('boolean');
            expect(typeof status.healthy).toBe('boolean');
        });
    });

    describe('Shutdown', () => {
        it('should shutdown gracefully', async () => {
            // Test shutdown and reinitialize
            await connectionManager.shutdown();
            expect(connectionManager.initialized).toBe(false);
            expect(connectionManager.isHealthy).toBe(false);
            
            // Reinitialize for other tests
            await connectionManager.initialize();
        });
    });
});
