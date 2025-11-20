# Collector Interconnections Export

This folder contains tooling for inspecting every unique combination of
`collector_id`, `collector_nik`, and `note` stored in the `collections`
database table. It helps identify how collectors are referenced and what
notes are attached to them.

## Files

- `export-collector-map.js` – Node script that queries PostgreSQL via the
  shared connection manager and writes the aggregated data to JSON. It also
  lists every distinct note value (including how many times `NULL` appears).
- `collector-interconnections.json` – Output file produced by the script.

## Usage

1. Ensure the `.env` file contains valid `DB_HOST`, `DB_PORT`, `DB_NAME`,
   `DB_USER`, and `DB_PASSWORD` values.
2. Run the export script from the project root:

   ```bash
   node collections/export-collector-map.js
   ```

3. Inspect `collections/collector-interconnections.json` for the results.

The generated JSON contains:

- `generated_at` – timestamp of the export.
- `total_collectors` – count of distinct collector entries.
- `total_variants` – number of unique `(collector_id, collector_nik, note)`
  combinations.
- `note_variants_summary` – statistics for the `note` column, including null
  occurrences and a list of each unique note with counts.
- `collectors` – array grouped by collector with per-note statistics
  (occurrence counts, first/last appearance dates).

