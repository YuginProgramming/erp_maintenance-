import { sanitizeCollectionEntry } from "./data-sanitizer.js";

/** Soliton splits one visit into купюри + монети a few seconds apart. */
export const VISIT_MERGE_WINDOW_MS = 2 * 60 * 1000;

function kyivWallParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function kyivWallString(date) {
  const p = kyivWallParts(date);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}

/**
 * Soliton sends "YYYY-MM-DD HH:mm:ss" as Kyiv wall time, no zone.
 * Date-only "YYYY-MM-DD" is a stub (UTC midnight → 03:00 Kyiv in summer).
 */
export function parseSolitonDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  const str = String(value ?? "").trim();
  if (!str) return null;

  const match = str.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (!match) {
    const fallback = new Date(str);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const [, year, month, day, hour, minute = "00", second = "00"] = match;
  if (hour == null) {
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  }
  const wall = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  for (const offset of ["+03:00", "+02:00"]) {
    const dt = new Date(`${wall}${offset}`);
    if (!Number.isNaN(dt.getTime()) && kyivWallString(dt) === wall) {
      return dt;
    }
  }
  return new Date(`${wall}+03:00`);
}

/** UTC midnight / 03:00 Kyiv — date-only import, not a real visit time. */
export function isDateStub(value) {
  const date = value instanceof Date ? value : parseSolitonDate(value);
  if (!date || Number.isNaN(date.getTime())) return false;
  if (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0
  ) {
    return true;
  }
  const p = kyivWallParts(date);
  return (
    (p.hour === "03" || p.hour === "00") &&
    p.minute === "00" &&
    p.second === "00"
  );
}

export function pickVisitDate(existingDate, incomingDate) {
  const existing = existingDate instanceof Date ? existingDate : parseSolitonDate(existingDate);
  const incoming = incomingDate instanceof Date ? incomingDate : parseSolitonDate(incomingDate);
  if (!existing) return incoming;
  if (!incoming) return existing;
  if (isDateStub(existing) && !isDateStub(incoming)) return incoming;
  if (!isDateStub(existing) && isDateStub(incoming)) return existing;
  return existing.getTime() <= incoming.getTime() ? existing : incoming;
}

export function amountsCompatible(a, b) {
  const notesOk = !a.banknotes || !b.banknotes || a.banknotes === b.banknotes;
  const coinsOk = !a.coins || !b.coins || a.coins === b.coins;
  return notesOk && coinsOk;
}

export function mergeVisitAmounts(a, b) {
  return {
    banknotes: Math.max(a.banknotes || 0, b.banknotes || 0),
    coins: Math.max(a.coins || 0, b.coins || 0),
  };
}

/**
 * Collapse Soliton API lines into one visit per device event.
 * Two visits hours apart stay two visits.
 */
export function mergeSolitonEntries(entries, windowMs = VISIT_MERGE_WINDOW_MS) {
  const prepared = [];
  for (const entry of entries || []) {
    const sanitized = sanitizeCollectionEntry(entry);
    const banknotes = sanitized.banknotes;
    const coins = sanitized.coins;
    if (banknotes + coins === 0) continue;
    const date = parseSolitonDate(entry.date);
    if (!date) continue;
    prepared.push({
      date,
      banknotes,
      coins,
      description: entry.descr || entry.description || null,
      collector_id: entry.collector_id || null,
      collector_nik: entry.collector_nik || null,
    });
  }

  prepared.sort((a, b) => a.date.getTime() - b.date.getTime());

  const visits = [];
  for (const item of prepared) {
    const last = visits[visits.length - 1];
    if (last && Math.abs(item.date.getTime() - last.date.getTime()) <= windowMs) {
      const merged = mergeVisitAmounts(last, item);
      last.banknotes = merged.banknotes;
      last.coins = merged.coins;
      last.date = pickVisitDate(last.date, item.date);
      last.description = last.description || item.description;
      last.collector_id = last.collector_id || item.collector_id;
      last.collector_nik = last.collector_nik || item.collector_nik;
    } else {
      visits.push({ ...item });
    }
  }

  for (const visit of visits) {
    visit.total_sum = visit.banknotes + visit.coins;
  }
  return visits;
}

export async function saveMergedCollectionVisits({
  collectionData,
  device,
  collectionRepo,
  extractCollector,
}) {
  const visits = mergeSolitonEntries(collectionData?.data || []);
  if (visits.length === 0) return 0;

  let savedCount = 0;
  for (const visit of visits) {
    const collector = extractCollector?.(visit.description) || {};
    const result = await collectionRepo.upsertVisit({
      device_id: device.id,
      date: visit.date,
      banknotes: visit.banknotes,
      coins: visit.coins,
      total_sum: visit.total_sum,
      machine: device.name || `Device ${device.id}`,
      collector_id: collector.id || visit.collector_id || null,
      collector_nik: collector.nik || visit.collector_nik || null,
      description: visit.description,
    });
    if (result?.created || result?.updated) savedCount += 1;
  }
  return savedCount;
}
