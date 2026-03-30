/**
 * Shared hour formatting utilities.
 *
 * Claude extracts hours as decimal (e.g. 8.5 = 8h30).
 * - UI display  → toHHMM()          e.g. 8.5 → "8:30"
 * - Excel cells → toExcelDuration() stores decimal / 24, apply [h]:mm format
 *
 * The DB ALL sheet keeps raw decimal for pivot/SUMIF operations.
 * Pivot sheets use toExcelDuration() so Excel can sum the cells natively.
 */

/**
 * Converts a decimal hour value to an HH:MM display string.
 * Used in the Vue UI only — never touches stored data.
 * e.g. 8.0 → "8:00" | 7.5 → "7:30" | 4.75 → "4:45"
 */
export function toHHMM(decimal: number): string {
  const totalMinutes = Math.round(decimal * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

/**
 * Converts decimal hours to an Excel serial duration value.
 * Excel stores time as a fraction of 24h, so 1.5h = 1.5/24.
 * Pair with numFmt '[h]:mm' on the cell so it displays correctly
 * and remains summable as a number.
 * e.g. 8.5 → 0.354166... which Excel shows as "8:30"
 */
export function toExcelDuration(decimal: number): number {
  return decimal / 24;
}

/**
 * The Excel number format string to apply to cells using toExcelDuration().
 * [h] allows totals over 24h (e.g. 168:00 for a full month).
 */
export const EXCEL_DURATION_FORMAT = "[h]:mm";
