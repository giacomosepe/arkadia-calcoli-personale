export interface ExtractedRow {
  date: string;
  employee: string;
  hours: number;
  sourceFile: string;
  month: number;
  year: number;
  day: number;
  declaredTotal?: number;
}

export interface ExtractionWarning {
  employee: string;
  month: number;
  year: number;
  declared: number;
  actual: number;
  diff: number;
  label: string;
}

export interface ExtractionResult {
  rows: ExtractedRow[];
  errors: string[];
  warnings: ExtractionWarning[];
  totalEmployees: number;
  totalMonths: number;
}

export interface ExportRequest {
  rows: ExtractedRow[];
}
