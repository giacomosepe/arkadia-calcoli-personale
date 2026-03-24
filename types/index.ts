export interface ExtractedRow {
  date: string        // DD/MM/YYYY
  employee: string
  hours: number       // decimal, 0 for non-working days
  sourceFile: string
  month: number       // 1-12
  year: number
  day: number         // 1-31
}

export interface ExtractionResult {
  rows: ExtractedRow[]
  errors: string[]
  totalEmployees: number
  totalMonths: number
}

export interface ExportRequest {
  rows: ExtractedRow[]
}

export interface PivotRequest {
  // sent as multipart — DB ALL xlsx uploaded as file
}
