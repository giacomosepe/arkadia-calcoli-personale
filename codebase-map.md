# LUL Extractor — Codebase Map
> Last updated: 2026-05-04 (Part 1 merged, Part 2 in progress)
> Purpose: index of what exists and its current state. Instructions for what to change live in Linear issue descriptions and CLAUDE.md.

---

## Reference docs

| File | What it contains |
|---|---|
| `CLAUDE.md` | Project brief, tech stack, folder structure, route list, extraction flow, prompt design decisions, Excel output spec, verification logic, auth setup, design system variables. **Read before touching any server file or prompt.** |
| `AGENTS.md` | Agent-specific instructions for Codex. |
| `codebase-map.md` | This file. |

---

## Directory structure

```
lul-extractor/
├── app.vue                  ← root entry (NuxtLayout + NuxtPage)
├── assets/css/main.css      ← full custom design system, CSS variables
├── components/              ← shared UI components
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
│   └── utils/               ← server-side utilities (Claude only — excel.ts pending ENGNEER-285)
├── types/                   ← shared TypeScript interfaces
└── utils/                   ← shared client+server utilities (formatting)
```

---

## Key files — current state

### `pages/app/index.vue` — ~350 lines
The extraction page. Handles PDF upload, config inputs, and the API call to `/api/extract`.
Thin orchestrator after Part 1 refactor — modal UI delegated to `ExtractionModal.vue`.
- `confirmExtraction()` — calls `trackExtractionStarted`, POSTs to `/api/extract`, calls `setResult()`, navigates to `/app/results`
- `trackExtractionCompleted` fires with `duration_ms` after API returns rows
- `handleRunClick()` — validates form, opens modal
- `formatSize()` imported from `utils/format.ts`
- No direct PostHog calls — all analytics via `useTracking()`
- No direct `sessionStorage` access — all state via `useExtractionStore()`
- **Pending:** ENGNEER-289 (add `trackExtractionFailed` in error and zero-rows paths)

### `pages/app/results.vue` — ~120 lines
Thin orchestrator after Part 1 refactor. Loads data, shows stats, delegates table and export to components.
- Reads result via `useExtractionStore().loadFromSession()` in `onMounted`
- `persist()` calls `persistResult()` and shows save toast
- `editedCount` and `unresolvedCount` read from `useExtractionStore()` — not emitted from `ResultsTable`
- Stats computeds: `uniqueEmployees`, `totalPages`, `totalFiles`, `employeeSummaries`
- Employee summary table at the bottom (separate from `ResultsTable`)
- No direct PostHog calls, no direct `sessionStorage` access

### `pages/app/pivot.vue` — ~230 lines
Upload DB ALL Excel, preview contents, regenerate employee pivot sheets via `/api/pivot`.
- Self-contained: no shared state with other pages
- `formatSize()` imported from `utils/format.ts`
- `setFile(f)` reads workbook client-side via ExcelJS for preview before upload

### `pages/app/config.vue`
Reference page listing LUL field codes. Read-only, no logic.

---

### `components/ExtractionModal.vue`
Confirmation modal extracted from `index.vue` in Part 1 (ENGNEER-280).
- Props: `isOpen`, `files`, `dailyColumn`, `summaryLabel`, `hasTotalField`, `nameOrder`, `isProcessing`
- Emits: `confirm`, `cancel`
- No analytics calls — tracking stays in `index.vue`

### `components/ResultsTable.vue` — ~550 lines
Results grid extracted from `results.vue` in Part 1 (ENGNEER-281).
Full two-column layout: discrepancy panel (left) + filterable day-row table (right).
- Props: `result: ExtractionResult`
- Emits: `change` (fires after any inline edit — parent calls `persist()`)
- Edit state (`editedRows`, `declaredOverrides`) lives in `useExtractionStore()` — not local (ENGNEER-291 done)
- `editedCount` and `unresolvedCount` read from store and exposed to parent via store, not emits
- Filter state (`filterEmployee`, `filterMonth`) is local to component
- Inline edit handlers: `onHoursChange`, `onDateChange`, `deleteRow`, `onDeclaredChange`
- `formatHours(val)` — local formatter: thousands separator (`.`) and decimal comma (`,`) for Italian display
- `hasMinutes(val)` — shows HH:MM hint next to input when value has non-zero minutes

### `components/ExportButton.vue`
Export button extracted from `results.vue` in Part 1 (ENGNEER-282).
- Props: `rows: ExtractedRow[]`, `disabled?: boolean`
- Calls `trackResultExported` after download completes
- Builds `documentId` from deduplicated source filenames
- Generates filename: `LUL_DB_ALL_${years}.xlsx`

### `components/Navbar.vue`, `AppMenu.vue`, `HomeMenu.vue`, `LulExtractorLogo.vue`
Navigation components. Not in current sprint scope.

---

### `composables/useTracking.ts` — ~50 lines
PostHog event wrapper. All analytics calls go through here. Fully typed.
- `trackExtractionStarted(documentId: string, documentName: string): void`
- `trackExtractionCompleted(documentId: string, documentName: string, durationMs: number): void`
- `trackResultExported(documentId: string): void`
- `useNuxtApp()` called lazily inside each function (not at setup time) — avoids SSR timing issues
- **Pending:** ENGNEER-289 — add `trackExtractionFailed(documentId, documentName, reason, errorMessage?)`

