import ExcelJS from "exceljs";
import type { ExportRequest } from "~/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "", // index 0 unused — months are 1-based
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
];

/**
 * Converts decimal hours to HH:MM string.
 * Used for the employee pivot sheets display.
 * The DB ALL sheet keeps decimal — needed for summing and verification.
 *
 * Examples:
 *   8.0   → "8:00"
 *   7.5   → "7:30"
 *   4.75  → "4:45"
 *   0.0   → "0:00"
 */
function decimalToHHMM(decimal: number): string {
  if (!decimal || decimal <= 0) return "0:00";
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  // Handle floating point edge case where minutes round to 60
  if (m === 60) return `${h + 1}:00`;
  return `${h}:${String(m).padStart(2, "0")}`;
}

// Shared header style used on both DB ALL and employee sheets
function applyHeaderStyle(row: ExcelJS.Row) {
  row.font = { bold: true, name: "Arial", size: 10 };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8EDF5" },
  };
  row.alignment = { horizontal: "center" };
  row.height = 18;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
  const body = await readBody<ExportRequest>(event);

  if (!body?.rows?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "Nessuna riga da esportare",
    });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "LUL Extractor";
  wb.created = new Date();

  // ── Sheet 1: DB ALL ────────────────────────────────────────────────────────
  // Matches the template.xlsx structure exactly:
  // Data | Risorsa | Ore | Giorno | Mese
  //
  // "Ore" stays decimal here — it's used for summing, verification, and
  // feeding the pivot step. HH:MM is only on the employee sheets.
  const wsAll = wb.addWorksheet("DB ALL");

  wsAll.columns = [
    { header: "Data", key: "date", width: 14 },
    { header: "Risorsa", key: "employee", width: 32 },
    { header: "Ore", key: "hours", width: 10 },
    { header: "Giorno", key: "day", width: 10 },
    { header: "Mese", key: "month", width: 10 },
  ];

  applyHeaderStyle(wsAll.getRow(1));

  for (const row of body.rows) {
    const dataRow = wsAll.addRow({
      date: row.date,
      employee: row.employee,
      hours: row.hours, // decimal — e.g. 8.75
      day: row.day,
      month: row.month,
    });
    dataRow.font = { name: "Arial", size: 10 };
    dataRow.getCell("date").alignment = { horizontal: "center" };
    dataRow.getCell("hours").alignment = { horizontal: "center" };
    dataRow.getCell("day").alignment = { horizontal: "center" };
    dataRow.getCell("month").alignment = { horizontal: "center" };
  }

  wsAll.views = [{ state: "frozen", ySplit: 1 }];

  // ── Employee pivot sheets ──────────────────────────────────────────────────
  // One sheet per employee.
  // Layout: rows = days 1–31, columns = months present in data.
  // Cell values are HH:MM strings (display format for the end user).
  //
  // Why only months with data? An employee on sick leave for all of June
  // would produce a blank column that adds no information. We include only
  // months where that employee has at least one worked hour.
  const employees = [...new Set(body.rows.map((r) => r.employee))].sort();

  for (const employee of employees) {
    const empRows = body.rows.filter((r) => r.employee === employee);

    // Months this employee actually has data for, in calendar order
    const months = [...new Set(empRows.map((r) => r.month))].sort(
      (a, b) => a - b,
    );

    // Excel sheet names are max 31 chars
    const sheetName =
      employee.length > 31 ? employee.substring(0, 31) : employee;
    const ws = wb.addWorksheet(sheetName);

    // Header row: "Giorno" + one column per month
    const headerRow = ws.addRow([
      "Giorno",
      ...months.map((m) => MONTH_NAMES[m]),
    ]);
    applyHeaderStyle(headerRow);

    // Column widths
    ws.getColumn(1).width = 10; // Giorno column
    months.forEach((_, i) => {
      ws.getColumn(i + 2).width = 10;
    });

    // Build a lookup: month → day → decimal hours
    // We look up decimal here so the decimalToHHMM conversion happens
    // exactly once per cell, not during row collection.
    const lookup = new Map<number, Map<number, number>>();
    for (const row of empRows) {
      if (!lookup.has(row.month)) lookup.set(row.month, new Map());
      lookup.get(row.month)!.set(row.day, row.hours);
    }

    // Write one row per day 1–31
    // Days the employee didn't work show "0:00" in grey
    for (let day = 1; day <= 31; day++) {
      const values: (number | string)[] = [day];

      for (const month of months) {
        const decimal = lookup.get(month)?.get(day) ?? 0;
        values.push(decimalToHHMM(decimal)); // HH:MM string
      }

      const dataRow = ws.addRow(values);
      dataRow.font = { name: "Arial", size: 10 };

      // Day number column: bold, centered
      dataRow.getCell(1).font = { bold: true, name: "Arial", size: 10 };
      dataRow.getCell(1).alignment = { horizontal: "center" };

      // Hour columns: centered, grey text for zero-hour cells
      for (let col = 2; col <= months.length + 1; col++) {
        const cell = dataRow.getCell(col);
        cell.alignment = { horizontal: "center" };
        if (cell.value === "0:00") {
          cell.font = { name: "Arial", size: 10, color: { argb: "FFBBBBBB" } };
        }
      }
    }

    // Freeze both the header row and the day column so you can scroll
    // across months while keeping the row/column labels visible
    ws.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];
  }

  // ── Build and return the file ──────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();

  const years = [...new Set(body.rows.map((r) => r.year))].sort().join("-");
  const filename = `LUL_DB_ALL_${years}.xlsx`;

  setResponseHeaders(event, {
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });

  return buffer;
});
