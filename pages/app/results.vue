<template>
	<div class="page-content">

		<!-- ── Save toast ────────────────────────────────────────────── -->
		<Transition name="toast">
			<div v-if="showSaved" class="save-toast">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<polyline points="20 6 9 17 4 12" />
				</svg>
				Salvato
			</div>
		</Transition>

		<!-- ── Sticky header ─────────────────────────────────────────── -->
		<div class="sticky-header">
			<div class="sticky-header-inner">
				<div class="stack stack-sm">
					<h1 class="page-title">Risultati estrazione</h1>
					<p v-if="result" class="page-subtitle">
						{{ result.totalEmployees }} dipendenti ·
						{{ result.totalMonths }} {{ result.totalMonths === 1 ? 'mese' : 'mesi' }}
					</p>
				</div>
				<div class="row gap-sm">
					<NuxtLink to="/app" class="btn btn-secondary">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
						</svg>
						Nuova estrazione
					</NuxtLink>
					<button class="btn btn-secondary" :disabled="editedCount === 0" @click="triggerSave">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
							<polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
						</svg>
						Salva{{ editedCount > 0 ? ` (${editedCount})` : '' }}
					</button>
					<button class="btn btn-primary" :disabled="isExporting || !result" @click="downloadExcel">
						<span v-if="isExporting" class="spinner" />
						<svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
						</svg>
						{{ isExporting ? 'Esportazione…' : 'Scarica Excel' }}
					</button>
				</div>
			</div>
		</div>

		<!-- ── No data ───────────────────────────────────────────────── -->
		<div v-if="!result" class="card">
			<div class="card-body" style="text-align: center; padding: 48px">
				<p class="text-secondary">
					Nessun risultato.
					<NuxtLink to="/app" style="color: var(--c-accent)">Avvia una nuova estrazione.</NuxtLink>
				</p>
			</div>
		</div>

		<template v-else>

			<!-- ── Stats ─────────────────────────────────────────────── -->
			<div class="stats-row" style="margin-bottom: 24px">
				<div class="stat-card">
					<div class="stat-value">{{ uniqueEmployees.length }}</div>
					<div class="stat-label">Dipendenti</div>
				</div>
				<div class="stat-card">
					<div class="stat-value" :style="unresolvedWarnings.length > 0 ? 'color: var(--c-warning)' : (allWarnings.length > 0 ? 'color: var(--c-success)' : '')">
						{{ unresolvedWarnings.length }}
					</div>
					<div class="stat-label">Discrepanze</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{{ totalPages }}</div>
					<div class="stat-label">Pagine elaborate</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{{ totalFiles }}</div>
					<div class="stat-label">File caricati</div>
				</div>
			</div>

			<!-- ── Errors ────────────────────────────────────────────── -->
			<Transition name="fade">
				<div v-if="result.errors.length > 0" class="card" style="margin-bottom: 16px; border-color: var(--c-danger)">
					<div class="card-header" style="background: var(--c-danger-light)">
						<div class="row gap-sm">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--c-danger)" stroke-width="2" style="flex-shrink:0">
								<circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
							</svg>
							<span class="card-title" style="color: var(--c-danger)">{{ result.errors.length }} pagina/e non estratta/e</span>
						</div>
					</div>
					<div class="card-body stack stack-sm" style="padding: 16px 20px">
						<p v-for="(e, i) in result.errors" :key="i" class="text-sm" style="color: var(--c-danger); font-family: var(--font-mono)">{{ e }}</p>
					</div>
				</div>
			</Transition>

			<!-- ── Two-column grid ──────────────────────────────────────── -->
			<div class="results-grid">

			<!-- LEFT — discrepancy card ─────────────────────────────────── -->
			<div class="results-col-left">
			<Transition name="fade">
				<div v-if="allWarnings.length > 0" class="card" style="border-color: var(--c-warning)">
					<div class="card-header" style="background: var(--c-warning-light)">
						<div class="row gap-sm" style="flex-wrap: wrap; justify-content: space-between; width: 100%">
							<div class="row gap-sm">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--c-warning)" stroke-width="2" style="flex-shrink:0">
									<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
									<line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
								</svg>
								<span class="card-title" style="color: var(--c-warning)">Discrepanze</span>
								<span class="badge" style="background: var(--c-warning-light); color: var(--c-warning); border: 1px solid var(--c-warning)">
									{{ unresolvedFilteredWarnings.length }} da verificare
								</span>
							</div>
						</div>
						<!-- Employee name / navigator -->
						<div style="margin-top: 8px">
							<select
								v-if="warningEmployees.length > 1"
								v-model="filterDiscrepancy"
								class="disc-employee-select disc-employee-name"
							>
								<option v-for="e in warningEmployees" :key="e" :value="e">{{ e }}</option>
							</select>
							<span
								v-else
								class="disc-employee-name"
							>{{ filterDiscrepancy }}</span>
						</div>
					</div>
					<div class="table-wrap" style="border: none; border-radius: 0">
						<table>
							<thead>
							<tr>
							<th>Mese</th>
							<th style="text-align: right">Somma ore giorni</th>
							<th style="text-align: right; width: 120px">Totale ore PDF</th>
							<th style="text-align: right; width: 80px">Diff</th>
							</tr>
							</thead>
							<tbody>
							 <tr
							  v-for="w in filteredWarnings"
							 :key="`${w.employee}-${w.month}-${w.year}`"
							class="disc-row"
							:class="{ 'disc-row-resolved': isResolved(w) }"
							>
									<td class="text-secondary text-sm">{{ monthNames[w.month] }} {{ w.year }}</td>
									<td class="td-mono" style="text-align: right">{{ toHHMM(liveActual(w)) }}</td>
									<td style="text-align: right; padding: 6px 12px">
										<input
											type="number"
											class="hours-input"
											:class="{ 'hours-input-edited': declaredOverrides.has(warnKey(w)) }"
											:value="liveDeclared(w)"
											min="0"
											step="0.5"
											:disabled="isResolved(w)"
											@change="onDeclaredChange(w, ($event.target as HTMLInputElement).value)"
											@focus="($event.target as HTMLInputElement).select()"
										/>
									</td>
									<td style="text-align: right; padding: 6px 12px">
										<span
											class="diff-badge"
											:class="isResolved(w) ? 'diff-badge-ok' : 'diff-badge-warn'"
										>
											<svg v-if="isResolved(w)" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
												<polyline points="20 6 9 17 4 12"/>
											</svg>
											<span v-else>{{ toHHMM(liveDiff(w)) }}</span>
											</span>
											</td>
											</tr>
							</tbody>
						</table>
					</div>
				</div>
			</Transition>
			</div><!-- /results-col-left -->

			<!-- RIGHT — filters + table ─────────────────────────────────── -->
			<div class="results-col-right">

			<!-- ── Filters ───────────────────────────────────────────── -->
			<div class="row" style="margin-bottom: 16px; gap: 10px; flex-wrap: wrap; align-items: center">
				<select v-model="filterEmployee" class="form-select" style="width: auto; min-width: 200px">
					<option value="">Tutti i dipendenti</option>
					<option v-for="e in uniqueEmployees" :key="e" :value="e">{{ e }}</option>
				</select>
				<select v-model="filterMonth" class="form-select" style="width: auto; min-width: 160px">
					<option value="">Tutti i mesi</option>
					<option v-for="m in uniqueMonths" :key="m.key" :value="m.key">{{ m.label }}</option>
				</select>
				<span class="text-sm text-secondary" style="margin-left: auto">
					{{ filteredRows.length }} righe
					<span v-if="editedCount > 0" style="color: var(--c-accent); margin-left: 8px">· {{ editedCount }} modificate</span>
				</span>
			</div>

			<!-- ── Main table ─────────────────────────────────────────── -->
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th style="width: 120px">Data</th>
							<th>Dipendente</th>
							<th style="width: 100px; text-align: right">Ore ord.</th>
							<th style="width: 100px; text-align: right">Ore str.</th>
							<th style="width: 64px"></th>
							<th style="width: 160px">File sorgente</th>
						</tr>
					</thead>
					<tbody>
						<template v-for="group in groupedRows" :key="group.employee">

							<!-- Employee group header — read-only computed sum -->
							<tr class="group-header-row">
								<td class="group-employee-cell">
									<span class="group-employee-name">{{ group.employee }}</span>
									<span class="group-badge">{{ group.rows.length }} giorni</span>
								</td>
								<td></td>
								<td class="group-total-cell">{{ toHHMM(group.totalHours) }}</td>
								<td class="group-total-cell" style="color: var(--c-text-secondary)">{{ toHHMM(group.totalExtraHours) }}</td>
								<td colspan="2"></td>
							</tr>

							<!-- Day rows -->
							<tr
								v-for="(row, i) in group.rows"
								:key="`${group.employee}-${i}`"
								class="data-row"
								:class="{ 'row-edited': editedRows.has(rowKey(row)) }"
								@mouseenter="hoveredRow = rowKey(row)"
								@mouseleave="hoveredRow = null"
							>
								<!-- Date cell — editable -->
								<td style="padding: 6px 8px">
									<input
										type="date"
										class="date-input"
										:class="{ 'date-input-edited': editedRows.has(rowKey(row)) }"
										:value="rowToDateInput(row)"
										:min="`${row.year}-${String(row.month).padStart(2,'0')}-01`"
										:max="`${row.year}-${String(row.month).padStart(2,'0')}-31`"
										@change="onDateChange(row, ($event.target as HTMLInputElement).value)"
									/>
								</td>
								<td class="text-secondary text-sm">{{ row.employee }}</td>
								<!-- Ordinary hours -->
								<td style="text-align: right; padding: 6px 8px">
									<div class="hours-cell">
										<span v-if="hasMinutes(row.hours)" class="hhmm-hint">{{ toHHMM(row.hours) }}</span>
										<input
											type="number"
											class="hours-input"
											:class="{ 'hours-input-edited': editedRows.has(rowKey(row)) }"
											:value="row.hours"
											min="0"
											max="8"
											step="0.25"
											@change="onHoursChange(row, 'hours', ($event.target as HTMLInputElement).value)"
											@focus="($event.target as HTMLInputElement).select()"
										/>
									</div>
								</td>
								<!-- Extra hours -->
								<td style="text-align: right; padding: 6px 8px">
									<div class="hours-cell">
										<span v-if="hasMinutes(row.extraHours)" class="hhmm-hint">{{ toHHMM(row.extraHours) }}</span>
										<input
											type="number"
											class="hours-input"
											:class="{ 'hours-input-edited': editedRows.has(rowKey(row)) }"
											:value="row.extraHours"
											min="0"
											step="0.25"
											@change="onHoursChange(row, 'extraHours', ($event.target as HTMLInputElement).value)"
											@focus="($event.target as HTMLInputElement).select()"
										/>
									</div>
								</td>
								<td class="actions-cell">
									<Transition name="fade">
										<button
											v-if="hoveredRow === rowKey(row) && pendingDelete !== rowKey(row)"
											class="action-btn action-btn-danger"
											title="Elimina riga"
											@click="pendingDelete = rowKey(row)"
										>
											<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
											</svg>
										</button>
									</Transition>
									<Transition name="fade">
										<div v-if="pendingDelete === rowKey(row)" class="delete-confirm">
											<span class="text-sm" style="color: var(--c-danger)">Elimina?</span>
											<button class="action-btn action-btn-danger" @click="deleteRow(row)">Sì</button>
											<button class="action-btn" @click="pendingDelete = null">No</button>
										</div>
									</Transition>
								</td>
								<td class="text-secondary text-sm source-cell">{{ row.sourceFile }}</td>
							</tr>

						</template>
						<tr v-if="filteredRows.length === 0">
							<td colspan="6" style="text-align:center; padding: 32px; color: var(--c-text-tertiary)">
								Nessuna riga trovata con i filtri selezionati.
							</td>
						</tr>
					</tbody>
				</table>
			</div><!-- /table-wrap -->
			</div><!-- /results-col-right -->
			</div><!-- /results-grid -->

			<!-- ── Employee summary ──────────────────────────────────── -->
			<div style="margin-top: 32px">
				<p class="section-label">Riepilogo per dipendente</p>
				<div class="table-wrap">
					<table>
						<thead>
							<tr>
								<th>Dipendente</th>
								<th style="text-align: right">Giorni</th>
								<th style="text-align: right">Ore ord.</th>
								<th style="text-align: right">Ore str.</th>
								<th style="text-align: right">Media/giorno</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="(s, i) in employeeSummaries" :key="i">
								<td style="font-weight: 500">{{ s.name }}</td>
								<td class="td-mono" style="text-align: right">{{ s.days }}</td>
								<td class="td-hours" style="text-align: right">{{ toHHMM(s.hours) }}</td>
								<td class="td-mono" style="text-align: right; color: var(--c-text-secondary)">{{ toHHMM(s.extraHours) }}</td>
								<td class="td-mono text-secondary" style="text-align: right">{{ toHHMM(s.hours / s.days) }}</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

		</template>
	</div>
