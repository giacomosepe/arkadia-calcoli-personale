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
					<div class="stat-value">{{ toHHMM(totalHours) }}</div>
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

			<!-- ── Warnings: hour discrepancies ─────────────────────────────── -->
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
							{{ acknowledgedCount }}/{{ result.warnings.length }}
							verificate
						</span>
					</div>

					<div class="card-body stack stack-md">
						<p class="text-sm text-secondary">
							Le ore estratte non corrispondono al totale
							dichiarato nel PDF. Correggi la discrepanza oppure
							spunta la casella per confermare e sbloccare il
							download.
						</p>

						<!-- One block per warning -->
						<div
							v-for="(w, i) in result.warnings"
							:key="i"
							class="warning-block"
						>
							<!-- Warning summary row -->
							<div class="warning-summary-row">
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
										<strong
											style="color: var(--c-text-primary)"
											>{{ toHHMM(liveDeclared(w)) }}</strong
										>
										· estratte
										<strong
											style="color: var(--c-text-primary)"
											>{{ toHHMM(liveActual(w)) }}</strong
										>
										· differenza
										<strong
											:style="
												liveDiff(w) <= 0.1
													? 'color: var(--c-success)'
													: 'color: var(--c-danger)'
											"
										>
											{{ toHHMM(liveDiff(w)) }}
										</strong>
									</span>
								</label>
								<button
									class="btn btn-primary btn-sm"
									style="flex-shrink: 0"
									@click="toggleCorrection(i)"
								>
									{{
										correctionOpen[i]
											? "Chiudi"
											: "Correggi"
									}}
								</button>
							</div>

							<!-- Correction panel -->
							<Transition name="fade">
								<div
									v-if="correctionOpen[i]"
									class="correction-panel"
								>
									<button class="correction-title">
										Correggi discrepanza
									</button>

									<!-- Mode selector -->
									<div class="correction-modes">
										<label
											class="correction-mode"
											:class="{
												active:
													correctionMode[i] ===
													'rows',
											}"
										>
											<input
												type="radio"
												:name="`mode-${i}`"
												value="rows"
												v-model="correctionMode[i]"
												style="
													accent-color: var(
														--c-accent
													);
													flex-shrink: 0;
													margin-top: 2px;
												"
											/>
											<div>
												<p class="mode-label">
													Modifica tabella dei giorni
													lavorati
												</p>
												<p class="mode-sub">
													Seleziona un giorno e
													modifica o aggiungi le ore
												</p>
											</div>
										</label>
										<label
											class="correction-mode"
											:class="{
												active:
													correctionMode[i] ===
													'total',
											}"
										>
											<input
												type="radio"
												:name="`mode-${i}`"
												value="total"
												v-model="correctionMode[i]"
												style="
													accent-color: var(
														--c-accent
													);
													flex-shrink: 0;
													margin-top: 2px;
												"
											/>
											<div>
												<p class="mode-label">
													Modifica il totale del mese
												</p>
												<p class="mode-sub">
													Il totale dichiarato nel PDF
													è errato
												</p>
											</div>
										</label>
									</div>

									<!-- Mode A: edit / add a specific day -->
									<div
										v-if="correctionMode[i] === 'rows'"
										class="correction-content"
									>
										<div class="correction-field-row">
											<span class="correction-field-label"
												>Giorno</span
											>
											<input
												type="date"
												class="form-input correction-date-input"
												:value="correctionDate[i] ?? ''"
												:min="`${w.year}-${String(w.month).padStart(2, '0')}-01`"
												:max="`${w.year}-${String(w.month).padStart(2, '0')}-31`"
												@change="
													onDateChange(
														i,
														w,
														(
															$event.target as HTMLInputElement
														).value,
													)
												"
											/>
											<span
												v-if="correctionDate[i]"
												class="correction-current-value"
											>
												{{
													currentDayValue(
														w,
														correctionDate[i],
													) !== null
														? `Valore attuale: ${toHHMM(currentDayValue(w, correctionDate[i])!)}`
														: "Giorno non presente — verrà aggiunto"
												}}
											</span>
										</div>
										<div
											class="divider"
											style="margin: 8px 0"
										/>
										<div class="correction-field-row">
											<span class="correction-field-label"
												>Ore corrette</span
											>
											<input
												type="number"
												class="form-input correction-hours-input"
												v-model.number="
													correctionHours[i]
												"
												min="0"
												max="24"
												step="0.5"
												placeholder="0"
											/>
											<span class="correction-hint"
												>Inserisci 0 per rimuovere il
												giorno</span
											>
										</div>
										<div class="correction-footer">
											<span class="correction-preview">
												Totale dopo correzione:
												<strong
													:style="
														previewTotal(w, i) !==
															null &&
														Math.abs(
															liveDeclared(w) -
																previewTotal(
																	w,
																	i,
																)!,
														) <= 0.1
															? 'color: var(--c-success)'
															: 'color: var(--c-text-primary)'
													"
												>
													{{
														previewTotal(w, i) !== null
															? toHHMM(previewTotal(w, i)!)
															: "—"
													}}
													}}
												</strong>
											</span>
											<button
												class="btn btn-primary btn-sm"
												:disabled="
													!correctionDate[i] ||
													correctionHours[i] === null
												"
												@click="
													applyRowCorrection(i, w)
												"
											>
												Applica →
											</button>
										</div>
									</div>

									<!-- Mode B: override declared total -->
									<div
										v-if="correctionMode[i] === 'total'"
										class="correction-content"
									>
										<div class="correction-field-row">
											<span class="correction-field-label"
												>Totale corretto</span
											>
											<input
												type="number"
												class="form-input correction-hours-input"
												v-model.number="
													correctionNewTotal[i]
												"
												min="0"
												step="0.5"
												:placeholder="
													w.declared.toFixed(2)
												"
											/>
											<span class="correction-hint"
												>Sostituisce il totale
												dichiarato dal PDF</span
											>
										</div>
										<div class="correction-footer">
											<span class="correction-preview">
												Nuovo totale dichiarato:
												<strong
													:style="
														correctionNewTotal[
															i
														] !== null &&
														Math.abs(
															Number(
																correctionNewTotal[
																	i
																],
															) - liveActual(w),
														) <= 0.1
															? 'color: var(--c-success)'
															: 'color: var(--c-text-primary)'
													"
												>
													{{
														correctionNewTotal[
															i
														] !== null
															? toHHMM(Number(correctionNewTotal[i]))
															: "—"
													}}
												</strong>
											</span>
											<button
												class="btn btn-primary btn-sm"
												:disabled="
													correctionNewTotal[i] ===
													null
												"
												@click="
													applyTotalCorrection(i, w)
												"
											>
												Applica →
											</button>
										</div>
									</div>
								</div>
							</Transition>
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
							<th>Ore</th>
							<th>File sorgente</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(row, i) in filteredRows" :key="i">
							<td class="td-mono">{{ row.date }}</td>
							<td style="font-weight: 500">{{ row.employee }}</td>
							<td class="td-hours">{{ toHHMM(row.hours) }}</td>
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
									{{ toHHMM(s.hours) }}
								</td>
								<td class="td-mono text-secondary">
									{{ toHHMM(s.hours / s.days) }}
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
import { toHHMM } from '~/utils/format'
definePageMeta({ layout: "app" });

