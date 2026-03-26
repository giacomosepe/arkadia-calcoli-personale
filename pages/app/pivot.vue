<template>
	<div class="page-content">
		<!-- ── Page header ──────────────────────────────────────────── -->
		<div class="stack stack-sm" style="margin-bottom: 32px">
			<h1 class="page-title">Genera schede dipendenti</h1>
			<p class="page-subtitle">
				Carica il file con la lista dei dipendenti e le ore lavorate
				prodotto dall'estrazione.
			</p>
		</div>

		<div
			class="two-col"
			style="
				display: grid;
				grid-template-columns: 1fr 300px;
				gap: 24px;
				align-items: start;
			"
		>
			<!-- Upload area -->
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
						accept=".xlsx,.xls"
						style="display: none"
						@change="handleFileChange"
					/>
					<div class="drop-icon">
						<svg
							width="48"
							height="48"
							viewBox="0 0 80 80"
							fill="none"
						>
							<rect
								width="80"
								height="80"
								rx="18"
								fill="#1D6F42"
							/>
							<rect
								x="12"
								y="10"
								width="36"
								height="46"
								rx="4"
								fill="white"
							/>
							<path d="M38 10 L38 22 L50 22 Z" fill="#C8E6C9" />
							<path d="M38 10 L50 22 L38 22 Z" fill="#1B5E20" />
							<rect
								x="17"
								y="27"
								width="26"
								height="2"
								rx="1"
								fill="#E0E0E0"
							/>
							<rect
								x="17"
								y="31"
								width="26"
								height="2"
								rx="1"
								fill="#E0E0E0"
							/>
							<rect
								x="17"
								y="35"
								width="26"
								height="2"
								rx="1"
								fill="#E0E0E0"
							/>
							<rect
								x="17"
								y="39"
								width="26"
								height="2"
								rx="1"
								fill="#E0E0E0"
							/>
							<line
								x1="25"
								y1="25"
								x2="25"
								y2="43"
								stroke="#E0E0E0"
								stroke-width="1.5"
							/>
							<line
								x1="33"
								y1="25"
								x2="33"
								y2="43"
								stroke="#E0E0E0"
								stroke-width="1.5"
							/>
							<rect
								x="50"
								y="38"
								width="18"
								height="22"
								rx="5"
								fill="#145A32"
							/>
							<text
								x="59"
								y="51"
								text-anchor="middle"
								font-family="system-ui, sans-serif"
								font-size="8.5"
								font-weight="800"
								fill="white"
							>
								XLS
							</text>
							<circle cx="60" cy="13" r="5" fill="#FFD600" />
							<circle cx="60" cy="13" r="2.5" fill="white" />
						</svg>
					</div>
					<p class="drop-title">
						{{
							selectedFile
								? selectedFile.name
								: "Trascina il file XLSX qui"
						}}
					</p>
					<p class="drop-subtitle">
						{{
							selectedFile
								? formatSize(selectedFile.size)
								: "oppure clicca per selezionare · .xlsx"
						}}
					</p>
				</div>
				<div class="">
					<p span="text-secondary"></p>
				</div>
				<!-- Preview of what will be generated -->
				<Transition name="fade">
					<div v-if="preview" class="card">
						<div class="card-header">
							<span class="card-title">Anteprima contenuto</span>
						</div>
						<div class="card-body">
							<div class="stats-row" style="margin-bottom: 16px">
								<div class="stat-card">
									<div class="stat-value">
										{{ preview.totalRows }}
									</div>
									<div class="stat-label">Righe totali</div>
								</div>
								<div class="stat-card">
									<div class="stat-value">
										{{ preview.employees.length }}
									</div>
									<div class="stat-label">Dipendenti</div>
								</div>
								<div class="stat-card">
									<div class="stat-value">
										{{ preview.months.length }}
									</div>
									<div class="stat-label">Mesi</div>
								</div>
							</div>
							<p class="section-label">
								Schede che verranno create
							</p>
							<div class="stack stack-sm">
								<div
									v-for="emp in preview.employees"
									:key="emp"
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
											color: var(--c-accent);
										"
									>
										<rect
											x="3"
											y="3"
											width="18"
											height="18"
											rx="2"
										/>
										<line x1="3" y1="9" x2="21" y2="9" />
										<line x1="9" y1="21" x2="9" y2="9" />
									</svg>
									<span class="file-name">{{ emp }}</span>
								</div>
							</div>
						</div>
					</div>
				</Transition>
			</div>

			<!-- Action panel -->
			<div class="stack stack-md">
				<div class="card">
					<div class="card-header">
						<span class="card-title">Genera il rapporto</span>
					</div>
					<div class="card-body stack stack-md">
						<div
							v-if="!selectedFile"
							class="stack stack-sm"
							style="
								padding: 12px;
								background: var(--c-bg);
								border-radius: var(--radius-md);
							"
						>
							<p class="text-sm text-secondary">
								Il file deve essere un Excel con un foglio
								chiamato
								<code
									style="
										background: var(--c-surface);
										padding: 1px 6px;
										border-radius: 4px;
										font-size: 0.75rem;
									"
									>DB ALL</code
								>
								con colonne: Data, Risorsa, Ore.
							</p>
							<p class="text-sm text-secondary">
								Clicca e trova il file nel folder
								<strong>DOWNLOADS</strong>.
							</p>
						</div>

						<div
							v-if="selectedFile"
							class="stack stack-sm"
							style="
								padding: 12px;
								background: var(--c-bg);
								border-radius: var(--radius-md);
							"
						>
							<p class="text-sm" style="font-weight: 500">
								{{ selectedFile.name }}
							</p>
							<p class="text-sm text-secondary">
								{{ formatSize(selectedFile.size) }}
							</p>
						</div>

						<div class="divider" style="margin: 4px 0" />

						<button
							class="btn btn-primary"
							style="width: 100%; justify-content: center"
							:disabled="!selectedFile || isProcessing"
							@click="generatePivot"
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
								<rect
									x="3"
									y="3"
									width="18"
									height="18"
									rx="2"
								/>
								<line x1="3" y1="9" x2="21" y2="9" />
								<line x1="9" y1="21" x2="9" y2="9" />
							</svg>
							{{
								isProcessing ? "Generazione…" : "Genera schede"
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
			</div>
		</div>
	</div>
	<!-- ── Back to PDF extraction ───────────────────────────────── -->
	<div class="outer-panel" style="margin-bottom: 32px">
		<NuxtLink to="/app" class="db-card">
			<div class="pdf-icon">
				<svg width="48" height="48" viewBox="0 0 80 80" fill="none">
					<rect width="80" height="80" rx="18" fill="#E63946" />
					<rect
						x="14"
						y="10"
						width="36"
						height="46"
						rx="4"
						fill="white"
					/>
					<path d="M40 10 L40 22 L52 22 Z" fill="#FFCDD2" />
					<path d="M40 10 L52 22 L40 22 Z" fill="#C62828" />
					<rect
						x="19"
						y="30"
						width="20"
						height="2.5"
						rx="1.25"
						fill="#E63946"
					/>
					<rect
						x="19"
						y="36"
						width="26"
						height="2.5"
						rx="1.25"
						fill="#E63946"
					/>
					<rect
						x="19"
						y="42"
						width="16"
						height="2.5"
						rx="1.25"
						fill="#E63946"
					/>
					<rect
						x="52"
						y="38"
						width="16"
						height="22"
						rx="5"
						fill="#C62828"
					/>
					<text
						x="60"
						y="53"
						text-anchor="middle"
						font-family="system-ui, sans-serif"
						font-size="9"
						font-weight="800"
						fill="white"
					>
						PDF
					</text>
					<circle cx="58" cy="13" r="5" fill="#FFD600" />
					<circle cx="58" cy="13" r="2.5" fill="white" />
				</svg>
			</div>
			<div style="flex: 1">
				<p class="db-card-title">Parti dai PDF</p>
				<p class="db-card-subtitle">
					Carica i PDF del LUL e avvia una nuova estrazione.
				</p>
			</div>
			<span class="btn btn-secondary btn-sm" style="flex-shrink: 0">
				← Torna all'estrazione
			</span>
		</NuxtLink>
	</div>
</template>

<script setup lang="ts">
import * as ExcelJS from "exceljs";

definePageMeta({
	layout: "app",
	middleware: "auth",
});

const selectedFile = ref<File | null>(null);
const isDragging = ref(false);
const isProcessing = ref(false);
const statusMessage = ref("");
const statusType = ref<"processing" | "success" | "error">("processing");
const fileInput = ref<HTMLInputElement | null>(null);

interface Preview {
	totalRows: number;
	employees: string[];
	months: number[];
}
const preview = ref<Preview | null>(null);

function handleDrop(e: DragEvent) {
	isDragging.value = false;
	const f = Array.from(e.dataTransfer?.files ?? []).find(
		(f) =>
			f.name.toLowerCase().endsWith(".xlsx") ||
			f.name.toLowerCase().endsWith(".xls"),
	);
	if (f) {
		setFile(f);
	} else {
		// optional: surface an error to the user
		statusType.value = "error";
		statusMessage.value = "Carica solo file .xlsx o .xls.";
	}
}

function handleFileChange(e: Event) {
	const f = (e.target as HTMLInputElement).files?.[0];
	if (
		f &&
		(f.name.toLowerCase().endsWith(".xlsx") ||
			f.name.toLowerCase().endsWith(".xls"))
	) {
		setFile(f);
	} else if (f) {
		statusType.value = "error";
		statusMessage.value = "Carica solo file .xlsx o .xls.";
	}
	(e.target as HTMLInputElement).value = "";
}

async function setFile(f: File) {
	selectedFile.value = f;
	preview.value = null;
	// Read the file client-side to show preview
	try {
		const buffer = await f.arrayBuffer();
		const wb = new ExcelJS.Workbook();
		await wb.xlsx.load(buffer);
		const ws = wb.getWorksheet("DB ALL");
		if (!ws) return;

		const employees = new Set<string>();
		const months = new Set<number>();
		let totalRows = 0;

		ws.eachRow((row, rowNum) => {
			if (rowNum === 1) return;
			const emp = row.getCell(2).text?.trim();
			const date = row.getCell(1).text?.trim();
			if (emp) employees.add(emp);
			if (date) {
				const mm = parseInt(date.split("/")[1]);
				if (!isNaN(mm)) months.add(mm);
			}
			totalRows++;
		});

		preview.value = {
			totalRows,
			employees: [...employees].sort(),
			months: [...months].sort((a, b) => a - b),
		};
	} catch {
		// preview fails silently — server will validate properly
	}
}

function formatSize(b: number) {
	if (b < 1024) return `${b} B`;
	if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
	return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

async function generatePivot() {
	if (!selectedFile.value) return;
	isProcessing.value = true;
	statusType.value = "processing";
	statusMessage.value = "Generazione schede in corso…";

	try {
		const formData = new FormData();
		formData.append("file", selectedFile.value);

		const blob = await $fetch<Blob>("/api/pivot", {
			method: "POST",
			body: formData,
			responseType: "blob",
		});

		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `LUL_Completo_${new Date().getFullYear()}.xlsx`;
		a.click();
		URL.revokeObjectURL(url);

		statusType.value = "success";
		statusMessage.value = `File generato con ${preview.value?.employees.length ?? "?"} schede dipendente.`;
	} catch (err) {
		statusType.value = "error";
		statusMessage.value = `Errore: ${err instanceof Error ? err.message : "Errore sconosciuto"}`;
	} finally {
		isProcessing.value = false;
	}
}
</script>

<style scoped>
/* Outer panel — matches index.vue exactly */
.outer-panel {
	background: transparent;
	border: 1px solid var(--c-border);
	border-radius: var(--radius-xl);
	padding: 20px;
}

/* White inner card — matches db-card pattern from index.vue */
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

.pdf-icon {
	width: 48px;
	height: 48px;
	border-radius: var(--radius-md);
	background: var(--c-accent);
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
</style>
