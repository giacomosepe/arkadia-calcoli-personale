# LUL Extractor — Project Brief

## Conversation history
This project was designed and evolved across these Claude.ai conversations:
- Original build: https://claude.ai/chat/ff965a17-c8cd-4140-a64d-baab61bc1f38
- Prompt engineering + architecture refinement: https://claude.ai/share/60303975-a198-4802-bc57-3d32339d433f


Read both before making changes. The second conversation contains all prompt design decisions,
the reasoning behind the two-prompt split, the JSON schema derivation from the Excel template,
and the HH:MM output decision.

---

## What this is

A Nuxt 3 + Vue 3 web app used by a small internal team (3 people) to:
1. Extract daily worked hours from Italian payroll PDFs (LUL — Libro Unico del Lavoro) using the Claude API
2. Export the data to Excel — a flat DB ALL sheet and one pivot sheet per employee

---

## Tech stack

- **Nuxt 3** + **Vue 3** + **TypeScript**
- **Anthropic SDK** — `claude-sonnet-4-5-20250929` (always pin the full model string)
- **pdf-lib** — splits multi-page PDFs into single pages before sending to Claude
- **ExcelJS** — generates all Excel output, no AI involved
- **Clerk** — authentication (invite-only, Restricted Mode, no self-signup)
- **Tailwind CSS** — homepage only
- **Custom CSS design system** — `assets/css/main.css`, CSS variables, all app pages
- **Vercel** — deployment (nitro preset)

---

## Folder structure

```
app.vue                        ← root entry (NuxtLayout + NuxtPage)
layouts/
  app.vue                      ← shell for all /app/* pages
components/
  AppNav.vue                   ← single nav, switches between HomeMenu/AppMenu
  HomeMenu.vue                 ← homepage nav (logo + Login/Dashboard)
  AppMenu.vue                  ← app nav (Estrai ore, Risultati, Schede dipendenti)
pages/
  index.vue                    ← homepage (public, Tailwind, Clerk-aware)
  app/
    index.vue                  ← Extract tab — upload PDFs, enter config, run extraction
    results.vue                ← Results preview + verification warnings + download
    pivot.vue                  ← Schede dipendenti — upload DB ALL, regenerate sheets
    config.vue                 ← Reference page for LUL field codes
server/
  api/
    extract.post.ts            ← splits PDFs, calls Claude once per page, verifies totals
    export.post.ts             ← rows[] → DB ALL sheet + employee pivot sheets (.xlsx)
    pivot.post.ts              ← uploaded DB ALL .xlsx → regenerate employee sheets only
    check-config.get.ts        ← checks ANTHROPIC_API_KEY is set
    companies.get.ts           ← serves config/companies.json (legacy, not used in UI)
  utils/
    claude.ts                  ← SYSTEM_PROMPT + buildUserPrompt() + Anthropic API call
assets/css/main.css            ← full design system, CSS variables
types/index.ts                 ← shared TypeScript types
config/companies.json          ← company configs (legacy, Supabase migration planned)
middleware/
  auth.global.ts               ← protects all /app/* routes via Clerk
```

---

## Routes

```
/              → homepage (public)
/app           → Extract tab (protected)
/app/results   → Results + download (protected)
/app/pivot     → Schede dipendenti — sheet regeneration (protected)
/app/config    → Field code reference (protected)
```

---

## Environment variables

```
ANTHROPIC_API_KEY       ← Anthropic API key
CLERK_PUBLISHABLE_KEY   ← pk_live_... for production, pk_test_... for localhost
CLERK_SECRET_KEY        ← sk_live_... for production
```

---

## The three server operations

Understanding which file does what is critical. There are three distinct operations:

### 1. `extract.post.ts` — Step 1, uses AI
Receives uploaded PDF files and two config values from the user.
Splits each PDF into individual pages using pdf-lib.
Calls `claude.ts` once per page → one JSON record per page.
Verifies: sums extracted daily hours vs declared monthly total, flags discrepancies > 0.1h.
Returns rows[] + warnings[] to the frontend (stored in sessionStorage).

