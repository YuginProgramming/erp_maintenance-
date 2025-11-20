#!/usr/bin/env node
/**
 * Export unique collector/notes combinations from the collections table
 *
 * This script reads the `collections` table and groups rows by the trio
 * (collector_id, collector_nik, note).  The output shows every distinct
 * combination together with helpful metadata (occurrence count and the date
 * span when that combination appeared).  The result is stored in
 * `collections/collector-interconnections.json`.
 *
 * Usage:
 *   node collections/export-collector-map.js
 *
 * Requirements:
 *   - Valid DB_* environment variables (.env) so the connection manager can
 *     connect to PostgreSQL.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectionManager } from '../database/index.js';
import { logger } from '../logger/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_PATH = path.join(__dirname, 'collector-interconnections.json');

/**
 * Fetch distinct collector/note combinations from the database.
 */
async function fetchCollectorVariants() {
    const sequelize = await connectionManager.getConnection();

    const [rows] = await sequelize.query(`
        SELECT
            collector_id,
            collector_nik,
            note,
            COUNT(*)::INTEGER AS occurrence_count,
            MIN(date) AS first_seen,
            MAX(date) AS last_seen
        FROM collections
        WHERE collector_id IS NOT NULL
           OR collector_nik IS NOT NULL
           OR note IS NOT NULL
        GROUP BY collector_id, collector_nik, note
        ORDER BY collector_nik NULLS LAST, collector_id NULLS LAST, note NULLS LAST;
    `, { logging: false });

    return rows;
}

/**
 * Fetch distinct note values with frequency counts.
 */
async function fetchNoteVariants() {
    const sequelize = await connectionManager.getConnection();

    const [rows] = await sequelize.query(`
        SELECT
            normalized_note,
            COUNT(*)::INTEGER AS occurrences
        FROM (
            SELECT NULLIF(TRIM(note::text), '') AS normalized_note
            FROM collections
        ) AS notes
        GROUP BY normalized_note
        ORDER BY normalized_note IS NULL, normalized_note;
    `, { logging: false });

    return rows;
}

/**
 * Transform raw row list into a grouped structure keyed by collector.
 */
function buildCollectorSummary(rows, noteRows) {
    const collectorsMap = new Map();

    rows.forEach(row => {
        const collectorId = row.collector_id ?? null;
        const collectorNik = row.collector_nik ?? null;
        const key = `${collectorId ?? 'null'}::${collectorNik ?? 'null'}`;

        if (!collectorsMap.has(key)) {
            collectorsMap.set(key, {
                collector_id: collectorId,
                collector_nik: collectorNik,
                total_records: 0,
                note_variants: []
            });
        }

        const collectorEntry = collectorsMap.get(key);
        collectorEntry.total_records += row.occurrence_count;
        collectorEntry.note_variants.push({
            note: row.note,
            occurrences: row.occurrence_count,
            first_seen: row.first_seen,
            last_seen: row.last_seen
        });
    });

    const noteVariants = noteRows.map(noteRow => ({
        note: noteRow.normalized_note,
        occurrences: noteRow.occurrences
    }));

    const nullNoteEntry = noteVariants.find(entry => entry.note === null);

    return {
        generated_at: new Date().toISOString(),
        total_collectors: collectorsMap.size,
        total_variants: rows.length,
        note_variants_summary: {
            total_distinct_notes: noteVariants.length,
            null_note_occurrences: nullNoteEntry ? nullNoteEntry.occurrences : 0,
            variants: noteVariants
        },
        collectors: Array.from(collectorsMap.values()).sort((a, b) => {
            const nikA = a.collector_nik || '';
            const nikB = b.collector_nik || '';
            return nikA.localeCompare(nikB);
        })
    };
}

async function main() {
    try {
        await connectionManager.initialize();
        const [collectorRows, noteRows] = await Promise.all([
            fetchCollectorVariants(),
            fetchNoteVariants()
        ]);
        const summary = buildCollectorSummary(collectorRows, noteRows);

        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(summary, null, 2), 'utf-8');
        logger.info(`Collector interconnections written to ${OUTPUT_PATH}`);
    } catch (error) {
        logger.error('Failed to export collector interconnections:', error);
        process.exitCode = 1;
    } finally {
        await connectionManager.shutdown();
    }
}

if (import.meta.url === `file://${__filename}`) {
    main();
}

