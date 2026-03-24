<template>
  <div class="page-content">

    <!-- Header row -->
    <div class="row row-between" style="margin-bottom: 32px; flex-wrap: wrap; gap: 16px">
      <div class="stack stack-sm">
        <h1 class="page-title">Risultati estrazione</h1>
        <p class="page-subtitle" v-if="result">
          {{ result.month }} · {{ companyLabel }}
        </p>
      </div>
      <div class="row gap-sm">
        <NuxtLink to="/app" class="btn btn-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Nuova estrazione
        </NuxtLink>
        <button
          class="btn btn-primary"
          :disabled="isExporting || !result"
          @click="downloadExcel"
        >
          <span v-if="isExporting" class="spinner" />
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {{ isExporting ? 'Esportazione…' : 'Scarica Excel' }}
        </button>
      </div>
    </div>

    <!-- No data state -->
    <div v-if="!result" class="card">
      <div class="card-body" style="text-align:center; padding: 48px">
        <p class="text-secondary">Nessun risultato. <NuxtLink to="/app" style="color:var(--c-accent)">Avvia una nuova estrazione.</NuxtLink></p>
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
          <div class="stat-value">{{ result.errors.length }}</div>
          <div class="stat-label" :style="result.errors.length > 0 ? 'color:var(--c-danger)' : ''">Errori</div>
        </div>
      </div>

      <!-- Errors banner -->
      <Transition name="fade">
        <div v-if="result.errors.length > 0" class="status-bar warning" style="margin-bottom: 16px">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>{{ result.errors.length }} pagina/e non estratta/e: {{ result.errors.join(' · ') }}</span>
        </div>
      </Transition>

      <!-- Filter + view toggle -->
      <div class="row row-between" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <div class="row gap-sm">
          <select v-model="filterEmployee" class="form-select" style="width: auto; min-width: 200px">
            <option value="">Tutti i dipendenti</option>
            <option v-for="e in uniqueEmployees" :key="e" :value="e">{{ e }}</option>
          </select>
        </div>
        <div class="row gap-sm">
          <span class="text-sm text-secondary">{{ filteredRows.length }} righe</span>
        </div>
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
              <td style="font-weight:500">{{ row.employee }}</td>
              <td class="td-hours">{{ row.hours % 1 === 0 ? row.hours.toFixed(0) : row.hours.toFixed(2) }}</td>
              <td class="text-secondary text-sm" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ row.sourceFile }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Per-employee summary -->
      <div style="margin-top: 32px">
        <p class="section-label">Riepilogo per dipendente</p>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Dipendente</th>
                <th>Giorni lavorativi</th>
                <th>Ore totali</th>
                <th>Media/giorno</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(summary, i) in employeeSummaries" :key="i">
                <td style="font-weight:500">{{ summary.name }}</td>
                <td class="td-mono">{{ summary.days }}</td>
                <td class="td-hours">{{ summary.hours.toFixed(2) }}</td>
                <td class="td-mono text-secondary">{{ (summary.hours / summary.days).toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import type { ExtractionResult, ExportRequest } from '~/types'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const result = ref<ExtractionResult | null>(null)
const isExporting = ref(false)
const filterEmployee = ref('')

// Load companies for label
const { data: companies } = await useFetch('/api/companies')

const companyLabel = computed(() => {
  if (!result.value) return ''
  return (companies.value as { id: string; name: string }[])?.find(
    c => c.id === result.value?.companyId
  )?.name ?? result.value.companyId
})

// Restore result from session storage on mount
onMounted(() => {
  try {
    const stored = sessionStorage.getItem('lul_result')
    if (stored) result.value = JSON.parse(stored)
  } catch {
    // ignore
  }
})

// Computed
const filteredRows = computed(() => {
  if (!result.value) return []
  if (!filterEmployee.value) return result.value.rows
  return result.value.rows.filter(r => r.employee === filterEmployee.value)
})

const uniqueEmployees = computed(() => {
  if (!result.value) return []
  return [...new Set(result.value.rows.map(r => r.employee))].sort()
})

const totalHours = computed(() =>
  result.value?.rows.reduce((sum, r) => sum + r.hours, 0) ?? 0
)

const employeeSummaries = computed(() => {
  if (!result.value) return []
  const map = new Map<string, { hours: number; days: number }>()
  for (const row of result.value.rows) {
    const curr = map.get(row.employee) ?? { hours: 0, days: 0 }
    map.set(row.employee, { hours: curr.hours + row.hours, days: curr.days + 1 })
  }
  return [...map.entries()]
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

// Export
async function downloadExcel() {
  if (!result.value) return
  isExporting.value = true

  try {
    const payload: ExportRequest = {
      rows: result.value.rows,
      companyId: result.value.companyId,
      month: result.value.month,
    }

    const blob = await $fetch<Blob>('/api/export', {
      method: 'POST',
      body: payload,
      responseType: 'blob',
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `LUL_${result.value.companyId}_${result.value.month?.replace(' ', '_') ?? 'export'}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Export failed', err)
  } finally {
    isExporting.value = false
  }
}
</script>
