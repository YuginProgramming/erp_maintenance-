// Function to get yesterday's date in YYYY-MM-DD format
export const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
};

// Function to get today's date in YYYY-MM-DD format
export const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
};

// Function to get previous day's date in YYYY-MM-DD format
export const getPreviousDayDate = () => {
    const previousDay = new Date();
    previousDay.setDate(previousDay.getDate() - 2); // 2 days ago (previous day)
    return previousDay.toISOString().split('T')[0];
};

// Function to get previous week's date range
export const getPreviousWeekRange = () => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() - 1); // Yesterday
    
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6); // 7 days before yesterday
    
    return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
    };
};

// Function to get previous month's year and month
export const getPreviousMonth = () => {
    const today = new Date();
    const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    
    return {
        year: previousMonth.getFullYear(),
        month: previousMonth.getMonth() + 1 // getMonth() returns 0-11, so add 1
    };
};

