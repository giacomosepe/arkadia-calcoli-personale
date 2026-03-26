import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedRow } from "~/types";

// ─── System prompt ────────────────────────────────────────────────────────────
// Stable behavioral contract. Never changes between calls → eligible for
// Anthropic prompt caching once you enable it.
// Rule of thumb: anything true for EVERY extraction lives here.
const SYSTEM_PROMPT = `You are a data extraction engine for Italian LUL payroll documents.
Each page you receive contains exactly one employee's attendance record for exactly one calendar month.
Return ONLY a valid JSON object. No explanation, no markdown, no prose.

Employee name rules:
- Find the field containing surname and given name (may be labelled "Cognome e Nome" or "Nome e Cognome")
- Always output as: SURNAME GIVENNAME — all caps, surname first, single space, no comma
- Examples: "Mario Rossi" → "ROSSI MARIO" | "BIANCHI ANNA MARIA" → "BIANCHI ANNA MARIA"

Hours conversion (H:MM → decimal):
8:00→8.0  7:30→7.5  4:45→4.75  0:30→0.5  0:00→0.0

Failure rules:
- Daily hours cell empty, missing, or is a letter or is a value different from a number like for example: "-", "--" → hours: 0
- Monthly total not found or unreadable → declared_total: "not found"`;

// ─── User prompt ──────────────────────────────────────────────────────────────
// Only the two variables change per call. Everything else is stable.
// dailyHoursColumn  → the column header for daily worked hours (e.g. "H Ord")
// totalHoursLabel   → the label for the monthly total in the summary (e.g. "ORE ORDINARIE")
function buildUserPrompt(
  dailyHoursColumn: string,
  totalHoursLabel: string,
): string {
  return `Extract from this LUL page:

- Employee name (see system rules for formatting)
- Month (1–12) and year
- Daily hours: column "${dailyHoursColumn}" in the GIORNO attendance table
- Monthly total: label "${totalHoursLabel}" in the hours summary section

Only include days where hours > 0. Zero-hour days (weekends, holidays, absences) are omitted.

Return this exact JSON — nothing else:
{"employee":"ROSSI MARIO","month":3,"year":2024,"declared_total":168.0,"days":[{"day":1,"hours":8.0},{"day":3,"hours":7.5},{"day":4,"hours":4.75}]}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Main extraction function ─────────────────────────────────────────────────
export async function extractFromPdf(
  pdfBase64: string,
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
        max_tokens: 2048, // 31 days × compact JSON ≈ 600 tokens max; 2048 is safe headroom
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
                text: buildUserPrompt(dailyHoursColumn, totalHoursLabel),
              },
            ],
          },
        ],
      });

      // Extract raw text from response
      const raw = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("")
        .trim();

      // Strip any accidental markdown fences (defensive — prompt says not to use them)
      const clean = raw
        .replace(/^```[\w]*\n?/m, "")
        .replace(/\n?```$/m, "")
        .trim();

      const parsed: ClaudeResponse = JSON.parse(clean);

      // Validate required fields
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

      // Parse declared_total — "not found" becomes undefined, numbers are kept
      const declaredTotal =
        typeof parsed.declared_total === "number"
          ? Math.round(parsed.declared_total * 10000) / 10000
          : undefined;

      // Map Claude's day array → ExtractedRow array
      // Note: we derive the date string from day+month+year here, not in the prompt
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

      if (isRateLimit && attempt < retries) {
        const waitSeconds = attempt * 60;
        console.log(
          `Rate limit on ${sourceFile}, attempt ${attempt}/${retries}. Waiting ${waitSeconds}s…`,
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
