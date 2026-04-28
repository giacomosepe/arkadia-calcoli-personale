import { PDFDocument } from "pdf-lib";
import { extractFromPdf } from "../utils/claude";
import type { ExtractionResult, ExtractionWarning } from "~/types";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);

  const formData = await readMultipartFormData(event);
  if (!formData) {
    throw createError({ statusCode: 400, statusMessage: "Nessun dato ricevuto" });
  }

  const userApiKey = formData.find((f) => f.name === "apiKey")?.data?.toString().trim() || "";
  const anthropicKey = userApiKey || config.anthropicApiKey;

  if (!anthropicKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "ANTHROPIC_API_KEY non configurata e nessuna chiave fornita",
    });
  }

  const vendorName    = formData.find((f) => f.name === "vendorName")?.data?.toString().trim()    || "Italian LUL payroll document";
  const nameOrder     = (formData.find((f) => f.name === "nameOrder")?.data?.toString().trim()    || "surname_first") as "surname_first" | "name_first";
  const dailyColumn   = formData.find((f) => f.name === "dailyColumn")?.data?.toString().trim()   || "";
  const extraColumn   = formData.find((f) => f.name === "extraColumn")?.data?.toString().trim()   || "";
  const summaryLabel  = formData.find((f) => f.name === "summaryLabel")?.data?.toString().trim()  || "";

  if (!dailyColumn) {
    throw createError({ statusCode: 400, statusMessage: "Colonna ore è obbligatoria" });
  }

  const pdfFiles = formData.filter(
    (f) => f.name === "files" && f.filename?.toLowerCase().endsWith(".pdf"),
  );

  if (pdfFiles.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "Nessun file PDF trovato" });
  }

  const allRows: ExtractionResult["rows"] = [];
  const errors: string[] = [];
  const declaredTotals = new Map<string, number>();

  for (const file of pdfFiles) {
    const filename = file.filename ?? "unknown.pdf";

    const pdfDoc = await PDFDocument.load(file.data);
    const pageCount = pdfDoc.getPageCount();
    console.log(`${filename}: ${pageCount} pages`);

    for (let i = 0; i < pageCount; i++) {
      const singlePage = await PDFDocument.create();
      const [page] = await singlePage.copyPages(pdfDoc, [i]);
      singlePage.addPage(page);
      const pageBytes = await singlePage.save();
      const base64 = Buffer.from(pageBytes).toString("base64");

      const result = await extractFromPdf(
        base64,
        vendorName,
        nameOrder,
        dailyColumn,
        extraColumn,
        summaryLabel,
        `${filename} (pagina ${i + 1})`,
        anthropicKey,
      );

      if (result.error) {
        errors.push(result.error);
      } else {
        allRows.push(...result.rows);
        if (result.rows.length > 0 && result.declaredTotal !== undefined) {
          const r = result.rows[0];
          declaredTotals.set(`${r.employee}__${r.month}__${r.year}`, result.declaredTotal);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  allRows.sort((a, b) => {
    const name = a.employee.localeCompare(b.employee);
    if (name !== 0) return name;
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
  });

  // ── Verification ────────────────────────────────────────────────
  const warnings: ExtractionWarning[] = [];
  const actualTotals = new Map<string, { hours: number; employee: string; month: number; year: number }>();

  for (const row of allRows) {
    const key = `${row.employee}__${row.month}__${row.year}`;
    if (!actualTotals.has(key)) {
      actualTotals.set(key, { hours: 0, employee: row.employee, month: row.month, year: row.year });
    }
    actualTotals.get(key)!.hours += row.hours;
  }

  const monthNames = ["", "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

  for (const [key, actual] of actualTotals) {
    const declared = declaredTotals.get(key);
    if (declared === undefined || declared === 0) continue;
    const actualRounded = Math.round(actual.hours * 100) / 100;
    const diff = Math.abs(declared - actualRounded);
    if (diff > 0.1) {
      warnings.push({
        employee: actual.employee,
        month: actual.month,
        year: actual.year,
        declared,
        actual: actualRounded,
        diff: Math.round(diff * 100) / 100,
        label: `${actual.employee} — ${monthNames[actual.month]} ${actual.year}`,
      });
    }
  }

  return {
    rows: allRows,
    errors,
    warnings,
    totalEmployees: new Set(allRows.map((r) => r.employee)).size,
    totalMonths: new Set(allRows.map((r) => `${r.year}-${r.month}`)).size,
  } satisfies ExtractionResult;
});
