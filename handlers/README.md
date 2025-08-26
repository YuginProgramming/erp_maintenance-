# Handlers

This folder contains the main application handlers that process Telegram bot commands and business logic.

## Files

### `maintenance-handler.js`
Handles maintenance-related Telegram bot commands:
- `/maintenance` - View all maintenance tasks
- `/machines` - Check machine status and water levels  
- `/alerts` - Show urgent maintenance alerts

## Structure

Each handler file should:
- Export functions that can be called from `app.js`
- Handle specific command logic
- Return formatted messages for Telegram
- Include proper error handling

## Usage

Handlers are imported and used in `app.js` to process user commands and generate responses.