</template>

<script setup lang="ts">
import { toHHMM } from '~/utils/format'
definePageMeta({ layout: 'app' })

import type { ExtractionResult, ExtractionWarning, ExtractedRow } from '~/types'

const result = ref<ExtractionResult | null>(null)
const isExporting = ref(false)
const filterEmployee = ref('')
const filterMonth = ref('')
const hoveredRow = ref<string | null>(null)
const pendingDelete = ref<string | null>(null)
const showSaved = ref(false)
let saveTimer: ReturnType<typeof setTimeout> | null = null

const editedRows = ref<Set<string>>(new Set())
const declaredOverrides = ref<Map<string, number>>(new Map())

function rowKey(row: ExtractedRow): string {
	return `${row.employee}__${row.year}__${row.month}__${row.day}`
}

// Key for a warning or declared override: employee__year__month
function warnKey(w: ExtractionWarning): string {
	return `${w.employee}__${w.year}__${w.month}`
}

// ── Mount ────────────────────────────────────────────────────────────
onMounted(() => {
	try {
		const stored = sessionStorage.getItem('lul_result')
		if (stored) {
			result.value = JSON.parse(stored)
			// Pre-select first employee with warnings
			const firstWarningEmployee = result.value?.warnings?.[0]?.employee
			if (firstWarningEmployee) filterDiscrepancy.value = firstWarningEmployee
		}
	} catch { /* ignore */ }
})

