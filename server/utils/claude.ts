import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedRow } from "~/types";

const SYSTEM_PROMPT = `	You are a data extraction engine for Italian LUL (Libro Unico del Lavoro) payroll documents.
Each page contains exactly one employee's attendance record for one calendar month.
Return ONLY a valid JSON object. No explanation, no markdown, no prose.

OUTPUT FORMAT
{"employee":"ROSSI MARIO","month":3,"year":2024,"declared_total":168.0,"days":[{"day":1,"hours":8.0,"extra_hours":0.0}]}

RULES
1. EMPLOYEE NAME: output as SURNAME GIVENNAME, all caps, single space, no comma.
2. DAY COLUMN: find the column with day numbers (values 1–31). It can be labeled "GG", "giorno" or similarly. Days may be prefixed with S (Sabato) or D (Domenica) — e.g. "S5", "D12", or with a space like "S 2", "S 14" or "D 30". Extract only the number to identify the day of the month. Cells in the day column always end with a number. No exceptions. When you read "S" or "D" in the first column it means weekend.
3. ORDINARY HOURS: find the column labelled as instructed below. Valid values are numbers ≥ 0 and ≤ 8. Read only the value in that exact column. If the cell is empty, hours = 0. Expected it be the next column after the day column.
   COLUMN DISCIPLINE: never read a value from an adjacent column into ordinary hours nor ever combine columns. Expect to see one or more columns to the right. Even very tight. Seeing a number on the same row in a different column to the right is expected and correct. Ignore it entirely. It's not ORDINARY HOURS.
   Example: if ORDINARY HOURS is empty the value is zero, even if EXTRA HOURS cell has a value, any value, either a number like "3,50" or "6.00", or "7", or a letter like "I", "R", "NT", or any other character. ORDINARY HOURS cells empty = value is zero and output: "0", Never add hours like "8" or the value you read and are misled to think it's a ORDINARY HOURS value but it's not.
4. Other columns:
   - EXTRA HOURS: find the extra hours column as instructed below. Same rules as ordinary hours. If not configured or cell is empty → 0.
   - Other columns: e.g. "ALTRE" or "SPECIALE" can be ignored entirely. No value from any of these column should be read or recorded. If a value is present, ignore it and treat the column as empty. The only relevant values in any row are those in the ORDINARY HOURS and EXTRA HOURS columns.

5. HOURS FORMAT: Italian decimal comma means hours and minutes — 8,00→8.0 and 6,45→6.75 (45 minutes, NOT 6.45). Colon format: 7:30→7.5. Plain integer: 168→168.0.
6. DECLARED TOTAL: find the label as instructed below. The value may appear either:
   a) Next to the label as a number aligned under the label or next to it. It's got the shape a box often with a black border.
   b) The box is placed in a summary section at the bottom of the page, OR In the document header area above the daily table.
   If absent → "not found".
7. Omit days where both hours and extra_hours are 0.
8. If the day is a weekend ORDINARY HOURS is always zero.`;

function buildNameInstruction(
  nameOrder: "surname_first" | "name_first",
): string {
  if (nameOrder === "surname_first") {
    return `The name appears as SURNAME FIRSTNAME (e.g. "ROSSI MARIO"). Output as-is in all caps.`;
  }
  return `The name appears as FIRSTNAME SURNAME (e.g. "MARIO ROSSI"). Reverse to SURNAME FIRSTNAME (e.g. "ROSSI MARIO"). Output in all caps.`;
}

