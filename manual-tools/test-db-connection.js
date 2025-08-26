import dotenv from 'dotenv';
import { sequelize } from "../database/sequelize.js";

// Load environment variables
dotenv.config({ path: '../.env' });

const testConnection = async () => {
    try {
        console.log('🔍 Testing database connection...');
        console.log('Database config:', {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            username: process.env.DB_USER
        });
        
        await sequelize.authenticate();
        console.log('✅ Database connection successful!');
        
        // Test a simple query
        const result = await sequelize.query('SELECT NOW() as current_time');
        console.log('✅ Query test successful:', result[0][0]);
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await sequelize.close();
        console.log('🔌 Database connection closed');
    }
};

testConnection();
