import fs from 'fs';
import path from 'path';

// Function to check if we have any local data files
const checkLocalData = () => {
    console.log('🔍 Checking for local data files...');
    
    const projectRoot = path.join(process.cwd(), '..');
    const files = fs.readdirSync(projectRoot);
    
    console.log('\n📁 Files in project root:');
    files.forEach(file => {
        if (file.includes('collection') || file.includes('log') || file.includes('json')) {
            console.log(`   📄 ${file}`);
        }
    });
    
    // Check for log files
    const logFiles = files.filter(file => file.includes('.log'));
    if (logFiles.length > 0) {
        console.log('\n📊 Log files found:');
        logFiles.forEach(file => {
            const stats = fs.statSync(path.join(projectRoot, file));
            console.log(`   📄 ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
        });
    }
    
    // Check for JSON files
    const jsonFiles = files.filter(file => file.includes('.json'));
    if (jsonFiles.length > 0) {
        console.log('\n📄 JSON files found:');
        jsonFiles.forEach(file => {
            const stats = fs.statSync(path.join(projectRoot, file));
            console.log(`   📄 ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
        });
    }
};

// Function to analyze log files
const analyzeLogFiles = () => {
    console.log('\n📊 Analyzing log files...');
    
    const projectRoot = path.join(process.cwd(), '..');
    const logFiles = fs.readdirSync(projectRoot).filter(file => file.includes('.log'));
    
    logFiles.forEach(file => {
        console.log(`\n📄 Analyzing ${file}:`);
        const logPath = path.join(projectRoot, file);
        const content = fs.readFileSync(logPath, 'utf8');
        
        // Count different types of entries
        const lines = content.split('\n');
        const infoCount = lines.filter(line => line.includes('[INFO]')).length;
        const errorCount = lines.filter(line => line.includes('[ERROR]')).length;
        const warnCount = lines.filter(line => line.includes('[WARN]')).length;
        
        console.log(`   📊 Total lines: ${lines.length}`);
        console.log(`   ℹ️  INFO entries: ${infoCount}`);
        console.log(`   ❌ ERROR entries: ${errorCount}`);
        console.log(`   ⚠️  WARN entries: ${warnCount}`);
        
        // Look for collection data entries
        const collectionEntries = lines.filter(line => 
            line.includes('Saved collection entry') || 
            line.includes('Total entries saved') ||
            line.includes('collection data')
        );
        
        if (collectionEntries.length > 0) {
            console.log(`   📦 Collection entries found: ${collectionEntries.length}`);
            collectionEntries.slice(0, 5).forEach(entry => {
                console.log(`      ${entry.trim()}`);
            });
            if (collectionEntries.length > 5) {
                console.log(`      ... and ${collectionEntries.length - 5} more`);
            }
        }
    });
};

// Function to provide server instructions
const showServerInstructions = () => {
    console.log('\n🚀 To run database analysis on your server:');
    console.log('==========================================');
    console.log('');
    console.log('1. SSH into your server:');
    console.log('   ssh your-username@your-server-ip');
    console.log('');
    console.log('2. Navigate to the project directory:');
    console.log('   cd /path/to/water-vending-maintenance-bot');
    console.log('');
    console.log('3. Run the collection data inspector:');
    console.log('   node manual-tools/check-collection-data.js');
    console.log('');
    console.log('4. Or check specific dates:');
    console.log('   node manual-tools/check-collection-data.js date 2025-08-23');
    console.log('');
    console.log('5. Check workers:');
    console.log('   node manual-tools/check-collection-data.js workers');
    console.log('');
    console.log('📊 This will show you:');
    console.log('   • All collection data from project start');
    console.log('   • Date-by-date breakdown');
    console.log('   • Collector performance');
    console.log('   • Device statistics');
    console.log('   • Financial summaries');
};

// Main execution
const main = () => {
    console.log('🔍 Local Data Inspector');
    console.log('=======================\n');
    
    checkLocalData();
    analyzeLogFiles();
    showServerInstructions();
};

main();
