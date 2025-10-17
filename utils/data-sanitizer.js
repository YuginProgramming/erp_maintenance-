/**
 * Data Sanitization Utilities
 * Handles cleaning and validation of malformed data from external APIs
 */

/**
 * Clean malformed numeric strings that have multiple decimal points
 * Examples: "2291.000.00" -> 2291.00, "0.0034.64" -> 0.003464
 */
export const cleanNumericString = (value) => {
    if (value === null || value === undefined || value === '') {
        return 0;
    }
    
    // Convert to string and handle edge cases
    let str = value.toString().trim();
    
    // Handle empty or invalid strings
    if (str === '' || str === 'null' || str === 'undefined') {
        return 0;
    }
    
    // Remove multiple decimal points by keeping only the first one
    // Split by decimal points and reconstruct properly
    const parts = str.split('.');
    
    if (parts.length === 1) {
        // No decimal points, just parse as integer
        const parsed = parseFloat(parts[0]);
        return isNaN(parsed) ? 0 : parsed;
    } else if (parts.length === 2) {
        // Normal case: one decimal point
        const parsed = parseFloat(str);
        return isNaN(parsed) ? 0 : parsed;
    } else {
        // Multiple decimal points: reconstruct properly
        // For cases like "0.0034.64", we want to combine the middle parts
        // For cases like "2291.000.00", we want to take the first and last parts
        
        if (parts.length === 3) {
            // Special handling for 3 parts like "0.0034.64" or "2291.000.00"
            const firstPart = parts[0];
            const middlePart = parts[1];
            const lastPart = parts[2];
            
            // If first part is "0" and middle part has leading zeros, combine middle and last
            if (firstPart === '0' && middlePart.startsWith('0')) {
                const combinedDecimal = middlePart + lastPart;
                const cleaned = `${firstPart}.${combinedDecimal}`;
                const parsed = parseFloat(cleaned);
                return isNaN(parsed) ? 0 : parsed;
            } else if (middlePart === '000' || middlePart === '00') {
                // For cases like "2291.000.00", take first and last parts
                const cleaned = `${firstPart}.${lastPart}`;
                const parsed = parseFloat(cleaned);
                return isNaN(parsed) ? 0 : parsed;
            } else {
                // For cases like "2291.0034.64", combine middle and last parts
                const combinedDecimal = middlePart + lastPart;
                const cleaned = `${firstPart}.${combinedDecimal}`;
                const parsed = parseFloat(cleaned);
                return isNaN(parsed) ? 0 : parsed;
            }
        } else {
            // For more than 3 parts, take first and last
            const integerPart = parts[0];
            const decimalPart = parts[parts.length - 1];
            const cleaned = `${integerPart}.${decimalPart}`;
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
        }
    }
};

/**
 * Sanitize collection data entry to ensure all numeric values are properly formatted
 */
export const sanitizeCollectionEntry = (entry) => {
    const sanitizedBanknotes = cleanNumericString(entry.banknotes);
    const sanitizedCoins = cleanNumericString(entry.coins);
    const sanitizedTotalSum = cleanNumericString(entry.total_sum);
    
    // If total_sum was malformed (returned 0), recalculate it from banknotes and coins
    const calculatedTotal = sanitizedBanknotes + sanitizedCoins;
    const finalTotal = sanitizedTotalSum > 0 ? sanitizedTotalSum : calculatedTotal;
    
    return {
        ...entry,
        banknotes: sanitizedBanknotes,
        coins: sanitizedCoins,
        total_sum: finalTotal
    };
};

/**
 * Validate that a numeric value is within reasonable bounds
 */
export const validateNumericBounds = (value, min = 0, max = 1000000) => {
    const cleaned = cleanNumericString(value);
    return Math.max(min, Math.min(max, cleaned));
};

/**
 * Log data sanitization issues for monitoring
 */
export const logSanitizationIssue = (originalValue, cleanedValue, context = '') => {
    if (originalValue !== cleanedValue.toString()) {
        console.warn(`[DATA SANITIZATION] ${context}: "${originalValue}" -> ${cleanedValue}`);
    }
};