import type {
	ExtractionResult,
	ExtractionWarning,
	ExtractedRow,
} from "~/types";

const result = ref<ExtractionResult | null>(null);
const isExporting = ref(false);
const filterEmployee = ref("");

// ── Acknowledgement ──────────────────────────────────────────────────
const acknowledged = ref<boolean[]>([]);
const acknowledgedCount = computed(
	() => acknowledged.value.filter(Boolean).length,
);
const canDownload = computed(() => {
	if (!result.value) return false;
	if (!result.value.warnings?.length) return true;
	return acknowledged.value.every(Boolean);
});

// ── Correction UI state (one entry per warning index) ────────────────
const correctionOpen = ref<boolean[]>([]);
const correctionMode = ref<Array<"rows" | "total">>([]);
const correctionDate = ref<Array<string | null>>([]);
const correctionHours = ref<Array<number | null>>([]);
const correctionNewTotal = ref<Array<number | null>>([]);

// Stores overridden declared totals keyed by "employee__month__year"
const overriddenDeclared = ref<Map<string, number>>(new Map());

function warningKey(w: ExtractionWarning): string {
	return `${w.employee}__${w.month}__${w.year}`;
}

function toggleCorrection(i: number) {
	correctionOpen.value[i] = !correctionOpen.value[i];
}

