<template>
	<button class="btn btn-primary" :disabled="isExporting || disabled || rows.length === 0" @click="downloadExcel">
		<span v-if="isExporting" class="spinner" />
		<svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
		</svg>
		{{ isExporting ? 'Esportazione…' : 'Scarica Excel' }}
	</button>
</template>

<script setup lang="ts">
import type { ExtractedRow } from '~/types'

const props = withDefaults(defineProps<{
	rows: ExtractedRow[]
	disabled?: boolean
}>(), {
	disabled: false,
})

const { trackResultExported } = useTracking()
const isExporting = ref(false)

function sourceDocumentId(rows: ExtractedRow[]): string {
	return rows
		.map(r => r.sourceFile.replace(/\s*\(pagina\s*\d+\)$/i, '').trim())
		.filter((v, i, a) => a.indexOf(v) === i)
		.sort()
		.join('|')
}

function yearRange(rows: ExtractedRow[]): string {
	return [...new Set(rows.map(r => r.year))].sort().join('-')
}

async function downloadExcel() {
	if (props.disabled || props.rows.length === 0) return
	isExporting.value = true
	const documentId = sourceDocumentId(props.rows)
	try {
		const blob = await $fetch<Blob>('/api/export', {
			method: 'POST',
			body: { rows: props.rows },
			responseType: 'blob',
		})
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `LUL_DB_ALL_${yearRange(props.rows)}.xlsx`
		a.click()
		URL.revokeObjectURL(url)
		trackResultExported(documentId)
	} catch (err) {
		console.error('Export failed', err)
	} finally {
		isExporting.value = false
	}
}
</script>
