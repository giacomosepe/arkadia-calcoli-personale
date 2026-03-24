# LUL Extractor - Developer & AI Assistant Documentation

This document provides comprehensive context for developers and AI assistants working on this project.

## Project Overview

**LUL Extractor** is a Nuxt 3 application that extracts working hours data from Italian payroll PDFs (LUL - Libro Unico del Lavoro) using Claude AI, and exports the data to Excel files.

### Original Design Context
This project was originally designed in a Claude.ai conversation: https://claude.ai/chat/ff965a17-c8cd-4140-a64d-baab61bc1f38

---

## Tech Stack

### Frontend
- **Framework**: Nuxt 3 (latest)
- **UI Library**: Vue 3 with Composition API
- **Styling**:
  - Custom CSS design system (`assets/css/main.css`) for dashboard/app pages
  - Tailwind CSS (v3) for homepage only
  - CSS Variables as single source of truth
- **Icons**: Inline SVG (no icon library)
- **Authentication**: Clerk (@clerk/nuxt)
- **TypeScript**: Full type safety

### Backend
- **Runtime**: Nitro (Nuxt's server engine)
- **API**: Server API routes in `server/api/`
- **AI**: Anthropic SDK (@anthropic-ai/sdk) - Claude Sonnet 4.5
- **Excel**: ExcelJS for reading and generating .xlsx files
- **Deployment**: Vercel (preset configured in nuxt.config.ts)

---

## Architecture

### Folder Structure

```
lul-extractor/
├── pages/
│   ├── index.vue               # Homepage (public, Tailwind)
│   └── app/                    # Protected app pages (custom CSS)
│       ├── index.vue           # Main extraction tool
│       ├── results.vue         # Results preview + download
│       ├── pivot.vue           # Employee sheets generator
│       └── config.vue          # Company configuration reference
├── layouts/
│   └── app.vue                 # App layout with Navbar
├── components/
│   ├── Navbar.vue              # Unified navbar (logo + conditional menu)
│   ├── HomeMenu.vue            # Homepage menu (Login/Dashboard button)
│   └── AppMenu.vue             # App navigation (Estrai ore, Risultati, etc.)
├── middleware/
│   └── auth.ts                 # Protects all /app/* routes with Clerk
├── server/
│   ├── api/
│   │   ├── extract.post.ts     # Receives PDFs → calls Claude → returns rows
│   │   ├── export.post.ts      # Builds DB ALL Excel from rows
│   │   ├── pivot.post.ts       # Builds employee pivot sheets
│   │   └── companies.get.ts    # Returns company list
│   └── utils/
│       └── claude.ts           # Prompt builder + Anthropic API integration
├── assets/css/
│   └── main.css                # Complete design system (CSS variables)
├── types/
│   └── index.ts                # Shared TypeScript types
├── config/
│   └── companies.json          # Company configurations
└── public/
    └── template.xlsx           # Excel template for export
```

### Page Routing & Layouts

- **`/`** (Homepage): Public, no layout, uses Tailwind
- **`/app/*`** (Dashboard): Protected by auth middleware, uses `app` layout, uses custom CSS

### Key Design Decisions

#### 1. Navigation Structure
**Problem**: Two separate nav components (HomeNav + AppNav) caused flickering during route transitions.

**Solution**: Single `Navbar.vue` component that:
- Stays mounted during all route transitions (prevents flicker)
- Conditionally renders `HomeMenu` or `AppMenu` based on route
- Logo is always visible and never remounts

#### 2. Styling System
**Problem**: Need both custom design system and Tailwind flexibility.

**Solution**: Dual approach with single source of truth:
- **CSS Variables** (`main.css`) = source of truth for all colors
- **Tailwind Config** = references CSS variables (e.g., `bg-primary` → `var(--c-accent)`)
- Homepage uses Tailwind classes
- Dashboard uses custom CSS classes
- Both pull from same color palette

#### 3. Authentication
- Clerk handles all auth (no custom implementation)
- Middleware protects `/app/*` routes
- Homepage shows Login button (guests) or Dashboard link (authenticated users)

---

## Color Palette

**Single Source**: `assets/css/main.css` (lines 1-37)

```css
:root {
    /* Brand */
    --c-accent: #4F46E5;          /* Primary indigo */
    --c-accent-hover: #4338CA;    /* Darker indigo */
    --c-accent-light: #EEF2FF;    /* Light indigo */

    /* Backgrounds */
    --c-bg: #F7F6F3;              /* Warm off-white */
    --c-surface: #ffffff;         /* Cards/panels */

    /* Borders */
    --c-border: #e4e2dc;
    --c-border-strong: #c8c5bc;

    /* Text */
    --c-text-primary: #1a1916;    /* Near black */
    --c-text-secondary: #6b6860;  /* Gray */
    --c-text-tertiary: #9c9a94;   /* Light gray */

    /* Status */
    --c-success: #1a7a4a;         /* Green */
    --c-warning: #a05c00;         /* Orange */
    --c-danger: #c0392b;          /* Red */
}
```

**To change colors**: Edit only `main.css`. Tailwind auto-references these variables.

---

## API Flow

### 1. Extract Flow (`/api/extract`)
```
User uploads PDFs
    ↓
POST /api/extract with FormData
    ↓
Server reads PDFs as base64
    ↓
Calls Claude API with prompt + PDF images
    ↓
Claude returns structured JSON with rows
    ↓
Returns { rows, errors, totalEmployees, totalMonths }
    ↓
Client stores in sessionStorage
    ↓
Navigates to /app/results
```

### 2. Export Flow (`/api/export`)
```
User clicks "Scarica Excel" on results page
    ↓
POST /api/export with { rows, companyId, month }
    ↓
Server uses ExcelJS to create workbook
    ↓
Writes "DB ALL" sheet with columns: Data, Risorsa, Ore
    ↓
Returns .xlsx file as blob
    ↓
Client downloads via URL.createObjectURL
```

### 3. Pivot Flow (`/api/pivot`)
```
User uploads DB ALL Excel file
    ↓
POST /api/pivot with FormData
    ↓
Server reads Excel, groups by employee
    ↓
Creates one sheet per employee (31 rows × months)
    ↓
Returns .xlsx file as blob
    ↓
Client downloads
```

---

## Claude AI Integration

### Model
`claude-sonnet-4-5-20250929` (latest Sonnet 4.5)

### Prompt Strategy
Located in `server/utils/claude.ts`

**Key elements**:
1. Clear role definition (payroll document analyzer)
2. Structured output format (JSON array)
3. Specific instructions for date formats, name extraction
4. Examples of expected input/output
5. Error handling instructions

**Input**: PDF pages as base64-encoded images via Vision API

**Output**: JSON array of `{ date, employee, hours, sourceFile }`

---

## Environment Variables

### Required

```env
# Anthropic API (for Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

### Vercel Setup
Add these in Vercel dashboard → Settings → Environment Variables

---

## Development Workflow

### Local Setup
```bash
npm install
cp .env.example .env
# Add your API keys to .env
npm run dev
```

### Build & Deploy
```bash
npm run build      # Test production build
git push           # Vercel auto-deploys from main branch
```

### Adding Features

**New app page**:
1. Create in `pages/app/`
2. Add `definePageMeta({ layout: 'app', middleware: 'auth' })`
3. Use custom CSS classes from `main.css`
4. Add link to `components/AppMenu.vue`

**New homepage section**:
1. Edit `pages/index.vue`
2. Use Tailwind classes
3. Reference CSS variables for colors

---

## Common Tasks

### Change Color Palette
Edit `assets/css/main.css` lines 1-37. That's it. Everything updates automatically.

### Add New Company Configuration
Edit `config/companies.json`:
```json
{
  "id": "acme",
  "name": "Acme SpA",
  "hoursFieldLabel": "ORE ORDINARIE",
  "hoursFieldCode": "ORD",
  "outputTemplatePath": "/template.xlsx"
}
```

### Modify Claude Prompt
Edit `server/utils/claude.ts` → `buildPrompt()` function

### Update Excel Template
Replace `public/template.xlsx`

---

## TypeScript Types

### Key Types (`types/index.ts`)

```typescript
interface ExtractionRow {
  date: string          // Format: DD/MM/YYYY
  employee: string      // Full name
  hours: number         // Decimal (e.g., 8.5)
  sourceFile: string    // Original PDF filename
}

interface ExtractionResult {
  rows: ExtractionRow[]
  errors: string[]
  totalEmployees: number
  totalMonths: number
  companyId?: string
  month?: string
}

interface CompanyConfig {
  id: string
  name: string
  hoursFieldLabel: string
  hoursFieldCode: string
  outputTemplatePath: string
}
```

---

## Testing Checklist

### Before Deployment
- [ ] Test PDF upload with multiple files
- [ ] Verify Claude extraction accuracy
- [ ] Check Excel download works
- [ ] Test pivot sheet generation
- [ ] Verify auth middleware blocks /app/* when logged out
- [ ] Test navigation transitions (no flicker)
- [ ] Verify colors match across homepage and dashboard
- [ ] Test responsive layout on mobile

### After Deployment
- [ ] Verify environment variables are set in Vercel
- [ ] Test production build
- [ ] Check Clerk auth in production
- [ ] Verify API costs (Anthropic usage)

---

## Known Limitations

1. **PDF Quality**: Scanned/low-quality PDFs may fail extraction
2. **Claude API**: Rate limits apply (check Anthropic dashboard)
3. **File Size**: Large PDFs (>50 pages) may timeout
4. **Session Storage**: Results lost on page refresh (by design)

---

## Future Roadmap

### Phase 2 Features
- [ ] R&D project allocation per employee
- [ ] Extraction history/database
- [ ] Multi-month export automation
- [ ] Custom Excel template builder
- [ ] Batch processing queue
- [ ] Email notifications on completion

### Technical Improvements
- [ ] Add unit tests (Vitest)
- [ ] Implement error monitoring (Sentry)
- [ ] Add analytics (Plausible/PostHog)
- [ ] Optimize Claude API usage (caching, batching)
- [ ] Add progress indicators for long extractions

---

## Troubleshooting

### Claude returns empty results
- Check PDF quality and readability
- Verify `dailyColumn` and `summaryLabel` match PDF exactly (case-sensitive)
- Inspect Claude API response in server logs

### Clerk auth not working
- Verify environment variables are set
- Check Clerk dashboard for application status
- Ensure middleware is applied to routes

### Excel download fails
- Check ExcelJS version compatibility
- Verify template.xlsx exists in public/
- Inspect server logs for errors

### Colors don't match
- All colors should reference CSS variables from `main.css`
- Tailwind config should use `var(--c-*)` syntax
- Check for hardcoded hex values

---

## Contact & Support

**Developer**: Giacomo Sepe
**Organization**: Arkadia
**Original Design**: https://claude.ai/chat/ff965a17-c8cd-4140-a64d-baab61bc1f38

For questions about this codebase, refer to this document first. All architectural decisions and rationale are documented here.