// ── Live computations ────────────────────────────────────────────────

// Sum of all rows for this employee+month (reacts to row mutations)
function liveActual(w: ExtractionWarning): number {
	if (!result.value) return w.actual;
	const sum = result.value.rows
		.filter(
			(r) =>
				r.employee === w.employee &&
				r.month === w.month &&
				r.year === w.year,
		)
		.reduce((acc, r) => acc + r.hours, 0);
	return Math.round(sum * 10000) / 10000;
}

// Declared total — may be overridden by user
function liveDeclared(w: ExtractionWarning): number {
	return overriddenDeclared.value.get(warningKey(w)) ?? w.declared;
}

// Absolute difference between declared and actual
function liveDiff(w: ExtractionWarning): number {
	return (
		Math.round(Math.abs(liveDeclared(w) - liveActual(w)) * 10000) / 10000
	);
}

// ── Date picker helpers ──────────────────────────────────────────────

function onDateChange(i: number, w: ExtractionWarning, dateStr: string) {
	correctionDate.value[i] = dateStr;
	const existing = currentDayValue(w, dateStr);
	// Pre-fill hours with existing value, or 0 for a new day
	correctionHours.value[i] = existing ?? 0;
}

// Returns the current hours for a given day, or null if not present
function currentDayValue(
	w: ExtractionWarning,
	dateStr: string | null,
): number | null {
	if (!dateStr || !result.value) return null;
	const day = parseInt(dateStr.split("-")[2]);
	const row = result.value.rows.find(
		(r) =>
			r.employee === w.employee &&
			r.month === w.month &&
			r.year === w.year &&
			r.day === day,
	);
	return row ? row.hours : null;
}

// Preview what the new total would be if the pending correction were applied
function previewTotal(w: ExtractionWarning, i: number): number | null {
	if (
		!result.value ||
		!correctionDate.value[i] ||
		correctionHours.value[i] === null
	)
		return null;
	const day = parseInt(correctionDate.value[i]!.split("-")[2]);
	const newHours = correctionHours.value[i]!;
	const sumWithoutDay = result.value.rows
		.filter(
			(r) =>
				r.employee === w.employee &&
				r.month === w.month &&
				r.year === w.year &&
				r.day !== day,
		)
		.reduce((acc, r) => acc + r.hours, 0);
	return (
		Math.round((sumWithoutDay + (newHours > 0 ? newHours : 0)) * 10000) /
		10000
	);
}

// ── Apply corrections ────────────────────────────────────────────────

function applyRowCorrection(i: number, w: ExtractionWarning) {
	if (
		!result.value ||
		!correctionDate.value[i] ||
		correctionHours.value[i] === null
	)
		return;

	const parts = correctionDate.value[i]!.split("-");
	const year = parseInt(parts[0]);
	const month = parseInt(parts[1]);
	const day = parseInt(parts[2]);
	const newHours = correctionHours.value[i]!;

	const existingIdx = result.value.rows.findIndex(
		(r) =>
			r.employee === w.employee &&
			r.year === year &&
			r.month === month &&
			r.day === day,
	);

	if (newHours <= 0) {
		// Remove the row if it exists
		if (existingIdx !== -1) result.value.rows.splice(existingIdx, 1);
	} else if (existingIdx !== -1) {
		// Update existing row in place
		result.value.rows[existingIdx].hours = newHours;
	} else {
		// Add new row for a previously missing day
		const dateStr = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
		const newRow: ExtractedRow = {
			date: dateStr,
			employee: w.employee,
			hours: newHours,
			month,
			year,
			day,
			sourceFile: "correzione manuale",
		};
		result.value.rows.push(newRow);
		// Keep rows sorted
		result.value.rows.sort((a, b) => {
			const name = a.employee.localeCompare(b.employee);
			if (name !== 0) return name;
			if (a.year !== b.year) return a.year - b.year;
			if (a.month !== b.month) return a.month - b.month;
			return a.day - b.day;
		});
	}

	// Reset correction fields for this warning
	correctionDate.value[i] = null;
	correctionHours.value[i] = null;

	// Auto-acknowledge and close if diff is now within tolerance
	if (liveDiff(w) <= 0.1) {
		acknowledged.value[i] = true;
		correctionOpen.value[i] = false;
	}

	// Persist to sessionStorage so a page refresh keeps the corrections
	sessionStorage.setItem("lul_result", JSON.stringify(result.value));
}

