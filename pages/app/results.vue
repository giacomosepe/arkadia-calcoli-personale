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
					<ExportButton :rows="result?.rows ?? []" :disabled="!result" />
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
					<div class="stat-value" :style="unresolvedCount > 0 ? 'color: var(--c-warning)' : (allWarnings.length > 0 ? 'color: var(--c-success)' : '')">
						{{ unresolvedCount }}
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

				<ResultsTable
					:result="result"
					@change="persist"
				/>

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

const { result, editedCount, unresolvedCount, loadFromSession, persistResult } = useExtractionStore()

const showSaved = ref(false)
let saveTimer: ReturnType<typeof setTimeout> | null = null

// ── Mount ────────────────────────────────────────────────────────────
onMounted(() => {
	loadFromSession()
})

// ── Save ─────────────────────────────────────────────────────────────
function persist() {
	persistResult()
	if (saveTimer) clearTimeout(saveTimer)
	showSaved.value = true
	saveTimer = setTimeout(() => { showSaved.value = false }, 2000)
}
function triggerSave() { persist() }

const allWarnings = computed(() => result.value?.warnings ?? [])

const uniqueEmployees = computed(() => {
	if (!result.value) return []
	return [...new Set(result.value.rows.map(r => r.employee))].sort()
})

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

</script>

<style scoped>
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
</style>
