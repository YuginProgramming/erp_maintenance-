# Manual Tools for Water Vending Maintenance Bot

This folder contains tools for manual database inspection and data analysis that we can use together when working on the project.

## 📁 Available Tools

### 🔍 `check-collection-data.js`
Comprehensive database inspection tool for collection data analysis.

### 🛡️ `robust-collection-fetcher.js`
**Advanced collection fetcher with automatic retry, progress tracking, and connection monitoring.**

**Features:**
- 🔄 **Automatic retry** (5 attempts per device)
- 📊 **Progress tracking** with resumption capability
- 🔍 **Connection health monitoring** (database + API)
- 🛑 **Graceful shutdown** handling
- 📦 **Batch processing** with configurable delays
- 🚫 **Duplicate prevention**
- ⏭️ **Zero-sum filtering**
- 💾 **Progress persistence** (can resume interrupted runs)

**Usage:**
```bash
# Fetch data for specific date
node robust-collection-fetcher.js 2025-08-26

# Test with sample data
node test-robust-fetcher.js
```

**Configuration:**
- Max retries: 5 per device
- Retry delay: 5 seconds
- Connection timeout: 30 seconds
- Batch size: 10 devices
- Delay between batches: 2 seconds

### 🧪 `test-completeness-checker.js`
**Test script for the database completeness checker functionality.**

**Features:**
- 🧪 **Comprehensive testing** of completeness checker
- 📊 **Feature demonstration** with clear output
- 🔍 **Error handling** testing
- 📋 **Detailed reporting** of test results

**Usage:**
```bash
# Test the completeness checker
node test-completeness-checker.js
```

#### Usage:
```bash
# Show all collection data from project start (2025-08-20)
node check-collection-data.js

# Check specific date
node check-collection-data.js date 2025-08-23

# Check workers in database
node check-collection-data.js workers
```

#### Features:
- 📊 **Complete data analysis** from project start date
- 📅 **Date-by-date breakdown** with statistics
- 👥 **Collector performance analysis**
- 🏪 **Device collection summaries**
- 💰 **Financial totals and averages**
- 👤 **Worker database inspection**

#### Output includes:
- Total collection entries
- Sum by date
- Device breakdown
- Collector performance
- Overall statistics
- Date ranges and averages

## 🎯 Use Cases

1. **Debugging scheduled messages** - Check what data is actually available
2. **Performance analysis** - See collector and device statistics
3. **Data validation** - Verify data integrity and completeness
4. **Troubleshooting** - Identify missing or incorrect data
5. **Reporting** - Generate manual reports for specific dates

## 🔧 How to Use

1. **Navigate to the manual-tools folder:**
   ```bash
   cd manual-tools
   ```

2. **Run the inspection tool:**
   ```bash
   node check-collection-data.js
   ```

3. **Check specific dates:**
   ```bash
   node check-collection-data.js date 2025-08-25
   ```

4. **Inspect workers:**
   ```bash
   node check-collection-data.js workers
   ```

## 📊 Understanding the Output

The tool provides detailed analysis including:
- **Entry counts** per date
- **Device collections** with amounts
- **Collector breakdowns** with performance metrics
- **Financial summaries** (banknotes vs coins)
- **Time-based analysis** with Kyiv timezone

## 🚨 Troubleshooting

If you see "No collection data found":
1. Check if the database is running
2. Verify the `.env` file has correct database credentials
3. Ensure the `collections` table exists
4. Check if data was actually collected for the specified dates

## 📈 Project Timeline

- **Project Start**: 2025-08-20
- **Data Collection**: Daily at 2 PM Kyiv time
- **Summary Reports**: Daily at 8 AM Kyiv time
- **Manual Tools**: Available for debugging and analysis
