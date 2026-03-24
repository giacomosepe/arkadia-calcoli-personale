<template>
  <div class="page-content">

    <div class="stack stack-sm" style="margin-bottom: 32px">
      <h1 class="page-title">Aziende configurate</h1>
      <p class="page-subtitle">Le configurazioni sono nel file <code class="text-mono" style="background:var(--c-bg);padding:2px 7px;border-radius:4px;font-size:0.8rem">config/companies.json</code> nel repository.</p>
    </div>

    <!-- How to add a company -->
    <div class="card" style="margin-bottom: 24px; border-left: 3px solid var(--c-accent)">
      <div class="card-body">
        <p class="fw-500" style="margin-bottom: 10px">Come aggiungere un'azienda</p>
        <p class="text-sm text-secondary" style="margin-bottom: 12px">Apri <code class="text-mono" style="background:var(--c-bg);padding:1px 6px;border-radius:4px">config/companies.json</code> e aggiungi un oggetto all'array:</p>
        <pre style="background:var(--c-bg);padding:16px;border-radius:var(--radius-md);font-family:var(--font-mono);font-size:0.78rem;line-height:1.7;overflow-x:auto;color:var(--c-text-primary)">{{ exampleJson }}</pre>
        <p class="text-sm text-secondary" style="margin-top: 12px">Poi esegui <code class="text-mono" style="background:var(--c-bg);padding:1px 6px;border-radius:4px">git commit &amp;&amp; git push</code> — Vercel rilancia automaticamente.</p>
      </div>
    </div>

    <!-- Company list -->
    <p class="section-label">Aziende attive ({{ companies?.length ?? 0 }})</p>

    <div class="stack stack-sm">
      <div v-for="company in companies" :key="company.id" class="card">
        <div class="card-body" style="display:grid;grid-template-columns:1fr auto;gap:16px;align-items:start">
          <div class="stack stack-sm">
            <div class="row gap-sm">
              <span style="font-weight:600">{{ company.name }}</span>
              <span class="badge badge-blue">{{ company.id }}</span>
            </div>
            <div class="row gap-md" style="flex-wrap:wrap">
              <span class="text-sm text-secondary">
                <span class="fw-500" style="color:var(--c-text-primary)">Campo ore:</span>
                {{ company.hoursFieldLabel }}
              </span>
              <span class="text-sm text-secondary">
                <span class="fw-500" style="color:var(--c-text-primary)">Codice:</span>
                <code class="text-mono" style="background:var(--c-bg);padding:1px 7px;border-radius:4px;font-size:0.75rem">{{ company.hoursFieldCode }}</code>
              </span>
            </div>
          </div>
          <span class="badge badge-green">attiva</span>
        </div>
      </div>
    </div>

    <!-- Field reference -->
    <div style="margin-top: 32px">
      <p class="section-label">Riferimento codici LUL comuni</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Codice</th>
              <th>Descrizione</th>
              <th>Quando usarlo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ref in fieldRef" :key="ref.code">
              <td><code class="text-mono" style="font-size:0.8rem">{{ ref.code }}</code></td>
              <td>{{ ref.label }}</td>
              <td class="text-secondary text-sm">{{ ref.note }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { CompanyConfig } from '~/types'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const { data: companies } = await useFetch<CompanyConfig[]>('/api/companies')

const exampleJson = `{
  "id": "acme",
  "name": "Acme SpA",
  "hoursFieldLabel": "ORE LAVORATE - REPORT PRODUTTI",
  "hoursFieldCode": "OST",
  "outputTemplatePath": "/template.xlsx"
}`

const fieldRef = [
  { code: 'ORD', label: 'Ore Ordinarie', note: 'Usato dalla maggior parte dei gestori paghe' },
  { code: 'OST', label: 'Ore Lavorate – Report Produttività', note: 'Variante comune in sistemi HR come Zucchetti' },
  { code: 'TEO', label: 'Ore Teoriche – Report Produttività', note: 'Ore contrattuali previste, non effettive' },
  { code: 'SMW', label: 'Smart Working Agevolato', note: 'Ore in lavoro agile, conteggiato separatamente' },
  { code: 'SDI', label: 'Straordinario Diurno Feriale', note: 'Ore extra nei giorni feriali' },
  { code: 'MAL', label: 'Malattia', note: 'Assenza per malattia certificata' },
  { code: 'FER', label: 'Ferie', note: 'Giorni di ferie godute' },
]
</script>
