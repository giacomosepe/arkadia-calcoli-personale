<template>
	<div class="page-content">
		<!-- ── Page header ──────────────────────────────────────────── -->
		<div class="stack stack-sm" style="margin-bottom: 32px">
			<h1 class="page-title">Estrai ore presenze</h1>
			<p class="page-subtitle">
				Carica i PDF del LUL e avvia l'estrazione, oppure rigenera le
				schede da un file Excel esistente.
			</p>
		</div>

		<!-- ══ SECTION 1 — Parti dai PDF ════════════════════════════ -->
		<p class="section-heading">Parti dai PDF</p>
		<div class="outer-panel">
			<!-- Two-column grid: config LEFT, upload RIGHT -->
			<div class="inner-grid">
				<!-- LEFT — Configurazione: steps 1 + 2 -->
				<div class="card">
					<div class="card-header">
						<span class="card-title">Configurazione</span>
					</div>
					<div class="card-body stack stack-md">
						<div class="step-row">
							<span class="step-badge">1</span>
							<div class="form-group" style="flex: 1">
								<label class="form-label">
									Colonna ore giornaliere nel PDF
									<span style="color: var(--c-danger)"
										>*</span
									>
								</label>
								<input
									v-model="dailyColumn"
									class="form-input"
									:style="
										dailyColumn.trim() === '' &&
										showValidation
											? 'border-color: var(--c-danger)'
											: ''
									"
									placeholder="es. H Ord"
									spellcheck="false"
								/>
								<p class="text-sm text-secondary mt-sm">
									Esattamente come appare nell'intestazione
									della tabella GIORNO del PDF.
								</p>
							</div>
						</div>

						<div class="step-row">
							<span class="step-badge">2</span>
							<div class="form-group" style="flex: 1">
								<label class="form-label">
									Etichetta nel sommario totale mensile del
									PDF
									<span style="color: var(--c-danger)"
										>*</span
									>
								</label>
								<input
									v-model="summaryLabel"
									class="form-input"
									:style="
										summaryLabel.trim() === '' &&
										showValidation
											? 'border-color: var(--c-danger)'
											: ''
									"
									placeholder="es. ORE ORDINARIE"
									spellcheck="false"
								/>
								<p class="text-sm text-secondary mt-sm">
									Come appare nella tabella di sommario nel
									PDF.
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- RIGHT — Carica i PDF: step 3 -->
				<div class="card">
					<div class="card-header">
						<span class="card-title">Carica i PDF</span>
						<span class="step-badge">3</span>
					</div>
					<div class="card-body stack stack-md">
						<div
							class="drop-zone"
							:class="{ 'drag-over': isDragging }"
							@dragover.prevent="isDragging = true"
							@dragleave="isDragging = false"
							@drop.prevent="handleDrop"
							@click="fileInput?.click()"
						>
							<input
								ref="fileInput"
								type="file"
								accept=".pdf"
								multiple
								style="display: none"
								@change="handleFileChange"
							/>
							<div class="drop-icon">
								<svg
									width="22"
									height="22"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
								>
									<path
										d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
									/>
									<polyline points="14 2 14 8 20 8" />
									<line x1="12" y1="18" x2="12" y2="12" />
									<line x1="9" y1="15" x2="15" y2="15" />
								</svg>
							</div>
							<p class="drop-title">Trascina i PDF qui</p>
							<p class="drop-subtitle">
								Qualsiasi combinazione di mesi e dipendenti ·
								solo .pdf
							</p>
						</div>

						<!-- File list appears after upload -->
						<Transition name="fade">
							<div v-if="files.length > 0" class="card">
								<div class="card-header">
									<span class="card-title"
										>{{ files.length }} file
										selezionati</span
									>
									<button
										class="btn btn-ghost btn-sm"
										@click="clearFiles"
									>
										Rimuovi tutti
									</button>
								</div>
								<div class="card-body" style="padding: 12px">
									<div
										class="file-list"
										style="
											margin: 0;
											max-height: 200px;
											overflow-y: auto;
										"
									>
										<div
											v-for="(file, i) in files"
											:key="i"
											class="file-item"
										>
											<svg
												width="14"
												height="14"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												style="
													flex-shrink: 0;
													color: var(
														--c-text-tertiary
													);
												"
											>
												<path
													d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
												/>
												<polyline
													points="14 2 14 8 20 8"
												/>
											</svg>
											<span class="file-name">{{
												file.name
											}}</span>
											<span class="file-size">{{
												formatSize(file.size)
											}}</span>
											<button
												class="file-remove"
												@click.stop="removeFile(i)"
											>
												<svg
													width="14"
													height="14"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
												>
													<line
														x1="18"
														y1="6"
														x2="6"
														y2="18"
													/>
													<line
														x1="6"
														y1="6"
														x2="18"
														y2="18"
													/>
												</svg>
											</button>
										</div>
									</div>
								</div>
							</div>
						</Transition>
					</div>
				</div>
			</div>

			<!-- Divider -->
			<div class="divider" style="margin: 4px 0" />

			<!-- Full-width launch area: status left, button+API right -->
			<div class="launch-area">
				<div class="launch-status">
					<Transition name="fade">
						<p
							v-if="showValidation && !canRun"
							class="text-sm"
							style="color: var(--c-danger)"
						>
							Compila tutti i campi obbligatori e carica almeno un
							PDF.
						</p>
					</Transition>
					<Transition name="fade">
						<div
							v-if="statusMessage"
							:class="`status-bar ${statusType}`"
						>
							<span v-if="isProcessing" class="spinner" />
							<span>{{ statusMessage }}</span>
						</div>
					</Transition>
					<Transition name="fade">
						<div
							v-if="errors.length > 0"
							class="card"
							style="border-color: var(--c-danger)"
						>
							<div class="card-header">
								<span
									class="card-title"
									style="color: var(--c-danger)"
									>Errori ({{ errors.length }})</span
								>
							</div>
							<div
								class="card-body stack stack-sm"
								style="font-size: 0.8125rem"
							>
								<p
									v-for="(e, i) in errors"
									:key="i"
									style="color: var(--c-danger)"
								>
									{{ e }}
								</p>
							</div>
						</div>
					</Transition>
				</div>

				<div class="launch-action">
					<button
						class="btn btn-primary"
						style="width: 100%; justify-content: center"
						:disabled="isProcessing"
						@click="handleRunClick"
					>
						<svg
							width="15"
							height="15"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<polygon points="5 3 19 12 5 21 5 3" />
						</svg>
						Avvia estrazione
					</button>
					<div class="api-status-row">
						<span class="text-sm text-secondary"
							>Connessione ad Anthropic</span
						>
						<span
							class="badge"
							:class="
								apiConfig?.hasAnthropicKey
									? 'badge-green'
									: 'badge-red'
							"
						>
							{{ apiConfig?.hasAnthropicKey ? "OK" : "Missing" }}
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- ══ SECTION 2 — Parti dal database ═══════════════════════ -->
		<p class="section-heading" style="margin-top: 48px">
			Parti dal database
		</p>
		<div class="outer-panel">
			<NuxtLink to="/app/pivot" class="db-card">
				<div class="excel-icon">
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
						<path
							d="M2 4.5C2 3.67 2.67 3 3.5 3H12l5 5v11.5c0 .83-.67 1.5-1.5 1.5h-13C2.67 21 2 20.33 2 19.5V4.5z"
							fill="white"
							opacity="0.2"
						/>
						<text
							x="3.5"
							y="16"
							font-size="7.5"
							font-weight="700"
							fill="white"
							font-family="system-ui, sans-serif"
						>
							XLS
						</text>
						<rect
							x="13.5"
							y="12.5"
							width="8"
							height="6.5"
							rx="0.75"
							fill="white"
							opacity="0.2"
						/>
						<line
							x1="14.5"
							y1="14.5"
							x2="20.5"
							y2="14.5"
							stroke="white"
							stroke-width="0.9"
							opacity="0.85"
						/>
						<line
							x1="14.5"
							y1="16.5"
							x2="20.5"
							y2="16.5"
							stroke="white"
							stroke-width="0.9"
							opacity="0.85"
						/>
						<line
							x1="17.5"
							y1="12.5"
							x2="17.5"
							y2="19"
							stroke="white"
							stroke-width="0.9"
							opacity="0.85"
						/>
					</svg>
				</div>
				<div style="flex: 1">
					<p class="db-card-title">Hai già il file Excel DB ALL?</p>
					<p class="db-card-subtitle">
						Rigenera le schede dipendenti senza riestrarre i PDF.
					</p>
				</div>
				<span class="btn btn-secondary btn-sm" style="flex-shrink: 0">
					Rigenera schede →
				</span>
			</NuxtLink>
		</div>

		<!-- ── Confirmation Modal ────────────────────────────────────── -->
		<Transition name="fade">
			<div
				v-if="showModal"
				style="
					position: fixed;
					inset: 0;
					z-index: 200;
					background: rgba(0, 0, 0, 0.45);
					display: flex;
					align-items: center;
					justify-content: center;
					padding: 24px;
				"
				@click.self="showModal = false"
			>
				<div
					class="card"
					style="
						width: 100%;
						max-width: 480px;
						box-shadow: var(--shadow-lg);
					"
				>
					<div class="card-header">
						<span class="card-title">Conferma estrazione</span>
					</div>
					<div class="card-body stack stack-md">
						<div
							style="
								background: var(--c-bg);
								border-radius: var(--radius-md);
								padding: 14px 16px;
							"
						>
							<p
								class="text-sm fw-500"
								style="margin-bottom: 8px"
							>
								File da elaborare ({{ files.length }}):
							</p>
							<div
								class="stack stack-sm"
								style="max-height: 160px; overflow-y: auto"
							>
								<p
									v-for="(file, i) in files"
									:key="i"
									class="text-sm text-secondary"
								>
									{{ file.name }}
								</p>
							</div>
						</div>
						<div
							style="
								background: var(--c-bg);
								border-radius: var(--radius-md);
								padding: 14px 16px;
							"
							class="stack stack-sm"
						>
							<p class="text-sm">
								<span class="fw-500">Colonna ore:</span>
								<code
									style="
										background: var(--c-surface);
										padding: 1px 6px;
										border-radius: 4px;
										font-size: 0.75rem;
										margin-left: 6px;
									"
									>{{ dailyColumn }}</code
								>
							</p>
							<p class="text-sm">
								<span class="fw-500">Etichetta Totale:</span>
								<code
									style="
										background: var(--c-surface);
										padding: 1px 6px;
										border-radius: 4px;
										font-size: 0.75rem;
										margin-left: 6px;
									"
									>{{ summaryLabel }}</code
								>
							</p>
						</div>
						<button
							class="btn btn-primary btn-lg"
							style="width: 100%; justify-content: center"
							:disabled="isProcessing"
							@click="confirmExtraction"
						>
							<span v-if="isProcessing" class="spinner" />
							<svg
								v-else
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<polygon points="5 3 19 12 5 21 5 3" />
							</svg>
							{{
								isProcessing
									? "Elaborazione in corso…"
									: "Conferma estrazione"
							}}
						</button>
						<p
							class="text-sm text-secondary"
							style="text-align: center; line-height: 1.5"
						>
							Una volta confermata, l'operazione non può essere
							annullata.
						</p>
						<button
							v-if="!isProcessing"
							class="btn btn-ghost"
							style="width: 100%; justify-content: center"
							@click="showModal = false"
						>
							Annulla
						</button>
					</div>
				</div>
			</div>
		</Transition>
	</div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "app" });

