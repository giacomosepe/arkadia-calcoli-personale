import ExcelJS from 'exceljs'

const MONTH_NAMES = ['', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

interface DbRow {
  date: string    // DD/MM/YYYY
  employee: string
  hours: number
}

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, statusMessage: 'Nessun file ricevuto' })
  }

  const xlsxFile = formData.find(f => f.name === 'file' &&
    (f.filename?.endsWith('.xlsx') || f.filename?.endsWith('.xls')))

  if (!xlsxFile) {
    throw createError({ statusCode: 400, statusMessage: 'File Excel non trovato' })
  }

  // Read uploaded DB ALL workbook
  const inWb = new ExcelJS.Workbook()
  await inWb.xlsx.load(xlsxFile.data)

  const dbSheet = inWb.getWorksheet('DB ALL')
  if (!dbSheet) {
    throw createError({ statusCode: 400, statusMessage: 'Foglio "DB ALL" non trovato nel file' })
  }

  // Parse rows from DB ALL (skip header row 1)
  const rows: DbRow[] = []
  dbSheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return
    const date = row.getCell(1).text?.trim()
    const employee = row.getCell(2).text?.trim()
    const hoursRaw = row.getCell(3).value
    const hours = typeof hoursRaw === 'number' ? hoursRaw : parseFloat(String(hoursRaw)) || 0
    if (date && employee) {
      rows.push({ date, employee, hours })
    }
  })

  if (rows.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Nessuna riga trovata in DB ALL' })
  }

  // Parse date strings DD/MM/YYYY
  interface ParsedRow extends DbRow { day: number; month: number; year: number }
  const parsed: ParsedRow[] = rows.map(r => {
    const [dd, mm, yyyy] = r.date.split('/')
    return { ...r, day: parseInt(dd), month: parseInt(mm), year: parseInt(yyyy) }
  })

  // Build new workbook — copy DB ALL sheet first
  const outWb = new ExcelJS.Workbook()
  outWb.creator = 'LUL Extractor'

  const outAll = outWb.addWorksheet('DB ALL')
  outAll.columns = [
    { header: 'Data',    key: 'date',     width: 14 },
    { header: 'Risorsa', key: 'employee', width: 32 },
    { header: 'Ore',     key: 'hours',    width: 10 },
  ]
  const hRow = outAll.getRow(1)
  hRow.font = { bold: true, name: 'Arial', size: 10 }
  hRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF5' } }
  outAll.views = [{ state: 'frozen', ySplit: 1 }]

  for (const r of rows) {
    outAll.addRow({ date: r.date, employee: r.employee, hours: r.hours })
  }

  // Employee pivot sheets
  const employees = [...new Set(parsed.map(r => r.employee))].sort()
  const allMonths = [...new Set(parsed.map(r => r.month))].sort((a, b) => a - b)

  for (const employee of employees) {
    const empRows = parsed.filter(r => r.employee === employee)
    const empMonths = [...new Set(empRows.map(r => r.month))].sort((a, b) => a - b)

    const sheetName = employee.length > 31 ? employee.substring(0, 31) : employee
    const ws = outWb.addWorksheet(sheetName)

    // Header
    const headerVals = ['Giorno', ...empMonths.map(m => MONTH_NAMES[m])]
    const hr = ws.addRow(headerVals)
    hr.font = { bold: true, name: 'Arial', size: 10 }
    hr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF5' } }
    hr.eachCell(cell => { cell.alignment = { horizontal: 'center' } })
    hr.height = 18

    ws.getColumn(1).width = 10
    empMonths.forEach((_, i) => { ws.getColumn(i + 2).width = 12 })

    // Lookup: month → day → hours
    const lookup = new Map<number, Map<number, number>>()
    for (const r of empRows) {
      if (!lookup.has(r.month)) lookup.set(r.month, new Map())
      lookup.get(r.month)!.set(r.day, r.hours)
    }

    // 31 day rows
    for (let day = 1; day <= 31; day++) {
      const vals: (number | string)[] = [day]
      for (const month of empMonths) {
        vals.push(lookup.get(month)?.get(day) ?? 0)
      }
      const dr = ws.addRow(vals)
      dr.font = { name: 'Arial', size: 10 }
      dr.getCell(1).font = { bold: true, name: 'Arial', size: 10 }
      dr.getCell(1).alignment = { horizontal: 'center' }
      for (let col = 2; col <= empMonths.length + 1; col++) {
        dr.getCell(col).alignment = { horizontal: 'center' }
        if (dr.getCell(col).value === 0) {
          dr.getCell(col).font = { name: 'Arial', size: 10, color: { argb: 'FFBBBBBB' } }
        }
      }
    }

    ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }]
  }

  const buffer = await outWb.xlsx.writeBuffer()
  const years = [...new Set(parsed.map(r => r.year))].sort().join('-')
  const filename = `LUL_Completo_${years}.xlsx`

  setResponseHeaders(event, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}"`,
  })

  return buffer
})
