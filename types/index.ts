export interface ExtractedRow {
  date: string;
  employee: string;
  hours: number;
  extraHours: number;
  sourceFile: string;
  month: number;
  year: number;
  day: number;
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

export interface CompanyConfig {
  id: string;
  name: string;
  vendorName: string;
  nameOrder: "surname_first" | "name_first";
  nameLocation: string;
  hoursFieldLabel: string;
  hoursFieldCode: string;
  dailyColumn: string;
  extraColumn: string;
  summaryLabel: string;
  outputTemplatePath: string;
}
