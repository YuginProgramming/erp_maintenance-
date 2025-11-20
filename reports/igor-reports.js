#!/usr/bin/env node

/**
 * Igor Collection Report
 *
 * Reads `docs/igor.csv` to get the list of device IDs associated with
 * collector Igor and prints a console summary of how much money those
 * devices collected for the current (or specified) calendar month.
 *
 * Usage:
 *   node reports/igor-reports.js           # Uses current month
 *   node reports/igor-reports.js --month=2025-11  # Explicit month
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectionManager } from '../database/index.js';
import { logger } from '../logger/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT_DIR, 'docs', 'igor.csv');

function parseArgs() {
    const monthArg = process.argv.find(arg => arg.startsWith('--month='));
    if (!monthArg) {
        return null;
    }
    const value = monthArg.split('=')[1];
    if (!/^\d{4}-\d{2}$/.test(value)) {
        throw new Error('Month argument must be in YYYY-MM format');
    }
    const [year, month] = value.split('-').map(Number);
    return { year, month: month - 1 };
}

function getMonthRange() {
    const override = parseArgs();
    const now = new Date();
    const year = override ? override.year : now.getUTCFullYear();
    const monthIndex = override ? override.month : now.getUTCMonth();

    const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));

    return {
        label: start.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
        startISO: start.toISOString(),
        endISO: end.toISOString()
    };
}

function parseDeviceIds() {
    const raw = fs.readFileSync(CSV_PATH, 'utf-8');
    const ids = raw
        .split(/\r?\n/)
        .slice(1) // skip header
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => line.split(',')[0]?.trim())
        .filter(Boolean);

    return [...new Set(ids.map(id => id.toString()))];
}

async function fetchMonthlyTotals(startISO, endISO) {
    const sequelize = await connectionManager.getConnection();

    const [rows] = await sequelize.query(`
        SELECT
            device_id,
            SUM(total_sum)::numeric AS total_sum
        FROM collections
        WHERE date >= :start_date
          AND date < :end_date
          AND (
                collector_nik = :collector_nik
             OR note ILIKE :note_pattern
          )
        GROUP BY device_id
    `, {
        replacements: {
            start_date: startISO,
            end_date: endISO,
            collector_nik: 'Р†РіРѕСЂ',
            note_pattern: '%Р†РіРѕСЂ%'
        }
    });

    const totals = new Map();
    rows.forEach(row => {
        totals.set(row.device_id.toString(), Number(row.total_sum));
    });

    return totals;
}

async function main() {
    const devices = parseDeviceIds();
    const { label, startISO, endISO } = getMonthRange();

    console.log('🧾 Igor collection report');
    console.log(`📅 Month: ${label}`);
    console.log(`📟 Devices tracked: ${devices.length}`);

    try {
        await connectionManager.initialize();
        const totalsMap = await fetchMonthlyTotals(startISO, endISO);

        let totalCollected = 0;
        devices.forEach(deviceId => {
            const amount = totalsMap.get(deviceId) || 0;
            totalCollected += amount;
            console.log(`   • Device ${deviceId}: ${amount.toFixed(2)} грн`);
        });

        console.log('-------------------------------------------');
        console.log(`✅ Total collected by Igor’s devices: ${totalCollected.toFixed(2)} грн`);
    } catch (error) {
        logger.error('Failed to generate Igor report:', error);
        process.exitCode = 1;
    } finally {
        await connectionManager.shutdown();
    }
}

if (import.meta.url === `file://${__filename}`) {
    main();
}

