// Test dei calcoli con esempi controllati a mano. Avvio: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../js/rules.js');
const close = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test('persona sola in affitto: ISR con quota lavoro e affitto massimo', () => {
  // 20.000 − min(20% = 4.000; 3.000) = 17.000; − affitto min(7.200; 7.000) = 10.000
  // mobiliare 3.000 sotto la franchigia di 6.000 → ISP 0; scala 1 → ISEE 10.000
  const r = D.calcolaTutto({ componenti: 1, redditoDip: 20000, nDip: 1, abitazione: 'affitto', affittoMensile: 600, contrattoRegistrato: true, contiSaldo: 3000, contiGiacenza: 2500 });
  assert.equal(r.ordinario.isr.detrDip, 3000);
  assert.equal(r.ordinario.isr.affitto, 7000);
  assert.equal(r.ordinario.isr.totale, 10000);
  assert.equal(r.ordinario.isp.totale, 0);
  assert.equal(r.ordinario.isee, 10000);
  assert.equal(r.speciale.isee, 10000);
});

test('affitto non registrato: nessuna detrazione', () => {
  const r = D.calcolaTutto({ componenti: 1, redditoDip: 20000, nDip: 1, abitazione: 'affitto', affittoMensile: 600, contrattoRegistrato: false });
  assert.equal(r.ordinario.isr.affitto, 0);
  assert.equal(r.ordinario.isee, 17000);
});

test('coppia con un figlio, casa di proprietà: ordinario vs speciale', () => {
  const inp = { componenti: 3, figli: 1, minori: 1, genitoriLavorano: true, redditoDip: 30000, nDip: 2, abitazione: 'proprieta', valoreCasa: 150000, mutuoCasa: 50000, contiSaldo: 12000, contiGiacenza: 9000 };
  const r = D.calcolaTutto(inp);
  // ISR 30.000 − 6.000 = 24.000
  assert.equal(r.ordinario.isr.totale, 24000);
  // casa netta 100.000; ordinario: (100.000 − 52.500) × 2/3 = 31.666,67; mobiliare 12.000 − 10.000 = 2.000
  close(r.ordinario.isp.casa.rileva, 31666.67);
  close(r.ordinario.isp.totale, 33666.67);
  // scala 2,04 + 0,2 (minori, genitori al lavoro) = 2,24; ISE 24.000 + 6.733,33 → ISEE 13.720,24
  assert.equal(r.ordinario.scala.valore, 2.24);
  close(r.ordinario.isee, 13720.24);
  // speciale: franchigia 91.500 → (8.500) × 2/3 = 5.666,67; ISP 7.666,67; ISE 25.533,33 / 2,24 = 11.398,81
  close(r.speciale.isp.casa.rileva, 5666.67);
  close(r.speciale.isee, 11398.81);
});

test('capoluogo metropolitano e 4 figli: franchigie e scale', () => {
  const d = Object.assign({}, D.DEFAULT_INPUT, { componenti: 6, figli: 4, minori: 4, under3: 1, genitoriLavorano: true, abitazione: 'proprieta', valoreCasa: 200000, capoluogoMetro: true });
  // ordinario: 2,85 + 0,35 = 3,20 + 0,35 (4 figli) + 0,3 (figlio < 3 anni) = 3,85
  assert.equal(D.scalaEquivalenza(d, 'ordinario').valore, 3.85);
  // speciale: 3,20 + 0,40 + 0,3 = 3,90
  assert.equal(D.scalaEquivalenza(d, 'speciale').valore, 3.9);
  // franchigia casa ordinario 52.500 + 2 × 2.500; speciale metro 120.000 + 3 × 2.500
  assert.equal(D.casaAbitazione(d, 'ordinario').franchigia, 57500);
  assert.equal(D.casaAbitazione(d, 'speciale').franchigia, 127500);
  // franchigia mobiliare: min(6.000 + 5 × 2.000; 10.000) + 2 × 1.000 = 12.000
  assert.equal(D.patrimonioMobiliare(d).franchigia, 12000);
  // affitto massimo con 4 figli: 7.000 + 2 × 500 (non applicato qui perché proprietari)
  assert.equal(D.detrazioneAffitto(Object.assign({}, d, { abitazione: 'affitto', affittoMensile: 1000 })), 8000);
});