function applyTotalCorrection(i: number, w: ExtractionWarning) {
	if (correctionNewTotal.value[i] === null) return;
	overriddenDeclared.value.set(
		warningKey(w),
		Number(correctionNewTotal.value[i]),
	);
	correctionNewTotal.value[i] = null;

	if (liveDiff(w) <= 0.1) {
		acknowledged.value[i] = true;
		correctionOpen.value[i] = false;
	}
}

// ── Mount ────────────────────────────────────────────────────────────
onMounted(() => {
	try {
		const stored = sessionStorage.getItem("lul_result");
		if (stored) {
			result.value = JSON.parse(stored);
			const len = result.value?.warnings?.length ?? 0;
			acknowledged.value = new Array(len).fill(false);
			correctionOpen.value = new Array(len).fill(false);
			correctionMode.value = new Array(len).fill("rows");
			correctionDate.value = new Array(len).fill(null);
			correctionHours.value = new Array(len).fill(null);
			correctionNewTotal.value = new Array(len).fill(null);
		}
	} catch {
		// ignore
	}
});

// ── Computed ─────────────────────────────────────────────────────────
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

// ── Download ─────────────────────────────────────────────────────────
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

<style scoped>
/* Warning block — wraps summary row + correction panel together */
.warning-block {
	display: flex;
	flex-direction: column;
	background: var(--c-bg);
	border-radius: var(--radius-md);
	overflow: hidden;
}

.warning-summary-row {
	padding: 14px 16px;
	display: flex;
	align-items: flex-start;
	gap: 12px;
}

/* Correction panel slides in below the summary row */
.correction-panel {
	border-top: 1px solid var(--c-border);
	background: var(--c-accent-light);
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.correction-title {
	font-size: 0.6875rem;
	font-weight: 700;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--c-accent);
}

/* Two-option mode selector */
.correction-modes {
	display: flex;
	gap: 8px;
}

.correction-mode {
	flex: 1;
	display: flex;
	align-items: flex-start;
	gap: 8px;
	padding: 10px 12px;
	background: var(--c-surface);
	border: 1.5px solid var(--c-border);
	border-radius: var(--radius-md);
	cursor: pointer;
	transition: border-color 0.15s;
}

.correction-mode.active {
	border-color: var(--c-accent);
}

.mode-label {
	font-size: 0.8125rem;
	font-weight: 500;
	color: var(--c-text-primary);
	margin: 0 0 2px;
}

.mode-sub {
	font-size: 0.75rem;
	color: var(--c-text-secondary);
	margin: 0;
}

/* White content box inside the correction panel */
.correction-content {
	background: var(--c-surface);
	border: 1px solid var(--c-border);
	border-radius: var(--radius-md);
	padding: 14px 16px;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.correction-field-row {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
}

.correction-field-label {
	font-size: 0.8125rem;
	color: var(--c-text-secondary);
	min-width: 110px;
	flex-shrink: 0;
}

.correction-date-input {
	width: 170px;
}

.correction-hours-input {
	width: 90px;
	text-align: right;
}

.correction-current-value {
	font-size: 0.8125rem;
	color: var(--c-text-secondary);
	background: var(--c-bg);
	border-radius: var(--radius-sm);
	padding: 4px 8px;
}

.correction-hint {
	font-size: 0.75rem;
	color: var(--c-text-tertiary);
	font-style: italic;
}

.correction-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding-top: 4px;
}

.correction-preview {
	font-size: 0.8125rem;
	color: var(--c-text-secondary);
}

/* Responsive */
@media (max-width: 768px) {
	.correction-modes {
		flex-direction: column;
	}
	.correction-field-row {
		flex-direction: column;
		align-items: flex-start;
	}
	.correction-date-input,
	.correction-hours-input {
		width: 100%;
	}
}
</style>
