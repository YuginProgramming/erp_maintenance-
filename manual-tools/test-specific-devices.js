import axios from "axios";

// Test specific devices that we know had data
const testSpecificDevices = async () => {
    console.log('🔍 Testing specific devices with known data:');
    console.log('===========================================\n');
    
    // Devices that had data according to our database
    const testCases = [
        { deviceId: '164', date: '2025-08-20', name: 'Бандери, 69' },
        { deviceId: '123', date: '2025-08-23', name: 'Щурата, 9' },
        { deviceId: '178', date: '2025-08-23', name: 'Генерала Тарнавського, 104б' },
        { deviceId: '326', date: '2025-08-23', name: 'Зелена 17' }
    ];
    
    for (const testCase of testCases) {
        try {
            console.log(`🔍 Testing Device ${testCase.deviceId} (${testCase.name}) for ${testCase.date}:`);
            
            const url = 'https://soliton.net.ua/water/api/device_inkas.php';
            const requestData = {
                device_id: testCase.deviceId,
                ds: testCase.date,
                de: testCase.date
            };
            
            console.log(`   📤 Request: ${JSON.stringify(requestData)}`);
            
            const response = await axios.post(url, requestData);
            const result = response.data;
            
            console.log(`   📥 Response status: ${result.status}`);
            
            if (result.status === 'success') {
                if (result.data && result.data.length > 0) {
                    console.log(`   ✅ Found ${result.data.length} entries:`);
                    result.data.forEach((entry, index) => {
                        console.log(`      Entry ${index + 1}: ${entry.sum} грн (${entry.descr || 'No description'})`);
                    });
                } else {
                    console.log(`   ⚠️  No data returned for this device/date combination`);
                }
            } else {
                console.log(`   ❌ API error: ${result.descr}`);
            }
            
            console.log('');
            
            // Small delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.log(`   ❌ Request failed: ${error.message}`);
            console.log('');
        }
    }
};

// Test if the API is working at all
const testAPIBasic = async () => {
    console.log('🌐 Testing basic API connectivity:');
    console.log('==================================\n');
    
    try {
        // Test devices endpoint
        console.log('📱 Testing devices endpoint...');
        const devicesResponse = await axios.post('https://soliton.net.ua/water/api/devices');
        console.log(`   ✅ Devices endpoint: ${devicesResponse.data.devices ? devicesResponse.data.devices.length : 0} devices`);
        
        // Test collection endpoint with a simple request
        console.log('\n💰 Testing collection endpoint...');
        const collectionResponse = await axios.post('https://soliton.net.ua/water/api/device_inkas.php', {
            device_id: '164',
            ds: '2025-08-20',
            de: '2025-08-20'
        });
        console.log(`   ✅ Collection endpoint: ${collectionResponse.data.status}`);
        
        if (collectionResponse.data.status === 'success') {
            console.log(`   📊 Data available: ${collectionResponse.data.data ? collectionResponse.data.data.length : 0} entries`);
        }
        
    } catch (error) {
        console.log(`   ❌ API test failed: ${error.message}`);
    }
};

// Main execution
const main = async () => {
    console.log('🔍 Specific Device Testing Tool');
    console.log('==============================\n');
    
    await testAPIBasic();
    console.log('\n' + '='.repeat(50) + '\n');
    await testSpecificDevices();
};

main();
