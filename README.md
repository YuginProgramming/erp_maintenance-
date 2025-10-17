# Water Vending Machine Maintenance Bot

A specialized Telegram bot for managing water vending machine maintenance, monitoring, and quality control.

## 🚰 Features

- 🔧 **Maintenance Task Management** - Track and manage maintenance tasks
- 🖥️ **Machine Status Monitoring** - Real-time machine status and water levels
- 💧 **Water Quality Tracking** - Monitor water quality tests and results
- 👨‍🔧 **Technician Management** - Assign and track technician work
- 📊 **Performance Analytics** - Sales data and maintenance history
- 🔄 **Preventive Maintenance** - Scheduled maintenance reminders

## 📁 Project Structure

```
water-vending-bot/
├── app.js                           # Main bot application
├── database-completeness-checker.js # Database completeness checking
├── daily-collection-scheduler.js    # Daily collection automation
├── daily-collection-summary.js      # Daily summary generation
├── device/                          # Device-related handlers
│   ├── device-handler.js            # Device list handling
│   ├── device-collection-handler.js # Device collection handling
│   ├── device-activation-handler.js # Device activation handling
│   └── card-api-handler.js          # Card API handling
├── database/                        # Database folder
│   ├── sequelize.js                 # Database configuration
│   ├── maintenance-models.js        # Database models for maintenance
│   ├── workers-table.js             # Workers table management
│   ├── tasks.js                     # Original task models (legacy)
│   ├── check-tasks.js               # Task checking script
│   └── check-tasks-simple.js        # Simple task checking script
├── manual-tools/                    # Manual testing and debugging tools
│   ├── test-completeness-checker.js # Test completeness checker
│   ├── robust-collection-fetcher.js # Robust collection fetcher
│   ├── check-collection-data.js     # Collection data inspection
│   ├── fill-database-aug25.js       # Database filling tool
│   └── README.md                    # Manual tools documentation
├── logger/                          # Logging utilities
├── docs/                           # Documentation and reference files
│   ├── x_api-instructions.txt      # API documentation
│   ├── x_collection_info.txt       # Collection data info
│   ├── x-collection-api.json       # Sample API data
│   └── README.md                   # Documentation guide
├── package.json
├── .env                            # Environment variables (not in git)
├── env.example                     # Environment variables template
└── README.md
```

## 🛠️ Installation

1. **Navigate to the water vending bot directory**
   ```bash
   cd water-vending-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   Then edit `.env` with your actual credentials:
   ```env
   TELEGRAM_BOT_TOKEN=your_water_maintenance_bot_token
   DB_HOST=your_database_host
   DB_PORT=5432
   DB_NAME=your_database_name
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   ```

4. **Start the bot**
   ```bash
   npm start
   ```

## 🔧 Configuration

### Telegram Bot Setup
1. Create a new bot with [@BotFather](https://t.me/botfather) for water maintenance
2. Get your bot token
3. Add it to `.env` file

### Database Setup
1. Set up PostgreSQL database
2. Update database credentials in `.env`
3. The bot will automatically create maintenance tables on first run

## 📋 Available Commands

- `/maintenance` - View all maintenance tasks
- `/machines` - Check machine status and water levels
- `/help` - Show help information

## 🗄️ Database Schema

### Maintenance Tasks Table
- `id` - Primary key
- `title` - Task title
- `description` - Task description
- `maintenance_type` - Type of maintenance (filter_replacement, system_cleaning, etc.)
- `status` - Task status (pending, in_progress, completed, urgent, scheduled)
- `priority` - Task priority (low, medium, high, critical)
- `machine_id` - Associated vending machine
- `technician_id` - Assigned technician
- `location` - Task location
- `estimated_duration` - Estimated time to complete
- `parts_needed` - Required parts for maintenance
- `scheduled_date` - Scheduled maintenance date
- `completed_at` - Completion timestamp

### Vending Machines Table
- `id` - Primary key
- `location` - Machine location
- `status` - Machine status (operational, maintenance, out_of_service, low_water)
- `water_level` - Current water level percentage
- `daily_sales` - Liters sold today
- `monthly_sales` - Liters sold this month
- `last_maintenance` - Last maintenance date
- `next_maintenance` - Next scheduled maintenance
- `filter_life_remaining` - Days until filter replacement
- `water_quality_status` - Current water quality rating

### Technicians Table
- `id` - Primary key
- `name` - Technician name
- `phone` - Contact phone
- `email` - Contact email
- `specialization` - Area of expertise
- `status` - Current availability
- `current_location` - Current location

### Water Quality Tests Table
- `id` - Primary key
- `machine_id` - Tested machine
- `test_date` - Test date
- `ph_level` - pH level
- `tds_level` - Total Dissolved Solids
- `chlorine_level` - Chlorine content
- `bacteria_count` - Bacteria count
- `overall_rating` - Overall quality rating
- `notes` - Test notes
- `tested_by` - Technician who conducted test

## 🔧 Maintenance Types

- 🔧 **Filter Replacement** - Replace water filters
- 🧹 **System Cleaning** - Clean system components
- 💧 **Water Quality Test** - Test water quality parameters
- 🔨 **Equipment Repair** - Repair malfunctioning equipment
- 🛡️ **Preventive Maintenance** - Scheduled preventive maintenance
- 🚨 **Emergency Repair** - Urgent emergency repairs

## 🔒 Security

- ✅ Environment variables are not committed to Git
- ✅ Database credentials are stored in `.env` file
- ✅ Bot token is protected
- ✅ `.env` is in `.gitignore`

## 🚀 Development

### Running in development mode
```bash
npm run dev
```

### Checking database
```bash
node database/check-tasks-simple.js
```

## 📝 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For technical support, please contact the maintenance team.
# erp_maintenance-
