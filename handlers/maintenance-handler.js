import { sequelize } from '../database/sequelize.js';

// Get all maintenance tasks from database
async function getAllMaintenanceTasks() {
    try {
        const tasks = await sequelize.query(
            'SELECT * FROM maintenance_tasks ORDER BY id;',
            { type: sequelize.QueryTypes.SELECT }
        );
        return tasks;
    } catch (error) {
        console.error('Error fetching maintenance tasks:', error);
        throw error;
    }
}

// Format maintenance status with emoji
function formatMaintenanceStatus(status) {
    switch (status) {
        case 'completed':
            return '✅ Completed';
        case 'pending':
            return '📝 Pending';
        case 'in_progress':
            return '🔧 In Progress';
        case 'urgent':
            return '🚨 Urgent';
        case 'scheduled':
            return '📅 Scheduled';
        default:
            return `❓ ${status}`;
    }
}

// Format maintenance priority with emoji
function formatMaintenancePriority(priority) {
    switch (priority?.toLowerCase()) {
        case 'critical':
        case 'urgent':
            return '🔴 Critical';
        case 'high':
            return '🟠 High';
        case 'medium':
            return '🟡 Medium';
        case 'low':
            return '🟢 Low';
        default:
            return `⚪ ${priority || 'Medium'}`;
    }
}

// Format maintenance type with emoji
function formatMaintenanceType(type) {
    switch (type?.toLowerCase()) {
        case 'filter_replacement':
            return '🔧 Filter Replacement';
        case 'system_cleaning':
            return '🧹 System Cleaning';
        case 'water_quality_test':
            return '💧 Water Quality Test';
        case 'equipment_repair':
            return '🔨 Equipment Repair';
        case 'preventive_maintenance':
            return '🛡️ Preventive Maintenance';
        case 'emergency_repair':
            return '🚨 Emergency Repair';
        default:
            return `⚙️ ${type || 'General Maintenance'}`;
    }
}

// Format single maintenance task for display
function formatMaintenanceTask(task, index) {
    const statusEmoji = formatMaintenanceStatus(task.status);
    const priorityEmoji = formatMaintenancePriority(task.priority);
    const typeEmoji = formatMaintenanceType(task.maintenance_type);
    const description = task.description || 'No description provided';
    const location = task.location || 'Location not specified';
    
    return `🔧 **Maintenance Task #${task.id}**
${statusEmoji} | ${priorityEmoji}
${typeEmoji}
📝 **${task.title}**
💬 ${description}
📍 **Location:** ${location}
${task.machine_id ? `🖥️ Machine ID: ${task.machine_id}` : ''}
${task.technician_id ? `👨‍🔧 Technician: ${task.technician_id}` : ''}
${task.estimated_duration ? `⏱️ Estimated Duration: ${task.estimated_duration}` : ''}
${task.parts_needed ? `🔧 Parts Needed: ${task.parts_needed}` : ''}
${task.completed_at ? `✅ Completed: ${new Date(task.completed_at).toLocaleString()}` : ''}
${task.scheduled_date ? `📅 Scheduled: ${new Date(task.scheduled_date).toLocaleDateString()}` : ''}
${task.createdAt ? `📅 Created: ${new Date(task.createdAt).toLocaleString()}` : ''}
`;
}