### 2. `export.post.ts` — Step 2, no AI
Receives rows[] from sessionStorage (the normal download path).
Builds a complete .xlsx with:
  - Sheet 1: DB ALL (flat, all employees)
  - Sheets 2–N: one pivot sheet per employee
This is the primary download — runs immediately after extraction.

### 3. `pivot.post.ts` — Step 2 alternative, no AI
Receives an already-exported DB ALL .xlsx uploaded by the user.
Re-reads its rows and regenerates all employee pivot sheets.
Use case: user reviewed/edited the DB ALL file manually and needs fresh sheets
without re-running the expensive extraction. Also useful if extraction partially
failed and was patched by hand.

**Key distinction**: `export.post.ts` takes rows from memory. `pivot.post.ts` takes
rows from a file. Both produce identical output — DB ALL + employee pivot sheets.

---

## Extraction flow (step by step)

1. User uploads PDFs (one per employee per month, or one per month per employee)
2. User enters two required config fields:
   - **Colonna ore giornaliere** (`dailyHoursColumn`) — column header in the table (e.g. `H Ord`)
   - **Totale ore mensili** (`totalHoursLabel`) — label for the monthly total in the summary section (e.g. `ORE ORDINARIE`)
3. User clicks "Avvia estrazione" → confirmation modal shows files + config
4. User confirms → server splits each PDF into single pages via pdf-lib
5. Each page sent to Claude separately (1 page = 1 employee-month)
6. Claude returns structured JSON (see prompt section below)
7. Server verifies: sum(extracted days) vs declared_total, flags if diff > 0.1h
8. Results page shows data + any warnings
9. Warnings must each be acknowledged (checkbox) before download is enabled
10. Download calls export.post.ts → returns .xlsx

---

## The Claude prompt (`server/utils/claude.ts`)

> ⚠️ **DO NOT EDIT THE PROMPTS IN `claude.ts` WITHOUT EXPLICIT OWNER APPROVAL**
> This applies to both Claude.ai and Claude Code.
> The prompts in `SYSTEM_PROMPT` and `buildUserPrompt()` have been carefully tuned
> through live testing against real payroll PDFs. Any change — even one that looks
> like an improvement — can silently break extraction accuracy across all document
> formats. Before touching anything in these prompts, ask the project owner first
> and describe exactly what you intend to change and why.
> The only exception is adding a new example to illustrate an existing rule
> (e.g. a new HH:MM conversion example), and even then — ask first.

### Design principles (important — read before editing)

The prompt is split into two parts for a deliberate reason:

**SYSTEM_PROMPT** — stable behavioral contract, never changes between calls.
Contains: role definition, name normalisation rules, hours conversion examples,
failure case rules. Eligible for Anthropic prompt caching (billed at 0.1× on cache hits).
Never put variables here.

**buildUserPrompt(dailyHoursColumn, totalHoursLabel)** — per-call instruction.
Contains only: what columns/labels to look for (the two variables), and the
JSON schema example. Everything else lives in the system prompt.

Rule: if it's true for every extraction → system prompt. If it changes per call → user prompt.

### Prompt design decisions (do not revert without good reason)

**Only return days with hours > 0** — Claude omits zero-hour days (weekends, holidays).
The ExcelJS code fills missing days with 0 via `lookup.get(month)?.get(day) ?? 0`.
This reduces response tokens and eliminates a whole class of misread errors.

**Employee name normalisation** — always output as SURNAME GIVENNAME, all caps,
surname first, single space, no comma. Handles both "Cognome e Nome" and
"Nome e Cognome" field orderings. This ensures consistent keys across the DB.

**Hours as decimal in JSON** — Claude returns 8.75, not "8:45".
Decimal is used for summing (verification) and stored in DB ALL.
HH:MM conversion happens in export.post.ts and pivot.post.ts, not in the prompt.

