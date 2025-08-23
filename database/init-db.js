import { sequelize } from './sequelize.js';
import { MaintenanceTask, VendingMachine, Technician, WaterQualityTest } from './maintenance-models.js';

const initializeDatabase = async () => {
    try {
        console.log('🔍 Connecting to database...');
        
        // Test connection
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');
        
        // Create tables
        console.log('📋 Creating tables...');
        await sequelize.sync({ alter: true }); // alter: true will update existing tables without dropping them
        
        console.log('✅ All tables created/updated successfully.');
        
        // Create sample vending machines first (needed for foreign keys)
        const machineCount = await VendingMachine.count();
        if (machineCount === 0) {
            console.log('🖥️ Creating sample vending machines...');
            
            await VendingMachine.bulkCreate([
                {
                    id: 153,
                    location: 'Антонича, 6',
                    status: 'operational',
                    water_level: 85,
                    daily_sales: 120,
                    monthly_sales: 3200,
                    filter_life_remaining: 25,
                    water_quality_status: 'good'
                },
                {
                    id: 164,
                    location: 'Бандери, 69',
                    status: 'maintenance',
                    water_level: 92,
                    daily_sales: 89,
                    monthly_sales: 2890,
                    filter_life_remaining: 12,
                    water_quality_status: 'excellent'
                },
                {
                    id: 228,
                    location: 'Сокільники, Весняна, 18',
                    status: 'operational',
                    water_level: 45,
                    daily_sales: 156,
                    monthly_sales: 4200,
                    filter_life_remaining: 3,
                    water_quality_status: 'fair'
                },
                {
                    id: 240,
                    location: 'Багряного, 39',
                    status: 'out_of_service',
                    water_level: 78,
                    daily_sales: 0,
                    monthly_sales: 1850,
                    filter_life_remaining: 18,
                    water_quality_status: 'good',
                    alerts: 'Dispenser malfunction - urgent repair needed'
                }
            ]);
            
            console.log('✅ Sample vending machines created.');
        }

        // Create sample technicians
        const technicianCount = await Technician.count();
        if (technicianCount === 0) {
            console.log('👨‍🔧 Creating sample technicians...');
            
            await Technician.bulkCreate([
                {
                    name: 'Олександр Петренко',
                    phone: '+380501234567',
                    email: 'oleksandr.petrenko@example.com',
                    specialization: 'general',
                    status: 'available'
                },
                {
                    name: 'Марія Коваленко',
                    phone: '+380509876543',
                    email: 'maria.kovalenko@example.com',
                    specialization: 'filters',
                    status: 'busy',
                    current_location: 'Бандери, 69'
                }
            ]);
            
            console.log('✅ Sample technicians created.');
        }

        // Now create maintenance tasks (after machines and technicians exist)
        const taskCount = await MaintenanceTask.count();
        if (taskCount === 0) {
            console.log('📝 Creating sample maintenance tasks...');
            
            await MaintenanceTask.bulkCreate([
                {
                    title: 'Replace Water Filter - Device 153',
                    description: 'Monthly filter replacement for device at Антонича, 6',
                    maintenance_type: 'filter_replacement',
                    status: 'pending',
                    priority: 'high',
                    machine_id: 153,
                    location: 'Антонича, 6',
                    estimated_duration: '30 minutes',
                    parts_needed: 'Water filter cartridge',
                    scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
                },
                {
                    title: 'System Cleaning - Device 164',
                    description: 'Weekly cleaning and sanitization',
                    maintenance_type: 'system_cleaning',
                    status: 'in_progress',
                    priority: 'medium',
                    machine_id: 164,
                    location: 'Бандери, 69',
                    estimated_duration: '45 minutes',
                    parts_needed: 'Sanitization chemicals',
                    scheduled_date: new Date()
                },
                {
                    title: 'Water Quality Test - Device 228',
                    description: 'Monthly water quality inspection',
                    maintenance_type: 'water_quality_test',
                    status: 'urgent',
                    priority: 'critical',
                    machine_id: 228,
                    location: 'Сокільники, Весняна, 18',
                    estimated_duration: '20 minutes',
                    parts_needed: 'Test kit',
                    scheduled_date: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday (overdue)
                },
                {
                    title: 'Emergency Repair - Device 240',
                    description: 'Dispenser not working properly',
                    maintenance_type: 'emergency_repair',
                    status: 'urgent',
                    priority: 'critical',
                    machine_id: 240,
                    location: 'Багряного, 39',
                    estimated_duration: '1-2 hours',
                    parts_needed: 'Dispenser valve, tubing',
                    scheduled_date: new Date()
                },
                {
                    title: 'Preventive Maintenance - Device 153',
                    description: 'Quarterly preventive maintenance check',
                    maintenance_type: 'preventive_maintenance',
                    status: 'completed',
                    priority: 'medium',
                    machine_id: 153,
                    location: 'Антонича, 6',
                    estimated_duration: '1 hour',
                    parts_needed: 'None',
                    scheduled_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    completed_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
                }
            ]);
            
            console.log('✅ Sample maintenance tasks created.');
        }
        
        console.log('\n🎉 Database initialization completed successfully!');
        console.log(`📊 Current data counts:`);
        console.log(`   - Maintenance Tasks: ${await MaintenanceTask.count()}`);
        console.log(`   - Vending Machines: ${await VendingMachine.count()}`);
        console.log(`   - Technicians: ${await Technician.count()}`);
        console.log(`   - Quality Tests: ${await WaterQualityTest.count()}`);
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
    } finally {
        await sequelize.close();
    }
};

// Run initialization if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    initializeDatabase();
}

export { initializeDatabase };
