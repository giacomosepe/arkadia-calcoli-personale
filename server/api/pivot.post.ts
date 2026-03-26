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

    // Build lookup: month → day → decimal hours
    const lookup = new Map<number, Map<number, number>>();
    for (const r of empRows) {
      if (!lookup.has(r.month)) lookup.set(r.month, new Map());
      lookup.get(r.month)!.set(r.day, r.hours);
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
