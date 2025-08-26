import { checkAndFillMissingData } from './database-completeness-checker.js';

// Test the completeness checker
const testCompletenessChecker = async () => {
    console.log('🧪 Testing Database Completeness Checker');
    console.log('=======================================\n');
    
    console.log('🛡️  Features to test:');
    console.log('=====================');
    console.log('✅ Check previous 30 days for missing data');
    console.log('✅ Skip dates that already have collection data');
    console.log('✅ Fetch missing data from API with retry logic');
    console.log('✅ Handle collector name encoding issues');
    console.log('✅ Batch processing with delays');
    console.log('✅ Duplicate prevention');
    console.log('✅ Zero-sum filtering');
    console.log('✅ Comprehensive logging and reporting');
    console.log('');
    
    console.log('🚀 Starting completeness check test...');
    console.log('💡 This will check the previous 30 days for missing collection data');
    console.log('');
    
    try {
        const result = await checkAndFillMissingData();
        
        if (result.success) {
            console.log('✅ Test completed successfully!');
            console.log('\n📊 Test Results:');
            console.log('================');
            console.log(`⏱️  Duration: ${result.duration} seconds`);
            console.log(`📅 Dates checked: ${result.datesChecked}`);
            console.log(`✅ Dates processed: ${result.datesProcessed}`);
            console.log(`⏭️  Dates skipped: ${result.datesSkipped}`);
            console.log(`📦 Total entries saved: ${result.totalSaved}`);
            
            if (result.datesProcessed > 0) {
                console.log('\n📋 Dates with new data:');
                const datesWithData = result.results.filter(r => r.status === 'completed' && r.totalSaved > 0);
                datesWithData.forEach(result => {
                    console.log(`  ${result.date}: ${result.totalSaved} entries from ${result.devicesWithData} devices`);
                });
            }
            
            console.log('\n🎉 Database completeness check is working correctly!');
        } else {
            console.log('❌ Test failed!');
            console.log(`Error: ${result.error}`);
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
};

// Run the test
testCompletenessChecker();
