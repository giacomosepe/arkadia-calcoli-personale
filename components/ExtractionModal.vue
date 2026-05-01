<template>
	<Transition name="fade">
		<div
			v-if="isOpen"
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
			@click.self="emit('cancel')"
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
						>{{ hasTotalField ? summaryLabel : 'disabilitato' }}</code
						>
						</p>
							<p class="text-sm">
								<span class="fw-500">Ordine nome:</span>
								<code
									style="
										background: var(--c-surface);
										padding: 1px 6px;
										border-radius: 4px;
										font-size: 0.75rem;
										margin-left: 6px;
									"
									>{{ nameOrder === 'surname_first' ? 'COGNOME NOME' : 'NOME COGNOME' }}</code
								>
							</p>
					</div>
					<button
						class="btn btn-primary btn-lg"
						style="width: 100%; justify-content: center"
						:disabled="isProcessing"
						@click="emit('confirm')"
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
						@click="emit('cancel')"
					>
						Annulla
					</button>
				</div>
			</div>
		</div>
	</Transition>
</template>

<script setup lang="ts">
defineProps<{
	isOpen: boolean
	files: File[]
	dailyColumn: string
	summaryLabel: string
	hasTotalField: boolean
	nameOrder: 'surname_first' | 'name_first'
	isProcessing: boolean
}>()

const emit = defineEmits<{
	confirm: []
	cancel: []
}>()
</script>