### `composables/useExtractionStore.ts` — ~110 lines
Module-level store for extraction result and edit state. Created in Part 1 (ENGNEER-279, ENGNEER-291).
- Module-level refs: `_result`, `_editedRows`, `_declaredOverrides`
- `setResult(r)` — writes to memory + sessionStorage, resets edit state
- `loadFromSession()` — reads from sessionStorage if `_result` is null
- `persistResult()` — re-serialises current `_result` to sessionStorage
- `clearResult()` — clears memory and sessionStorage
- `markEdited(row)`, `markDeleted(row)` — add row key to `_editedRows`
- `setDeclaredOverride(warning, value)` — overrides declared total for a warning
- `editedCount: ComputedRef<number>` — `_editedRows.size`
- `unresolvedCount: ComputedRef<number>` — count of unresolved warnings
- SessionStorage key: `'lul_result'` — defined as `STORAGE_KEY` constant

---

### `plugins/posthog.client.ts` — ~30 lines
Initialises PostHog, opts out in DEV, registers `$pageview` on route change, provides `$posthog`.
- Client-side only (`.client.ts` suffix)
- `$posthog` typed as `() => PostHog` via Nuxt module augmentation (`declare module '#app'`)
- Reads key from `runtimeConfig.public.posthogKey` (env var: `POSTHOG_KEY`)
- API host from `runtimeConfig.public.posthogHost` (defaults to `https://eu.i.posthog.com`)
- DEV opt-out: `if (import.meta.env.DEV) ph.opt_out_capturing()` — events do not fire on localhost
- **ENGNEER-290 complete** — already converted to TypeScript with full type declarations

---

### `server/utils/claude.ts` — ~160 lines
**Do not modify without explicit owner approval. See CLAUDE.md.**
- `extractFromPdf(base64Pdf, vendorName, nameOrder, dailyHoursColumn, extraHoursColumn, totalHoursLabel, sourceFile, apiKey, retries)` → `{ rows: ExtractedRow[], declaredTotal?: number, error?: string }`
- `SYSTEM_PROMPT` — 7-rule extraction contract. Stable. Never put variables here.
- `buildPrompt(...)` — per-call user prompt. Assembles variable fields including dynamic ignore list.
- `buildNameInstruction(nameOrder)` — two branches: `surname_first` vs `name_first`
- Model pinned to `claude-sonnet-4-5-20250929` — never use the alias
- Rate limiting: 2s delay between pages; 429/529: waits `attempt * 30 + random(10)` seconds, up to 3 retries
- Ignore list in `buildPrompt` is dynamic: always includes `"GIUSTIFICATIVI"` + `extraHoursColumn` if provided

### `server/utils/excel.ts`
**Does not exist yet.** Planned in ENGNEER-285 (shared helpers) and ENGNEER-287 (pivot builder).

### `server/api/extract.post.ts` — ~100 lines
Receives multipart form data, splits PDFs via pdf-lib, calls `extractFromPdf` once per page, runs verification, returns `ExtractionResult`.
- Reads: `vendorName`, `nameOrder`, `dailyColumn`, `extraColumn`, `summaryLabel`, `apiKey`, `files[]` from formData
- 2s `setTimeout` delay between each page call
- Verification key format: `${employee}__${month}__${year}`
- Tolerance: `|sum - declared| > 0.1h` triggers a warning

### `server/api/export.post.ts` — ~140 lines
Receives `{ rows: ExtractedRow[] }`, builds DB ALL sheet + employee pivot sheets, returns `.xlsx` buffer.
**Pending:** ENGNEER-285 (move `applyHeaderStyle`, `applyTotalStyle`, `MONTH_NAMES` to `excel.ts`), ENGNEER-287 (move employee pivot loop to `excel.ts`).
- Pivot cells use `toExcelDuration()` + `numFmt '[h]:mm'` — summable in Excel
- Imports `toExcelDuration`, `EXCEL_DURATION_FORMAT` from `~/utils/format`
- `applyHeaderStyle`, `applyTotalStyle`, `MONTH_NAMES` defined locally — duplicated in `pivot.post.ts`

### `server/api/pivot.post.ts` — ~180 lines
Receives uploaded DB ALL `.xlsx`, re-reads rows, regenerates employee pivot sheets.
**Pending:** ENGNEER-285, ENGNEER-286 (replace `decimalToHHMM` with `toHHMM`), ENGNEER-287.
- `decimalToHHMM(decimal)` defined locally — functionally identical to `toHHMM` in `utils/format.ts`
- Pivot cells use HH:MM strings (not Excel duration fractions) — intentional difference from `export.post.ts`
- `applyHeaderStyle`, `applyTotalStyle`, `MONTH_NAMES` defined locally — duplicated from `export.post.ts`
- DB ALL columns read: 1=Data, 2=Risorsa, 3=Ore, 4=Giorno, 5=Mese

