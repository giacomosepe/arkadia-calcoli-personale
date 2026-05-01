# LUL Extractor — Codebase Map
> Last updated: 2026-05-01 (pre Part 1 refactor — no issues merged yet)
> Purpose: index of what exists and its current state. Instructions for what to change live in Linear issue spec documents and CLAUDE.md.

---

## Reference docs

| File | What it contains |
|---|---|
| `CLAUDE.md` | Project brief, tech stack, folder structure, route list, extraction flow, prompt design decisions, Excel output spec, verification logic, auth setup, design system variables. **Read before touching any server file or prompt.** |
| `codebase-map.md` | This file. |
| `README.md` | Minimal project readme, not maintained as a reference. |

---

## Directory structure

```
lul-extractor/
├── app.vue                  ← root entry (NuxtLayout + NuxtPage)
├── assets/css/main.css      ← full custom design system, CSS variables
├── components/              ← shared UI components (nav only currently)
├── composables/             ← client-side state and tracking
├── config/                  ← legacy company configs (JSON, not yet in DB)
├── layouts/                 ← app shell layout
├── middleware/              ← Clerk auth guard
├── pages/
│   ├── index.vue            ← public homepage (Tailwind)
│   └── app/                 ← protected app pages
├── plugins/                 ← Nuxt plugins (PostHog)
├── public/                  ← static assets and Excel template
├── server/
│   ├── api/                 ← Nitro route handlers
│   └── utils/               ← server-side utilities (Claude, Excel — partial)
├── types/                   ← shared TypeScript interfaces
└── utils/                   ← shared client+server utilities (formatting)
```

---

## Key files — current state

### `pages/app/index.vue` — ~380 lines
The extraction page. Handles PDF upload, config inputs, confirmation modal, and the API call to `/api/extract`.
Pending changes: ENGNEER-280 (extract modal), ENGNEER-279 (replace sessionStorage direct access), ENGNEER-278 (type useTracking calls), ENGNEER-289 (add extraction_failed event).
- `confirmExtraction()` — calls `trackExtractionStarted`, POSTs to `/api/extract`, writes result to sessionStorage, navigates to `/app/results`
- `handleRunClick()` — validates form, opens modal
- `formatSize(b: number)` — duplicated from `pivot.vue`, pending move to `utils/format.ts` (ENGNEER-284)
- Modal block starts at `<!-- ── Confirmation Modal ──` comment (~line 248 of template)

### `pages/app/results.vue` — ~430 lines
Results preview, inline editing, discrepancy panel, and Excel download trigger.
Pending changes: ENGNEER-281 (extract ResultsTable), ENGNEER-282 (extract ExportButton), ENGNEER-279 (replace sessionStorage direct access).
- Reads result from `sessionStorage.getItem('lul_result')` in `onMounted` — raw JSON.parse, no type safety
- `downloadExcel()` — POSTs rows to `/api/export`, triggers file download, calls `trackResultExported`
- `persist()` — writes current result back to sessionStorage, triggers save toast
- `filteredRows`, `groupedRows` — computed from inline filter state
- `editedRows: Set<string>`, `declaredOverrides: Map<string, number>` — inline edit state

### `pages/app/pivot.vue` — ~230 lines
Upload DB ALL Excel, preview contents, regenerate employee pivot sheets via `/api/pivot`.
- Self-contained: no shared state with other pages
- `formatSize(b: number)` — duplicated from `index.vue`, pending move to `utils/format.ts` (ENGNEER-284)
- `setFile(f)` — reads workbook client-side via ExcelJS for preview before upload

### `pages/app/config.vue`
Reference page listing LUL field codes. Read-only, no logic.

### `composables/useTracking.ts` — ~30 lines
PostHog event wrapper. All analytics calls go through here.
Pending changes: ENGNEER-278 (add TS types), ENGNEER-289 (add trackExtractionFailed).
- `trackExtractionStarted(documentId, documentName)` — fires on modal confirm, before API call
- `trackExtractionCompleted(documentId, documentName, durationMs)` — fires after API returns rows
- `trackResultExported(documentId)` — fires after Excel download
- Parameters currently untyped (`any`) — ENGNEER-278 pending
- Uses `$posthog` from `useNuxtApp()` — client-side only, cannot be called in server routes