import type { ExtractionResult } from "~/types";

const files = ref<File[]>([]);
const isDragging = ref(false);
const dailyColumn = ref("");
const summaryLabel = ref("");
const isProcessing = ref(false);
const statusMessage = ref("");
const statusType = ref<"processing" | "success" | "error" | "warning">(
	"processing",
);
const errors = ref<string[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const showModal = ref(false);
const showValidation = ref(false);

const { data: apiConfig } = await useFetch("/api/check-config");

const canRun = computed(
	() =>
		files.value.length > 0 &&
		dailyColumn.value.trim() !== "" &&
		summaryLabel.value.trim() !== "",
);

function handleRunClick() {
	showValidation.value = true;
	if (!canRun.value) return;
	showModal.value = true;
}

function handleDrop(e: DragEvent) {
	isDragging.value = false;
	addFiles(
		Array.from(e.dataTransfer?.files ?? []).filter((f) =>
			f.name.toLowerCase().endsWith(".pdf"),
		),
	);
}

function handleFileChange(e: Event) {
	addFiles(Array.from((e.target as HTMLInputElement).files ?? []));
	(e.target as HTMLInputElement).value = "";
}

function addFiles(newFiles: File[]) {
	const existing = new Set(files.value.map((f) => f.name));
	files.value = [
		...files.value,
		...newFiles.filter((f) => !existing.has(f.name)),
	];
}

function removeFile(i: number) {
	files.value = files.value.filter((_, idx) => idx !== i);
}

function clearFiles() {
	files.value = [];
}

function formatSize(b: number) {
	if (b < 1024) return `${b} B`;
	if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
	return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

const router = useRouter();

async function confirmExtraction() {
	isProcessing.value = true;
	errors.value = [];
	statusType.value = "processing";
	statusMessage.value = `Invio di ${files.value.length} PDF a Claude…`;

	try {
		const formData = new FormData();
		formData.append("dailyColumn", dailyColumn.value);
		formData.append("summaryLabel", summaryLabel.value);
		files.value.forEach((f) => formData.append("files", f));

		statusMessage.value = "Claude sta analizzando i documenti…";

		const result = await $fetch<ExtractionResult>("/api/extract", {
			method: "POST",
			body: formData,
		});

		if (result.errors?.length) errors.value = result.errors;

		if (result.rows.length === 0) {
			statusType.value = "warning";
			statusMessage.value =
				"Nessuna riga estratta. Controlla i file e riprova.";
			showModal.value = false;
			return;
		}

		statusType.value = "success";
		statusMessage.value = `${result.rows.length} righe estratte · ${result.totalEmployees} dipendenti · ${result.totalMonths} mesi`;

		sessionStorage.setItem("lul_result", JSON.stringify(result));
		router.push("/app/results");
	} catch (err: unknown) {
		statusType.value = "error";
		statusMessage.value = `Errore: ${err instanceof Error ? err.message : "Errore sconosciuto"}`;
		showModal.value = false;
	} finally {
		isProcessing.value = false;
	}
}
</script>

<style scoped>
.section-heading {
	font-size: 1.1rem;
	font-weight: 600;
	letter-spacing: -0.02em;
	color: var(--c-text-primary);
	margin-bottom: 14px;
}

/* Outer panel — transparent bg, subtle border, same style for both sections */
.outer-panel {
	background: transparent;
	border: 1px solid var(--c-border);
	border-radius: var(--radius-xl);
	padding: 20px;
	display: flex;
	flex-direction: column;
	gap: 16px;
}

/* 50/50 grid: config left, upload right */
.inner-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 16px;
	align-items: start;
}

/* Numbered step badge */
.step-badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	border-radius: 50%;
	background: var(--c-accent);
	color: white;
	font-size: 0.75rem;
	font-weight: 600;
	flex-shrink: 0;
}