// ── Save ─────────────────────────────────────────────────────────────
function persist() {
	sessionStorage.setItem('lul_result', JSON.stringify(result.value))
	if (saveTimer) clearTimeout(saveTimer)
	showSaved.value = true
	saveTimer = setTimeout(() => { showSaved.value = false }, 2000)
}
function triggerSave() { persist() }
const editedCount = computed(() => editedRows.value.size)
function markEdited(row: ExtractedRow) {
	editedRows.value = new Set([...editedRows.value, rowKey(row)])
}

// ── Date helpers ─────────────────────────────────────────────────────
function rowToDateInput(row: ExtractedRow): string {
	return `${row.year}-${String(row.month).padStart(2, '0')}-${String(row.day).padStart(2, '0')}`
}

function onDateChange(row: ExtractedRow, value: string) {
	if (!result.value || !value) return
	const [y, m, d] = value.split('-').map(Number)
	if (!y || !m || !d) return
	const idx = result.value.rows.findIndex(
		r => r.employee === row.employee && r.year === row.year && r.month === row.month && r.day === row.day
	)
	if (idx === -1) return
	const dd = String(d).padStart(2, '0')
	const mm = String(m).padStart(2, '0')
	result.value.rows[idx] = { ...result.value.rows[idx], date: `${dd}/${mm}/${y}`, day: d, month: m, year: y }
	result.value.rows.sort((a, b) => {
		const n = a.employee.localeCompare(b.employee)
		if (n !== 0) return n
		if (a.year !== b.year) return a.year - b.year
		if (a.month !== b.month) return a.month - b.month
		return a.day - b.day
	})
	markEdited(result.value.rows[idx] ?? row)
	persist()
}