### `server/api/check-config.get.ts`
Returns `{ hasAnthropicKey: boolean }`. Read by `index.vue` to show the API key status badge.

### `server/api/companies.get.ts`
Serves `config/companies.json`. Not used by the current UI — legacy endpoint.
**Pending:** ENGNEER-288 (align JSON to `CompanyConfig` type, add runtime validation).

---

### `utils/format.ts` — ~40 lines
Shared formatting utilities, used by both client and server.
- `toHHMM(decimal: number): string` — decimal hours → "H:MM" display string. e.g. 8.5 → "8:30"
- `toExcelDuration(decimal: number): number` — decimal hours → Excel serial fraction (divide by 24)
- `EXCEL_DURATION_FORMAT: string` — `"[h]:mm"`, apply as `numFmt` on ExcelJS cells
- `formatSize(b: number): string` — bytes → human-readable string (B / KB / MB). Used by `index.vue` and `pivot.vue`

### `types/index.ts` — ~40 lines
All shared TypeScript interfaces.
**Pending:** ENGNEER-288 may add `nameOrder` and `extraColumn` to `CompanyConfig`.

```typescript
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
  // nameOrder and extraColumn exist in companies.json but not yet in this type — ENGNEER-288 pending
}
```

### `config/companies.json`
Two company config entries. Fields have drifted from `CompanyConfig` — `straorColumn` present (should be `extraColumn`), `nameOrder` missing on one entry.
**Pending:** ENGNEER-288.

### `middleware/auth.ts`
Clerk auth guard. Protects all `/app/*` routes. No logic to change.

### `layouts/app.vue`
App shell. Sets `--header-h` CSS variable used by sticky header in `results.vue`.

### `nuxt.config.ts`
- `pdfjs-dist` references removed (file deleted, `pdfExtract.ts` deleted)
- Runtime config: `posthogKey` (`POSTHOG_KEY`), `posthogHost` (`POSTHOG_HOST`), `anthropicApiKey` (`ANTHROPIC_API_KEY`)
- Tailwind only active for `pages/index.vue` (homepage) — all `/app/*` pages use `assets/css/main.css`

### `package.json`
- `pdfjs-dist` still listed as a dependency — should be removed (dead weight, `pdfExtract.ts` deleted)
- Key deps: `@anthropic-ai/sdk`, `exceljs`, `pdf-lib`, `posthog-js`, `@clerk/nuxt`

---

## Part 2 — open issues

| Issue | Title | Status |
|---|---|---|
| ENGNEER-285 | Extract shared Excel helpers into `server/utils/excel.ts` | Backlog |
| ENGNEER-286 | Replace `decimalToHHMM` in `pivot.post.ts` with `toHHMM` | Backlog |
| ENGNEER-287 | Extract pivot sheet builder into `server/utils/excel.ts` | Backlog — blocked by 285 + 286 |
| ENGNEER-288 | Align `companies.json` to `CompanyConfig`, add validation | Backlog |
| ENGNEER-289 | Track `extraction_failed` in PostHog | Backlog |
| ENGNEER-290 | Convert `posthog.client.js` to TypeScript | ✅ Done (Part 1) |

---

## Known quirks

- **`useRuntimeConfig()` in server routes** must receive `event`: `useRuntimeConfig(event)`. Without it, env vars are not available in Nitro.
- **ExcelJS sheet names** max 31 chars — employee names are truncated with `.substring(0, 31)`.
- **Floating point** — all hour values use `Math.round(value * 10000) / 10000` throughout to prevent drift.
- **PostHog in DEV** — `posthog.client.ts` calls `ph.opt_out_capturing()` in development. Events will not appear in PostHog when running locally. Test on the live Vercel URL.
- **`$posthog` call pattern** — the plugin provides `$posthog: () => PostHog`. Callers must invoke it as a function: `$posthog().capture(...)`.
- **`useNuxtApp()` in composables** — must be called lazily inside each function body, not at composable setup time. Calling it at setup time causes SSR/hydration timing issues where `$posthog` is `undefined`.
- **SessionStorage key** — result is stored as `'lul_result'` (constant `STORAGE_KEY` in `useExtractionStore.ts`). Never access sessionStorage directly outside this composable.
- **Verification tolerance** — discrepancy warnings fire when `|sum - declared| > 0.1h` (6 minutes).
- **pdf-lib required** — multi-page PDFs must be split into single pages before sending to Claude. Splitting happens in `extract.post.ts`.
- **Model string pinned** — always `claude-sonnet-4-5-20250929`. Never use the alias `claude-sonnet-4-5`.
- **Tailwind vs custom CSS** — Tailwind is used only on `pages/index.vue`. All `/app/*` pages use the custom CSS design system in `assets/css/main.css`.
- **`pdfjs-dist` in package.json** — listed as a dependency but unused. `pdfExtract.ts` was deleted. Safe to remove.
- **Excel format difference** — `export.post.ts` pivot cells use `toExcelDuration()` (summable fractions with `numFmt '[h]:mm'`). `pivot.post.ts` pivot cells use `decimalToHHMM()` (plain HH:MM strings). This is intentional — the two sheets serve different use cases. Preserve this difference when extracting to `excel.ts`.
