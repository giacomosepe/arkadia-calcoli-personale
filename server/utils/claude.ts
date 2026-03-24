import Anthropic from '@anthropic-ai/sdk'
import type { ExtractedRow } from '~/types'

const SYSTEM_PROMPT = `Sei un assistente specializzato nell'estrazione dati da buste paga italiane (LUL - Libro Unico del Lavoro).
Estrai i dati richiesti e rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza testo aggiuntivo, senza markdown, senza backtick.`

function buildUserPrompt(dailyColumn: string, summaryLabel: string): string {
  return `Questo è un documento LUL (Libro Unico del Lavoro) italiano - sezione presenze mensili.

Estrai le seguenti informazioni:
1. Nome completo del dipendente (campo "Cognome e Nome")
2. Mese (numero 1-12) e anno del documento
3. Per OGNI giorno del mese (dal giorno 1 all'ultimo giorno del mese): il giorno e le ore lavorate

Le ore giornaliere si trovano nella colonna "${dailyColumn}" della tabella GIORNO.
Nel riepilogo VOCI il campo corrispondente è etichettato: "${summaryLabel}".

REGOLE IMPORTANTI:
- Includi TUTTI i giorni dal 1 all'ultimo giorno del mese, nessuno escluso
- Per sabati, domeniche, festivi e giorni con "--": inserisci hours: 0
- I festivi nazionali italiani (1 gen, 6 gen, 25 apr, 1 mag, 2 giu, 15 ago, 1 nov, 8 dic, 25 dic, 26 dic) contano come hours: 0
- Le ore sono nel formato H:MM (es. "8:00" = 8.0, "4:45" = 4.75)
- Converti sempre in numero decimale
- Se un giorno non compare nel documento inserisci hours: 0

Rispondi con questo JSON esatto, nient'altro:
{
  "employee": "COGNOME NOME",
  "month": 1,
  "year": 2023,
  "days": [
    { "day": 1, "hours": 0 },
    { "day": 2, "hours": 8.0 },
    { "day": 3, "hours": 8.0 }
  ]
}`
}

export async function extractFromPdf(
  pdfBase64: string,
  dailyColumn: string,
  summaryLabel: string,
  sourceFile: string,
  apiKey: string
): Promise<{ rows: ExtractedRow[]; error?: string }> {
  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: buildUserPrompt(dailyColumn, summaryLabel),
            },
          ],
        },
      ],
    })

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(clean)

    if (!parsed.employee || !parsed.month || !parsed.year || !Array.isArray(parsed.days)) {
      return { rows: [], error: `Risposta inattesa per ${sourceFile}` }
    }

    const rows: ExtractedRow[] = parsed.days.map((d: { day: number; hours: number }) => {
      const dd = String(d.day).padStart(2, '0')
      const mm = String(parsed.month).padStart(2, '0')
      return {
        date: `${dd}/${mm}/${parsed.year}`,
        employee: parsed.employee.trim(),
        hours: Math.round((d.hours ?? 0) * 10000) / 10000,
        sourceFile,
        month: parsed.month,
        year: parsed.year,
        day: d.day,
      }
    })

    return { rows }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { rows: [], error: `Errore su ${sourceFile}: ${msg}` }
  }
}