### `composables/useExtractionStore.ts`
Does not exist yet. Planned in ENGNEER-279.

### `plugins/posthog.client.js` — ~20 lines
Initialises PostHog, opts out in DEV, registers `$pageview` on route change, provides `$posthog` via `useNuxtApp()`.
- Client-side only (`.client.js` suffix)
- `$posthog` is injected as `() => posthog` — callers must invoke it: `$posthog().capture(...)`
- Currently plain JS, no TypeScript — pending conversion (ENGNEER-290, not yet created)

### `server/utils/claude.ts` — ~130 lines
**Do not modify without explicit owner approval. See CLAUDE.md.**
- `extractFromPdf(base64Pdf, vendorName, nameOrder, dailyHoursColumn, extraHoursColumn, totalHoursLabel, sourceFile, apiKey, retries)` → `{ rows: ExtractedRow[], declaredTotal?: number, error?: string }`
- `SYSTEM_PROMPT` — stable contract, eligible for prompt caching, never put variables here
- `buildPrompt(...)` — per-call user prompt, assembles the variable fields
- Model pinned to `claude-sonnet-4-5-20250929` — never use the alias
- Rate limiting: 2s delay between pages; 429/529: waits `attempt * 30 + random(10)` seconds, retries up to 3 times

### `server/api/extract.post.ts` — ~100 lines
Receives multipart form data, splits PDFs via pdf-lib, calls `extractFromPdf` once per page, runs verification (sum vs declared total, tolerance 0.1h), returns `ExtractionResult`.
- Reads: `vendorName`, `nameOrder`, `dailyColumn`, `extraColumn`, `summaryLabel`, `apiKey`, `files[]` from formData
- 2s `setTimeout` delay between each page call (rate limiting)
- Verification key format: `${employee}__${month}__${year}`

### `server/api/export.post.ts` — ~140 lines
Receives `{ rows: ExtractedRow[] }`, builds DB ALL sheet + employee pivot sheets, returns `.xlsx` buffer.
Pending changes: ENGNEER-285 (move shared helpers to excel.ts), ENGNEER-287 (move pivot builder to excel.ts).
- No AI involved
- Pivot cells use `toExcelDuration()` + `numFmt '[h]:mm'` — cells are summable in Excel
- Imports `toExcelDuration`, `EXCEL_DURATION_FORMAT` from `~/utils/format`
- `applyHeaderStyle`, `applyTotalStyle`, `MONTH_NAMES` defined locally — duplicated in `pivot.post.ts`

### `server/api/pivot.post.ts` — ~180 lines
Receives uploaded DB ALL `.xlsx`, re-reads rows, regenerates employee pivot sheets. Use case: user edited the DB ALL file manually and wants fresh sheets without re-running extraction.
Pending changes: ENGNEER-285, ENGNEER-286 (replace decimalToHHMM), ENGNEER-287.
- `decimalToHHMM(decimal)` defined locally — functionally identical to `toHHMM` in `utils/format.ts` (ENGNEER-286 pending)
- Pivot cells use HH:MM strings (not Excel duration fractions) — intentional difference from `export.post.ts`
- `applyHeaderStyle`, `applyTotalStyle`, `MONTH_NAMES` defined locally — duplicated from `export.post.ts`
- Reads columns from DB ALL: 1=Data, 2=Risorsa, 3=Ore, 4=Giorno, 5=Mese

### `server/api/check-config.get.ts`
Returns `{ hasAnthropicKey: boolean }`. Read by `index.vue` to show the API key status badge.

### `server/api/companies.get.ts`
Serves `config/companies.json`. Not used by the current UI — legacy endpoint.
Pending changes: ENGNEER-288 (add runtime validation).

### `server/utils/excel.ts`
Does not exist yet. Planned in ENGNEER-285 (shared helpers) and ENGNEER-287 (pivot builder).

