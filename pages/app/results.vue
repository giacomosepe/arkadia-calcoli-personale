<template>
	<div class="page-content">
		<!-- Header -->
		<div
			class="row row-between"
			style="margin-bottom: 32px; flex-wrap: wrap; gap: 16px"
		>
			<div class="stack stack-sm">
				<h1 class="page-title">Risultati estrazione</h1>
				<p v-if="result" class="page-subtitle">
					{{ result.totalEmployees }} dipendenti ·
					{{ result.totalMonths }} mesi
				</p>
			</div>
			<div class="row gap-sm">
				<NuxtLink to="/app" class="btn btn-secondary">
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<line x1="19" y1="12" x2="5" y2="12" />
						<polyline points="12 19 5 12 12 5" />
					</svg>
					Nuova estrazione
				</NuxtLink>
				<button
					class="btn btn-primary"
					:disabled="isExporting || !result || !canDownload"
					:title="
						!canDownload
							? 'Verifica tutte le discrepanze prima di scaricare'
							: ''
					"
					@click="downloadExcel"
				>
					<span v-if="isExporting" class="spinner" />
					<svg
						v-else
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="7 10 12 15 17 10" />
						<line x1="12" y1="15" x2="12" y2="3" />
					</svg>
					{{ isExporting ? "Esportazione…" : "Scarica Excel" }}
				</button>
			</div>
		</div>

		<!-- No data -->
		<div v-if="!result" class="card">
			<div class="card-body" style="text-align: center; padding: 48px">
				<p class="text-secondary">
					Nessun risultato.
					<NuxtLink to="/app" style="color: var(--c-accent)"
						>Avvia una nuova estrazione.</NuxtLink
					>
				</p>
			</div>
		</div>

		<template v-else>
			<!-- Stats -->
			<div class="stats-row" style="margin-bottom: 24px">
				<div class="stat-card">
					<div class="stat-value">{{ result.rows.length }}</div>
					<div class="stat-label">Righe totali</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{{ uniqueEmployees.length }}</div>
					<div class="stat-label">Dipendenti</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{{ totalHours.toFixed(1) }}</div>
					<div class="stat-label">Ore totali</div>
				</div>
				<div class="stat-card">
					<div
						class="stat-value"
						:style="
							result.errors.length > 0
								? 'color:var(--c-danger)'
								: ''
						"
					>
						{{ result.errors.length }}
					</div>
					<div class="stat-label">Errori</div>
				</div>
			</div>

			<!-- Errors -->
			<Transition name="fade">
				<div
					v-if="result.errors.length > 0"
					class="status-bar warning"
					style="margin-bottom: 16px"
				>
					<svg
						width="15"
						height="15"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						style="flex-shrink: 0"
					>
						<path
							d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
						/>
						<line x1="12" y1="9" x2="12" y2="13" />
						<line x1="12" y1="17" x2="12.01" y2="17" />
					</svg>
					<span
						>{{ result.errors.length }} pagina/e non estratta/e:
						{{ result.errors.join(" · ") }}</span
					>
				</div>
			</Transition>

			<!-- ── Warnings: hour discrepancies ───────────────────────── -->
			<Transition name="fade">
				<div
					v-if="result.warnings?.length"
					class="card"
					style="margin-bottom: 24px; border-color: var(--c-warning)"
				>
					<div
						class="card-header"
						style="background: var(--c-warning-light)"
					>
						<div class="row gap-sm">
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="var(--c-warning)"
								stroke-width="2"
								style="flex-shrink: 0"
							>
								<path
									d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
								/>
								<line x1="12" y1="9" x2="12" y2="13" />
								<line x1="12" y1="17" x2="12.01" y2="17" />
							</svg>
							<span
								class="card-title"
								style="color: var(--c-warning)"
							>
								{{ result.warnings.length }} discrepanza/e nelle
								ore — verifica prima di scaricare
							</span>
						</div>
						<span
							class="badge"
							style="
								background: var(--c-warning-light);
								color: var(--c-warning);
							"
						>
							{{ acknowledgedCount }}/{{
								result.warnings.length
							}}
							verificate
						</span>
					</div>
					<div class="card-body stack stack-md">
						<p class="text-sm text-secondary">
							Le ore estratte non corrispondono al totale
							dichiarato nel PDF. Verifica ogni discrepanza e
							spunta la casella per confermare prima di poter
							scaricare.
						</p>
						<div
							v-for="(w, i) in result.warnings"
							:key="i"
							style="
								padding: 14px 16px;
								background: var(--c-bg);
								border-radius: var(--radius-md);
								display: flex;
								align-items: flex-start;
								gap: 12px;
							"
						>
							<input
								type="checkbox"
								:id="`warn-${i}`"
								v-model="acknowledged[i]"
								style="
									margin-top: 3px;
									flex-shrink: 0;
									cursor: pointer;
									width: 16px;
									height: 16px;
									accent-color: var(--c-accent);
								"
							/>
							<label
								:for="`warn-${i}`"
								style="cursor: pointer; flex: 1"
								class="stack stack-sm"
							>
								<span class="fw-500 text-sm">{{
									w.label
								}}</span>
								<span class="text-sm text-secondary">
									PDF dichiara
									<strong style="color: var(--c-text-primary)"
										>{{ w.declared.toFixed(2) }}h</strong
									>
									· estratte
									<strong style="color: var(--c-text-primary)"
										>{{ w.actual.toFixed(2) }}h</strong
									>
									· differenza
									<strong style="color: var(--c-danger)"
										>{{ w.diff.toFixed(2) }}h</strong
									>
								</span>
							</label>
						</div>

						<!-- Download blocked message -->
						<Transition name="fade">
							<div
								v-if="!canDownload"
								class="status-bar warning"
								style="margin-top: 4px"
							>
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									style="flex-shrink: 0"
								>
									<rect
										x="3"
										y="11"
										width="18"
										height="11"
										rx="2"
										ry="2"
									/>
									<path d="M7 11V7a5 5 0 0 1 10 0v4" />
								</svg>
								<span
									>Download bloccato — verifica tutte le
									{{ result.warnings.length }} discrepanze per
									sbloccare.</span
								>
							</div>
						</Transition>
					</div>
				</div>
			</Transition>

			<!-- Filter -->
			<div
				class="row row-between"
				style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap"
			>
				<select
					v-model="filterEmployee"
					class="form-select"
					style="width: auto; min-width: 200px"
				>
					<option value="">Tutti i dipendenti</option>
					<option v-for="e in uniqueEmployees" :key="e" :value="e">
						{{ e }}
					</option>
				</select>
				<span class="text-sm text-secondary"
					>{{ filteredRows.length }} righe</span
				>
			</div>

			<!-- Table -->
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Data</th>
							<th>Dipendente</th>
							<th>Ore (decimale)</th>
							<th>File sorgente</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(row, i) in filteredRows" :key="i">
							<td class="td-mono">{{ row.date }}</td>
							<td style="font-weight: 500">{{ row.employee }}</td>
							<td class="td-hours">
								{{
									row.hours % 1 === 0
										? row.hours.toFixed(0)
										: row.hours.toFixed(2)
								}}
							</td>
							<td
								class="text-secondary text-sm"
								style="
									max-width: 200px;
									overflow: hidden;
									text-overflow: ellipsis;
									white-space: nowrap;
								"
							>
								{{ row.sourceFile }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- Employee summary -->
			<div style="margin-top: 32px">
				<p class="section-label">Riepilogo per dipendente</p>
				<div class="table-wrap">
					<table>
						<thead>
							<tr>
								<th>Dipendente</th>
								<th>Giorni</th>
								<th>Ore totali</th>
								<th>Media/giorno</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="(s, i) in employeeSummaries" :key="i">
								<td style="font-weight: 500">{{ s.name }}</td>
								<td class="td-mono">{{ s.days }}</td>
								<td class="td-hours">
									{{ s.hours.toFixed(2) }}
								</td>
								<td class="td-mono text-secondary">
									{{ (s.hours / s.days).toFixed(2) }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "app" });

