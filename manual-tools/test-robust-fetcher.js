import { RobustCollectionFetcher } from './robust-collection-fetcher.js';

// Test the robust fetcher with a small sample
const testRobustFetcher = async () => {
    console.log('🧪 Testing Robust Collection Fetcher');
    console.log('===================================\n');
    
    const targetDate = '2025-08-26'; // Test with a different date
    
    console.log('🛡️  Features to test:');
    console.log('=====================');
    console.log('✅ Automatic retry on connection failures');
    console.log('✅ Progress tracking and resumption');
    console.log('✅ Connection health monitoring');
    console.log('✅ Graceful shutdown handling');
    console.log('✅ Batch processing with delays');
    console.log('✅ Duplicate prevention');
    console.log('✅ Zero-sum filtering');
    console.log('');
    
    const fetcher = new RobustCollectionFetcher(targetDate);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Received SIGINT, stopping gracefully...');
        fetcher.stop();
    });
    
    console.log(`🚀 Starting robust collection fetch for ${targetDate}`);
    console.log('💡 Press Ctrl+C to test graceful shutdown');
    console.log('');
    
    await fetcher.start();
};

// Run the test
testRobustFetcher();
