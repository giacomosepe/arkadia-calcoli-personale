import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { fileURLToPath } from "node:url";

const workerUrl = new URL(
  "../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
  import.meta.url,
);
pdfjsLib.GlobalWorkerOptions.workerSrc = fileURLToPath(workerUrl);

export interface TextItem {
  str: string;
  x: number;
  y: number;
}

export interface DayRow {
  day: number;
  columns: Record<string, string>;
}

export interface ExtractedTable {
  rows: DayRow[];
  headerText: string;
  summaryText: string;
}

export async function extractTableFromPage(
  pdfBase64: string,
  columnHeaders: string[],
): Promise<ExtractedTable> {

  const data = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
  const pdf = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1 });
  const pageHeight = viewport.height;
  const pageWidth = viewport.width;

  const Y_TOL = 5;
  const X_TOL = 18;

  const items: TextItem[] = textContent.items
    .filter((item: any): item is { str: string; transform: number[] } =>
      "str" in item &&
      typeof item.str === "string" &&
      item.str.trim() !== "" &&
      item.str.trim() !== " ",
    )
    .map((item: any) => ({
      str: item.str.trim(),
      x: Math.round(item.transform[4]),
      y: Math.round(pageHeight - item.transform[5]),
    }));

  // Find the correct GG. — on the same row as ORD. or STRAOR.
  const ggCandidates = items.filter((i) => i.str === "GG." || i.str === "GG");

  let ggItem: TextItem | undefined;
  for (const candidate of ggCandidates) {
    const rowItems = items.filter((i) => Math.abs(i.y - candidate.y) <= Y_TOL);
    const rowStrings = rowItems.map((i) => i.str.toUpperCase());
    const hasTargetColumn = columnHeaders.some((h) => rowStrings.includes(h.toUpperCase()));
    const hasDailyColumns =
      rowStrings.includes("ORD.") || rowStrings.includes("STRAOR.") ||
      rowStrings.includes("ORDINARIE") || rowStrings.includes("STRAORDINARIE");
    if (hasTargetColumn || hasDailyColumns) {
      ggItem = candidate;
      break;
    }
  }

  if (!ggItem) {
    const shortItems = items.filter((i) => i.str.length <= 8).slice(0, 40);
    console.warn(`[pdfExtract] Daily table GG. not found. Items: ${shortItems.map(i => JSON.stringify(i.str)).join(", ")}`);
    return { rows: [], headerText: items.map((i) => i.str).join(" "), summaryText: "" };
  }

  const headerY = ggItem.y;
  const ggX = ggItem.x;

  // Detect column X positions from the header row
  const tableHeaderItems = items.filter((i) => Math.abs(i.y - headerY) <= Y_TOL);
  const colX: Record<string, number> = { "GG.": ggX };
  for (const header of columnHeaders) {
    const found = tableHeaderItems.find((i) => i.str.toUpperCase() === header.toUpperCase());
    if (found) colX[header] = found.x;
    else console.warn(`[pdfExtract] Column header "${header}" not found on page`);
  }

  // Footer boundary — use 40% of page width to exclude right-column financial markers
  // (PAGAMENTO etc. appear at the same Y as day 28-29 but on the right side of the page)
  const tableRightX = pageWidth * 0.40;
  const FOOTER_MARKERS = ["PAGAMENTO", "IMPONIBILE PREVIDENZIALE", "TOTALE COMPETENZE", "TOTALI"];
  const footerItem = items.find((i) => FOOTER_MARKERS.includes(i.str) && i.x > tableRightX);
  const footerY = footerItem ? footerItem.y : pageHeight;

  // Three zones
  const aboveItems = items.filter((i) => i.y < headerY - Y_TOL);
  const tableItems = items.filter((i) => i.y > headerY + Y_TOL && i.y < footerY);
  const summaryItems = items.filter((i) => i.y >= footerY);

  // Group table items into rows by Y
  const rowBuckets = new Map<number, TextItem[]>();
  for (const item of tableItems) {
    let matched = false;
    for (const [bucketY] of rowBuckets) {
      if (Math.abs(item.y - bucketY) <= Y_TOL) {
        rowBuckets.get(bucketY)!.push(item);
        matched = true;
        break;
      }
    }
    if (!matched) rowBuckets.set(item.y, [item]);
  }

  const sortedBuckets = Array.from(rowBuckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([, rowItems]) => rowItems.sort((a, b) => a.x - b.x));

  // Map each bucket to a DayRow
  const dayRows: DayRow[] = [];
  for (const rowItems of sortedBuckets) {
    // Look for day number near GG. column X
    const nearGG = rowItems.filter((i) => Math.abs(i.x - ggX) <= X_TOL * 3);

    let day: number | null = null;
    let dayItem: TextItem | null = null;

    // Pattern 1: single item like "5", "S5", "D12"
    for (const item of nearGG) {
      const m = item.str.match(/^[A-Z]{0,2}\s*(\d{1,2})$|^(\d{1,2})$/);
      if (m) {
        const n = parseInt(m[1] ?? m[2], 10);
        if (n >= 1 && n <= 31) { day = n; dayItem = item; break; }
      }
    }

    // Pattern 2: two adjacent items "S" + "5"
    if (day === null && nearGG.length >= 2) {
      for (let i = 0; i < nearGG.length - 1; i++) {
        const a = nearGG[i].str;
        const b = nearGG[i + 1].str;
        if (/^[A-Z]{1,2}$/.test(a) && /^\d{1,2}$/.test(b)) {
          const n = parseInt(b, 10);
          if (n >= 1 && n <= 31) { day = n; dayItem = nearGG[i + 1]; break; }
        }
      }
    }

    if (day === null) continue;

    // Map each configured column — skip only the exact day number item
    const columns: Record<string, string> = {};
    for (const header of columnHeaders) {
      if (!(header in colX)) { columns[header] = ""; continue; }
      const hx = colX[header];
      const candidate = rowItems
        .filter((i) => i !== dayItem)
        .find((i) => Math.abs(i.x - hx) <= X_TOL);
      columns[header] = candidate ? candidate.str : "";
    }

    dayRows.push({ day, columns });
  }

  console.log(`[pdfExtract] Page detected days: ${dayRows.map(r => r.day).join(", ")}`);
  console.log(`[pdfExtract] Page ${dayRows.length} rows detected`);

  return {
    rows: dayRows,
    headerText: aboveItems.map((i) => i.str).join(" "),
    summaryText: summaryItems.map((i) => i.str).join(" "),
  };
}

export function formatTableForClaude(
  table: ExtractedTable,
  columnHeaders: string[],
): string {
  if (table.rows.length === 0) {
    return `(no daily table detected)\n\nPAGE TEXT:\n${table.headerText}`;
  }

  const COL_W = 10;
  const headerLine = "DAY   " + columnHeaders.map((h) => h.padEnd(COL_W)).join("");
  const separator = "-".repeat(headerLine.length);

  const lines = table.rows.map((row) => {
    const dayStr = String(row.day).padEnd(6);
    const cols = columnHeaders.map((h) => (row.columns[h] ?? "").padEnd(COL_W));
    return dayStr + cols.join("");
  });

  return [
    "DOCUMENT HEADER (find employee name, month and year here):",
    table.headerText,
    "",
    "DAILY ATTENDANCE TABLE:",
    headerLine,
    separator,
    ...lines,
    "",
    "SUMMARY SECTION (find declared total here):",
    table.summaryText,
  ].join("\n");
}