// ── Hours inline edit ────────────────────────────────────────────────
function onHoursChange(row: ExtractedRow, field: 'hours' | 'extraHours', rawValue: string) {
	if (!result.value) return
	const val = parseFloat(rawValue)
	if (isNaN(val) || val < 0) return
	const idx = result.value.rows.findIndex(
		r => r.employee === row.employee && r.year === row.year && r.month === row.month && r.day === row.day
	)
	if (idx === -1) return
	result.value.rows[idx][field] = Math.round(val * 10000) / 10000
	markEdited(result.value.rows[idx])
	persist()
}

// ── Delete row ───────────────────────────────────────────────────────
function deleteRow(row: ExtractedRow) {
	if (!result.value) return
	result.value.rows = result.value.rows.filter(
		r => !(r.employee === row.employee && r.year === row.year && r.month === row.month && r.day === row.day)
	)
	pendingDelete.value = null
	editedRows.value = new Set([...editedRows.value, rowKey(row)])
	persist()
}

// ── Discrepancy helpers ───────────────────────────────────────────────
// Live sum of extracted daily hours for a warning's employee+month
function liveActual(w: ExtractionWarning): number {
	if (!result.value) return w.actual
	return Math.round(
		result.value.rows
			.filter(r => r.employee === w.employee && r.month === w.month && r.year === w.year)
			.reduce((s, r) => s + r.hours, 0) * 10000
	) / 10000
}

