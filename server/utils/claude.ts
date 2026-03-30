import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedRow } from "~/types";

// ─── System prompt ─────────────────────────────────────────────────────────────
// Universal rules true for ALL LUL documents regardless of vendor or software.
// Never contains vendor-specific column names or layout descriptions.
// Eligible for Anthropic prompt caching — never changes between calls.
const SYSTEM_PROMPT = `You are a data extraction engine for Italian LUL (Libro Unico del Lavoro) payroll documents.
Each page contains exactly one employee's attendance record for one calendar month.
You will extract every row of the appropriate daily hours column as indicated in the Locate information instructions .
Return ONLY a valid JSON object. No explanation, no markdown, no prose.

Output format (always exactly this structure):
{"employee":"ROSSI MARIO","month":3,"year":2024,"declared_total":168.0,"days":[{"day":1,"hours":8.0}]}

Employee name rules:
- The instructions for this document will tell you where to find the name
- Always output as: SURNAME GIVENNAME — all caps, surname first, single space, no comma
- If the name appears as "Firstname Lastname" reverse it: "Andrea Albanese" → "ALBANESE ANDREA"
- If already "LASTNAME FIRSTNAME" keep it: "ALBANESE ANDREA" stays "ALBANESE ANDREA"
- Multi-word names: "BIANCHI ANNA MARIA" keep last name in front, if you can't tell the last name, then it stays as-is

Hours conversion (H:MM → decimal) — applies to ALL values including declared_total:
PDF will always display hours, they will be formatted as H:MM format (e.g. "8:00", "7:30", "4:45", "0:30", "0:00", "172:30") or in other formats (e.g. "168.0" or "168" or "8.30" or "8,30").
If a value has no colon and looks like a plain number (168 or 168.0) treat it as hours.

Once you read the hours, whatever the format is, you will convert them to decimal format: 8:00→8.0  7:30→7.5  4:45→4.75  0:30→0.5  0:00→0.0  172:30→172.5

Zero/empty rules:
- Cell empty, contains only "-" or "--", or contains a letter code or have a code have value = zero → hours: 0, omit from days array
- Omit ALL days where hours = 0 (weekends, holidays, absences)
- Monthly total not found or unreadable → declared_total: "not found"`;

// ─── User prompt ────────────────────────────────────────────────────────────────
// Built from company config. Describes this specific vendor's document layout.
// Variables:
//   vendorName       → human name of the payroll software/vendor (e.g. "Zucchetti")
//   nameLocation     → where/how to find the employee name in this format
//   dailyHoursColumn → exact column header for daily worked hours
//   totalHoursLabel  → exact label for the monthly total row in the summary section
function buildUserPrompt(
  vendorName: string,
  nameLocation: string,
  dailyHoursColumn: string,
  totalHoursLabel: string,
): string {
  return `This LUL page is from: ${vendorName}

Locate information instructions:
Employee name: ${nameLocation}

Daily hours — extract ONLY from the column with the title or Column header: "${dailyHoursColumn}"
- This column is inside the main "hours worked" section of the daily attendance table
- Do NOT read from any other column such as absence/justification columns (e.g. GIUSTIFICATIVI, ASSENZE, CODICE) even if the worked-hours cell is empty for that day
- If the worked-hours cell is empty or zero for a day → hours: 0, omit from output

Monthly total:
- Find the row or cell labelled "${totalHoursLabel}" in the summary/totals section at the bottom of the page
- Convert to decimal using the rules in the system prompt

Return ONLY the JSON. Nothing else.`;
}

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ClaudeDay {
  day: number;
  hours: number;
}

interface ClaudeResponse {
  employee: string;
  month: number;
  year: number;
  declared_total: number | "not found";
  days: ClaudeDay[];
}

// ─── Main extraction function ───────────────────────────────────────────────────
export async function extractFromPdf(
  pdfBase64: string,
  vendorName: string,
  nameLocation: string,
  dailyHoursColumn: string,
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
                  data: pdfBase64,
                },
              },
              {
                type: "text",
                text: buildUserPrompt(
                  vendorName,
                  nameLocation,
                  dailyHoursColumn,
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
        .map((d: ClaudeDay) => {
          const dd = String(d.day).padStart(2, "0");
          const mm = String(parsed.month).padStart(2, "0");
          return {
            date: `${dd}/${mm}/${parsed.year}`,
            employee: parsed.employee.trim(),
            hours: Math.round((d.hours ?? 0) * 10000) / 10000,
            sourceFile,
            month: parsed.month,
            year: parsed.year,
            day: d.day,
          };
        });

      return { rows, declaredTotal };
    } catch (err) {
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes("429") || err.message.includes("rate_limit"));

      // Transient errors (rate limit, 529 overload) get exponential backoff + jitter.
      // attempt 1 → ~30s, attempt 2 → ~60s, attempt 3 → ~90s — then gives up.
      const isTransient =
        isRateLimit ||
        (err instanceof Error &&
          (err.message.includes("529") || err.message.includes("overloaded")));

      if (isTransient && attempt < retries) {
        const baseSeconds = attempt * 30;
        const jitter = Math.floor(Math.random() * 10);
        const waitSeconds = baseSeconds + jitter;
        console.warn(
          `[${sourceFile}] Transient error (attempt ${attempt}/${retries}), retrying in ${waitSeconds}s…`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
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
