# LUL Extractor

Estrae ore di presenza dai PDF del LUL (Libro Unico del Lavoro) e le esporta in Excel.

Costruito con **Nuxt 3** + **Vue 3** + **Anthropic Claude API**, deployato su **Vercel**.

---

## Setup locale

### 1. Clona e installa

```bash
git clone <your-repo-url>
cd lul-extractor
npm install
```

### 2. Configura la chiave API

Copia il file di esempio e inserisci la tua chiave Anthropic:

```bash
cp .env.example .env
```

Modifica `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Aggiungi il template Excel

Copia il tuo file `Base_Dati_Personale_Template.xlsx` nella cartella `public/` e rinominalo:

```
public/template.xlsx
```

### 4. Avvia in sviluppo

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

---

## Aggiungere un'azienda

Modifica `config/companies.json`:

```json
[
  {
    "id": "acme",
    "name": "Acme SpA",
    "hoursFieldLabel": "ORE ORDINARIE",
    "hoursFieldCode": "ORD",
    "outputTemplatePath": "/template.xlsx"
  }
]
```

**Campi:**
- `id` — identificativo breve senza spazi (usato nel nome del file Excel esportato)
- `name` — nome visualizzato nel menu
- `hoursFieldLabel` — etichetta esatta nella sezione VOCI del PDF (es. `ORE ORDINARIE`, `ORE LAVORATE - REPORT PRODUTTI`)
- `hoursFieldCode` — codice a 3 lettere corrispondente (es. `ORD`, `OST`)

Dopo la modifica: `git add . && git commit -m "add acme" && git push` — Vercel rilancia in automatico.

---

## Deploy su Vercel

### Prima volta

```bash
npm install -g vercel
vercel
```

Segui il wizard. Quando chiede il framework, seleziona **Nuxt.js**.

### Variabile d'ambiente su Vercel

Nel dashboard Vercel → **Settings → Environment Variables**:

| Nome | Valore |
|------|--------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |

### Deploy successivi

```bash
git push
```

Vercel fa il deploy automatico ad ogni push sul branch `main`.

---

## Struttura del progetto

```
lul-extractor/
├── pages/
│   ├── index.vue        ← Upload + selezione azienda
│   ├── results.vue      ← Anteprima risultati + download
│   └── config.vue       ← Visualizza aziende configurate
├── server/
│   ├── api/
│   │   ├── extract.post.ts   ← Riceve PDF → chiama Claude
│   │   ├── export.post.ts    ← Genera file Excel
│   │   └── companies.get.ts  ← Lista aziende
│   └── utils/
│       └── claude.ts         ← Prompt + chiamata API Anthropic
├── config/
│   └── companies.json   ← ⭐ Configura qui le aziende
├── types/
│   └── index.ts         ← Tipi TypeScript condivisi
├── public/
│   └── template.xlsx    ← ⭐ Copia qui il tuo template Excel
└── assets/css/
    └── main.css         ← Design system
```

---

## Utilizzo

1. Vai su `https://your-app.vercel.app`
2. Trascina i PDF del LUL (uno per dipendente, tutti dello stesso mese)
3. Seleziona l'azienda dal menu
4. Clicca **Avvia estrazione**
5. Controlla l'anteprima — verifica i nomi e le ore
6. Clicca **Scarica Excel**

---

## Prossimi sviluppi (Parte 2)

- Allocazione ore su progetti R&D per dipendente
- Storico delle estrazioni
- Esportazione multi-mese
