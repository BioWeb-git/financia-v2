import React, { useState, useMemo, useCallback } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { AlertTriangle, TrendingUp, Info, ChevronDown, ChevronUp } from 'lucide-react';
import {
  calculateMonthlyPayment,
  capitalRestantDuExact,
  newPaymentAfterRA,
  newDurationAfterRA,
  valeurPlacement,
} from './lib/finance';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...i) { return twMerge(clsx(i)); }

const fmt = (n) => Math.round(n).toLocaleString('fr-FR');
const fmtK = (n) => (Math.abs(n) >= 1000 ? (n / 1000).toFixed(0) + ' k' : Math.round(n).toString()) + ' €';

const COLORS = [
  { id: 'A', hex: '#6366f1', label: 'Scénario A', tw: 'indigo' },
  { id: 'B', hex: '#10b981', label: 'Scénario B', tw: 'emerald' },
  { id: 'C', hex: '#f59e0b', label: 'Scénario C', tw: 'amber' },
  { id: 'D', hex: '#f43f5e', label: 'Scénario D', tw: 'rose' },
];

const CHART_OPTIONS_BASE = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      position: 'top',
      labels: { font: { size: 10, weight: '700' }, padding: 16, usePointStyle: true, pointStyleWidth: 10 },
    },
    tooltip: {
      backgroundColor: '#0f172a',
      titleColor: '#94a3b8',
      bodyColor: '#f8fafc',
      titleFont: { size: 9, weight: '700' },
      bodyFont: { size: 11, weight: '700' },
      padding: 12,
      cornerRadius: 12,
      boxPadding: 4,
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label} : ${fmt(ctx.parsed.y)} €`,
      },
    },
  },
  scales: {
    x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 9 } } },
    y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 9 }, callback: (v) => fmtK(v) } },
  },
};

function Slider({ label, value, min, max, step, onChange, format, sub }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <span className="text-sm font-black text-slate-900">{format ? format(value) : value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-indigo-500 cursor-pointer"
      />
      {sub && <p className="text-[9px] text-slate-400">{sub}</p>}
    </div>
  );
}

function Alert({ level, msg }) {
  const cls = level === 'error'
    ? 'bg-rose-50 border-rose-300 text-rose-700'
    : 'bg-amber-50 border-amber-300 text-amber-700';
  return (
    <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-bold', cls)}>
      <AlertTriangle size={10} />
      {msg}
    </div>
  );
}

function computeScenario(p, apport) {
  const { price, fraisNotaire, fraisAgence, fraisAutres, rate, duration, insurance, income, depensesFamille, rendement, prixParcelle, moisVente, raMode, matelas, travaux, epargneTotale } = p;
  const fraisTotal = price * (fraisNotaire / 100) + fraisAgence + fraisAutres;
  const totalAcquisition = price + fraisTotal;
  const loanAmount = Math.max(0, totalAcquisition - apport);

  const cashGarde = epargneTotale - apport;
  const cashPlace = Math.max(0, cashGarde - matelas - travaux);

  // Phase 1
  const pmt1 = calculateMonthlyPayment(loanAmount, rate, duration, insurance);
  const debtRatio1 = income > 0 ? (pmt1.total / income) * 100 : 0;
  const rav1 = income - pmt1.total;
  const epargne1 = rav1 - depensesFamille;

  // RA à moisVente
  const nTotal = duration * 12;
  const tRA = Math.min(moisVente, nTotal - 1);
  const crAvantRA = capitalRestantDuExact(loanAmount, rate, duration, tRA);
  const raEffectif = Math.min(prixParcelle, crAvantRA);
  const remainingMonths = nTotal - tRA;

  let pmt2 = pmt1;
  let dureePhase2Mois = remainingMonths;
  let newDuration = duration;

  if (prixParcelle > 0 && tRA > 0) {
    if (raMode === 'mensualite') {
      pmt2 = newPaymentAfterRA(crAvantRA, raEffectif, rate, remainingMonths, insurance, loanAmount);
      dureePhase2Mois = remainingMonths;
      newDuration = duration;
    } else if (raMode === 'duree') {
      const nRemaining = newDurationAfterRA(crAvantRA, raEffectif, rate, pmt1.pi);
      dureePhase2Mois = nRemaining;
      newDuration = tRA / 12 + nRemaining / 12;
      pmt2 = { ...pmt1 };
    }
    // raMode === 'investir' : pmt2 = pmt1, durée inchangée, l'argent va dans le placement
  }

  const rav2 = income - pmt2.total;
  const epargne2 = rav2 - depensesFamille;
  const debtRatio2 = income > 0 ? (pmt2.total / income) * 100 : 0;

  // Coût total
  const totalPaye1 = pmt1.total * tRA;
  const totalPaye2 = pmt2.total * dureePhase2Mois;
  const coutInteretsAssurance = totalPaye1 + totalPaye2 - loanAmount;

  // Patrimoine financier
  const ep1 = Math.max(0, epargne1);
  const ep2 = Math.max(0, epargne2);
  const phase1Val = valeurPlacement(cashPlace, ep1, rendement, tRA);
  const capitalPhase2 = raMode === 'investir' && prixParcelle > 0 && tRA > 0
    ? phase1Val + prixParcelle
    : phase1Val;
  const phase2Val = valeurPlacement(capitalPhase2, ep2, rendement, dureePhase2Mois);

  // Phase 3 (mode "duree" uniquement) : crédit terminé, mensualité libérée → tout dans le placement
  const loanEndMonth = tRA + dureePhase2Mois;
  const phase3Months = raMode === 'duree' ? Math.max(0, nTotal - loanEndMonth) : 0;
  // En phase 3 : on verse ep2 + mensualité entière (crédit fini, plus rien à la banque)
  const ep3 = raMode === 'duree' ? Math.max(0, ep2 + pmt2.total) : ep2;
  const valPatrimoineFinancier = phase3Months > 0
    ? valeurPlacement(phase2Val, ep3, rendement, phase3Months)
    : phase2Val;

  // Mensualité ressentie : vraie moyenne mois par mois sur toute la durée (nTotal)
  let totalRessentie = 0;
  for (let m = 1; m <= nTotal; m++) {
    const inPhase3 = m > loanEndMonth;
    let placem;
    if (m <= tRA) {
      placem = valeurPlacement(cashPlace, ep1, rendement, m);
    } else if (!inPhase3) {
      placem = valeurPlacement(capitalPhase2, ep2, rendement, m - tRA);
    } else {
      placem = valeurPlacement(phase2Val, ep3, rendement, m - loanEndMonth);
    }
    const revMensuel = placem * (rendement / 100 / 12);
    const pmt = inPhase3 ? 0 : (m <= tRA ? pmt1.total : pmt2.total);
    totalRessentie += Math.max(0, pmt - revMensuel);
  }
  const mensualiteRessentie = totalRessentie / nTotal;

  const injectionParcelle = raMode === 'investir' && prixParcelle > 0 && tRA > 0 ? prixParcelle : 0;

  // Alertes
  const alerts = [];
  if (debtRatio1 > 35) alerts.push({ level: 'error', msg: 'Taux d\'endettement > 35 % (HCSF)' });
  else if (debtRatio1 > 33) alerts.push({ level: 'warn', msg: 'Marge faible vs HCSF (33 %)' });
  if (apport < totalAcquisition * 0.10) alerts.push({ level: 'warn', msg: 'Apport < 10 % de l\'opération' });
  if (cashGarde < matelas + travaux) alerts.push({ level: 'warn', msg: 'Coussin de sécurité insuffisant' });
  if (raEffectif > crAvantRA) alerts.push({ level: 'error', msg: 'RA > capital restant à cette date' });
  if (rendement > 7) alerts.push({ level: 'warn', msg: 'Rendement > 7 % : hypothèse optimiste' });

  return {
    apport, fraisTotal, totalAcquisition, loanAmount,
    cashGarde, cashPlace,
    pmt1, debtRatio1, rav1, epargne1,
    tRA, crAvantRA, raEffectif,
    pmt2, dureePhase2Mois, newDuration, debtRatio2, rav2, epargne2,
    coutInteretsAssurance,
    valPatrimoineFinancier, mensualiteRessentie,
    injectionParcelle, capitalPhase2, phase2Val, loanEndMonth, phase3Months, ep3,
    alerts,
  };
}

const MAX_APPORT = 150000;

function computeMinApportHCSF(price, fraisNotaire, fraisAgence, fraisAutres, rate, duration, insurance, income) {
  const fraisTotal = price * (fraisNotaire / 100) + fraisAgence + fraisAutres;
  const totalAcquisition = price + fraisTotal;
  const maxMonthly = income * 0.35;
  const r = rate / 100 / 12;
  const n = duration * 12;
  const denom = r > 0
    ? (r / (1 - Math.pow(1 + r, -n))) + (insurance / 100 / 12)
    : (1 / n) + (insurance / 100 / 12);
  const loanCapacity = maxMonthly / denom;
  return Math.max(0, Math.ceil((totalAcquisition - loanCapacity) / 1000) * 1000);
}

function distributeApports(min, max) {
  if (min >= max) return [min, min, max, max];
  const step = (max - min) / 3;
  return [
    Math.round(min / 1000) * 1000,
    Math.round((min + step) / 1000) * 1000,
    Math.round((min + 2 * step) / 1000) * 1000,
    Math.round(max / 1000) * 1000,
  ];
}

export default function AnalysePage({ currentScenario, globalSettings }) {
  const initPrice = currentScenario?.price || 430000;
  const initRate = currentScenario?.rate || 3.2;
  const initDuration = currentScenario?.duration || 25;
  const initInsurance = currentScenario?.insurance || 0.36;
  const initIncome = (globalSettings?.incomeJess || 3200) + (globalSettings?.incomeRenaud || 1314);
  const initEpargne = globalSettings?.epargneTotale || 200000;

  const [price, setPrice] = useState(initPrice);
  const [fraisNotaire, setFraisNotaire] = useState(currentScenario?.notaryRate || 7.5);
  const [fraisAgence, setFraisAgence] = useState(12000);
  const [fraisAutres, setFraisAutres] = useState(8000);
  const [rate, setRate] = useState(initRate);
  const [duration, setDuration] = useState(initDuration);
  const [insurance, setInsurance] = useState(initInsurance);
  const [income, setIncome] = useState(initIncome);
  const [depensesFamille, setDepensesFamille] = useState(2500);
  const [rendement, setRendement] = useState(4.5);

  const [prixParcelle, setPrixParcelle] = useState(80000);
  const [moisVente, setMoisVente] = useState(18);
  const [raMode, setRaMode] = useState('mensualite');

  const [matelas, setMatelas] = useState(20000);
  const [travaux, setTravaux] = useState(30000);
  const [epargneTotale, setEpargneTotale] = useState(initEpargne);

  const initMin = computeMinApportHCSF(initPrice, currentScenario?.notaryRate || 7.5, 12000, 8000, initRate, initDuration, initInsurance, initIncome);
  const [apports, setApports] = useState(distributeApports(initMin, MAX_APPORT));

  const repartir = useCallback(() => {
    const min = computeMinApportHCSF(price, fraisNotaire, fraisAgence, fraisAutres, rate, duration, insurance, income);
    setApports(distributeApports(min, MAX_APPORT));
  }, [price, fraisNotaire, fraisAgence, fraisAutres, rate, duration, insurance, income]);

  const [showCharts, setShowCharts] = useState(true);

  const params = useMemo(() => ({
    price, fraisNotaire, fraisAgence, fraisAutres,
    rate, duration, insurance, income, depensesFamille, rendement,
    prixParcelle, moisVente, raMode,
    matelas, travaux, epargneTotale,
  }), [price, fraisNotaire, fraisAgence, fraisAutres, rate, duration, insurance, income, depensesFamille, rendement, prixParcelle, moisVente, raMode, matelas, travaux, epargneTotale]);

  const results = useMemo(() => apports.map((a) => computeScenario(params, a)), [params, apports]);

  // Génération données graphiques
  const chartData = useMemo(() => {
    const nTotal = Math.round(duration * 12);
    const months = Array.from({ length: nTotal + 1 }, (_, i) => i);
    const years = Array.from({ length: duration + 1 }, (_, i) => i);

    const pointStyle = { pointRadius: 3, pointHoverRadius: 7, pointBorderWidth: 2 };

    const xMonths = months.filter((_, i) => i % 12 === 0).map((m) => `${m / 12} an${m / 12 > 1 ? 's' : ''}`);
    const monthsSubsampled = months.filter((_, i) => i % 12 === 0);

    const mensualiteLines = COLORS.map((c, i) => {
      const r = results[i];
      const rawData = months.map((m) => m < r.tRA ? r.pmt1.total : (m <= nTotal ? r.pmt2.total : null));
      const subData = monthsSubsampled.map((m) => rawData[m]);
      const raYearIdx = monthsSubsampled.findIndex((m) => m >= r.tRA);
      return {
        label: c.label,
        data: subData,
        borderColor: c.hex,
        backgroundColor: c.hex + '22',
        borderWidth: 2,
        ...pointStyle,
        pointBackgroundColor: subData.map((_, idx) => idx === raYearIdx && r.tRA > 0 ? '#ffffff' : c.hex),
        pointBorderColor: subData.map((_, idx) => idx === raYearIdx && r.tRA > 0 ? c.hex : c.hex),
        pointRadius: subData.map((_, idx) => idx === raYearIdx && r.tRA > 0 ? 6 : 3),
        stepped: 'after',
      };
    });

    const capitalLines = COLORS.map((c, i) => {
      const r = results[i];
      let crApresRA = null;
      const rawData = months.map((m) => {
        if (m < r.tRA) return capitalRestantDuExact(r.loanAmount, rate, duration, m);
        if (m === r.tRA) {
          crApresRA = Math.max(0, r.crAvantRA - r.raEffectif);
          return r.crAvantRA;
        }
        if (crApresRA === null) return capitalRestantDuExact(r.loanAmount, rate, duration, m);
        const elapsed = m - r.tRA;
        return capitalRestantDuExact(crApresRA, rate, r.dureePhase2Mois / 12, elapsed);
      });
      const subData = monthsSubsampled.map((m) => rawData[m]);
      const raYearIdx = monthsSubsampled.findIndex((m) => m >= r.tRA);
      return {
        label: c.label,
        data: subData,
        borderColor: c.hex,
        backgroundColor: c.hex + '22',
        borderWidth: 2,
        ...pointStyle,
        pointBackgroundColor: subData.map((_, idx) => idx === raYearIdx && r.tRA > 0 ? '#ffffff' : c.hex),
        pointRadius: subData.map((_, idx) => idx === raYearIdx && r.tRA > 0 ? 6 : 3),
        tension: 0,
      };
    });

    const patrimoineLines = COLORS.map((c, i) => {
      const r = results[i];
      const ep1 = Math.max(0, r.epargne1);
      const ep2 = Math.max(0, r.epargne2);
      return {
        label: c.label,
        data: years.map((y) => {
          const m = y * 12;
          if (m <= r.tRA) return valeurPlacement(r.cashPlace, ep1, rendement, m);
          if (m <= r.loanEndMonth) return valeurPlacement(r.capitalPhase2 ?? (r.cashPlace), ep2, rendement, m - r.tRA);
          return valeurPlacement(r.phase2Val, r.ep3, rendement, m - r.loanEndMonth);
        }),
        borderColor: c.hex,
        backgroundColor: c.hex + '18',
        borderWidth: 2,
        ...pointStyle,
        pointBackgroundColor: c.hex,
        tension: 0.3,
        fill: true,
      };
    });

    const mensualiteRessentieLines = COLORS.map((c, i) => {
      const r = results[i];
      const ep1 = Math.max(0, r.epargne1);
      const ep2 = Math.max(0, r.epargne2);
      const rawData = months.map((m) => {
        const inPhase3 = m > r.loanEndMonth;
        let placem;
        if (m <= r.tRA) {
          placem = valeurPlacement(r.cashPlace, ep1, rendement, m);
        } else if (!inPhase3) {
          placem = valeurPlacement(r.capitalPhase2, ep2, rendement, m - r.tRA);
        } else {
          placem = valeurPlacement(r.phase2Val, r.ep3, rendement, m - r.loanEndMonth);
        }
        const revPlacement = placem * (rendement / 100 / 12);
        const pmt = inPhase3 ? 0 : (m <= r.tRA ? r.pmt1.total : r.pmt2.total);
        return Math.max(0, pmt - revPlacement);
      });
      const subData = monthsSubsampled.map((m) => rawData[m]);
      return {
        label: c.label,
        data: subData,
        borderColor: c.hex,
        backgroundColor: c.hex + '22',
        borderWidth: 2,
        ...pointStyle,
        pointBackgroundColor: c.hex,
        stepped: 'after',
      };
    });

    return {
      mensualite: {
        labels: xMonths,
        datasets: mensualiteLines,
      },
      capital: {
        labels: xMonths,
        datasets: capitalLines,
      },
      patrimoine: {
        labels: years.map((y) => `${y} an${y > 1 ? 's' : ''}`),
        datasets: patrimoineLines,
      },
      couts: {
        labels: ['💸 Facture banque', '📈 Épargne finale', '✅ Gain net'],
        datasets: COLORS.map((c, i) => ({
          label: c.label,
          data: [
            results[i].coutInteretsAssurance,
            results[i].valPatrimoineFinancier,
            results[i].valPatrimoineFinancier - results[i].coutInteretsAssurance,
          ],
          backgroundColor: c.hex + 'cc',
          borderRadius: 6,
        })),
      },
      mensualiteRessentie: {
        labels: xMonths,
        datasets: mensualiteRessentieLines,
      },
    };
  }, [results, params, duration, rendement, rate]);

  const fraisTotal = price * (fraisNotaire / 100) + fraisAgence + fraisAutres;
  const totalAcquisition = price + fraisTotal;

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Analyse Comparative
            <span className="text-slate-400 font-medium ml-2">| Simulateur</span>
          </h2>
          {currentScenario?.name && (
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
              Basé sur : {currentScenario.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-100 rounded-2xl px-4 py-2 text-center">
            <p className="text-[9px] text-slate-400 uppercase font-bold">Acquisition totale</p>
            <p className="text-lg font-black text-slate-900">{fmt(totalAcquisition)} €</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl px-4 py-2 text-center">
            <p className="text-[9px] text-slate-400 uppercase font-bold">Dont frais</p>
            <p className="text-lg font-black text-slate-500">{fmt(fraisTotal)} €</p>
          </div>
        </div>
      </div>

      {/* Paramètres globaux */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-6">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paramètres Globaux</h3>
        <div className="grid grid-cols-2 gap-x-10 gap-y-5">
          <Slider label="Prix du bien" value={price} min={100000} max={800000} step={5000} onChange={setPrice} format={(v) => `${fmt(v)} €`} />
          <Slider label="Revenus mensuels nets" value={income} min={2000} max={12000} step={100} onChange={setIncome} format={(v) => `${fmt(v)} €`} />
          <Slider label="Frais de notaire" value={fraisNotaire} min={2} max={10} step={0.1} onChange={setFraisNotaire} format={(v) => `${v.toFixed(1)} %`} sub={`→ ${fmt(price * fraisNotaire / 100)} €`} />
          <Slider label="Dépenses famille / mois" value={depensesFamille} min={500} max={6000} step={100} onChange={setDepensesFamille} format={(v) => `${fmt(v)} €`} />
          <Slider label="Frais d'agence" value={fraisAgence} min={0} max={30000} step={500} onChange={setFraisAgence} format={(v) => `${fmt(v)} €`} />
          <Slider label="Rendement placement (% net/an)" value={rendement} min={0} max={10} step={0.1} onChange={setRendement} format={(v) => `${v.toFixed(1)} %`} sub={rendement > 7 ? '⚠ Hypothèse optimiste' : ''} />
          <Slider label="Autres frais (garantie + dossier + courtage)" value={fraisAutres} min={0} max={20000} step={500} onChange={setFraisAutres} format={(v) => `${fmt(v)} €`} />
          <Slider label="Taux crédit (% nominal)" value={rate} min={2} max={5.5} step={0.05} onChange={setRate} format={(v) => `${v.toFixed(2)} %`} />
          <Slider label="Durée crédit (ans)" value={duration} min={15} max={25} step={1} onChange={setDuration} format={(v) => `${v} ans`} />
          <Slider label="Taux assurance emprunteur" value={insurance} min={0.15} max={0.55} step={0.01} onChange={setInsurance} format={(v) => `${v.toFixed(2)} %`} />
        </div>
      </div>

      {/* Parcelle + Patrimoine */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-5">
          <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Parcelle Divisible</h3>
          <Slider label="Prix vente parcelle" value={prixParcelle} min={0} max={150000} step={5000} onChange={setPrixParcelle} format={(v) => `${fmt(v)} €`} />
          <Slider label="Mois prévisionnel de la vente" value={moisVente} min={0} max={60} step={1} onChange={setMoisVente} format={(v) => `M+${v}`} />
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Que faire avec l'argent de la vente ?</p>
            <div className="flex flex-col gap-2">
              {[
                ['mensualite', '📉 Rembourser → baisser la mensualité'],
                ['duree', '⏱ Rembourser → raccourcir la durée'],
                ['investir', '📈 Investir → placer et laisser fructifier'],
              ].map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setRaMode(val)}
                  className={cn(
                    'w-full py-2.5 px-3 rounded-xl text-[10px] font-black text-left transition-all',
                    raMode === val
                      ? 'bg-amber-500 text-white shadow'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  )}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-5">
          <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Patrimoine Initial</h3>
          <Slider label="Épargne totale disponible" value={epargneTotale} min={0} max={400000} step={5000} onChange={setEpargneTotale} format={(v) => `${fmt(v)} €`} />
          <Slider label="Matelas de sécurité (intouchable)" value={matelas} min={0} max={50000} step={1000} onChange={setMatelas} format={(v) => `${fmt(v)} €`} />
          <Slider label="Provision travaux (mobilisable)" value={travaux} min={0} max={80000} step={1000} onChange={setTravaux} format={(v) => `${fmt(v)} €`} sub={`Cash placé minimal = ${fmt(Math.max(0, epargneTotale - apports[0] - matelas - travaux))} €`} />
        </div>
      </div>

      {/* Sliders apports par scénario */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Apport par Scénario</h3>
          <button
            onClick={repartir}
            className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase hover:bg-indigo-100 transition-all"
            title="Recalcule le minimum HCSF avec les paramètres actuels et redistribue jusqu'à 150 k"
          >
            ↺ Recalculer la répartition
          </button>
        </div>
        <div className="grid grid-cols-4 gap-6">
          {COLORS.map((c, i) => (
            <div key={c.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }} />
                <span className="text-[10px] font-black uppercase text-slate-600">{c.label}</span>
              </div>
              <Slider
                label="Apport"
                value={apports[i]}
                min={0}
                max={epargneTotale}
                step={1000}
                onChange={(v) => setApports((prev) => prev.map((a, j) => (j === i ? v : a)))}
                format={(v) => `${fmt(v)} €`}
                sub={`Emprunté : ${fmt(Math.max(0, totalAcquisition - apports[i]))} €`}
              />
              {results[i].alerts.length > 0 && (
                <div className="space-y-1">
                  {results[i].alerts.map((al, k) => (
                    <Alert key={k} level={al.level} msg={al.msg} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tableau de synthèse */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tableau de Synthèse</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase w-48">Indicateur</th>
                {COLORS.map((c) => (
                  <th key={c.id} className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
                      <span className="text-[10px] font-black text-slate-700">{c.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                { label: 'Apport', key: (r) => `${fmt(r.apport)} €` },
                { label: 'Emprunt', key: (r) => `${fmt(r.loanAmount)} €` },
                { label: 'Cash gardé jour J', key: (r) => `${fmt(r.cashGarde)} €`, color: (r) => r.cashGarde < 0 ? 'text-rose-600' : '' },
                { label: 'Cash placé', key: (r) => `${fmt(r.cashPlace)} €`, color: (r) => r.cashPlace < 0 ? 'text-rose-600' : 'text-emerald-600' },
                { label: '— PHASE 1 —', header: true },
                { label: 'Mensualité totale', key: (r) => `${fmt(r.pmt1.total)} €` },
                { label: 'Taux d\'endettement', key: (r) => `${r.debtRatio1.toFixed(1)} %`, color: (r) => r.debtRatio1 > 35 ? 'text-rose-600 font-black' : r.debtRatio1 > 33 ? 'text-amber-600' : 'text-emerald-600' },
                { label: 'Reste à vivre', key: (r) => `${fmt(r.rav1)} €`, color: (r) => r.rav1 < 500 ? 'text-rose-600' : 'text-slate-700' },
                { label: 'Épargne mensuelle', key: (r) => `${fmt(r.epargne1)} €`, color: (r) => r.epargne1 < 0 ? 'text-rose-600' : 'text-emerald-600' },
                { label: `— APRÈS VENTE PARCELLE (M+${moisVente}) —`, header: true },
                { label: raMode === 'investir' ? 'Capital injecté dans le placement' : 'Capital restant avant RA', key: (r) => raMode === 'investir' ? `${fmt(r.injectionParcelle)} €` : `${fmt(r.crAvantRA)} €`, color: raMode === 'investir' ? () => 'text-emerald-600' : undefined },
                { label: raMode === 'investir' ? 'Mensualité (inchangée)' : raMode === 'mensualite' ? 'Nouvelle mensualité' : 'Mensualité maintenue', key: (r) => `${fmt(r.pmt2.total)} €`, color: (r) => r.pmt2.total < r.pmt1.total ? 'text-emerald-600' : '' },
                { label: raMode === 'duree' ? 'Durée réduite à (mois)' : 'Durée (inchangée)', key: (r) => raMode === 'duree' ? `${Math.round(r.tRA + r.dureePhase2Mois)} mois` : `${duration * 12} mois` },
                { label: 'Reste à vivre phase 2', key: (r) => `${fmt(r.rav2)} €`, color: (r) => r.rav2 < 500 ? 'text-rose-600' : 'text-slate-700' },
                { label: 'Épargne mensuelle phase 2', key: (r) => `${fmt(r.epargne2)} €`, color: (r) => r.epargne2 < 0 ? 'text-rose-600' : 'text-emerald-600' },
                ...(raMode === 'duree' ? [
                  { label: '— PHASE 3 : crédit terminé —', header: true },
                  { label: 'Mois libérés (réinvestis)', key: (r) => r.phase3Months > 0 ? `${r.phase3Months} mois` : '—', color: (r) => r.phase3Months > 0 ? 'text-emerald-600' : 'text-slate-400' },
                  { label: 'Versement mensuel phase 3', key: (r) => r.phase3Months > 0 ? `${fmt(r.ep3)} €` : '—', color: (r) => r.phase3Months > 0 ? 'text-emerald-600 font-black' : 'text-slate-400' },
                ] : []),
                { label: '— BILAN —', header: true },
                { label: 'Coût total intérêts+assur.', key: (r) => `${fmt(r.coutInteretsAssurance)} €`, color: () => 'text-rose-600' },
                { label: 'Patrimoine financier final', key: (r) => `${fmt(r.valPatrimoineFinancier)} €`, color: () => 'text-emerald-600 font-black' },
                { label: 'Mensualité ressentie moy.', key: (r) => `${fmt(Math.max(0, r.mensualiteRessentie))} €`, color: (r) => r.mensualiteRessentie < r.pmt1.total * 0.5 ? 'text-emerald-600' : '' },
              ].map((row, idx) => {
                if (row.header) {
                  return (
                    <tr key={idx} className="bg-slate-900">
                      <td colSpan={5} className="px-4 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">{row.label}</td>
                    </tr>
                  );
                }
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5 text-[10px] font-bold text-slate-500">{row.label}</td>
                    {results.map((r, i) => (
                      <td key={i} className={cn('px-4 py-2.5 text-center text-[11px] font-black', row.color ? row.color(r) : 'text-slate-800')}>
                        {row.key(r)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Graphiques */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <button
          className="w-full p-6 flex items-center justify-between"
          onClick={() => setShowCharts((v) => !v)}
        >
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visualisations Comparatives</h3>
          {showCharts ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {showCharts && (
          <div className="px-6 pb-6 grid grid-cols-2 gap-8">

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">1 · Mensualité dans le temps</p>
              <div className="h-56"><Line data={chartData.mensualite} options={{ ...CHART_OPTIONS_BASE, plugins: { ...CHART_OPTIONS_BASE.plugins, annotation: {} } }} /></div>
              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                <p className="text-[10px] font-black text-slate-700">Ce que montre cette courbe</p>
                <div className="space-y-1.5 text-[10px] text-slate-500 leading-relaxed">
                  <p>C'est <span className="font-bold text-slate-700">ce qui sort de votre compte bancaire chaque mois</span> pour rembourser la banque — capital + intérêts + assurance. Techniquement appelée "annuité constante", elle ne change pas pendant toute la durée du crédit.</p>
                  <p>La courbe est en marches d'escalier car cette somme est fixe : elle reste au même niveau des années entières, puis <span className="font-bold text-slate-700">descend d'un coup quand vous remboursez par anticipation</span> avec la vente de la parcelle.</p>
                  <p>👉 Comparez la hauteur du premier palier : c'est votre engagement financier mensuel dès le premier jour. Plus il est bas, plus vous avez de marge pour vivre, épargner ou faire face aux imprévus.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">2 · Capital restant dû</p>
              <div className="h-56"><Line data={chartData.capital} options={CHART_OPTIONS_BASE} /></div>
              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                <p className="text-[10px] font-black text-slate-700">Ce que montre cette courbe</p>
                <div className="space-y-1.5 text-[10px] text-slate-500 leading-relaxed">
                  <p>C'est <span className="font-bold text-slate-700">ce que vous devez encore à la banque</span> si vous remboursiez tout demain. Au départ, vous devez presque autant que ce que vous avez emprunté. Ça descend lentement les premières années — parce que la majorité de vos mensualités part en intérêts, pas en remboursement réel.</p>
                  <p>La chute brutale sur la courbe, c'est <span className="font-bold text-slate-700">le jour où vous vendez la parcelle et remboursez une grosse somme d'un coup</span>. D'un trait, votre dette chute — et avec elle, soit vos mensualités, soit la durée restante.</p>
                  <p>👉 Un scénario avec moins d'apport part plus haut sur cette courbe (plus de dette), mais profite aussi d'un saut plus marqué au moment du remboursement anticipé.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">3 · Évolution patrimoine financier</p>
              <div className="h-56"><Line data={chartData.patrimoine} options={CHART_OPTIONS_BASE} /></div>
              <div className="bg-slate-50 rounded-xl p-3 space-y-3">
                <p className="text-[10px] font-black text-slate-700">Comment ce capital grossit chaque mois</p>
                <div className="space-y-1.5 text-[10px] text-slate-500 leading-relaxed">
                  <p>Chaque mois, votre capital augmente de <span className="font-bold text-slate-700">deux sources</span> :</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded-lg p-2 border border-slate-200">
                      <p className="font-black text-slate-700 mb-0.5">📥 Ce que vous versez</p>
                      <p>Ce qui reste de votre salaire après avoir tout payé : mensualité + courses + factures. C'est votre <span className="font-bold">épargne mensuelle</span> = revenus − mensualité crédit − dépenses famille.</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-slate-200">
                      <p className="font-black text-slate-700 mb-0.5">📈 Ce que le capital génère seul</p>
                      <p>Les intérêts sur votre capital déjà placé. Avec {rendement}% annuel, chaque mois le capital rapporte <span className="font-bold">{(rendement / 12).toFixed(2)}% de sa valeur</span> — automatiquement, sans rien faire.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-600">Décomposition par scénario au démarrage</p>
                  <table className="w-full text-[9px]">
                    <thead>
                      <tr className="text-slate-400 font-black uppercase">
                        <th className="text-left py-1 pr-2">Scénario</th>
                        <th className="text-right py-1 px-2">Capital initial placé</th>
                        <th className="text-right py-1 px-2">Versement mensuel</th>
                        <th className="text-right py-1 px-2">Intérêts mois 1</th>
                        {raMode === 'investir' && prixParcelle > 0 && <th className="text-right py-1 pl-2">Injection M+{moisVente}</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {COLORS.map((c, i) => {
                        const r = results[i];
                        const interetsMois1 = r.cashPlace * (rendement / 100 / 12);
                        const versement = Math.max(0, r.epargne1);
                        return (
                          <tr key={c.id}>
                            <td className="py-1.5 pr-2 font-black" style={{ color: c.hex }}>{c.label}</td>
                            <td className="py-1.5 px-2 text-right font-bold text-slate-700">{fmt(r.cashPlace)} €</td>
                            <td className={cn('py-1.5 px-2 text-right font-bold', versement > 0 ? 'text-emerald-600' : 'text-rose-500')}>{versement > 0 ? '+' : ''}{fmt(versement)} €</td>
                            <td className="py-1.5 px-2 text-right font-bold text-indigo-600">+{fmt(interetsMois1)} €</td>
                            {raMode === 'investir' && prixParcelle > 0 && <td className="py-1.5 pl-2 text-right font-bold text-amber-600">+{fmt(r.injectionParcelle)} €</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="text-[10px] text-slate-500 leading-relaxed pt-1 border-t border-slate-200 space-y-1">
                  <p>👉 <span className="font-bold text-slate-700">Les intérêts composés font boule de neige :</span> plus le capital est grand, plus les intérêts mensuels sont grands, plus le capital grossit vite. C'est pour ça que la courbe s'accélère avec le temps plutôt que d'être une ligne droite.</p>
                  <p>👉 <span className="font-bold text-slate-700">Les courbes qui partent le plus haut = moins d'apport mis dans la maison</span> = plus de cash conservé et placé dès le départ. Chaque euro supplémentaire en apport, c'est un euro de moins qui travaille pour vous pendant 25 ans.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">4 · Coûts comparés</p>
              <div className="h-56"><Bar data={chartData.couts} options={{ ...CHART_OPTIONS_BASE, scales: { ...CHART_OPTIONS_BASE.scales, x: { ...CHART_OPTIONS_BASE.scales.x, ticks: { font: { size: 8 } } } } }} /></div>
              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                <p className="text-[10px] font-black text-slate-700">Ce que montre ce graphique</p>
                <div className="space-y-1.5 text-[10px] text-slate-500 leading-relaxed">
                  <p><span className="font-black text-slate-700">💸 Facture banque</span> — tout ce que vous avez payé à la banque en intérêts et assurance, au-delà du capital emprunté. C'est de l'argent définitivement perdu, qui ne vous appartient plus.</p>
                  <p><span className="font-black text-slate-700">📈 Épargne finale</span> — la valeur de votre épargne à la fin des 25 ans : le cash que vous n'avez pas mis en apport, placé dès le départ, augmenté chaque mois de ce que vous réussissez à mettre de côté.</p>
                  <p><span className="font-black text-slate-700">✅ Gain net</span> — épargne finale moins facture banque. C'est votre bilan financier réel hors bien immobilier. <span className="font-bold text-slate-700">C'est la barre à maximiser.</span> Si un scénario avec moins d'apport a un gain net plus élevé, c'est que votre placement rapporte plus que ce que vous coûte le crédit — le levier joue en votre faveur.</p>
                </div>
              </div>
            </div>

            <div className="col-span-2 space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">5 · Mensualité ressentie (après rendement placement)</p>
              <div className="h-56"><Line data={chartData.mensualiteRessentie} options={CHART_OPTIONS_BASE} /></div>
              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                <p className="text-[10px] font-black text-slate-700">Ce que montre cette courbe</p>
                <div className="space-y-1.5 text-[10px] text-slate-500 leading-relaxed">
                  <p>Votre crédit vous coûte 1 800 € par mois sur le papier. Mais en parallèle, votre épargne placée génère chaque mois des intérêts. <span className="font-bold text-slate-700">La mensualité ressentie, c'est ce que le crédit vous coûte vraiment</span> une fois que vous déduisez ces gains : mensualité brute − revenus du placement.</p>
                  <p>Au départ, l'écart est faible (votre placement vient juste de démarrer). Mais les intérêts s'accumulent, le capital grossit, et les revenus mensuels du placement augmentent chaque année. <span className="font-bold text-slate-700">La courbe descend en continu</span> — là où la mensualité brute restait plate sur un palier.</p>
                  <p>👉 Si la courbe atteint zéro, votre placement couvre entièrement votre remboursement : votre crédit s'autofinance. C'est le scénario idéal. Comparez à quelle vitesse chaque scénario descend vers zéro — c'est ça, le vrai coût de la vie sur 25 ans.</p>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Quick analyses */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Analyses Rapides</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: 'Apport minimum HCSF (35 %)',
              fn: () => {
                const minApport = [145000, 130000, 115000, 95000].map((_, i) => {
                  const r = results[i];
                  const maxMonthly = income * 0.35;
                  const monthlyRate = rate / 100 / 12;
                  const n = duration * 12;
                  const factor = monthlyRate > 0
                    ? (1 - Math.pow(1 + monthlyRate, -n)) / (monthlyRate + (insurance / 100 / 12))
                    : n;
                  const loanCapacity = maxMonthly * factor;
                  return Math.max(0, totalAcquisition - loanCapacity);
                });
                return `Min. apport requis : ${fmt(minApport[0])} € (identique pour tous scénarios)`;
              },
            },
            {
              label: raMode === 'duree' ? 'Gain durée vs mensualité (parcelle)' : 'Gain mensualité vs durée (parcelle)',
              fn: () => {
                const r0 = results[0];
                const crRA = r0.crAvantRA;
                const remMois = duration * 12 - r0.tRA;
                if (raMode === 'duree') {
                  const nNew = newDurationAfterRA(crRA, prixParcelle, rate, r0.pmt1.pi);
                  const gain = remMois - nNew;
                  return `Durée réduite de ${Math.round(gain)} mois (${(gain / 12).toFixed(1)} ans) — Scénario A`;
                } else {
                  const pmtNew = newPaymentAfterRA(crRA, prixParcelle, rate, remMois, insurance, r0.loanAmount);
                  const gain = r0.pmt1.total - pmtNew.total;
                  return `Économie mensuelle : ${fmt(gain)} € → ${fmt(pmtNew.total)} €/mois — Scénario A`;
                }
              },
            },
            {
              label: `Mensualité ressentie si rendement = 5 %`,
              fn: () => {
                const r0 = results[0];
                const vFin = valeurPlacement(r0.cashPlace, Math.max(0, r0.epargne1), 5, duration * 12);
                const rev = vFin * (5 / 100 / 12);
                const ressentie = Math.max(0, r0.pmt1.total - rev);
                return `Scénario A : ${fmt(ressentie)} €/mois (patrimoine final : ${fmt(vFin)} €)`;
              },
            },
            {
              label: `Si parcelle vendue ${fmt(prixParcelle + 20000)} € (+20k)`,
              fn: () => {
                const pPlus = computeScenario({ ...params, prixParcelle: prixParcelle + 20000 }, apports[0]);
                const base = results[0];
                if (raMode === 'mensualite') {
                  return `Mensualité phase 2 : ${fmt(pPlus.pmt2.total)} € vs ${fmt(base.pmt2.total)} € (−${fmt(base.pmt2.total - pPlus.pmt2.total)} €)`;
                } else {
                  return `Durée réduite à ${Math.round(pPlus.tRA + pPlus.dureePhase2Mois)} mois vs ${Math.round(base.tRA + base.dureePhase2Mois)} mois`;
                }
              },
            },
          ].map((qa, i) => (
            <QuickAnalysis key={i} label={qa.label} compute={qa.fn} />
          ))}
        </div>
      </div>
    </main>
  );
}

function QuickAnalysis({ label, compute }) {
  const [result, setResult] = useState(null);
  return (
    <button
      onClick={() => setResult(compute())}
      className="text-left p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group"
    >
      <p className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5 group-hover:text-indigo-600 transition-colors">
        <TrendingUp size={12} />
        {label}
      </p>
      {result && (
        <p className="mt-2 text-xs font-bold text-slate-800">{result}</p>
      )}
    </button>
  );
}
