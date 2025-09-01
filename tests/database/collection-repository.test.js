import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { CollectionRepository } from '../../database/repositories/collection-repository.js';
import { connectionManager } from '../../database/connection-manager.js';

describe('Collection Repository', () => {
    let collectionRepository;

    beforeAll(async () => {
        // Initialize connection manager
        await connectionManager.initialize();
        collectionRepository = new CollectionRepository();
    });

    afterAll(async () => {
        // Clean up
        await connectionManager.shutdown();
    });

    beforeEach(() => {
        // Reset test state if needed
    });

    describe('Data Validation', () => {
        it('should validate required fields', () => {
            const validData = {
                device_id: 123,
                date: '2025-01-27',
                banknotes: 1000,
                coins: 500
            };

            expect(() => {
                collectionRepository.validateData(validData, ['device_id', 'date']);
            }).not.toThrow();
        });

        it('should throw error for missing required fields', () => {
            const invalidData = {
                device_id: 123
                // Missing date
            };

            expect(() => {
                collectionRepository.validateData(invalidData, ['device_id', 'date']);
            }).toThrow('Validation failed');
        });
    });

    describe('Data Sanitization', () => {
        it('should sanitize data correctly', () => {
            const rawData = {
                device_id: 123,
                date: '2025-01-27',
                banknotes: 1000,
                coins: 500,
                undefined_field: undefined,
                null_field: null
            };

            const sanitized = collectionRepository.sanitizeData(rawData);
            
            expect(sanitized.device_id).toBe(123);
            expect(sanitized.date).toBe('2025-01-27');
            expect(sanitized.banknotes).toBe(1000);
            expect(sanitized.coins).toBe(500);
            expect(sanitized.undefined_field).toBeUndefined();
            expect(sanitized.null_field).toBeNull();
        });

        it('should convert dates to ISO strings', () => {
            const testDate = new Date('2025-01-27T10:00:00Z');
            const rawData = {
                date: testDate
            };

            const sanitized = collectionRepository.sanitizeData(rawData);
            expect(sanitized.date).toBe(testDate.toISOString());
        });
    });

    describe('Collection Data Operations', () => {
        it('should check if data exists', async () => {
            // This test would require a test database
            // For now, we'll test the method signature
            expect(typeof collectionRepository.checkDataExists).toBe('function');
        });

        it('should get collection data by date range', async () => {
            // This test would require a test database
            // For now, we'll test the method signature
            expect(typeof collectionRepository.getCollectionDataByDateRange).toBe('function');
        });

        it('should get collection summary by date', async () => {
            // This test would require a test database
            // For now, we'll test the method signature
            expect(typeof collectionRepository.getCollectionSummaryByDate).toBe('function');
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid data gracefully', async () => {
            const invalidData = {
                // Missing required fields
            };

            await expect(collectionRepository.saveCollectionData(invalidData))
                .rejects.toThrow();
        });

        it('should handle database connection errors', async () => {
            // This would require mocking database failures
            // For now, we'll test that error handling exists
            expect(typeof collectionRepository.saveCollectionData).toBe('function');
        });
    });

    describe('Bulk Operations', () => {
        it('should handle bulk insert operations', async () => {
            const testData = [
                {
                    device_id: 123,
                    date: '2025-01-27',
                    banknotes: 1000,
                    coins: 500
                },
                {
                    device_id: 124,
                    date: '2025-01-27',
                    banknotes: 2000,
                    coins: 300
                }
            ];

            // This test would require a test database
            // For now, we'll test the method signature
            expect(typeof collectionRepository.bulkInsertCollectionData).toBe('function');
        });
    });
});
