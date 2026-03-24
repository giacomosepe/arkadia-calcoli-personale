# LUL Extractor

**Trasforma i tuoi PDF del Libro Unico del Lavoro in tabelle Excel in pochi minuti.**

LUL Extractor utilizza l'intelligenza artificiale (Claude Sonnet 4.5 di Anthropic) per leggere automaticamente i dati dalle buste paga e generare file Excel pronti all'uso, eliminando ore di trascrizione manuale.

---

## 🚀 Come funziona

### 1. **Carica i PDF**
Trascina uno o più file PDF del LUL nella dashboard. Puoi caricare:
- Più mesi contemporaneamente
- Più dipendenti contemporaneamente
- Qualsiasi combinazione di mesi e dipendenti

### 2. **Configura l'estrazione**
Indica all'app quale informazione estrarre specificando:
- **Colonna ore giornaliere**: L'intestazione della colonna nel PDF (es. "H Ord", "ORE ORDINARIE")
- **Etichetta riepilogo**: Come appare nel riepilogo finale del PDF (es. "ORE ORDINARIE", "ORE LAVORATE")

### 3. **Scarica i risultati**
L'app analizza i documenti e produce:
- Un file Excel **DB ALL** con tutti i dati (Data, Risorsa, Ore)
- Statistiche immediate: totale ore, numero dipendenti, eventuali errori
- La possibilità di generare **schede individuali** per dipendente

---

## 📊 Funzionalità

### Estrazione intelligente
- ✅ Riconosce automaticamente nomi dipendenti e date
- ✅ Estrae ore giornaliere da tabelle complesse
- ✅ Gestisce formati PDF diversi
- ✅ Segnala pagine non processate

### Esportazione flessibile
- 📥 **DB ALL**: File Excel con tutte le righe per analisi e pivot
- 📋 **Schede dipendenti**: Un foglio Excel per ogni dipendente con 31 righe (giorni del mese) × mesi

### Anteprima e controllo
- 👀 Visualizza i dati estratti prima di scaricare
- 🔍 Filtra per dipendente
- 📈 Statistiche immediate: totale ore, giorni lavorativi, media giornaliera

---

## 🎯 Casi d'uso

- **Amministrazione del personale**: Trasforma velocemente le buste paga in database
- **Report aziendali**: Genera schede mensili per ogni dipendente
- **Analisi R&D**: Prepara i dati per allocazione ore su progetti
- **Controllo qualità**: Verifica rapidamente ore e presenze

---

## 🔒 Sicurezza e Privacy

- I file PDF vengono processati tramite API sicura (Anthropic Claude)
- Nessun dato viene memorizzato permanentemente
- I risultati sono disponibili solo nella sessione corrente
- Tutto il traffico è criptato (HTTPS)

---

## 💡 Suggerimenti per l'uso

1. **Nomi file chiari**: Nomina i PDF in modo descrittivo (es. `Rossi_Mario_Gennaio_2025.pdf`)
2. **Controlla sempre**: Verifica i risultati nell'anteprima prima di scaricare
3. **PDF leggibili**: Assicurati che i PDF non siano scansioni di bassa qualità
4. **Configurazione corretta**: Usa esattamente le etichette come appaiono nel PDF (maiuscole/minuscole)

---

## 📞 Supporto

Per problemi o domande, contatta il team di supporto Arkadia.

**Versione**: 1.0
**Powered by**: Claude AI (Anthropic) + Nuxt 3
**Sviluppato da**: Giacomo Sepe per Arkadia

---

## 🔮 Prossimi sviluppi

- Allocazione ore su progetti R&D
- Storico delle estrazioni
- Esportazione multi-mese automatica
- Template Excel personalizzabili
