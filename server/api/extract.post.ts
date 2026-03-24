import { extractFromPdf } from '../utils/claude'
import type { ExtractionResult } from '~/types'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.anthropicApiKey

  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'ANTHROPIC_API_KEY non configurata' })
  }

  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, statusMessage: 'Nessun dato ricevuto' })
  }

  const dailyColumnField = formData.find(f => f.name === 'dailyColumn')
  const summaryLabelField = formData.find(f => f.name === 'summaryLabel')

  const dailyColumn = dailyColumnField?.data?.toString().trim() || 'H Ord'
  const summaryLabel = summaryLabelField?.data?.toString().trim() || 'ORE ORDINARIE'

  const pdfFiles = formData.filter(
    f => f.name === 'files' && f.filename?.toLowerCase().endsWith('.pdf')
  )

  if (pdfFiles.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Nessun file PDF trovato' })
  }

  const allRows: ExtractionResult['rows'] = []
  const errors: string[] = []

  for (const file of pdfFiles) {
    const base64 = Buffer.from(file.data).toString('base64')
    const filename = file.filename ?? 'unknown.pdf'
    const result = await extractFromPdf(base64, dailyColumn, summaryLabel, filename, apiKey)
    if (result.error) {
      errors.push(result.error)
    } else {
      allRows.push(...result.rows)
    }
  }

  // Sort by employee → year → month → day
  allRows.sort((a, b) => {
    const name = a.employee.localeCompare(b.employee)
    if (name !== 0) return name
    if (a.year !== b.year) return a.year - b.year
    if (a.month !== b.month) return a.month - b.month
    return a.day - b.day
  })

  const uniqueEmployees = new Set(allRows.map(r => r.employee))
  const uniqueMonths = new Set(allRows.map(r => `${r.year}-${r.month}`))

  const result: ExtractionResult = {
    rows: allRows,
    errors,
    totalEmployees: uniqueEmployees.size,
    totalMonths: uniqueMonths.size,
  }

  return result
})