// Declared total — from override map, or original warning value
function liveDeclared(w: ExtractionWarning): number {
	return declaredOverrides.value.get(warnKey(w)) ?? w.declared
}

// Absolute difference
function liveDiff(w: ExtractionWarning): number {
	return Math.round(Math.abs(liveDeclared(w) - liveActual(w)) * 10000) / 10000
}

// A warning is resolved when diff ≤ 0.1
function isResolved(w: ExtractionWarning): boolean {
	return liveDiff(w) <= 0.1
}

// Handler for editing "Totale ore PDF" cell in the discrepancy table
function onDeclaredChange(w: ExtractionWarning, rawValue: string) {
	const val = parseFloat(rawValue)
	if (isNaN(val) || val < 0) return
	declaredOverrides.value = new Map([
		...declaredOverrides.value,
		[warnKey(w), Math.round(val * 10000) / 10000],
	])
	persist()
}

const allWarnings = computed((): ExtractionWarning[] => result.value?.warnings ?? [])

// Unique employees that have warnings — drives the dropdown
const warningEmployees = computed(() =>
	[...new Set(allWarnings.value.map(w => w.employee))].sort()
)

// Selected employee in discrepancy panel — auto-initialised to first on mount
const filterDiscrepancy = ref('')

// Warnings for selected employee only
const filteredWarnings = computed(() =>
	allWarnings.value.filter(w =>
		!filterDiscrepancy.value || w.employee === filterDiscrepancy.value
	)
)

// Unresolved count for selected employee (shown in badge)
const unresolvedFilteredWarnings = computed(() =>
	filteredWarnings.value.filter(w => !isResolved(w))
)

// Global unresolved (kept for any future use)
const unresolvedWarnings = computed(() => allWarnings.value.filter(w => !isResolved(w)))