**declared_total: "not found"** if the monthly total label isn't found.
Never guess a number. The server treats "not found" as undefined and skips
the verification check for that employee-month.

**Five conversion examples, not one rule** — pattern matching beats formula
application for reliability:
`8:00→8.0  7:30→7.5  4:45→4.75  0:30→0.5  0:00→0.0`

**Model string is pinned** — always `claude-sonnet-4-5-20250929`, never the
alias `claude-sonnet-4-5`. Aliases can silently change.

**max_tokens: 2048** — Claude returns only worked days (typically 20–22 per month).
Response is under 400 tokens in practice. 2048 is safe headroom without waste.

### Current prompts (source of truth is claude.ts — these are for reference)

```
SYSTEM_PROMPT extract from file /utils/claude.ts : 
You are a data extraction engine for Italian LUL (Libro Unico del Lavoro) payroll documents.
Each page contains exactly one employee's attendance record for one calendar month.
You will extract every row of the appropriate daily hours column as indicated in the Locate information instructions .
Return ONLY a valid JSON object. No explanation, no markdown, no prose.

- The instructions for this document will tell you where to find the name
- Always output as: SURNAME GIVENNAME — all caps, surname first, single space, no comma
- If the name appears as "Firstname Lastname" reverse it: "Andrea Albanese" → "ALBANESE ANDREA"
- If already "LASTNAME FIRSTNAME" keep it: "ALBANESE ANDREA" stays "ALBANESE ANDREA"
- Multi-word names: "BIANCHI ANNA MARIA" keep last name in front, if you can't tell the last name, then it stays as-is
- 
Hours conversion (H:MM → decimal) — applies to ALL values including declared_total:
PDF will always display hours, they will be formatted as H:MM format (e.g. "8:00", "7:30", "4:45", "0:30", "0:00", "172:30") or in other formats (e.g. "168.0" or "168" or "8.30" or "8,30").
If a value has no colon and looks like a plain number (168 or 168.0) treat it as hours.

Zero/empty rules:
- Cell empty, contains only "-" or "--", or contains a letter code or have a code have value = zero → hours: 0, omit from days array
- Omit ALL days where hours = 0 (weekends, holidays, absences)
- Monthly total not found or unreadable → declared_total: "not found"`;
```

```
buildUserPrompt(dailyHoursColumn, totalHoursLabel):
Extract from this LUL page:
Locate information instructions:
Employee name: ${buildNameInstruction(nameOrder)}

Daily hours — extract ONLY from the "${dailyHoursColumn}" column indicated by user in the prompt through variables dynamic prompt:
- This is the numeric sub-column inside the section of the attendance table. Only take the value from the column identified by the set label
- A valid value is a BARE NUMBER only (e.g. "8,00" or "6:45", or 8.30) with NO letter code before or after it on the same cell
- If a row shows a letter code before number (e.g. "MA 8,00", "FE 8,00", "RL 2,00", "ST 0,30") that is a different entry — IGNORE IT entirely, even if it appears in a position that looks like the appropriate column
- Do NOT read any other column that is not the appropriate column indeicated by user in the prompt input.


Monthly total:
- Find the row or cell labelled by the user through the prompt variable, in the summary/totals section typically at the bottom of the page
- Convert to decimal using the rules in the system prompt