test('ISEE speciale: maggiorazione già con 2 figli', () => {
  const d = Object.assign({}, D.DEFAULT_INPUT, { componenti: 4, figli: 2, minori: 0 });
  assert.equal(D.scalaEquivalenza(d, 'ordinario').valore, 2.46);
  assert.equal(D.scalaEquivalenza(d, 'speciale').valore, 2.56);
});

test('genitore solo non lavoratore con minori: maggiorazione 0,2', () => {
  const d = Object.assign({}, D.DEFAULT_INPUT, { componenti: 2, figli: 1, minori: 1, genitoreSolo: true, genitoriLavorano: false });
  assert.equal(D.scalaEquivalenza(d, 'ordinario').valore, 1.77);
});

test('disabilità: +0,5 per persona', () => {
  const d = Object.assign({}, D.DEFAULT_INPUT, { componenti: 2, disabili: 1 });
  assert.equal(D.scalaEquivalenza(d, 'ordinario').valore, 2.07);
});

test('titoli di Stato esclusi fino a 50.000 € e reddito figurativo', () => {
  const d = Object.assign({}, D.DEFAULT_INPUT, { componenti: 1, titoliStato: 70000, altriInvestimenti: 10000, contiSaldo: 5000, contiGiacenza: 8000 });
  const m = D.patrimonioMobiliare(d);
  assert.equal(m.titoliEsclusi, 50000);
  assert.equal(m.conti, 8000); // il più alto tra saldo e giacenza media
  assert.equal(m.lordo, 38000); // 8.000 + 20.000 + 10.000
  assert.equal(m.netto, 32000); // − 6.000
  // figurativo sul solo non-conto: (20.000 + 10.000) × 2,6% = 780
  assert.equal(D.isr(d).figurativo, 780);
});

test('pensione: quota 20% con tetto 1.000 €', () => {
  const r = D.calcolaTutto({ componenti: 1, redditoPens: 12000, nPens: 1 });
  assert.equal(r.ordinario.isr.detrPens, 1000);
  assert.equal(r.ordinario.isee, 11000);
});

test('ISEE corrente: ultimi 2 mesi × 6 dopo perdita del lavoro', () => {
  const r = D.calcolaTutto({ componenti: 1, redditoDip: 30000, nDip: 1, peggiorata: true, motivo: 'lavoro_indeterminato', modoCorrente: '2mesi', correnteTR: 1000 });
  // ordinario: 30.000 − 3.000 = 27.000; corrente: NASpI 1.000 × 6 = 6.000 (nessuna quota 20%)
  assert.equal(r.ordinario.isee, 27000);
  assert.equal(r.corrente.moltiplicatore, 6);
  assert.equal(r.corrente.ordinario.isee, 6000);
  assert.ok(r.corrente.ammesso);
  assert.ok(r.corrente.conviene);
});

test('ISEE corrente per calo del reddito: serve oltre il 25%', () => {
  const base = { componenti: 1, redditoDip: 20000, nDip: 1, peggiorata: true, motivo: 'calo', modoCorrente: '12mesi' };
  // ISR ordinario 17.000; corrente 16.000 − 3.000 = 13.000 → −23,5%: non ammesso
  const a = D.calcolaTutto(Object.assign({}, base, { correnteLD: 16000 }));
  assert.equal(a.corrente.ammesso, false);
  // corrente 15.000 − 3.000 = 12.000 → −29,4%: ammesso
  const b = D.calcolaTutto(Object.assign({}, base, { correnteLD: 15000 }));
  assert.equal(b.corrente.ammesso, true);
  // per il calo non vale la regola dei 2 mesi
  const c = D.calcolaTutto(Object.assign({}, base, { correnteLD: 2000, modoCorrente: '2mesi' }));
  assert.equal(c.corrente.moltiplicatore, 1);
});