// ── Month options ─────────────────────────────────────────────────────
const monthNames = ['', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
	'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

const uniqueMonths = computed(() => {
	if (!result.value) return []
	const seen = new Set<string>()
	const out: { key: string; label: string }[] = []
	for (const row of result.value.rows) {
		const key = `${row.year}-${String(row.month).padStart(2, '0')}`
		if (!seen.has(key)) {
			seen.add(key)
			out.push({ key, label: `${monthNames[row.month]} ${row.year}` })
		}
	}
	return out.sort((a, b) => a.key.localeCompare(b.key))
})

const uniqueEmployees = computed(() => {
	if (!result.value) return []
	return [...new Set(result.value.rows.map(r => r.employee))].sort()
})

// ── Filtered + grouped rows ───────────────────────────────────────────
const filteredRows = computed(() => {
	if (!result.value) return []
	return result.value.rows.filter(r => {
		const empOk = !filterEmployee.value || r.employee === filterEmployee.value
		const mKey = `${r.year}-${String(r.month).padStart(2, '0')}`
		const monOk = !filterMonth.value || mKey === filterMonth.value
		return empOk && monOk
	})
})

const groupedRows = computed(() => {
	const map = new Map<string, { employee: string; rows: ExtractedRow[]; totalHours: number; totalExtraHours: number }>()
	for (const row of filteredRows.value) {
		if (!map.has(row.employee)) map.set(row.employee, { employee: row.employee, rows: [], totalHours: 0, totalExtraHours: 0 })
		const g = map.get(row.employee)!
		g.rows.push(row)
		g.totalHours += row.hours
		g.totalExtraHours += (row.extraHours ?? 0)
	}
	return [...map.values()].sort((a, b) => a.employee.localeCompare(b.employee))
})

const totalHours = computed(() => result.value?.rows.reduce((s, r) => s + r.hours, 0) ?? 0)

// Returns true when a decimal hour value has a non-zero minute component
// e.g. 8.5 → true (8:30), 8.0 → false, 1.75 → true (1:45)
function hasMinutes(val: number | undefined): boolean {
	if (!val) return false
	return Math.round(val * 60) % 60 !== 0
}

// Total pages = unique "filename (pagina N)" source strings across all rows + errors
const totalPages = computed(() => {
	if (!result.value) return 0
	const pages = new Set(result.value.rows.map(r => r.sourceFile))
	// Also count error pages (each error string contains the source reference)
	result.value.errors.forEach(e => pages.add(e))
	return pages.size
})

// Total files = unique base filenames (strip " (pagina N)" suffix)
const totalFiles = computed(() => {
	if (!result.value) return 0
	const files = new Set(
		result.value.rows.map(r => r.sourceFile.replace(/\s*\(pagina\s*\d+\)$/i, '').trim())
	)
	return files.size
})

// ── Employee summary ──────────────────────────────────────────────────
const employeeSummaries = computed(() => {
	if (!result.value) return []
	const map = new Map<string, { hours: number; extraHours: number; days: number }>()
	for (const row of result.value.rows) {
		const curr = map.get(row.employee) ?? { hours: 0, extraHours: 0, days: 0 }
		map.set(row.employee, {
			hours: curr.hours + row.hours,
			extraHours: curr.extraHours + (row.extraHours ?? 0),
			days: curr.days + 1,
		})
	}
	return [...map.entries()]
		.map(([name, s]) => ({ name, ...s }))
		.sort((a, b) => a.name.localeCompare(b.name))
})

// ── Download ──────────────────────────────────────────────────────────
async function downloadExcel() {
	if (!result.value) return
	isExporting.value = true
	try {
		const blob = await $fetch<Blob>('/api/export', {
			method: 'POST',
			body: { rows: result.value.rows },
			responseType: 'blob',
		})
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		const years = [...new Set(result.value.rows.map(r => r.year))].sort().join('-')
		a.download = `LUL_DB_ALL_${years}.xlsx`
		a.click()
		URL.revokeObjectURL(url)
	} catch (err) {
		console.error('Export failed', err)
	} finally {
		isExporting.value = false
	}
}
</script>

<style scoped>
/* ── Two-column results grid ─────────────────────────────────── */
.results-grid {
	display: grid;
	grid-template-columns: 1fr 2fr;
	gap: 24px;
	align-items: start;
	margin-bottom: 32px;
}

.results-col-left {
	position: sticky;
	/* app header (60px) + results sticky header (~72px) + breathing room */
	top: calc(var(--header-h) + 88px);
}

.results-col-right {
	min-width: 0; /* prevent table overflow breaking grid */
}

@media (max-width: 900px) {
	.results-grid {
		grid-template-columns: 1fr;
	}
	.results-col-left {
		position: static;
	}
}

/* ── Save toast ──────────────────────────────────────────────────── */
.save-toast {
	position: fixed;
	bottom: 24px;
	right: 24px;
	z-index: 300;
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 16px;
	background: var(--c-text-primary);
	color: white;
	border-radius: var(--radius-md);
	font-size: 0.8125rem;
	font-weight: 500;
	box-shadow: var(--shadow-lg);
}
.toast-enter-active, .toast-leave-active { transition: opacity 0.2s, transform 0.2s; }
.toast-enter-from { opacity: 0; transform: translateY(8px); }
.toast-leave-to  { opacity: 0; transform: translateY(8px); }

/* ── Sticky header ───────────────────────────────────────────────── */
.sticky-header {
	position: sticky;
	top: var(--header-h);
	z-index: 50;
	background: var(--c-bg);
	border-bottom: 1px solid var(--c-border);
	margin: 0 -28px 32px;
	padding: 0 28px;
}
.sticky-header-inner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 16px;
	padding: 16px 0;
}

/* ── Group header row ────────────────────────────────────────────── */
.group-header-row {
	background: var(--c-bg);
	border-top: 2px solid var(--c-border);
}
.group-header-row td {
	padding: 8px 16px;
	border-bottom: 1px solid var(--c-border);
}
.group-employee-cell {
	display: flex;
	align-items: center;
	gap: 10px;
}
.group-employee-name {
	font-size: 0.8125rem;
	font-weight: 700;
	color: var(--c-text-primary);
}
.group-badge {
	font-size: 0.72rem;
	font-weight: 500;
	color: var(--c-text-tertiary);
	background: var(--c-surface);
	border: 1px solid var(--c-border);
	border-radius: 20px;
	padding: 2px 8px;
}
.group-total-cell {
	font-family: var(--font-mono);
	font-size: 0.8rem;
	font-weight: 600;
	color: var(--c-accent);
	text-align: right;
	padding: 8px 16px;
}

