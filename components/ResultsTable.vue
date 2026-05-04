<template>
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
								</td>
								<td class="group-total-cell">{{ formatHours(group.totalCombinedHours) }}</td>
								<td class="group-total-cell">{{ formatHours(group.totalHours) }}</td>
								<td class="group-total-cell">{{ formatHours(group.totalExtraHours) }}</td>
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
</template>

<script setup lang="ts">
import { toHHMM } from '~/utils/format'
import type { ExtractedRow, ExtractionResult, ExtractionWarning } from '~/types'

const props = defineProps<{
	result: ExtractionResult
}>()

const emit = defineEmits<{
	change: []
}>()

const {
	result,
	editedRows,
	declaredOverrides,
	editedCount,
	markEdited,
	markDeleted,
	setDeclaredOverride,
} = useExtractionStore()

const filterEmployee = ref('')
const filterMonth = ref('')
const hoveredRow = ref<string | null>(null)
const pendingDelete = ref<string | null>(null)

function rowKey(row: ExtractedRow): string {
	return `${row.employee}__${row.year}__${row.month}__${row.day}`
}

// Key for a warning or declared override: employee__year__month
function warnKey(w: ExtractionWarning): string {
	return `${w.employee}__${w.year}__${w.month}`
}

// ── Date helpers ─────────────────────────────────────────────────────
function rowToDateInput(row: ExtractedRow): string {
	return `${row.year}-${String(row.month).padStart(2, '0')}-${String(row.day).padStart(2, '0')}`
}

function onDateChange(row: ExtractedRow, value: string) {
	if (!value) return
	const [y, m, d] = value.split('-').map(Number)
	if (!y || !m || !d) return
	const rows = result.value!.rows
	const idx = rows.findIndex(
		r => r.employee === row.employee && r.year === row.year && r.month === row.month && r.day === row.day
	)
	if (idx === -1) return
	const dd = String(d).padStart(2, '0')
	const mm = String(m).padStart(2, '0')
	rows[idx] = { ...rows[idx], date: `${dd}/${mm}/${y}`, day: d, month: m, year: y }
	rows.sort((a, b) => {
		const n = a.employee.localeCompare(b.employee)
		if (n !== 0) return n
		if (a.year !== b.year) return a.year - b.year
		if (a.month !== b.month) return a.month - b.month
		return a.day - b.day
	})
	markEdited(rows[idx] ?? row)
	emit('change')
}

// ── Hours inline edit ────────────────────────────────────────────────
function onHoursChange(row: ExtractedRow, field: 'hours' | 'extraHours', rawValue: string) {
	const val = parseFloat(rawValue)
	if (isNaN(val) || val < 0) return
	const rows = result.value!.rows
	const idx = rows.findIndex(
		r => r.employee === row.employee && r.year === row.year && r.month === row.month && r.day === row.day
	)
	if (idx === -1) return
	rows[idx][field] = Math.round(val * 10000) / 10000
	markEdited(rows[idx])
	emit('change')
}

// ── Delete row ───────────────────────────────────────────────────────
function deleteRow(row: ExtractedRow) {
	result.value!.rows = result.value!.rows.filter(
		r => !(r.employee === row.employee && r.year === row.year && r.month === row.month && r.day === row.day)
	)
	pendingDelete.value = null
	markDeleted(row)
	emit('change')
}

// ── Discrepancy helpers ───────────────────────────────────────────────
function liveActual(w: ExtractionWarning): number {
	return Math.round(
		props.result.rows
			.filter(r => r.employee === w.employee && r.month === w.month && r.year === w.year)
			.reduce((s, r) => s + r.hours, 0) * 10000
	) / 10000
}

function liveDeclared(w: ExtractionWarning): number {
	return declaredOverrides.value.get(warnKey(w)) ?? w.declared
}

function liveDiff(w: ExtractionWarning): number {
	return Math.round(Math.abs(liveDeclared(w) - liveActual(w)) * 10000) / 10000
}

function isResolved(w: ExtractionWarning): boolean {
	return liveDiff(w) <= 0.1
}

function onDeclaredChange(w: ExtractionWarning, rawValue: string) {
	const val = parseFloat(rawValue)
	if (isNaN(val) || val < 0) return
	setDeclaredOverride(w, val)
	emit('change')
}

const allWarnings = computed((): ExtractionWarning[] => props.result.warnings ?? [])

const warningEmployees = computed(() =>
	[...new Set(allWarnings.value.map(w => w.employee))].sort()
)

const filterDiscrepancy = ref('')

watch(warningEmployees, (employees) => {
	if (employees.length > 0 && !employees.includes(filterDiscrepancy.value)) {
		filterDiscrepancy.value = employees[0]
	}
}, { immediate: true })

const filteredWarnings = computed(() =>
	allWarnings.value.filter(w =>
		!filterDiscrepancy.value || w.employee === filterDiscrepancy.value
	)
)

const unresolvedFilteredWarnings = computed(() =>
	filteredWarnings.value.filter(w => !isResolved(w))
)

const unresolvedWarnings = computed(() => allWarnings.value.filter(w => !isResolved(w)))

// ── Month options ─────────────────────────────────────────────────────
const monthNames = ['', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
	'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

const uniqueMonths = computed(() => {
	const seen = new Set<string>()
	const out: { key: string; label: string }[] = []
	for (const row of props.result.rows) {
		const key = `${row.year}-${String(row.month).padStart(2, '0')}`
		if (!seen.has(key)) {
			seen.add(key)
			out.push({ key, label: `${monthNames[row.month]} ${row.year}` })
		}
	}
	return out.sort((a, b) => a.key.localeCompare(b.key))
})

const uniqueEmployees = computed(() =>
	[...new Set(props.result.rows.map(r => r.employee))].sort()
)

// ── Filtered + grouped rows ───────────────────────────────────────────
const filteredRows = computed(() => {
	return props.result.rows.filter(r => {
		const empOk = !filterEmployee.value || r.employee === filterEmployee.value
		const mKey = `${r.year}-${String(r.month).padStart(2, '0')}`
		const monOk = !filterMonth.value || mKey === filterMonth.value
		return empOk && monOk
	})
})

const groupedRows = computed(() => {
	const map = new Map<string, { employee: string; rows: ExtractedRow[]; totalHours: number; totalExtraHours: number; totalCombinedHours: number }>()
	for (const row of filteredRows.value) {
		if (!map.has(row.employee)) map.set(row.employee, { employee: row.employee, rows: [], totalHours: 0, totalExtraHours: 0, totalCombinedHours: 0 })
		const g = map.get(row.employee)!
		g.rows.push(row)
		g.totalHours += row.hours
		g.totalExtraHours += (row.extraHours ?? 0)
		g.totalCombinedHours = Math.round((g.totalHours + g.totalExtraHours) * 10000) / 10000
	}
	return [...map.values()].sort((a, b) => a.employee.localeCompare(b.employee))
})

// Returns true when a decimal hour value has a non-zero minute component
// e.g. 8.5 → true (8:30), 8.0 → false, 1.75 → true (1:45)
function formatHours(val: number): string {
	const rounded = Math.round(val * 100) / 100
	const [intPart, decPart] = rounded.toString().split('.')
	const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
	return decPart ? `${withSep},${decPart}` : withSep
}

function hasMinutes(val: number | undefined): boolean {
	if (!val) return false
	return Math.round(val * 60) % 60 !== 0
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
	color: var(--c-text-primary);
	text-align: center;
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
</style>