function buildPrompt(
  vendorName: string,
  nameOrder: "surname_first" | "name_first",
  dailyHoursColumn: string,
  extraHoursColumn: string,
  totalHoursLabel: string,
): string {
  const extraInstruction = extraHoursColumn
    ? `EXTRA HOURS COLUMN: "${extraHoursColumn}"`
    : `EXTRA HOURS COLUMN: not configured — use 0 for all days.`;

  const totalInstruction = totalHoursLabel
    ? `DECLARED TOTAL LABEL: "${totalHoursLabel}"`
    : `DECLARED TOTAL LABEL: not configured — set declared_total: "not found".`;

  const ignoreColumns = ['"GIUSTIFICATIVI"'];
  if (extraHoursColumn) ignoreColumns.push(`"${extraHoursColumn}"`);

  return `Document vendor: ${vendorName}

EMPLOYEE NAME: ${buildNameInstruction(nameOrder)}
ORDINARY HOURS COLUMN: "${dailyHoursColumn}"
${extraInstruction}
${totalInstruction}
IGNORE THESE COLUMNS ENTIRELY when reading ordinary hours — do not read any values from them: ${ignoreColumns.join(", ")}
`;
}

interface ClaudeDay {
  day: number;
  hours: number;
  extra_hours?: number;
}

interface ClaudeResponse {
  employee: string;
  month: number;
  year: number;
  declared_total: number | "not found";
  days: ClaudeDay[];
}

export async function extractFromPdf(
  base64Pdf: string,
  vendorName: string,
  nameOrder: "surname_first" | "name_first",
  dailyHoursColumn: string,
  extraHoursColumn: string,
  totalHoursLabel: string,
  sourceFile: string,
  apiKey: string,
  retries = 3,
): Promise<{ rows: ExtractedRow[]; declaredTotal?: number; error?: string }> {
  const client = new Anthropic({ apiKey });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64Pdf,
                },
              },
              {
                type: "text",
                text: buildPrompt(
                  vendorName,
                  nameOrder,
                  dailyHoursColumn,
                  extraHoursColumn,
                  totalHoursLabel,
                ),
              },
            ],
          },
        ],
      });

      const raw = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("")
        .trim();

      const clean = raw
        .replace(/^```[\w]*\n?/m, "")
        .replace(/\n?```$/m, "")
        .trim();

      console.log(`[claude] ${sourceFile}: ${clean.substring(0, 200)}`);

      const parsed: ClaudeResponse = JSON.parse(clean);

      if (
        typeof parsed.employee !== "string" ||
        typeof parsed.month !== "number" ||
        typeof parsed.year !== "number" ||
        !Array.isArray(parsed.days)
      ) {
        return {
          rows: [],
          error: `Risposta struttura non valida per ${sourceFile}`,
        };
      }

      const declaredTotal =
        typeof parsed.declared_total === "number"
          ? Math.round(parsed.declared_total * 10000) / 10000
          : undefined;

      const rows: ExtractedRow[] = parsed.days
        .filter((d) => typeof d.day === "number" && typeof d.hours === "number")
        .filter((d) => (d.hours ?? 0) > 0 || (d.extra_hours ?? 0) > 0)
        .map((d: ClaudeDay) => {
          const dd = String(d.day).padStart(2, "0");
          const mm = String(parsed.month).padStart(2, "0");
          return {
            date: `${dd}/${mm}/${parsed.year}`,
            employee: parsed.employee.trim(),
            hours: Math.round((d.hours ?? 0) * 10000) / 10000,
            extraHours: Math.round((d.extra_hours ?? 0) * 10000) / 10000,
            sourceFile,
            month: parsed.month,
            year: parsed.year,
            day: d.day,
          };
        });

      return { rows, declaredTotal };
    } catch (err) {
      const isTransient =
        err instanceof Error &&
        (err.message.includes("429") ||
          err.message.includes("rate_limit") ||
          err.message.includes("529") ||
          err.message.includes("overloaded"));

      if (isTransient && attempt < retries) {
        const wait = (attempt * 30 + Math.floor(Math.random() * 10)) * 1000;
        await new Promise((resolve) => setTimeout(resolve, wait));
        continue;
      }

      const msg = err instanceof Error ? err.message : String(err);
      return { rows: [], error: `Errore su ${sourceFile}: ${msg}` };
    }
  }

  return {
    rows: [],
    error: `Errore su ${sourceFile}: tutti i tentativi falliti`,
  };
}
