import ExcelJS from 'exceljs'
import type { ExportRequest } from '~/types'

const MONTH_NAMES = ['', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

export default defineEventHandler(async (event) => {
  const body = await readBody<ExportRequest>(event)

  if (!body?.rows?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Nessuna riga da esportare' })
  }

  const wb = new ExcelJS.Workbook()
  wb.creator = 'LUL Extractor'
  wb.created = new Date()

  // ── Sheet 1: DB ALL ──────────────────────────────────────────────
  const wsAll = wb.addWorksheet('DB ALL')

  // Header row
  wsAll.columns = [
    { header: 'Data',    key: 'date',     width: 14 },
    { header: 'Risorsa', key: 'employee', width: 32 },
    { header: 'Ore',     key: 'hours',    width: 10 },
  ]

  // Style header
  const headerRow = wsAll.getRow(1)
  headerRow.font = { bold: true, name: 'Arial', size: 10 }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF5' } }
  headerRow.alignment = { horizontal: 'center' }
  wsAll.getRow(1).height = 18

  // Data rows
  for (const row of body.rows) {
    wsAll.addRow({ date: row.date, employee: row.employee, hours: row.hours })
  }

  // Style data rows
  wsAll.eachRow((row, rowNum) => {
    if (rowNum === 1) return
    row.font = { name: 'Arial', size: 10 }
    row.getCell('hours').alignment = { horizontal: 'center' }
    row.getCell('date').alignment = { horizontal: 'center' }
  })

  // Freeze header
  wsAll.views = [{ state: 'frozen', ySplit: 1 }]

  // ── Employee pivot sheets ─────────────────────────────────────────
  const employees = [...new Set(body.rows.map(r => r.employee))].sort()

  for (const employee of employees) {
    const empRows = body.rows.filter(r => r.employee === employee)

    // Detect which months are present
    const months = [...new Set(empRows.map(r => r.month))].sort((a, b) => a - b)

    // Sheet name max 31 chars for Excel
    const sheetName = employee.length > 31 ? employee.substring(0, 31) : employee
    const ws = wb.addWorksheet(sheetName)

    // Build header row: blank, then month names
    const headerValues = ['Giorno', ...months.map(m => MONTH_NAMES[m])]
    const hRow = ws.addRow(headerValues)
    hRow.font = { bold: true, name: 'Arial', size: 10 }
    hRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF5' } }
    hRow.alignment = { horizontal: 'center' }
    hRow.height = 18

    // Set column widths
    ws.getColumn(1).width = 10
    months.forEach((_, i) => { ws.getColumn(i + 2).width = 12 })

    // Build lookup: month → day → hours
    const lookup = new Map<number, Map<number, number>>()
    for (const row of empRows) {
      if (!lookup.has(row.month)) lookup.set(row.month, new Map())
      lookup.get(row.month)!.set(row.day, row.hours)
    }

    // Detect max days in any month (up to 31)
    const maxDay = 31

    // Write 31 day rows
    for (let day = 1; day <= maxDay; day++) {
      const rowValues: (number | string)[] = [day]
      for (const month of months) {
        const hours = lookup.get(month)?.get(day) ?? 0
        rowValues.push(hours)
      }
      const dataRow = ws.addRow(rowValues)
      dataRow.font = { name: 'Arial', size: 10 }
      dataRow.getCell(1).alignment = { horizontal: 'center' }
      dataRow.getCell(1).font = { bold: true, name: 'Arial', size: 10 }
      for (let col = 2; col <= months.length + 1; col++) {
        dataRow.getCell(col).alignment = { horizontal: 'center' }
        // Grey out zero-hour cells subtly
        const val = dataRow.getCell(col).value
        if (val === 0) {
          dataRow.getCell(col).font = { name: 'Arial', size: 10, color: { argb: 'FFBBBBBB' } }
        }
      }
    }

    // Freeze header row and day column
    ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }]
  }

  const buffer = await wb.xlsx.writeBuffer()

  // Derive filename from data
  const years = [...new Set(body.rows.map(r => r.year))].sort().join('-')
  const filename = `LUL_DB_ALL_${years}.xlsx`

  setResponseHeaders(event, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}"`,
  })

  return buffer
})
