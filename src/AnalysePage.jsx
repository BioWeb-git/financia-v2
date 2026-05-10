import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { AlertTriangle, TrendingUp, Info, ChevronDown, ChevronUp, Save, RotateCcw, ArrowLeftRight, X } from 'lucide-react';
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

function ChartHelp({ title, children, className = 'space-y-2' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-slate-50 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-100 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-[10px] font-black text-slate-600">{title}</span>
        {open
          ? <ChevronUp size={12} className="text-slate-400 shrink-0" />
          : <ChevronDown size={12} className="text-slate-400 shrink-0" />}
      </button>
      {open && <div className={cn('px-3 pb-3', className)}>{children}</div>}
    </div>
  );
}

const fmt = (n) => Math.round(n).toLocaleString('fr-FR');
const fmtK = (n) => (Math.abs(n) >= 1000 ? (n / 1000).toFixed(0) + ' k' : Math.round(n).toString()) + ' €';

const COLORS = [
  { id: 'A', hex: '#6366f1', label: 'Scénario A', tw: 'indigo' },
  { id: 'B', hex: '#10b981', label: 'Scénario B', tw: 'emerald' },
  { id: 'C', hex: '#f59e0b', label: 'Scénario C', tw: 'amber' },
  { id: 'D', hex: '#f43f5e', label: 'Scénario D', tw: 'rose' },
];
const COLORS_PASTEL = [
  { hex: '#c7d2fe' },
  { hex: '#a7f3d0' },
  { hex: '#fde68a' },
  { hex: '#fecdd3' },
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

function Slider({ label, value, min, max, step, onChange, format, sub, isDark }) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const dec = step < 1 ? (String(step).split('.')[1]?.length || 1) : 0;

  const handleMinus = () => onChange(Number(Math.max(min, value - step).toFixed(dec)));
  const handlePlus  = () => onChange(Number(Math.min(max, value + step).toFixed(dec)));

  const commit = () => {
    const num = parseFloat(String(inputVal).replace(/\s/g, '').replace(',', '.'));
    if (!isNaN(num)) onChange(Number(Math.min(max, Math.max(min, num)).toFixed(dec)));
    setEditing(false);
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center gap-2">
        <span className={cn("text-[10px] font-black uppercase tracking-widest leading-tight", isDark ? "text-slate-500" : "text-slate-400")}>{label}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleMinus} className={cn("w-5 h-5 rounded flex items-center justify-center font-black text-sm leading-none transition-colors", isDark ? "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white" : "bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600")}>−</button>
          {editing ? (
            <input
              autoFocus
              className={cn("w-16 bg-transparent border-b text-[11px] font-black text-center focus:ring-0 outline-none", isDark ? "border-slate-700 text-white" : "border-slate-200 text-slate-900")}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
            />
          ) : (
            <span
              onClick={() => { setInputVal(value); setEditing(true); }}
              className={cn("text-[11px] font-black cursor-pointer tabular-nums", isDark ? "text-white" : "text-slate-900")}
            >
              {format ? format(value) : value}
            </span>
          )}
          <button onClick={handlePlus} className={cn("w-5 h-5 rounded flex items-center justify-center font-black text-sm leading-none transition-colors", isDark ? "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white" : "bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600")}>+</button>
        </div>
      </div>
      <div className="relative h-4 flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn("w-full h-1 bg-transparent rounded-lg appearance-none cursor-pointer accent-indigo-500", isDark ? "bg-slate-800" : "bg-slate-100")}
        />
      </div>
      {sub && <p className={cn("text-[9px] font-bold leading-tight", isDark ? "text-slate-500" : "text-slate-400")}>{sub}</p>}
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
  const { price, fraisNotaire, fraisAgence, fraisAutres, rate, duration, insurance, income, bankIncome, depensesFamille, rendement, prixParcelle, moisVente, raMode, matelas, travaux, epargneTotale, guaranteeRate } = p;
  const incomeForDebt = bankIncome > 0 ? bankIncome : income;
  const fraisTotal = price * (fraisNotaire / 100) + fraisAgence + fraisAutres;
  const totalAcquisition = price + fraisTotal;
  // Garantie caution dynamique — même logique que le dashboard
  const guaranteeRateFactor = 1 + (guaranteeRate ?? 0.6345) / 100;
  const loanAmount = Math.max(0, totalAcquisition - apport) * guaranteeRateFactor;

  const cashGarde = epargneTotale - apport;
  const cashPlace = Math.max(0, cashGarde - matelas - travaux);

  // Phase 1
  const pmt1 = calculateMonthlyPayment(loanAmount, rate, duration, insurance);
  const debtRatio1 = incomeForDebt > 0 ? (pmt1.total / incomeForDebt) * 100 : 0;
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
  const debtRatio2 = incomeForDebt > 0 ? (pmt2.total / incomeForDebt) * 100 : 0;

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
  const dr = debtRatio1.toFixed(3);
  if (debtRatio1 > 35) alerts.push({ level: 'error', msg: `Endettement ${dr} % — dépasse la limite HCSF (35 %)` });
  else if (debtRatio1 > 33) alerts.push({ level: 'warn', msg: `Endettement ${dr} % — marge faible vs HCSF (35 %)` });
  if (apport < totalAcquisition * 0.10) alerts.push({ level: 'warn', msg: 'Apport < 10 % de l\'opération' });
  if (cashGarde < matelas + travaux) alerts.push({ level: 'warn', msg: 'Coussin de sécurité insuffisant' });
  if (raEffectif > crAvantRA) alerts.push({ level: 'error', msg: 'RA > capital restant à cette date' });
  if (rendement > 7) alerts.push({ level: 'warn', msg: 'Rendement > 7 % : hypothèse optimiste' });

  return {
    apport, fraisTotal, totalAcquisition, loanAmount, debtRatio1, debtRatio2,
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
const STORAGE_KEY = 'financia_analyse_sims';
const DEFAULT_PARAMS = {
  price: 430000, fraisNotaire: 7.276, fraisAgence: 12000, fraisAutres: 8000,
  rate: 3.2, duration: 25, insurance: 0.36, income: 5800,
  depensesFamille: 2500, rendement: 4.5,
  prixParcelle: 80000, moisVente: 18, raMode: 'mensualite',
  matelas: 20000, travaux: 30000, epargneTotale: 200000,
  parcelleActive: true,
};

function computeMinApportHCSF(price, fraisNotaire, fraisAgence, fraisAutres, rate, duration, insurance, income, guaranteeRate) {
  const initialTotal = price + price * (fraisNotaire / 100) + fraisAgence + fraisAutres;
  const maxMonthly = income * 0.35;
  const r = rate / 100 / 12;
  const n = duration * 12;
  const denom = r > 0
    ? (r / (1 - Math.pow(1 + r, -n))) + (insurance / 100 / 12)
    : (1 / n) + (insurance / 100 / 12);
  const loanCapacity = maxMonthly / denom;
  // Correction garantie caution — même logique que le dashboard
  const guaranteeRateFactor = 1 + (guaranteeRate ?? 0.6345) / 100;
  return Math.max(0, initialTotal - loanCapacity / guaranteeRateFactor);
}

function distributeApports(min, max) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  if (lo >= hi) return [lo, lo, lo, lo];
  const step = (hi - lo) / 3;
  return [
    Math.round(lo / 1000) * 1000,
    Math.round((lo + step) / 1000) * 1000,
    Math.round((lo + 2 * step) / 1000) * 1000,
    Math.round(hi / 1000) * 1000,
  ];
}

export default function AnalysePage({ currentScenario, globalSettings, currentResults, isMobileAsideOpen, setIsMobileAsideOpen }) {
  const initPrice = currentScenario?.price || 430000;
  const initRate = currentScenario?.rate || 3.2;
  const initDuration = currentScenario?.duration || 25;
  const initInsurance = currentScenario?.insurance || 0.36;
  const initIncome = currentScenario ? ((currentScenario.income || 0) + (currentScenario.income2 || 0)) : ((globalSettings?.incomeJess || 3200) + (globalSettings?.incomeRenaud || 1314));
  const initEpargne = globalSettings?.epargneTotale || 200000;

  const [price, setPrice] = useState(initPrice);
  const [fraisNotaire, setFraisNotaire] = useState(currentScenario?.notaryRate || 7.276);
  const [fraisAgence, setFraisAgence] = useState(
    currentResults?.agencyFees ?? (initPrice * ((currentScenario?.agencyRate || 0) / 100))
  );
  const [fraisAutres, setFraisAutres] = useState(
    (currentResults?.bankFee ?? 1500) + (currentResults?.brokerFee ?? 4100)
  );
  const [rate, setRate] = useState(initRate);
  const [duration, setDuration] = useState(initDuration);
  const [insurance, setInsurance] = useState(initInsurance);
  const [income, setIncome] = useState(initIncome);
  const [depensesFamille, setDepensesFamille] = useState(2500);
  const [rendement, setRendement] = useState(4.5);

  const [prixParcelle, setPrixParcelle] = useState(80000);
  const [moisVente, setMoisVente] = useState(18);
  const [raMode, setRaMode] = useState('mensualite');
  const [parcelleActive, setParcelleActive] = useState(true);

  const [matelas, setMatelas] = useState(20000);
  const [travaux, setTravaux] = useState(30000);
  const [epargneTotale, setEpargneTotale] = useState(initEpargne);

  const initBankIncome = (globalSettings?.incomeJess || 0) + (globalSettings?.incomeRenaud || 0);
  const initFraisAgence = currentResults?.agencyFees ?? (initPrice * ((currentScenario?.agencyRate || 0) / 100));
  const initFraisAutres = (currentResults?.bankFee ?? 1500) + (currentResults?.brokerFee ?? 4100);
  const initMin = Math.ceil(computeMinApportHCSF(initPrice, currentScenario?.notaryRate || 7.276, initFraisAgence, initFraisAutres, initRate, initDuration, initInsurance, initBankIncome, currentResults?.guaranteeRate ?? 0.6345) / 1000) * 1000;
  const [apports, setApports] = useState(distributeApports(initMin, MAX_APPORT));

  const applyParams = (p, newApports) => {
    setPrice(p.price); setFraisNotaire(p.fraisNotaire); setFraisAgence(p.fraisAgence);
    setFraisAutres(p.fraisAutres); setRate(p.rate); setDuration(p.duration);
    setInsurance(p.insurance); setIncome(p.income); setDepensesFamille(p.depensesFamille);
    setRendement(p.rendement); setPrixParcelle(p.prixParcelle); setMoisVente(p.moisVente);
    setRaMode(p.raMode); setMatelas(p.matelas); setTravaux(p.travaux);
    setEpargneTotale(p.epargneTotale);
    if (p.parcelleActive !== undefined) setParcelleActive(p.parcelleActive);
    if (newApports) setApports(newApports);
  };

  const syncFromDashboard = () => {
    if (!currentScenario) return;
    const s = currentScenario;
    const r = currentResults;
    applyParams({
      price: s.price || 430000,
      fraisNotaire: s.notaryRate || 7.276,
      fraisAgence: r?.agencyFees ?? (s.price * ((s.agencyRate || 0) / 100)),
      fraisAutres: (r?.bankFee ?? 1500) + (r?.brokerFee ?? 4100),
      rate: s.rate || 3.2, duration: s.duration || 25, insurance: s.insurance || 0.36,
      income: (currentScenario?.income || 0) + (currentScenario?.income2 || 0),
      depensesFamille, rendement, prixParcelle, moisVente, raMode, matelas, travaux,
      epargneTotale: globalSettings?.epargneTotale || 200000,
    }, null);
    setActiveSimId(null);
  };

  const [savedSims, setSavedSims] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [activeSimId, setActiveSimId] = useState(null);
  const [compareSimId, setCompareSimId] = useState(null);
  const [saveInput, setSaveInput] = useState({ open: false, name: '' });

  // Chargement au démarrage depuis analyse.json (API prioritaire, localStorage fallback)
  useEffect(() => {
    fetch('/api/analyse')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const sims = data.simulations || [];
        setSavedSims(sims);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sims));
      })
      .catch(() => {});
  }, []);

  // Sync localStorage + API à chaque changement de savedSims
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSims));
    fetch('/api/analyse/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ simulations: savedSims }),
    }).catch(() => {});
  }, [savedSims]);

  const saveSim = () => {
    if (!saveInput.name.trim()) return;
    const snap = {
      id: Date.now(),
      name: saveInput.name.trim(),
      createdAt: new Date().toISOString(),
      params: { price, fraisNotaire, fraisAgence, fraisAutres, rate, duration, insurance, income, depensesFamille, rendement, prixParcelle, moisVente, raMode, matelas, travaux, epargneTotale },
      apports: [...apports],
    };
    setSavedSims(prev => {
      const idx = prev.findIndex(s => s.id === activeSimId);
      if (idx >= 0) { const n = [...prev]; n[idx] = snap; return n; }
      return [...prev, snap];
    });
    setActiveSimId(snap.id);
    setSaveInput({ open: false, name: '' });
  };

  const loadSim = (sim) => { applyParams(sim.params, sim.apports); setActiveSimId(sim.id); };

  const deleteSim = (id) => {
    setSavedSims(prev => prev.filter(s => s.id !== id));
    if (activeSimId === id) setActiveSimId(null);
    if (compareSimId === id) setCompareSimId(null);
  };

  const resetToDefaults = () => { applyParams(DEFAULT_PARAMS, null); setActiveSimId(null); };

  const compareSimResults = useMemo(() => {
    if (!compareSimId) return null;
    const sim = savedSims.find(s => s.id === compareSimId);
    if (!sim) return null;
    return sim.apports.map(a => computeScenario(sim.params, a));
  }, [compareSimId, savedSims]);

  const compareSimParams = useMemo(() => {
    if (!compareSimId) return null;
    return savedSims.find(s => s.id === compareSimId)?.params ?? null;
  }, [compareSimId, savedSims]);

  const optiApport = useMemo(() => {
    // Si les paramètres clés correspondent au scénario dashboard, on utilise son
    // minApportAt35 exact (inclut travaux, frais précis). Sinon on recompute localement.
    const dashPrice = currentScenario?.price;
    const dashRate = currentScenario?.rate;
    const dashDuration = currentScenario?.duration;
    const paramsMatchDashboard =
      dashPrice && Math.abs(price - dashPrice) < 1 &&
      Math.abs(rate - (dashRate || 3.2)) < 0.001 &&
      Math.abs(duration - (dashDuration || 25)) < 0.1;
    if (paramsMatchDashboard && currentResults?.minApportAt35 != null) {
      return currentResults.minApportAt35;
    }
    const bankIncome = (globalSettings?.incomeJess || 0) + (globalSettings?.incomeRenaud || 0);
    return computeMinApportHCSF(price, fraisNotaire, fraisAgence, fraisAutres, rate, duration, insurance, bankIncome, currentResults?.guaranteeRate ?? 0.6345);
  }, [price, fraisNotaire, fraisAgence, fraisAutres, rate, duration, insurance, globalSettings, currentScenario, currentResults]);

  const optiApportExact = Math.round(optiApport);
  const optiApportRounded = Math.round(optiApport / 1000) * 1000;

  const repartir = useCallback(() => {
    const lo = optiApportExact; // A = valeur exacte, sans arrondi au millier
    const hi = apports[3];      // D inchangé
    const range = hi - lo;
    if (range <= 0) {
      setApports([lo, lo, lo, Math.max(lo, hi)]);
      return;
    }
    setApports([
      lo,
      Math.round((lo + range / 3) / 1000) * 1000,
      Math.round((lo + 2 * range / 3) / 1000) * 1000,
      hi,
    ]);
  }, [optiApportExact, apports]);


  const params = useMemo(() => ({
    price, fraisNotaire, fraisAgence, fraisAutres,
    rate, duration, insurance, income,
    bankIncome: (globalSettings?.incomeJess || 0) + (globalSettings?.incomeRenaud || 0),
    depensesFamille, rendement,
    prixParcelle: parcelleActive ? prixParcelle : 0,
    moisVente, raMode,
    matelas, travaux, epargneTotale,
    parcelleActive,
    guaranteeRate: currentResults?.guaranteeRate ?? 0.6345,
  }), [price, fraisNotaire, fraisAgence, fraisAutres, rate, duration, insurance, income, globalSettings, depensesFamille, rendement, prixParcelle, moisVente, raMode, matelas, travaux, epargneTotale, parcelleActive, currentResults]);

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

    // Courbes de référence (simulation comparée) — pastel + tirets
    const cmpRate = compareSimParams?.rate ?? rate;
    const cmpDuration = compareSimParams?.duration ?? duration;
    const cmpRendement = compareSimParams?.rendement ?? rendement;
    const cmpNTotal = Math.round(cmpDuration * 12);
    const cmpBase = { borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0, pointHoverRadius: 4 };

    const cmpMensualiteLines = compareSimResults ? COLORS_PASTEL.map((c, i) => {
      const r = compareSimResults[i];
      const rawData = months.map((m) => m < r.tRA ? r.pmt1.total : (m <= cmpNTotal ? r.pmt2.total : null));
      return { label: `${COLORS[i].label} (réf)`, data: monthsSubsampled.map((m) => rawData[m] ?? null), borderColor: c.hex, backgroundColor: 'transparent', stepped: 'after', ...cmpBase };
    }) : [];

    const cmpCapitalLines = compareSimResults ? COLORS_PASTEL.map((c, i) => {
      const r = compareSimResults[i];
      let crApresRA = null;
      const rawData = months.map((m) => {
        if (m < r.tRA) return capitalRestantDuExact(r.loanAmount, cmpRate, cmpDuration, m);
        if (m === r.tRA) { crApresRA = Math.max(0, r.crAvantRA - r.raEffectif); return r.crAvantRA; }
        if (crApresRA === null) return capitalRestantDuExact(r.loanAmount, cmpRate, cmpDuration, m);
        return capitalRestantDuExact(crApresRA, cmpRate, r.dureePhase2Mois / 12, m - r.tRA);
      });
      return { label: `${COLORS[i].label} (réf)`, data: monthsSubsampled.map((m) => rawData[m] ?? null), borderColor: c.hex, backgroundColor: 'transparent', tension: 0, ...cmpBase };
    }) : [];

    const cmpPatrimoineLines = compareSimResults ? COLORS_PASTEL.map((c, i) => {
      const r = compareSimResults[i];
      const ep1 = Math.max(0, r.epargne1); const ep2 = Math.max(0, r.epargne2);
      return {
        label: `${COLORS[i].label} (réf)`,
        data: years.map((y) => {
          const m = y * 12;
          if (m <= r.tRA) return valeurPlacement(r.cashPlace, ep1, cmpRendement, m);
          if (m <= r.loanEndMonth) return valeurPlacement(r.capitalPhase2 ?? r.cashPlace, ep2, cmpRendement, m - r.tRA);
          return valeurPlacement(r.phase2Val, r.ep3, cmpRendement, m - r.loanEndMonth);
        }),
        borderColor: c.hex, backgroundColor: 'transparent', fill: false, tension: 0.3, ...cmpBase,
      };
    }) : [];

    const cmpRessentieLines = compareSimResults ? COLORS_PASTEL.map((c, i) => {
      const r = compareSimResults[i];
      const ep1 = Math.max(0, r.epargne1); const ep2 = Math.max(0, r.epargne2);
      const rawData = months.map((m) => {
        const inPhase3 = m > r.loanEndMonth;
        let placem = m <= r.tRA ? valeurPlacement(r.cashPlace, ep1, cmpRendement, m)
          : !inPhase3 ? valeurPlacement(r.capitalPhase2, ep2, cmpRendement, m - r.tRA)
          : valeurPlacement(r.phase2Val, r.ep3, cmpRendement, m - r.loanEndMonth);
        const pmt = inPhase3 ? 0 : (m <= r.tRA ? r.pmt1.total : r.pmt2.total);
        return Math.max(0, pmt - placem * (cmpRendement / 100 / 12));
      });
      return { label: `${COLORS[i].label} (réf)`, data: monthsSubsampled.map((m) => rawData[m] ?? null), borderColor: c.hex, backgroundColor: 'transparent', stepped: 'after', ...cmpBase };
    }) : [];

    return {
      mensualite: { labels: xMonths, datasets: [...mensualiteLines, ...cmpMensualiteLines] },
      capital:    { labels: xMonths, datasets: [...capitalLines,    ...cmpCapitalLines] },
      patrimoine: {
        labels: years.map((y) => `${y} an${y > 1 ? 's' : ''}`),
        datasets: [...patrimoineLines, ...cmpPatrimoineLines],
      },
      couts: {
        labels: ['💸 Facture banque', '📈 Épargne finale', '✅ Gain net'],
        datasets: [
          ...COLORS.map((c, i) => ({
            label: c.label,
            data: [results[i].coutInteretsAssurance, results[i].valPatrimoineFinancier, results[i].valPatrimoineFinancier - results[i].coutInteretsAssurance],
            backgroundColor: c.hex + 'cc', borderRadius: 6,
          })),
          ...(compareSimResults ? COLORS_PASTEL.map((c, i) => ({
            label: `${COLORS[i].label} (réf)`,
            data: [compareSimResults[i].coutInteretsAssurance, compareSimResults[i].valPatrimoineFinancier, compareSimResults[i].valPatrimoineFinancier - compareSimResults[i].coutInteretsAssurance],
            backgroundColor: c.hex + 'bb', borderRadius: 6,
          })) : []),
        ],
      },
      mensualiteRessentie: { labels: xMonths, datasets: [...mensualiteRessentieLines, ...cmpRessentieLines] },
    };
  }, [results, params, duration, rendement, rate, compareSimResults, compareSimParams]);

  const fraisTotal = price * (fraisNotaire / 100) + fraisAgence + fraisAutres;
  const totalAcquisition = price + fraisTotal;

  return (
    <>
      <main className="flex-1 overflow-y-auto p-3 md:p-8 space-y-6 md:space-y-8 bg-slate-50/50 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-start justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Analyse Comparative
            <span className="text-slate-400 font-medium ml-2">| Simulateur</span>
          </h2>
          {currentScenario?.name && (
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
              Basé sur : {currentScenario.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-white border border-slate-100 rounded-2xl px-3 py-2 text-center">
            <p className="text-[9px] text-slate-400 uppercase font-bold">Acquisition totale</p>
            <p className="text-base font-black text-slate-900">{fmt(totalAcquisition)} €</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl px-3 py-2 text-center">
            <p className="text-[9px] text-slate-400 uppercase font-bold">Dont frais</p>
            <p className="text-base font-black text-slate-500">{fmt(fraisTotal)} €</p>
          </div>
          <button 
            onClick={() => setIsMobileAsideOpen(true)}
            className="xl:hidden p-3 bg-slate-900 text-white rounded-2xl shadow-lg hover:scale-105 transition-all"
          >
            <TrendingUp size={16} />
          </button>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-4 gap-4 md:gap-6">
          {COLORS.map((c, i) => (
            <div key={c.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }} />
                <span className="text-[10px] font-black uppercase text-slate-600">{c.label}</span>
                {apports[i] === optiApportExact && (
                  <span className="text-[8px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">Opti</span>
                )}
              </div>
              <Slider
                label="Apport"
                value={apports[i]}
                min={0}
                max={epargneTotale}
                step={1000}
                onChange={(v) => setApports((prev) => prev.map((a, j) => (j === i ? v : a)))}
                format={(v) => `${fmt(v)} €`}
              />
              <div className="grid grid-cols-3 gap-1 text-center">
                <div className="bg-slate-50 rounded-lg px-2 py-1.5">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Emprunté</p>
                  <p className="text-[11px] font-black text-slate-700">{fmt(Math.max(0, totalAcquisition - apports[i]))} €</p>
                </div>
                <div className={cn('rounded-lg px-2 py-1.5', results[i].debtRatio1 > 35 ? 'bg-rose-50' : results[i].debtRatio1 > 33 ? 'bg-amber-50' : 'bg-emerald-50')}>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Endettement</p>
                  <p className={cn('text-[11px] font-black', results[i].debtRatio1 > 35 ? 'text-rose-600' : results[i].debtRatio1 > 33 ? 'text-amber-600' : 'text-emerald-600')}>{results[i].debtRatio1.toFixed(3)} %</p>
                </div>
                <div className="bg-indigo-50 rounded-lg px-2 py-1.5">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Opti</p>
                  <p className="text-[11px] font-black text-indigo-600">{fmt(optiApport)} €</p>
                </div>
              </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Tableau de synthèse */}
        <div className="lg:col-span-7 space-y-6">
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
                    { label: 'Apport',           key: (r) => `${fmt(r.apport)} €`,    raw: (r) => r.apport,    lib: false },
                    { label: 'Emprunt',          key: (r) => `${fmt(r.loanAmount)} €`, raw: (r) => r.loanAmount, lib: true },
                    { label: 'Taux d\'endettement',key: (r) => `${r.debtRatio1.toFixed(3)} %`, raw: (r) => r.debtRatio1, lib: true, isPercent: true, color: (r) => r.debtRatio1 > 35 ? 'text-rose-600 font-black' : r.debtRatio1 > 33 ? 'text-amber-600' : 'text-emerald-600' },
                    { label: 'Cash gardé jour J',key: (r) => `${fmt(r.cashGarde)} €`, raw: (r) => r.cashGarde, lib: false, color: (r) => r.cashGarde < 0 ? 'text-rose-600' : '' },
                    { label: 'Cash placé',       key: (r) => `${fmt(r.cashPlace)} €`, raw: (r) => r.cashPlace, lib: false, color: (r) => r.cashPlace < 0 ? 'text-rose-600' : 'text-emerald-600' },
                    { label: '— PHASE 1 —', header: true },
                    { label: 'Mensualité totale',  key: (r) => `${fmt(r.pmt1.total)} €`, raw: (r) => r.pmt1.total, lib: true },
                    { label: 'Reste à vivre',    key: (r) => `${fmt(r.rav1)} €`, raw: (r) => r.rav1, lib: false, color: (r) => r.rav1 < 500 ? 'text-rose-600' : 'text-slate-700' },
                    { label: 'Épargne mensuelle',key: (r) => `${fmt(r.epargne1)} €`, raw: (r) => r.epargne1, lib: false, color: (r) => r.epargne1 < 0 ? 'text-rose-600' : 'text-emerald-600' },
                    ...(parcelleActive ? [
                      { label: `— APRÈS VENTE PARCELLE —`, header: true },
                      { label: raMode === 'investir' ? 'Capital injecté placement' : 'Capital restant avant RA', key: (r) => `${fmt(raMode === 'investir' ? r.injectionParcelle : r.crAvantRA)} €`, raw: (r) => raMode === 'investir' ? r.injectionParcelle : r.crAvantRA, lib: false, color: raMode === 'investir' ? () => 'text-emerald-600' : undefined },
                      { label: raMode === 'investir' ? 'Mensualité (inchangée)' : raMode === 'mensualite' ? 'Nouvelle mensualité' : 'Mensualité maintenue', key: (r) => `${fmt(r.pmt2.total)} €`, raw: (r) => r.pmt2.total, lib: true, color: (r) => r.pmt2.total < r.pmt1.total ? 'text-emerald-600' : '' },
                      { label: raMode === 'duree' ? 'Durée réduite à (mois)' : 'Durée (inchangée)', key: (r) => raMode === 'duree' ? `${Math.round(r.tRA + r.dureePhase2Mois)} mois` : `${duration * 12} mois`, raw: (r) => raMode === 'duree' ? Math.round(r.tRA + r.dureePhase2Mois) : duration * 12, lib: true, isMonths: true },
                      { label: 'Reste à vivre phase 2', key: (r) => `${fmt(r.rav2)} €`, raw: (r) => r.rav2, lib: false, color: (r) => r.rav2 < 500 ? 'text-rose-600' : 'text-slate-700' },
                      { label: 'Épargne mensuelle phase 2', key: (r) => `${fmt(r.epargne2)} €`, raw: (r) => r.epargne2, lib: false, color: (r) => r.epargne2 < 0 ? 'text-rose-600' : 'text-emerald-600' },
                      ...(raMode === 'duree' ? [
                        { label: '— PHASE 3 : crédit terminé —', header: true },
                        { label: 'Mois libérés (réinvestis)', key: (r) => r.phase3Months > 0 ? `${r.phase3Months} mois` : '—', color: (r) => r.phase3Months > 0 ? 'text-emerald-600' : 'text-slate-400' },
                        { label: 'Versement mensuel phase 3', key: (r) => r.phase3Months > 0 ? `${fmt(r.ep3)} €` : '—', raw: (r) => r.ep3, lib: false, color: (r) => r.phase3Months > 0 ? 'text-emerald-600 font-black' : 'text-slate-400' },
                      ] : []),
                    ] : []),
                    { label: '— BILAN —', header: true },
                    { label: 'Coût intérêts+assur.', key: (r) => `${fmt(r.coutInteretsAssurance)} €`, raw: (r) => r.coutInteretsAssurance, lib: true, color: () => 'text-rose-600' },
                    { label: 'Patrimoine financier final', key: (r) => `${fmt(r.valPatrimoineFinancier)} €`, raw: (r) => r.valPatrimoineFinancier, lib: false, color: () => 'text-emerald-600 font-black' },
                    { label: 'Mensualité ressentie moy.', key: (r) => `${fmt(Math.max(0, r.mensualiteRessentie))} €`, raw: (r) => r.mensualiteRessentie, lib: true, color: (r) => r.mensualiteRessentie < r.pmt1.total * 0.5 ? 'text-emerald-600' : '' },
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
                        {results.map((r, i) => {
                          const cmpR = compareSimResults?.[i];
                          let delta = null;
                          if (row.raw && cmpR) {
                            const d = row.raw(r) - row.raw(cmpR);
                            if (Math.abs(d) >= 0.5) {
                              const isGood = row.lib ? d < 0 : d > 0;
                              const sign = d > 0 ? '+' : '';
                              const txt = row.isPercent ? `${sign}${d.toFixed(3)} %`
                                : row.isMonths ? `${sign}${Math.round(d)} mois`
                                : `${sign}${Math.round(d).toLocaleString()} €`;
                              delta = <span className={`block text-[9px] font-black mt-0.5 ${isGood ? 'text-emerald-500' : 'text-rose-500'}`}>{txt}</span>;
                            }
                          }
                          return (
                            <td key={i} className={cn('px-4 py-2.5 text-center text-[11px] font-black', row.color ? row.color(r) : 'text-slate-800')}>
                              {row.key(r)}
                              {delta}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Analyses Rapides */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Analyses Rapides</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  label: 'Apport minimum HCSF (35 %)',
                  fn: () => {
                    const maxMonthly = income * 0.35;
                    const monthlyRate = rate / 100 / 12;
                    const n = duration * 12;
                    const factor = monthlyRate > 0 
                      ? (1 - Math.pow(1 + monthlyRate, -n)) / (monthlyRate + (insurance / 100 / 12))
                      : n;
                    const loanCapacity = maxMonthly * factor;
                    const minApport = Math.max(0, totalAcquisition - loanCapacity);
                    return `Apport requis : ${fmt(minApport)} € pour 35% d'endettement`;
                  }
                },
                {
                  label: raMode === 'duree' ? 'Gain durée vs mensualité (parcelle)' : 'Gain mensualité vs durée (parcelle)',
                  fn: () => {
                    const r0 = results[0];
                    const crRA = r0.crAvantRA;
                    const remMois = (duration * 12) - r0.tRA;
                    if (raMode === 'duree') {
                      const nNew = newDurationAfterRA(crRA, prixParcelle, rate, r0.pmt1.pi);
                      const gain = remMois - nNew;
                      return `Réduction de ${Math.round(gain)} mois (${(gain/12).toFixed(3)} ans) — Scénario A`;
                    } else {
                      const pmtNew = newPaymentAfterRA(crRA, prixParcelle, rate, remMois, insurance, r0.loanAmount);
                      const gain = r0.pmt1.total - pmtNew.total;
                      return `Économie : ${fmt(gain)} €/mois → ${fmt(pmtNew.total)} €/mois — Scénario A`;
                    }
                  }
                },
                {
                  label: `Mensualité ressentie si rendement = 5 %`,
                  fn: () => {
                    const r0 = results[0];
                    const vFin = valeurPlacement(r0.cashPlace, Math.max(0, r0.epargne1), 5, duration * 12);
                    const rev = vFin * (5 / 100 / 12);
                    const ressentie = Math.max(0, r0.pmt1.total - rev);
                    return `Scénario A : ${fmt(ressentie)} €/mois (Patrimoine : ${fmt(vFin)} €)`;
                  }
                },
                {
                  label: `Si parcelle vendue ${fmt(prixParcelle + 20000)} € (+20k)`,
                  fn: () => {
                    const pPlus = computeScenario({...params, prixParcelle: prixParcelle + 20000}, apports[0]);
                    const base = results[0];
                    if (raMode === 'mensualite') {
                      return `Mensualité Ph2 : ${fmt(pPlus.pmt2.total)} € vs ${fmt(base.pmt2.total)} € (-${fmt(base.pmt2.total - pPlus.pmt2.total)} €)`;
                    } else {
                      return `Durée Ph2 : ${Math.round(pPlus.tRA + pPlus.dureePhase2Mois)} mois vs ${Math.round(base.tRA + base.dureePhase2Mois)} mois`;
                    }
                  }
                }
              ].map((qa, i) => (
                <QuickAnalysis key={i} label={qa.label} compute={qa.fn} />
              ))}
            </div>
          </div>
        </div>

        {/* Graphiques */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-4">Visualisations</h3>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">1 · Mensualité dans le temps</p>
                <div className="h-48"><Line data={chartData.mensualite} options={{ ...CHART_OPTIONS_BASE, plugins: { ...CHART_OPTIONS_BASE.plugins, annotation: {} } }} /></div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">2 · Mensualité ressentie</p>
                <div className="h-48"><Line data={chartData.mensualiteRessentie} options={CHART_OPTIONS_BASE} /></div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">3 · Capital restant dû</p>
                <div className="h-48"><Line data={chartData.capital} options={CHART_OPTIONS_BASE} /></div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">4 · Évolution patrimoine financier</p>
                <div className="h-48"><Line data={chartData.patrimoine} options={CHART_OPTIONS_BASE} /></div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">5 · Coûts comparés</p>
                <div className="h-48"><Bar data={chartData.couts} options={{ ...CHART_OPTIONS_BASE, scales: { ...CHART_OPTIONS_BASE.scales, x: { ...CHART_OPTIONS_BASE.scales.x, ticks: { font: { size: 8 } } } } }} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </main>

    {/* Sidebar de réglages (Aside) */}
    <aside className={cn(
      "fixed xl:relative top-0 right-0 h-full xl:h-auto w-[400px] bg-slate-900 border-l border-slate-800 z-50 transition-transform duration-300 transform flex flex-col text-white",
      isMobileAsideOpen ? "translate-x-0" : "translate-x-full xl:translate-x-0"
    )}>
      {/* Overlay mobile */}
      {isMobileAsideOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm xl:hidden -z-10" onClick={() => setIsMobileAsideOpen(false)} />
      )}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-indigo-400" />
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Réglages Simulateur</h3>
        </div>
        <button onClick={() => setIsMobileAsideOpen(false)} className="xl:hidden p-2 text-slate-500 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
        {/* Simulation Management */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-slate-800 pb-2">Simulation</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveSimId(null)}
              className={cn('px-3 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2',
                activeSimId === null
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white')}
            >
              ✏ Brouillon
            </button>
            <button
              onClick={syncFromDashboard}
              disabled={!currentScenario?.price}
              className="px-3 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-[10px] font-black uppercase hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
            >
              ↙ Dashboard
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Comparer avec</label>
              {compareSimId && (
                <button onClick={() => setCompareSimId(null)} className="text-[9px] font-black text-indigo-400 uppercase hover:text-indigo-300">Aucun</button>
              )}
            </div>
            <select
              value={compareSimId ?? ''}
              onChange={e => setCompareSimId(e.target.value === '' ? null : Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-[11px] font-black text-white outline-none focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
            >
              <option value="">Aucun scénario</option>
              {savedSims.filter(s => s.id !== activeSimId).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={resetToDefaults}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-[10px] font-black uppercase hover:bg-slate-700 hover:text-white transition-all border border-transparent"
            >
              <RotateCcw size={12} /> Réinitialiser
            </button>

            {saveInput.open ? (
              <div className="col-span-2 space-y-2 pt-1">
                <input
                  autoFocus
                  type="text"
                  placeholder="Nom de la simulation…"
                  value={saveInput.name}
                  onChange={e => setSaveInput(v => ({ ...v, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') saveSim(); if (e.key === 'Escape') setSaveInput({ open: false, name: '' }); }}
                  className="w-full bg-slate-800 border border-indigo-500 rounded-xl px-4 py-2.5 text-[11px] font-black text-white outline-none shadow-lg shadow-indigo-500/10"
                />
                <div className="flex gap-2">
                  <button onClick={saveSim} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase hover:bg-indigo-500 transition-all">OK</button>
                  <button onClick={() => setSaveInput({ open: false, name: '' })} className="px-4 py-2 rounded-lg bg-slate-700 text-slate-400 hover:text-white transition-all"><X size={14} /></button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setSaveInput({ open: true, name: activeSimId ? (savedSims.find(s => s.id === activeSimId)?.name ?? '') : '' })}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all"
              >
                <Save size={12} /> {activeSimId ? 'Mettre à jour' : 'Sauvegarder'}
              </button>
            )}
          </div>

          {/* Saved Sims Chips (compact) */}
          {savedSims.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {savedSims.map(sim => (
                <div key={sim.id} className="flex items-center shrink-0">
                  <button
                    onClick={() => loadSim(sim)}
                    className={cn('px-3 py-1.5 rounded-l-lg text-[9px] font-black uppercase transition-all border-y border-l',
                      activeSimId === sim.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700')}
                  >
                    {sim.name}
                  </button>
                  <button
                    onClick={() => deleteSim(sim.id)}
                    className={cn('px-2 py-1.5 rounded-r-lg text-[10px] transition-all border-y border-r',
                      activeSimId === sim.id
                        ? 'bg-indigo-500 text-white border-indigo-500 hover:bg-rose-500'
                        : 'bg-slate-800 text-slate-600 border-slate-700 hover:bg-rose-500/20 hover:text-rose-500')}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Paramètres globaux */}
        <section className="space-y-6">
          <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-slate-800 pb-2">Paramètres Globaux</h3>
          <div className="space-y-5">
            <Slider label="Prix du bien" value={price} min={100000} max={800000} step={5000} onChange={setPrice} format={(v) => `${fmt(v)} €`} isDark />
            <Slider label="Revenus mensuels nets" value={income} min={2000} max={12000} step={100} onChange={setIncome} format={(v) => `${fmt(v)} €`} isDark />
            <Slider label="Frais de notaire" value={fraisNotaire} min={2} max={10} step={0.001} onChange={setFraisNotaire} format={(v) => `${v.toFixed(3)} %`} sub={`→ ${fmt(price * fraisNotaire / 100)} €`} isDark />
            <Slider label="Dépenses famille / mois" value={depensesFamille} min={500} max={6000} step={100} onChange={setDepensesFamille} format={(v) => `${fmt(v)} €`} isDark />
            <Slider label="Frais d'agence" value={fraisAgence} min={0} max={30000} step={500} onChange={setFraisAgence} format={(v) => `${fmt(v)} €`} isDark />
            <Slider label="Rendement placement (% net/an)" value={rendement} min={0} max={10} step={0.001} onChange={setRendement} format={(v) => `${v.toFixed(3)} %`} isDark />
            <Slider label="Autres frais" value={fraisAutres} min={0} max={20000} step={500} onChange={setFraisAutres} format={(v) => `${fmt(v)} €`} isDark />
            <Slider label="Taux crédit (% nominal)" value={rate} min={2} max={5.5} step={0.001} onChange={setRate} format={(v) => `${v.toFixed(3)} %`} isDark />
            <Slider label="Durée crédit (ans)" value={duration} min={15} max={25} step={1} onChange={setDuration} format={(v) => `${v} ans`} isDark />
            <Slider label="Taux assurance emprunteur" value={insurance} min={0.01} max={1} step={0.001} onChange={setInsurance} format={(v) => `${v.toFixed(3)} %`} isDark />
          </div>
        </section>

        {/* Parcelle Divisible */}
        <section className={cn('space-y-5 p-4 rounded-2xl border transition-all', parcelleActive ? 'bg-amber-500/5 border-amber-500/20' : 'bg-slate-800/50 border-slate-700')}>
          <div className="flex items-center justify-between">
            <h3 className={cn('text-[10px] font-black uppercase tracking-widest', parcelleActive ? 'text-amber-500' : 'text-slate-500')}>
              Parcelle Divisible
            </h3>
            <button
              onClick={() => setParcelleActive(v => !v)}
              className={cn('w-10 h-5 rounded-full transition-all relative shrink-0', parcelleActive ? 'bg-amber-500' : 'bg-slate-700')}
            >
              <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200', parcelleActive ? 'left-5' : 'left-0.5')} />
            </button>
          </div>
          <div className={cn('space-y-5 transition-opacity duration-200', !parcelleActive && 'opacity-30 pointer-events-none')}>
            <Slider label="Prix vente parcelle" value={prixParcelle} min={0} max={150000} step={5000} onChange={setPrixParcelle} format={(v) => `${fmt(v)} €`} isDark />
            <Slider label="Mois prévisionnel de la vente" value={moisVente} min={0} max={60} step={1} onChange={setMoisVente} format={(v) => `M+${v}`} isDark />
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Utilisation de la vente</p>
              <div className="flex flex-col gap-2">
                {[
                  ['mensualite', '📉 Baisser la mensualité'],
                  ['duree', '⏱ Raccourcir la durée'],
                  ['investir', '📈 Investir / Placer'],
                ].map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setRaMode(val)}
                    className={cn(
                      'w-full py-2.5 px-3 rounded-xl text-[10px] font-black text-left transition-all',
                      raMode === val ? 'bg-amber-500 text-white shadow' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    )}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Patrimoine Initial */}
        <section className="space-y-5 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20">
          <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Patrimoine Initial</h3>
          <Slider label="Épargne totale" value={epargneTotale} min={0} max={400000} step={5000} onChange={setEpargneTotale} format={(v) => `${fmt(v)} €`} isDark />
          <Slider label="Matelas de sécurité" value={matelas} min={0} max={50000} step={1000} onChange={setMatelas} format={(v) => `${fmt(v)} €`} isDark />
          <Slider label="Provision travaux" value={travaux} min={0} max={80000} step={1000} onChange={setTravaux} format={(v) => `${fmt(v)} €`} isDark />
        </section>
      </div>
    </aside>
  </>
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