// Handle /maintenance command
async function handleMaintenanceCommand(bot, chatId) {
    try {
        // Send loading message
        const loadingMsg = await bot.sendMessage(chatId, '🔧 Loading maintenance tasks...');
        
        // Fetch maintenance tasks from database
        const tasks = await getAllMaintenanceTasks();
        
        if (tasks.length === 0) {
            await bot.editMessageText('📭 No maintenance tasks found in the database.', {
                chat_id: chatId,
                message_id: loadingMsg.message_id
            });
            return;
        }

        // Count tasks by status
        const pendingCount = tasks.filter(t => t.status === 'pending').length;
        const completedCount = tasks.filter(t => t.status === 'completed').length;
        const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
        const urgentCount = tasks.filter(t => t.status === 'urgent').length;

        // Send summary header
        const summary = `🔧 **Water Vending Machine Maintenance Summary**
📝 Pending: ${pendingCount} | 🔧 In Progress: ${inProgressCount} | 🚨 Urgent: ${urgentCount} | ✅ Completed: ${completedCount}
🔧 **Total Maintenance Tasks: ${tasks.length}**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        await bot.editMessageText(summary, {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
        });

        // Send each maintenance task individually
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const taskMessage = formatMaintenanceTask(task, i);
            
            await bot.sendMessage(chatId, taskMessage, { 
                parse_mode: 'Markdown' 
            });
            
            // Add small delay between messages to avoid rate limiting
            if (i < tasks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

    } catch (error) {
        console.error('Error handling maintenance command:', error);
        await bot.sendMessage(chatId, '❌ Error loading maintenance tasks. Please try again later.');
    }
}

// Handle /machines command to show machine status
async function handleMachinesCommand(bot, chatId) {
    try {
        const machines = await sequelize.query(
            'SELECT * FROM vending_machines ORDER BY id;',
            { type: sequelize.QueryTypes.SELECT }
        );

        if (machines.length === 0) {
            await bot.sendMessage(chatId, '📭 No vending machines found in the database.');
            return;
        }

        const summary = `🖥️ **Water Vending Machines Status**
📊 **Total Machines: ${machines.length}**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        await bot.sendMessage(chatId, summary, { parse_mode: 'Markdown' });

        // Send each machine status individually
        for (let i = 0; i < machines.length; i++) {
            const machine = machines[i];
            const machineMessage = `🖥️ **Machine #${machine.id}**
📍 **Location:** ${machine.location || 'Not specified'}
💧 **Water Level:** ${machine.water_level || 'Unknown'}%
🔧 **Status:** ${machine.status || 'Unknown'}
📊 **Daily Sales:** ${machine.daily_sales || 0} liters
🔄 **Last Maintenance:** ${machine.last_maintenance ? new Date(machine.last_maintenance).toLocaleDateString() : 'Never'}
⚠️ **Alerts:** ${machine.alerts || 'None'}`;

            await bot.sendMessage(chatId, machineMessage, { parse_mode: 'Markdown' });
            
            if (i < machines.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

    } catch (error) {
        console.error('Error handling machines command:', error);
        await bot.sendMessage(chatId, '❌ Error loading machine status. Please try again later.');
    }
}

// Handle /alerts command to show urgent issues
async function handleAlertsCommand(bot, chatId) {
    try {
        const alerts = await sequelize.query(
            "SELECT * FROM maintenance_tasks WHERE status = 'urgent' OR priority = 'critical' ORDER BY \"createdAt\" DESC;",
            { type: sequelize.QueryTypes.SELECT }
        );

        if (alerts.length === 0) {
            await bot.sendMessage(chatId, '✅ No urgent alerts at this time.');
            return;
        }

        const summary = `🚨 **Urgent Maintenance Alerts**
⚠️ **Critical Issues: ${alerts.length}**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        await bot.sendMessage(chatId, summary, { parse_mode: 'Markdown' });

        // Send each alert individually
        for (let i = 0; i < alerts.length; i++) {
            const alert = alerts[i];
            const alertMessage = `🚨 **URGENT: ${alert.title}**
🔧 **Type:** ${formatMaintenanceType(alert.maintenance_type)}
📍 **Location:** ${alert.location || 'Not specified'}
🖥️ **Machine:** ${alert.machine_id || 'Not specified'}
⏰ **Created:** ${new Date(alert.createdAt).toLocaleString()}
💬 **Description:** ${alert.description || 'No description'}`;

            await bot.sendMessage(chatId, alertMessage, { parse_mode: 'Markdown' });
            
            if (i < alerts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

    } catch (error) {
        console.error('Error handling alerts command:', error);
        await bot.sendMessage(chatId, '❌ Error loading alerts. Please try again later.');
    }
}

export { handleMaintenanceCommand, handleMachinesCommand, handleAlertsCommand };