Return ONLY the JSON. Nothing else:
{"employee":"ROSSI MARIO","month":3,"year":2024,"declared_total":168.0,"days":[{"day":1,"hours":8.0},{"day":3,"hours":7.5},{"day":4,"hours":4.75}]}
```

---

## Excel output

### DB ALL sheet (5 columns — matches template.xlsx)

| Data       | Risorsa      | Ore  | Giorno | Mese |
|------------|--------------|------|--------|------|
| DD/MM/YYYY | ROSSI MARIO  | 8.75 | 1      | 3    |

- All employees, only worked days (hours > 0), sorted by employee → year → month → day
- `Ore` is decimal throughout — used for verification sums and downstream math
- `Giorno` and `Mese` are explicit columns — pivot logic reads them directly, no date parsing needed

### Employee pivot sheets (one per employee)

- Rows: days 1–31
- Columns: `Giorno` + one column per month present in the data (only months with data)
- Values: HH:MM strings (e.g. "8:45", "7:30", "0:00")
- Zero-hour cells: shown in grey
- Both axes frozen (xSplit: 1, ySplit: 1)
- Sheet name = employee name, max 31 chars (Excel limit), truncated if needed

### Hours format rule

DB ALL stores **decimal** (8.75). Employee sheets display **HH:MM** ("8:45").
The `decimalToHHMM()` helper lives in both export.post.ts and pivot.post.ts.
Never store HH:MM in DB ALL — it breaks summing and verification.

```typescript
function decimalToHHMM(decimal: number): string {
  if (!decimal || decimal <= 0) return "0:00";
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  if (m === 60) return `${h + 1}:00`; // floating point edge case
  return `${h}:${String(m).padStart(2, "0")}`;
}
```

---

## Verification logic (in extract.post.ts)

After all pages are processed, for each employee+month:
- Sum all extracted daily hours
- Compare to `declared_total` from Claude
- If `declared_total` is "not found" → skip check
- If `|sum - declared_total| > 0.1` → push a warning
- Warnings are shown on results page, each must be acknowledged before download

Tolerance is 0.1h (6 minutes) to absorb rounding from H:MM conversion.

---

## Rate limiting (in claude.ts)

- 2 second delay between each page/API call (`setTimeout 2000`)
- On 429: wait `attempt × 60` seconds, retry up to 3 times
- Free Anthropic tier hits limits easily — use a paid account for production runs

---

## Authentication (Clerk)

- Invite-only, Restricted Mode enabled in Clerk dashboard
- No self-signup flow
- Homepage (`/`) is public
- All `/app/*` routes protected by `middleware/auth.global.ts`
- To invite: Clerk dashboard → Invitations → New invitation → enter email
- Dev keys (`pk_test_`) work on localhost only
- Production requires `pk_live_` keys and a custom domain (Vercel's `*.vercel.app` cannot be added to Clerk production)

---

## Design system

Custom CSS variables in `assets/css/main.css`. Tailwind is only used on the homepage and references these same variables.

```css
--c-accent: #1A4FCC
--c-bg: #F7F6F3
--c-surface: #FFFFFF
--c-text-primary: #1A1916
--c-text-secondary: #6B6860
--c-danger: #C0392B
--c-warning: #A05C00
--c-success: #1A7A4A
--font-sans: 'DM Sans'
--font-mono: 'DM Mono'
```

Layout: `.header` full-width background, `.site-container` (max 1100px, centered) constrains content.
`.page-content` handles vertical padding only. `.two-col` collapses to single column at 768px.

---

## Known issues / watch out for

- `useRuntimeConfig()` must receive `event` in server routes: `useRuntimeConfig(event)`
- ExcelJS sheet names max 31 chars — employee names are truncated if longer
- pdf-lib page splitting is required — sending a multi-page PDF as one document breaks per-employee-month extraction
- Floating point: `Math.round(hours * 10000) / 10000` throughout to avoid 8.750000000001 type drift
- `decimalToHHMM`: guard the `m === 60` edge case or you get "8:60"

---

## What is NOT built yet (planned)

### Supabase migration
Currently company configs live in `config/companies.json`. Planned schema:
- `companies` — company identity
- `pdf_field_configs` — dailyHoursColumn + totalHoursLabel per company
- `programmi` — Patent Box, Credito R&S etc, each with own Excel template in Storage
- `company_programmi` — many-to-many bridge
- `extractions` — audit log per run
- `extraction_rows` — one row per employee per day

### Part 2 — R&D hour allocation
- User inputs a % of hours allocated to a specific R&D project
- System distributes allocated hours across actual worked days (hours > 0) using a randomised spread
- Zero-hour days in DB ALL serve as the exclusion mask for this distribution
- Output: allocated hours per employee per day, linked to the project
