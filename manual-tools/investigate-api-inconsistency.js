import axios from "axios";

// Investigate API inconsistency
const investigateAPIInconsistency = async () => {
    console.log('🔍 Investigating API Data Inconsistency');
    console.log('======================================\n');
    
    // Test the same device/date combinations multiple times
    const testCases = [
        { deviceId: '164', date: '2025-08-20', name: 'Бандери, 69' },
        { deviceId: '123', date: '2025-08-23', name: 'Щурата, 9' },
        { deviceId: '178', date: '2025-08-23', name: 'Генерала Тарнавського, 104б' }
    ];
    
    for (const testCase of testCases) {
        console.log(`🔍 Testing Device ${testCase.deviceId} (${testCase.name}) for ${testCase.date}:`);
        
        // Test multiple times to see if data is consistent
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`   📊 Attempt ${attempt}:`);
                
                const response = await axios.post('https://soliton.net.ua/water/api/device_inkas.php', {
                    device_id: testCase.deviceId,
                    ds: testCase.date,
                    de: testCase.date
                });
                
                const result = response.data;
                
                if (result.status === 'success' && result.data && result.data.length > 0) {
                    let totalSum = 0;
                    result.data.forEach((entry, index) => {
                        const sumBanknotes = parseFloat(entry.banknotes) || 0;
                        const sumCoins = parseFloat(entry.coins) || 0;
                        const entryTotal = sumBanknotes + sumCoins;
                        totalSum += entryTotal;
                        
                        console.log(`      Entry ${index + 1}: ${entryTotal} грн (${entry.descr || 'No description'})`);
                    });
                    
                    console.log(`      📈 Total: ${totalSum} грн`);
                    
                } else {
                    console.log(`      ❌ No data returned`);
                }
                
                // Small delay between attempts
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.log(`      ❌ Error: ${error.message}`);
            }
        }
        
        console.log('');
    }
};

// Test if this is a timing issue
const testTimingIssue = async () => {
    console.log('⏰ Testing for Timing Issues:');
    console.log('============================\n');
    
    const deviceId = '164';
    const date = '2025-08-20';
    
    console.log(`🔍 Testing Device ${deviceId} for ${date} over time:`);
    
    for (let test = 1; test <= 5; test++) {
        try {
            console.log(`   📊 Test ${test} (${new Date().toLocaleTimeString()}):`);
            
            const response = await axios.post('https://soliton.net.ua/water/api/device_inkas.php', {
                device_id: deviceId,
                ds: date,
                de: date
            });
            
            const result = response.data;
            
            if (result.status === 'success' && result.data && result.data.length > 0) {
                let totalSum = 0;
                result.data.forEach((entry, index) => {
                    const sumBanknotes = parseFloat(entry.banknotes) || 0;
                    const sumCoins = parseFloat(entry.coins) || 0;
                    const entryTotal = sumBanknotes + sumCoins;
                    totalSum += entryTotal;
                });
                
                console.log(`      Total: ${totalSum} грн (${result.data.length} entries)`);
                
            } else {
                console.log(`      No data`);
            }
            
            // Wait 30 seconds between tests
            if (test < 5) {
                console.log(`      ⏳ Waiting 30 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
            
        } catch (error) {
            console.log(`      ❌ Error: ${error.message}`);
        }
    }
};

// Test different date ranges
const testDateRanges = async () => {
    console.log('📅 Testing Different Date Ranges:');
    console.log('================================\n');
    
    const deviceId = '164';
    const dates = ['2025-08-19', '2025-08-20', '2025-08-21', '2025-08-22', '2025-08-23', '2025-08-24'];
    
    for (const date of dates) {
        try {
            console.log(`🔍 Testing Device ${deviceId} for ${date}:`);
            
            const response = await axios.post('https://soliton.net.ua/water/api/device_inkas.php', {
                device_id: deviceId,
                ds: date,
                de: date
            });
            
            const result = response.data;
            
            if (result.status === 'success' && result.data && result.data.length > 0) {
                let totalSum = 0;
                result.data.forEach((entry, index) => {
                    const sumBanknotes = parseFloat(entry.banknotes) || 0;
                    const sumCoins = parseFloat(entry.coins) || 0;
                    const entryTotal = sumBanknotes + sumCoins;
                    totalSum += entryTotal;
                });
                
                console.log(`   ✅ Found ${result.data.length} entries, Total: ${totalSum} грн`);
                
            } else {
                console.log(`   ❌ No data for ${date}`);
            }
            
            // Small delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }
};

// Main execution
const main = async () => {
    console.log('🔍 API Inconsistency Investigation');
    console.log('==================================\n');
    
    await investigateAPIInconsistency();
    console.log('='.repeat(50));
    console.log('');
    await testDateRanges();
    
    console.log('\n📋 Analysis:');
    console.log('============');
    console.log('🔍 The API appears to be returning real data now');
    console.log('🔍 This suggests the API might have been updated or fixed');
    console.log('🔍 Our zero-sum filtering might need adjustment');
    console.log('🔍 We should test the actual collection logic');
};

main();