test('residuo per vivere', () => {
  const r = D.residuo(Object.assign({}, D.DEFAULT_INPUT, { componenti: 2, nettoMensile: 1800, abitazione: 'affitto', affittoMensile: 650, bollette: 150, trasporti: 80, prestiti: 120, assicurazioni: 40, altreSpese: 60 }));
  assert.equal(r.totaleSpese, 1100);
  assert.equal(r.mensile, 700);
  assert.equal(r.perPersona, 350);
  const neg = D.residuo(Object.assign({}, D.DEFAULT_INPUT, { nettoMensile: 500, abitazione: 'proprieta', rataMutuo: 700 }));
  assert.equal(neg.mensile, -200);
});

test('Assegno Unico: estremi e punto intermedio', () => {
  assert.equal(D.stimaAuuBase(10000), 203.8);
  assert.equal(D.stimaAuuBase(50000), 58.3);
  const mid = (17468.51 + 46582.71) / 2;
  close(D.stimaAuuBase(mid), (203.8 + 58.3) / 2);
});

test('neutralizzazione dell\'Assegno Unico nell\'ISEE speciale', () => {
  const r = D.calcolaTutto({ componenti: 3, figli: 1, minori: 1, genitoriLavorano: true, redditoDip: 25000, nDip: 2, auu2025: 2240 });
  // ISR = 25.000 + 2.240 − 5.000 = 22.240; scala 2,24 → speciale 9.928,57; neutralizzato −1.000 = 8.928,57
  close(r.speciale.isee, 9928.57);
  close(r.specialeNeutralizzato, 8928.57);
});

test('benefici: soglie ADI e bonus sociali', () => {
  const r = D.calcolaTutto({ componenti: 2, figli: 1, minori: 1, genitoreSolo: true, redditoDip: 9000, nDip: 1 });
  const by = Object.fromEntries(r.benefici.map((b) => [b.id, b]));
  // ISR 9.000 − 1.800 = 7.200; scala 1,57 + 0,2 = 1,77 → 4.067,80
  close(r.ordinario.isee, 4067.80);
  assert.equal(by.adi.esito, 'si');
  assert.equal(by.bonus.esito, 'si');
  assert.ok(by.auu);
  const ricco = D.calcolaTutto({ componenti: 1, redditoDip: 60000, nDip: 1 });
  const b2 = Object.fromEntries(ricco.benefici.map((b) => [b.id, b]));
  assert.equal(b2.adi.esito, 'no');
  assert.equal(b2.bonus.esito, 'no');
  assert.equal(b2.auu, undefined);
});

test('valore IMU dalla rendita catastale', () => {
  assert.equal(D.valoreImuDaRendita(500), 84000); // 500 × 1,05 × 160
});

test('input vuoti o negativi non rompono il calcolo', () => {
  const r = D.calcolaTutto({ componenti: '', redditoDip: -5, contiSaldo: 'abc' });
  assert.equal(r.ordinario.isee, 0);
  assert.equal(r.ordinario.scala.valore, 1);
});

test('ogni regola ha stato e fonte valida', () => {
  const R = D.RULES;
  for (const [k, v] of Object.entries(R)) {
    if (v && typeof v === 'object' && 'stato' in v) {
      assert.ok(['verificato', 'valore2026', 'da_confermare'].includes(v.stato), k);
      assert.ok(R.fonti[v.fonte], 'fonte mancante per ' + k);
    }
  }
});

test('con ISEE corrente conveniente gli aiuti usano il corrente', () => {
  const r = D.calcolaTutto({ componenti: 2, figli: 1, minori: 1, genitoreSolo: true, redditoDip: 30000, nDip: 1, peggiorata: true, motivo: 'lavoro_indeterminato', modoCorrente: '12mesi', correnteTR: 6000 });
  // ordinario: 27.000 / 1,77 = 15.254,24 → ADI no; corrente: 6.000 / 1,77 = 3.389,83 → ADI sì
  close(r.ordinario.isee, 15254.24);
  close(r.corrente.speciale.isee, 3389.83);
  assert.equal(r.beneficiConCorrente, true);
  assert.equal(r.benefici.find((b) => b.id === 'adi').esito, 'si');
});
