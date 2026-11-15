# Prompt per Grok Bot – DirittiChiari 2027

## Obiettivo
Migliora e completa la PWA **DirittiChiari 2027** già presente nel repo GitHub:
https://github.com/gheocapaula1000-code/dirittichiari-2027

PWA mobile-first stile BastaUno che aiuta chiunque a capire se ha diritto ad aiuti dalle PA in base alla situazione reale, calcola il residuo dopo le spese fisse e prepara per il CAF.  
Tutto basato sulle regole **2027** (redditi 2025 + patrimonio al 31/12/2025).

## Requisiti principali

### Flusso Wizard
1. Nucleo familiare (componenti, minori, disabilità)
2. Redditi 2025 (per ISEE ordinario)
3. Spese fisse attuali (affitto/mutuo, bollette, trasporti, altre) → residuo pratico
4. Patrimonio al 31/12/2025 (prima casa IMU + mutuo residuo, mobiliare)
5. Opzione ISEE corrente (se la situazione è peggiorata dopo il 2025)
6. Risultati

### Calcoli client-side
- **Residuo mensile** = (reddito attuale / 12) – affitto/mutuo – bollette – trasporti – altre spese fisse
- **ISEE ordinario stimato** (redditi 2025 + patrimonio)
- **ISEE speciale prestazioni familiari** (franchigia prima casa 91.500 € / 120.000 € in capoluogo metropolitano)
- **ISEE corrente stimato** (se attivato: redditi ultimi 12 mesi o 2 mesi × 6)

### Output
- Barra chiara: “Ti rimangono X € al mese per vivere”
- ISEE ordinario + speciale + eventuale corrente
- Lista benefici potenziali 2027 (ADI, Assegno Unico, Carta Acquisti, bonus nido, ecc.)
- Checklist documenti DSU 2027 (+ extra per corrente)
- Sezione **Consigli per ottimizzare legalmente**
- Disclaimer forte e visibile
- Possibilità di export PDF o stampa

### Sezione Consigli (legale)
- Documenta bene contratto di locazione registrato e mutuo residuo
- Sfrutta la franchigia maggiorata sulla prima casa
- Quando conviene chiedere l’ISEE corrente (calo >25% o perdita lavoro)
- Cosa **non** fare (non omettere patrimonio, non dichiarare dati falsi)
- Distinzione chiara: le spese quotidiane contano per il residuo, non per l’ISEE

### Requisiti tecnici
- Tutto client-side (privacy massima)
- Mobile-first, UX pulita stile BastaUno
- PWA installabile
- Codice manutenibile
- Disclaimer in ogni schermata risultati

## Istruzioni
- Parti dal codice esistente in `index.html`
- Migliora calcoli, UX, testi e completezza
- Aggiungi export PDF se possibile
- Mantieni tutto gratuito e senza backend
- Lovable va usato **solo** per la pubblicazione finale (se necessario)
- Preferisci deploy su Netlify (gratuito)

Quando hai finito, fornisci il link alla versione aggiornata e, se possibile, il deploy su Netlify.