/* ── Data rows ───────────────────────────────────────────────────── */
.data-row td { padding: 6px 16px; }
.data-row.row-edited { background: #fafaf7; }

/* ── Shared input base ───────────────────────────────────────────── */
.hours-input,
.date-input {
	padding: 5px 8px;
	border: 1px solid var(--c-border);
	border-radius: var(--radius-sm);
	background: var(--c-surface);
	font-family: var(--font-mono);
	font-size: 0.8rem;
	font-weight: 500;
	color: var(--c-accent);
	outline: none;
	transition: border-color 0.15s, box-shadow 0.15s;
}
.hours-input:hover, .date-input:hover { border-color: var(--c-border-strong); }
.hours-input:focus, .date-input:focus {
	border-color: var(--c-accent);
	box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}
.hours-input:disabled { opacity: 0.4; cursor: not-allowed; }
.hours-input-edited, .date-input-edited {
	color: var(--c-warning) !important;
	background: var(--c-warning-light) !important;
	border-color: var(--c-warning) !important;
}
.hours-input {
	width: 72px;
	text-align: right;
	-moz-appearance: textfield;
}
.hours-input::-webkit-inner-spin-button,
.hours-input::-webkit-outer-spin-button { opacity: 0; width: 0; }
.date-input { width: 120px; color: var(--c-text-primary); }

/* Hours cell wrapper — HH:MM hint left of input */
.hours-cell {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	justify-content: flex-end;
}
.hhmm-hint {
	font-size: 0.7rem;
	font-family: var(--font-mono);
	color: var(--c-text-tertiary);
	white-space: nowrap;
	pointer-events: none;
	user-select: none;
}

/* Discrepancy employee select */
.disc-employee-select {
	padding: 4px 8px;
	border: 1px solid var(--c-warning);
	border-radius: var(--radius-sm);
	background: var(--c-surface);
	font-family: var(--font-sans);
	font-size: 0.75rem;
	font-weight: 500;
	color: var(--c-warning);
	outline: none;
	cursor: pointer;
	max-width: 140px;
}
.disc-employee-select:focus {
	box-shadow: 0 0 0 2px rgba(160, 92, 0, 0.15);
}

/* Employee name shown below the header title — plain text or dropdown */
.disc-employee-name {
	display: block;
	font-size: 0.8125rem;
	font-weight: 700;
	color: var(--c-text-primary);
	letter-spacing: 0.01em;
}

/* ── Discrepancy table rows ──────────────────────────────────────── */
.disc-row td { padding: 10px 16px; transition: opacity 0.3s, color 0.3s; }
.disc-row-resolved td {
	opacity: 0.45;
	color: var(--c-text-tertiary) !important;
}
.disc-row-resolved .hours-input {
	color: var(--c-text-tertiary) !important;
	background: var(--c-bg) !important;
}

/* Diff badge */
.diff-badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 3px 8px;
	border-radius: 20px;
	font-size: 0.75rem;
	font-family: var(--font-mono);
	font-weight: 600;
	min-width: 52px;
}
.diff-badge-warn {
	background: var(--c-warning-light);
	color: var(--c-warning);
}
.diff-badge-ok {
	background: var(--c-success-light);
	color: var(--c-success);
}

/* ── Actions column ──────────────────────────────────────────────── */
.actions-cell { padding: 4px 8px; white-space: nowrap; }
.action-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 4px 7px;
	border: 1px solid var(--c-border);
	border-radius: var(--radius-sm);
	background: var(--c-surface);
	font-size: 0.75rem;
	font-weight: 500;
	color: var(--c-text-secondary);
	cursor: pointer;
	transition: all 0.15s;
}
.action-btn:hover { border-color: var(--c-border-strong); color: var(--c-text-primary); }
.action-btn-danger { color: var(--c-danger); border-color: var(--c-danger-light); }
.action-btn-danger:hover { background: var(--c-danger-light); }
.delete-confirm { display: inline-flex; align-items: center; gap: 6px; }

/* ── Source file cell ────────────────────────────────────────────── */
.source-cell {
	max-width: 160px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* ── Transitions ─────────────────────────────────────────────────── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-enter-from { opacity: 0; transform: translateY(6px); }
.fade-leave-to { opacity: 0; }
</style>
