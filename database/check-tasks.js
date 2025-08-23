import { sequelize } from './sequelize.js';
import { Task } from './tasks.js';

async function checkTasksTable() {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');

        // Sync the Task model to ensure table exists
        await Task.sync();
        console.log('✅ Task model synchronized.');

        // Query all tasks
        const allTasks = await Task.findAll({
            raw: true // Get plain objects instead of Sequelize instances
        });

        console.log('\n📋 All Tasks in Database:');
        console.log('========================');
        
        if (allTasks.length === 0) {
            console.log('No tasks found in the database.');
        } else {
            console.log(`Found ${allTasks.length} task(s):\n`);
            
            allTasks.forEach((task, index) => {
                console.log(`Task ${index + 1}:`);
                console.log(`  ID: ${task.id}`);
                console.log(`  Title: ${task.title}`);
                console.log(`  Description: ${task.description || 'N/A'}`);
                console.log(`  Status: ${task.status}`);
                console.log(`  Priority: ${task.priority}`);
                console.log(`  Worker ID: ${task.workerId || 'N/A'}`);
                console.log(`  Device ID: ${task.deviceId || 'N/A'}`);
                console.log(`  Completed At: ${task.completedAt || 'Not completed'}`);
                console.log(`  Created At: ${task.createdAt}`);
                console.log(`  Updated At: ${task.updatedAt}`);
                console.log('  ---');
            });
        }

        // Also show table structure
        console.log('\n📊 Table Structure:');
        console.log('==================');
        const tableInfo = await sequelize.query(
            "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'tasks' ORDER BY ordinal_position;",
            { type: sequelize.QueryTypes.SELECT }
        );
        
        tableInfo.forEach(column => {
            console.log(`  ${column.column_name}: ${column.data_type} ${column.is_nullable === 'YES' ? '(nullable)' : '(not null)'} ${column.column_default ? `default: ${column.column_default}` : ''}`);
        });

    } catch (error) {
        console.error('❌ Error checking tasks table:', error);
    } finally {
        // Close the database connection
        await sequelize.close();
        console.log('\n🔌 Database connection closed.');
    }
}

// Run the check
checkTasksTable();
