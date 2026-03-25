import ExcelJS from "exceljs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "",
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

// ─── Row shape parsed from DB ALL ─────────────────────────────────────────────
interface DbRow {
  date: string; // DD/MM/YYYY
  employee: string;
  hours: number; // decimal
  day: number;
  month: number;
  year: number;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
// This route receives an already-exported DB ALL Excel file and regenerates
// all employee sheets from it — no AI involved, pure ExcelJS.
//
// When to use this vs export.post.ts:
//   export.post.ts  → first run, you have raw extracted rows in memory
//   pivot.post.ts   → re-run after reviewing/editing the DB ALL file manually
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

  // Parse rows from DB ALL.
  // The sheet has 5 columns: Data | Risorsa | Ore | Giorno | Mese
  // We use Giorno and Mese directly — no need to parse the date string.
  const rows: DbRow[] = [];

  dbSheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return; // skip header

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

    // Derive year from the date string since it's not a separate column
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
  const employees = [...new Set(rows.map((r) => r.employee))].sort();

  for (const employee of employees) {
    const empRows = rows.filter((r) => r.employee === employee);
    const months = [...new Set(empRows.map((r) => r.month))].sort(
      (a, b) => a - b,
    );

    const sheetName =
      employee.length > 31 ? employee.substring(0, 31) : employee;
    const ws = outWb.addWorksheet(sheetName);

    // Header
    const headerRow = ws.addRow([
      "Giorno",
      ...months.map((m) => MONTH_NAMES[m]),
    ]);
    applyHeaderStyle(headerRow);

    ws.getColumn(1).width = 10;
    months.forEach((_, i) => {
      ws.getColumn(i + 2).width = 10;
    });

    // Lookup: month → day → decimal hours
    const lookup = new Map<number, Map<number, number>>();
    for (const r of empRows) {
      if (!lookup.has(r.month)) lookup.set(r.month, new Map());
      lookup.get(r.month)!.set(r.day, r.hours);
    }

    // 31 day rows with HH:MM values
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

    ws.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];
  }

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
