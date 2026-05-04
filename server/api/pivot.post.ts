import ExcelJS from "exceljs";
import {
  applyHeaderStyle,
  buildPivotSheets,
} from "~/server/utils/excel";
import { toHHMM } from "~/utils/format";

// ─── Row shape parsed from DB ALL ─────────────────────────────────────────────
interface DbRow {
  date: string;
  employee: string;
  hours: number;
  day: number;
  month: number;
  year: number;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event);
  if (!formData) {
    throw createError({
      statusCode: 400,
      statusMessage: "Nessun file ricevuto",
    });
  }

  const xlsxFile = formData.find(
    (f) =>
      f.name === "file" &&
      (f.filename?.endsWith(".xlsx") || f.filename?.endsWith(".xls")),
  );

  if (!xlsxFile) {
    throw createError({
      statusCode: 400,
      statusMessage: "File Excel non trovato",
    });
  }

  // ── Step 1: Read DB ALL from the uploaded workbook ────────────────────────
  const inWb = new ExcelJS.Workbook();
  await inWb.xlsx.load(xlsxFile.data);

  const dbSheet = inWb.getWorksheet("DB ALL");
  if (!dbSheet) {
    throw createError({
      statusCode: 400,
      statusMessage: '"DB ALL" sheet not found in uploaded file',
    });
  }

  const rows: DbRow[] = [];

  dbSheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return;

    const date = row.getCell(1).text?.trim();
    const employee = row.getCell(2).text?.trim();
    const hoursRaw = row.getCell(3).value;
    const dayRaw = row.getCell(4).value;
    const monthRaw = row.getCell(5).value;

    const hours =
      typeof hoursRaw === "number"
        ? hoursRaw
        : parseFloat(String(hoursRaw)) || 0;
    const day =
      typeof dayRaw === "number" ? dayRaw : parseInt(String(dayRaw)) || 0;
    const month =
      typeof monthRaw === "number" ? monthRaw : parseInt(String(monthRaw)) || 0;

    let year = 0;
    if (date && date.includes("/")) {
      year = parseInt(date.split("/")[2]) || 0;
    }

    if (date && employee && day && month && year) {
      rows.push({ date, employee, hours, day, month, year });
    }
  });

  if (rows.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Nessuna riga valida trovata in DB ALL",
    });
  }

  // ── Step 2: Build output workbook ─────────────────────────────────────────
  const outWb = new ExcelJS.Workbook();
  outWb.creator = "LUL Extractor";

  // Copy DB ALL sheet into the output workbook unchanged
  const outAll = outWb.addWorksheet("DB ALL");
  outAll.columns = [
    { header: "Data", key: "date", width: 14 },
    { header: "Risorsa", key: "employee", width: 32 },
    { header: "Ore", key: "hours", width: 10 },
    { header: "Giorno", key: "day", width: 10 },
    { header: "Mese", key: "month", width: 10 },
  ];
  applyHeaderStyle(outAll.getRow(1));
  outAll.views = [{ state: "frozen", ySplit: 1 }];

  for (const r of rows) {
    const dataRow = outAll.addRow({
      date: r.date,
      employee: r.employee,
      hours: r.hours,
      day: r.day,
      month: r.month,
    });
    dataRow.font = { name: "Arial", size: 10 };
    dataRow.getCell("date").alignment = { horizontal: "center" };
    dataRow.getCell("hours").alignment = { horizontal: "center" };
    dataRow.getCell("day").alignment = { horizontal: "center" };
    dataRow.getCell("month").alignment = { horizontal: "center" };
  }

  // ── Step 3: Build employee pivot sheets ───────────────────────────────────
  buildPivotSheets(outWb, rows, {
    cellFormatter: toHHMM,
    isZeroCell: (value) => value === "0:00",
  });

  // ── Return file ───────────────────────────────────────────────────────────
  const buffer = await outWb.xlsx.writeBuffer();
  const years = [...new Set(rows.map((r) => r.year))].sort().join("-");
  const filename = `LUL_Completo_${years}.xlsx`;

  setResponseHeaders(event, {
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });

  return buffer;
});
