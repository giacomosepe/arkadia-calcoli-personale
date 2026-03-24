<template>
	<div class="page-content">
		<div class="stack stack-sm" style="margin-bottom: 32px">
			<h1 class="page-title">Estrai ore presenze</h1>
			<p class="page-subtitle">
				Carica i PDF del LUL (uno o più mesi, uno o più dipendenti) e
				avvia l'estrazione.
			</p>
		</div>

		<div
			class="two-col"
			style="
				display: grid;
				grid-template-columns: 1fr 320px;
				gap: 24px;
				align-items: start;
			"
		>
			<!-- Drop zone -->
			<div class="stack stack-md">
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
						Qualsiasi combinazione di mesi e dipendenti · solo .pdf
					</p>
				</div>

				<Transition name="fade">
					<div v-if="files.length > 0" class="card">
						<div class="card-header">
							<span class="card-title"
								>{{ files.length }} file selezionati</span
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
									max-height: 240px;
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
											color: var(--c-text-tertiary);
										"
									>
										<path
											d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
										/>
										<polyline points="14 2 14 8 20 8" />
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

			<!-- Config panel -->
			<div class="stack stack-md">
				<div class="card">
					<div class="card-header">
						<span class="card-title">Configurazione</span>
					</div>
					<div class="card-body stack stack-md">
						<div class="form-group">
							<label class="form-label">
								Colonna ore giornaliere nel PDF
							</label>
							<input
								v-model="dailyColumn"
								class="form-input"
								placeholder="H Ord"
								spellcheck="false"
							/>
							<p class="text-sm text-secondary mt-sm">
								Esattamente come appare nell'intestazione della
								tabella GIORNO del PDF. Default:
								<code
									style="
										background: var(--c-bg);
										padding: 1px 6px;
										border-radius: 4px;
										font-size: 0.75rem;
									"
									>H Ord</code
								>
							</p>
						</div>

						<div class="form-group">
							<label class="form-label">
								Etichetta nel riepilogo VOCI
							</label>
							<input
								v-model="summaryLabel"
								class="form-input"
								placeholder="ORE ORDINARIE"
								spellcheck="false"
							/>
							<p class="text-sm text-secondary mt-sm">
								Come appare nella tabella VOCI in fondo al PDF.
								Default:
								<code
									style="
										background: var(--c-bg);
										padding: 1px 6px;
										border-radius: 4px;
										font-size: 0.75rem;
									"
									>ORE ORDINARIE</code
								>
							</p>
						</div>

						<div class="divider" style="margin: 4px 0" />

						<button
							class="btn btn-primary"
							style="width: 100%; justify-content: center"
							:disabled="!canRun || isProcessing"
							@click="runExtraction"
						>
							<span v-if="isProcessing" class="spinner" />
							<svg
								v-else
								width="15"
								height="15"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<polygon points="5 3 19 12 5 21 5 3" />
							</svg>
							{{
								isProcessing
									? `Elaborazione PDF ${currentFile}/${files.length}…`
									: "Avvia estrazione"
							}}
						</button>
					</div>
				</div>

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
		</div>
	</div>
</template>

<script setup lang="ts">
import type { ExtractionResult } from "~/types";

definePageMeta({
	layout: 'app',
	middleware: 'auth',
})

const files = ref<File[]>([]);
const isDragging = ref(false);
const dailyColumn = ref("H Ord");
const summaryLabel = ref("ORE ORDINARIE");
const isProcessing = ref(false);
const currentFile = ref(0);
const statusMessage = ref("");
const statusType = ref<"processing" | "success" | "error" | "warning">(
	"processing",
);
const errors = ref<string[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);

const canRun = computed(() => files.value.length > 0);

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

async function runExtraction() {
	if (!canRun.value) return;
	isProcessing.value = true;
	errors.value = [];
	statusType.value = "processing";
	statusMessage.value = `Invio di ${files.value.length} PDF a Claude…`;
	currentFile.value = 0;

	try {
		const formData = new FormData();
		formData.append("dailyColumn", dailyColumn.value || "H Ord");
		formData.append("summaryLabel", summaryLabel.value || "ORE ORDINARIE");
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
			return;
		}

		statusType.value = "success";
		statusMessage.value = `${result.rows.length} righe estratte · ${result.totalEmployees} dipendenti · ${result.totalMonths} mesi`;

		sessionStorage.setItem("lul_result", JSON.stringify(result));
		router.push("/app/results");
	} catch (err: unknown) {
		statusType.value = "error";
		statusMessage.value = `Errore: ${err instanceof Error ? err.message : "Errore sconosciuto"}`;
	} finally {
		isProcessing.value = false;
	}
}
</script>
