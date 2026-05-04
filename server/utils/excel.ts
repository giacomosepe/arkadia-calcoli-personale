import ExcelJS from "exceljs";

export const MONTH_NAMES = [
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

export function applyHeaderStyle(row: ExcelJS.Row) {
  row.font = { bold: true, name: "Arial", size: 10 };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8EDF5" },
  };
  row.alignment = { horizontal: "center" };
  row.height = 18;
}

export function applyTotalStyle(row: ExcelJS.Row, colCount: number) {
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

export interface PivotRow {
  employee: string;
  hours: number;
  day: number;
  month: number;
}

interface BuildPivotSheetsOptions {
  cellFormatter: (decimal: number) => number | string;
  formatDataCell?: (cell: ExcelJS.Cell) => void;
  formatTotalCell?: (cell: ExcelJS.Cell) => void;
  isZeroCell?: (value: number | string) => boolean;
}

export function buildPivotSheets(
  wb: ExcelJS.Workbook,
  rows: PivotRow[],
  options: BuildPivotSheetsOptions,
) {
  const employees = [...new Set(rows.map((r) => r.employee))].sort();

  for (const employee of employees) {
    const empRows = rows.filter((r) => r.employee === employee);
    const months = [...new Set(empRows.map((r) => r.month))].sort(
      (a, b) => a - b,
    );

    const sheetName =
      employee.length > 31 ? employee.substring(0, 31) : employee;
    const ws = wb.addWorksheet(sheetName);

    const headerRow = ws.addRow([
      "Giorno",
      ...months.map((m) => MONTH_NAMES[m]),
    ]);
    applyHeaderStyle(headerRow);

    ws.getColumn(1).width = 10;
    months.forEach((_, i) => {
      ws.getColumn(i + 2).width = 10;
    });

    const lookup = new Map<number, Map<number, number>>();
    for (const row of empRows) {
      if (!lookup.has(row.month)) lookup.set(row.month, new Map());
      lookup.get(row.month)!.set(row.day, row.hours);
    }

    for (let day = 1; day <= 31; day++) {
      const values: (number | string)[] = [day];

      for (const month of months) {
        const decimal = lookup.get(month)?.get(day) ?? 0;
        values.push(options.cellFormatter(decimal));
      }

      const dataRow = ws.addRow(values);
      dataRow.font = { name: "Arial", size: 10 };
      dataRow.getCell(1).font = { bold: true, name: "Arial", size: 10 };
      dataRow.getCell(1).alignment = { horizontal: "center" };

      for (let col = 2; col <= months.length + 1; col++) {
        const cell = dataRow.getCell(col);
        cell.alignment = { horizontal: "center" };
        options.formatDataCell?.(cell);

        if (options.isZeroCell?.(cell.value as number | string)) {
          cell.font = { name: "Arial", size: 10, color: { argb: "FFBBBBBB" } };
          if (typeof cell.value === "number") {
            cell.value = 0;
          }
        }
      }
    }

    ws.addRow([]);

    const totalValues: (string | number)[] = ["Totale"];
    for (const month of months) {
      const monthMap = lookup.get(month);
      const total = monthMap
        ? [...monthMap.values()].reduce((sum, h) => sum + h, 0)
        : 0;
      totalValues.push(options.cellFormatter(Math.round(total * 10000) / 10000));
    }

    const totalRow = ws.addRow(totalValues);
    applyTotalStyle(totalRow, months.length);
    for (let col = 2; col <= months.length + 1; col++) {
      options.formatTotalCell?.(totalRow.getCell(col));
    }

    ws.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];
  }
}
