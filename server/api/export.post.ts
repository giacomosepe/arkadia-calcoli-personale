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
 */
function decimalToHHMM(decimal: number): string {
  if (!decimal || decimal <= 0) return "0:00";
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  if (m === 60) return `${h + 1}:00`;
  return `${h}:${String(m).padStart(2, "0")}`;
}

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

function applyTotalStyle(row: ExcelJS.Row, colCount: number) {
  row.font = { bold: true, name: "Arial", size: 10 };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8EDF5" },
  };
  row.height = 18;
  row.getCell(1).alignment = { horizontal: "center" };
  for (let col = 2; col <= colCount + 1; col++) {
    row.getCell(col).alignment = { horizontal: "center" };
  }
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
      hours: row.hours,
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
  const employees = [...new Set(body.rows.map((r) => r.employee))].sort();

  for (const employee of employees) {
    const empRows = body.rows.filter((r) => r.employee === employee);
    const months = [...new Set(empRows.map((r) => r.month))].sort(
      (a, b) => a - b,
    );

    const sheetName =
      employee.length > 31 ? employee.substring(0, 31) : employee;
    const ws = wb.addWorksheet(sheetName);

    // Header row: "Giorno" + one column per month
    const headerRow = ws.addRow([
      "Giorno",
      ...months.map((m) => MONTH_NAMES[m]),
    ]);
    applyHeaderStyle(headerRow);

    ws.getColumn(1).width = 10;
    months.forEach((_, i) => {
      ws.getColumn(i + 2).width = 10;
    });

    // Build lookup: month → day → decimal hours
    const lookup = new Map<number, Map<number, number>>();
    for (const row of empRows) {
      if (!lookup.has(row.month)) lookup.set(row.month, new Map());
      lookup.get(row.month)!.set(row.day, row.hours);
    }

    // Write day rows 1–31
    for (let day = 1; day <= 31; day++) {
      const values: (number | string)[] = [day];

      for (const month of months) {
        const decimal = lookup.get(month)?.get(day) ?? 0;
        values.push(decimalToHHMM(decimal));
      }

      const dataRow = ws.addRow(values);
      dataRow.font = { name: "Arial", size: 10 };
      dataRow.getCell(1).font = { bold: true, name: "Arial", size: 10 };
      dataRow.getCell(1).alignment = { horizontal: "center" };

      for (let col = 2; col <= months.length + 1; col++) {
        const cell = dataRow.getCell(col);
        cell.alignment = { horizontal: "center" };
        if (cell.value === "0:00") {
          cell.font = { name: "Arial", size: 10, color: { argb: "FFBBBBBB" } };
        }
      }
    }

    // ── Blank separator row ──────────────────────────────────────────────────
    ws.addRow([]);

    // ── Totals row — sum of all worked hours per month ───────────────────────
    const totalValues: (string | number)[] = ["Totale"];
    for (const month of months) {
      const monthMap = lookup.get(month);
      const total = monthMap
        ? [...monthMap.values()].reduce((sum, h) => sum + h, 0)
        : 0;
      totalValues.push(decimalToHHMM(Math.round(total * 10000) / 10000));
    }

    const totalRow = ws.addRow(totalValues);
    applyTotalStyle(totalRow, months.length);

    // Freeze both axes
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