### `utils/format.ts` — ~35 lines
Shared formatting utilities, used by both client and server.
Pending changes: ENGNEER-284 (add formatSize), ENGNEER-286 (pivot.post.ts will import toHHMM from here).
- `toHHMM(decimal: number): string` — decimal hours → "H:MM" display string. e.g. 8.5 → "8:30"
- `toExcelDuration(decimal: number): number` — decimal hours → Excel serial fraction (divide by 24)
- `EXCEL_DURATION_FORMAT: string` — `"[h]:mm"`, apply as `numFmt` on ExcelJS cells

### `types/index.ts` — ~40 lines
All shared TypeScript interfaces. See Types section below.
Pending changes: ENGNEER-288 may update `CompanyConfig`.

### `config/companies.json`
Two company config entries. Currently has field drift from `CompanyConfig` type — `straorColumn` (should be `extraColumn`), missing `nameOrder` on one entry.
Pending changes: ENGNEER-288 (align to type, add validation).

### `middleware/auth.ts`
Clerk auth guard. Protects all `/app/*` routes. No logic to change.

### `components/Navbar.vue`, `AppMenu.vue`, `HomeMenu.vue`, `LulExtractorLogo.vue`
Navigation components. Not in current sprint scope.

### `layouts/app.vue`
App shell. Sets `--header-h` CSS variable used by sticky header in `results.vue`.

---

## Types

```typescript
// types/index.ts

interface ExtractedRow {
  date: string;        // "DD/MM/YYYY"
  employee: string;    // "SURNAME FIRSTNAME" all caps
  hours: number;       // decimal, e.g. 8.75
  extraHours: number;  // decimal, 0 if absent
  sourceFile: string;  // "filename.pdf (pagina N)"
  month: number;       // 1–12
  year: number;
  day: number;         // 1–31
}

interface ExtractionWarning {
  employee: string;
  month: number;
  year: number;
  declared: number;    // from Claude's declared_total
  actual: number;      // sum of extracted daily hours
  diff: number;        // abs(declared - actual)
  label: string;       // "EMPLOYEE — Month YEAR" display string
}

interface ExtractionResult {
  rows: ExtractedRow[];
  errors: string[];
  warnings: ExtractionWarning[];
  totalEmployees: number;
  totalMonths: number;
}

interface ExportRequest {
  rows: ExtractedRow[];
}

interface CompanyConfig {
  id: string;
  name: string;
  vendorName: string;
  nameLocation: string;
  hoursFieldLabel: string;
  hoursFieldCode: string;
  dailyColumn: string;
  summaryLabel: string;
  outputTemplatePath: string;
  // Note: nameOrder and extraColumn exist in companies.json but not yet in this type — ENGNEER-288 pending
}
```

---

## Known quirks

- **`useRuntimeConfig()` in server routes** must receive `event`: `useRuntimeConfig(event)`. Without it, env vars are not available in Nitro.
- **ExcelJS sheet names** max 31 chars — employee names are truncated with `.substring(0, 31)`.
- **Floating point** — all hour values use `Math.round(value * 10000) / 10000` throughout to prevent 8.750000000001-style drift.
- **PostHog in DEV** — `posthog.client.js` calls `ph.opt_out_capturing()` in development. Events will not appear in PostHog when running locally.
- **`$posthog` call pattern** — the plugin provides `$posthog: () => posthog`. Callers must invoke it as a function: `$posthog().capture(...)`, not `$posthog.capture(...)`.
- **sessionStorage key** — result is stored as `'lul_result'`. Both `index.vue` (write) and `results.vue` (read) use this key directly — no shared constant yet (ENGNEER-279 pending).
- **Verification tolerance** — discrepancy warnings fire when `|sum - declared| > 0.1h` (6 minutes). This absorbs HH:MM rounding errors.
- **pdf-lib required** — multi-page PDFs must be split into single pages before sending to Claude. Sending a multi-page PDF as one document breaks per-employee-month extraction. This splitting happens in `extract.post.ts`.
- **Model string pinned** — always `claude-sonnet-4-5-20250929`. Never use the alias `claude-sonnet-4-5` (aliases can silently change).
- **Tailwind vs custom CSS** — Tailwind is used only on `pages/index.vue` (homepage). All `/app/*` pages use the custom CSS design system in `assets/css/main.css`.
