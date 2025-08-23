import { DataTypes } from 'sequelize';
import { sequelize } from './sequelize.js';

// Maintenance Task Model
const MaintenanceTask = sequelize.define('MaintenanceTask', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    maintenance_type: {
        type: DataTypes.ENUM('filter_replacement', 'system_cleaning', 'water_quality_test', 'equipment_repair', 'preventive_maintenance', 'emergency_repair'),
        defaultValue: 'preventive_maintenance'
    },
    status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'urgent', 'scheduled'),
        defaultValue: 'pending'
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium'
    },
    machine_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    technician_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true
    },
    estimated_duration: {
        type: DataTypes.STRING,
        allowNull: true
    },
    parts_needed: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    scheduled_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'maintenance_tasks',
    timestamps: true
});

// Vending Machine Model
const VendingMachine = sequelize.define('VendingMachine', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    location: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('operational', 'maintenance', 'out_of_service', 'low_water'),
        defaultValue: 'operational'
    },
    water_level: {
        type: DataTypes.INTEGER, // Percentage
        allowNull: true
    },
    daily_sales: {
        type: DataTypes.INTEGER, // Liters sold today
        defaultValue: 0
    },
    monthly_sales: {
        type: DataTypes.INTEGER, // Liters sold this month
        defaultValue: 0
    },
    last_maintenance: {
        type: DataTypes.DATE,
        allowNull: true
    },
    next_maintenance: {
        type: DataTypes.DATE,
        allowNull: true
    },
    alerts: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    filter_life_remaining: {
        type: DataTypes.INTEGER, // Days remaining
        allowNull: true
    },
    water_quality_status: {
        type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor', 'critical'),
        defaultValue: 'good'
    }
}, {
    tableName: 'vending_machines',
    timestamps: true
});

// Technician Model
const Technician = sequelize.define('Technician', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    specialization: {
        type: DataTypes.ENUM('general', 'filters', 'electronics', 'plumbing'),
        defaultValue: 'general'
    },
    status: {
        type: DataTypes.ENUM('available', 'busy', 'off_duty'),
        defaultValue: 'available'
    },
    current_location: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'technicians',
    timestamps: true
});

// Water Quality Test Model
const WaterQualityTest = sequelize.define('WaterQualityTest', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    machine_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    test_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    ph_level: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true
    },
    tds_level: {
        type: DataTypes.INTEGER, // Total Dissolved Solids
        allowNull: true
    },
    chlorine_level: {
        type: DataTypes.DECIMAL(4, 3),
        allowNull: true
    },
    bacteria_count: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    overall_rating: {
        type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor', 'critical'),
        allowNull: false
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    tested_by: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'water_quality_tests',
    timestamps: true
});

// Define relationships
MaintenanceTask.belongsTo(VendingMachine, { foreignKey: 'machine_id', as: 'machine' });
VendingMachine.hasMany(MaintenanceTask, { foreignKey: 'machine_id', as: 'maintenanceTasks' });

MaintenanceTask.belongsTo(Technician, { foreignKey: 'technician_id', as: 'technician' });
Technician.hasMany(MaintenanceTask, { foreignKey: 'technician_id', as: 'assignedTasks' });

WaterQualityTest.belongsTo(VendingMachine, { foreignKey: 'machine_id', as: 'machine' });
VendingMachine.hasMany(WaterQualityTest, { foreignKey: 'machine_id', as: 'qualityTests' });

WaterQualityTest.belongsTo(Technician, { foreignKey: 'tested_by', as: 'tester' });
Technician.hasMany(WaterQualityTest, { foreignKey: 'tested_by', as: 'conductedTests' });

export { MaintenanceTask, VendingMachine, Technician, WaterQualityTest };
