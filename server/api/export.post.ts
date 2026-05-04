import ExcelJS from "exceljs";
import type { ExportRequest } from "~/types";
import {
  applyHeaderStyle,
  buildPivotSheets,
} from "~/server/utils/excel";
import { toExcelDuration, EXCEL_DURATION_FORMAT } from "~/utils/format";

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
    { header: "Ore Ord.", key: "hours", width: 10 },
    { header: "Ore Str.", key: "extraHours", width: 10 },
    { header: "Giorno", key: "day", width: 10 },
    { header: "Mese", key: "month", width: 10 },
  ];

  applyHeaderStyle(wsAll.getRow(1));

  for (const row of body.rows) {
    const dataRow = wsAll.addRow({
      date: row.date,
      employee: row.employee,
      hours: row.hours,
      extraHours: row.extraHours ?? 0,
      day: row.day,
      month: row.month,
    });
    dataRow.font = { name: "Arial", size: 10 };
    dataRow.getCell("date").alignment = { horizontal: "center" };
    dataRow.getCell("hours").alignment = { horizontal: "center" };
    dataRow.getCell("extraHours").alignment = { horizontal: "center" };
    dataRow.getCell("day").alignment = { horizontal: "center" };
    dataRow.getCell("month").alignment = { horizontal: "center" };
  }

  wsAll.views = [{ state: "frozen", ySplit: 1 }];

  // ── Employee pivot sheets ──────────────────────────────────────────────────
  buildPivotSheets(wb, body.rows, {
    cellFormatter: (decimal) => (decimal > 0 ? toExcelDuration(decimal) : 0),
    formatDataCell: (cell) => {
      cell.numFmt = EXCEL_DURATION_FORMAT;
    },
    formatTotalCell: (cell) => {
      cell.numFmt = EXCEL_DURATION_FORMAT;
    },
    isZeroCell: (value) => !value || value === 0,
  });

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