import type { ExtractionResult } from "~/types";

const result = ref<ExtractionResult | null>(null);
const isExporting = ref(false);
const filterEmployee = ref("");

// Acknowledgement state — one boolean per warning
const acknowledged = ref<boolean[]>([]);

const acknowledgedCount = computed(
	() => acknowledged.value.filter(Boolean).length,
);

const canDownload = computed(() => {
	if (!result.value) return false;
	if (!result.value.warnings?.length) return true;
	return acknowledged.value.every(Boolean);
});

onMounted(() => {
	try {
		const stored = sessionStorage.getItem("lul_result");
		if (stored) {
			result.value = JSON.parse(stored);
			// Initialize acknowledged array
			acknowledged.value = new Array(
				result.value?.warnings?.length ?? 0,
			).fill(false);
		}
	} catch {
		// ignore
	}
});

const filteredRows = computed(() => {
	if (!result.value) return [];
	if (!filterEmployee.value) return result.value.rows;
	return result.value.rows.filter((r) => r.employee === filterEmployee.value);
});

const uniqueEmployees = computed(() => {
	if (!result.value) return [];
	return [...new Set(result.value.rows.map((r) => r.employee))].sort();
});

const totalHours = computed(
	() => result.value?.rows.reduce((sum, r) => sum + r.hours, 0) ?? 0,
);

const employeeSummaries = computed(() => {
	if (!result.value) return [];
	const map = new Map<string, { hours: number; days: number }>();
	for (const row of result.value.rows) {
		const curr = map.get(row.employee) ?? { hours: 0, days: 0 };
		map.set(row.employee, {
			hours: curr.hours + row.hours,
			days: curr.days + 1,
		});
	}
	return [...map.entries()]
		.map(([name, s]) => ({ name, ...s }))
		.sort((a, b) => a.name.localeCompare(b.name));
});

async function downloadExcel() {
	if (!result.value || !canDownload.value) return;
	isExporting.value = true;

	try {
		const blob = await $fetch<Blob>("/api/export", {
			method: "POST",
			body: { rows: result.value.rows },
			responseType: "blob",
		});

		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		const years = [...new Set(result.value.rows.map((r) => r.year))]
			.sort()
			.join("-");
		a.download = `LUL_DB_ALL_${years}.xlsx`;
		a.click();
		URL.revokeObjectURL(url);
	} catch (err) {
		console.error("Export failed", err);
	} finally {
		isExporting.value = false;
	}
}
</script>