/* Step row inside config card */
.step-row {
	display: flex;
	gap: 12px;
	align-items: flex-start;
}

/* Full-width launch area: status left, button+API right */
.launch-area {
	display: flex;
	align-items: flex-end;
	gap: 20px;
}

.launch-status {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 10px;
	min-width: 0;
}

.launch-action {
	width: 240px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

/* API status row sits directly under the button */
.api-status-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

/* White inner card inside the database outer panel */
.db-card {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 18px 20px;
	background: var(--c-surface);
	border: 1px solid var(--c-border);
	border-radius: var(--radius-lg);
	text-decoration: none;
	transition:
		border-color 0.15s,
		box-shadow 0.15s;
}

.db-card:hover {
	border-color: var(--c-border-strong);
	box-shadow: var(--shadow-sm);
}

.excel-icon {
	width: 48px;
	height: 48px;
	border-radius: var(--radius-md);
	background: #1d6f42;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.db-card-title {
	font-size: 0.9375rem;
	font-weight: 600;
	color: var(--c-text-primary);
	margin-bottom: 3px;
}

.db-card-subtitle {
	font-size: 0.8125rem;
	color: var(--c-text-secondary);
}

/* Responsive — Tailwind md breakpoint equivalent */
@media (max-width: 768px) {
	.inner-grid {
		grid-template-columns: 1fr;
	}

	.launch-area {
		flex-direction: column;
		align-items: stretch;
	}

	.launch-action {
		width: 100%;
	}

	.db-card {
		flex-wrap: wrap;
	}
}
</style>
