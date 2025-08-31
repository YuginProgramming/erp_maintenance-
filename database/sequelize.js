import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'postgres',
        port: process.env.DB_PORT || 5432,
        logging: false,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        retry: {
            max: 3,
            timeout: 10000
        }
    }
);

// Function to ensure database connection is active
export const ensureConnection = async () => {
    try {
        await sequelize.authenticate();
        return true;
    } catch (error) {
        console.error('Database connection failed:', error.message);
        return false;
    }
};

// Function to close database connection properly
export const closeConnection = async () => {
    try {
        await sequelize.close();
        console.log('Database connection closed properly');
    } catch (error) {
        console.error('Error closing database connection:', error.message);
    }
};