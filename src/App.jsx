import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, TrendingUp, PieChart, Table as TableIcon, Home,
  ArrowLeftRight, Plus, Minus, Trash2, ShieldCheck, AlertTriangle, User, Lock, Unlock, RotateCcw,
  Info, ChevronRight, ChevronDown, ChevronUp, Save, FileText, Landmark, Leaf, History, Settings, ExternalLink,
  ArrowUpRight, ArrowDownRight, X, Search
} from 'lucide-react';
import BienPage from './BienPage';
import AnalysePage from './AnalysePage';
import { motion, AnimatePresence } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, BarElement, Filler } from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';
import { calculateMonthlyPayment, generateAmortizationTable, calculateTotalCost, calculateInflationImpact } from './lib/finance';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Filler);

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const formatBudgetLabel = (key) => {
  const mapping = {
    taxeFonciere: "Taxe Foncière",
    assuranceHab: "Assurance Habitation",
    electricite: "Électricité",
    epargne: "Épargne",
    fraisBancaires: "Frais Bancaires",
    alimentation: "Alimentation",
    carburant: "Carburant",
    abonnements: "Abonnements",
    telephones: "Téléphones",
    googleAiPro: "Google AI Pro (5 TB)",
    spotify: "Spotify",
    claudeAi: "Claude AI",
    realdebrid: "Realdebrid",
    hpInstantInk: "HP Instant Ink",
    googlePlayPass: "Google Play Pass",
    microsoft365: "Microsoft 365 Basic",
    carlance: "Carlance",
    stationnement: "Stationnement",
    divers: "Divers",
    rav: "Reste à Vivre",
    logement: "Logement (Prêt/Loyer)"
  };
  
  if (mapping[key]) return mapping[key];

  // Fallback : Ajoute un espace avant chaque majuscule
  const formatted = key.replace(/([A-Z])/g, ' $1').trim();
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const BudgetModal = ({ isOpen, onClose, items, total }) => {
  if (!isOpen) return null;
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white rounded-[3rem] shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col border border-white/20"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-900">Détails du Budget Mensuel</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Analyse complète des postes de dépenses</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-all">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Poste de Dépense</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Montant</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">
                  <span className="flex items-center justify-end gap-1">
                    Écart / Actuel
                    <HelpTip title="Différence mensuelle" content="Compare le montant de ce scénario avec votre situation actuelle. Le rouge indique un surcoût, le vert une économie." position="bottom" align="right" />
                  </span>
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">
                  <span className="flex items-center justify-end gap-1">
                    Part (%)
                    <HelpTip title="Poids du poste" content="Représente le pourcentage que cette dépense occupe par rapport à l'ensemble de votre budget mensuel (Revenus)." position="bottom" align="right" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(item => {
                const diff = item.val - item.baseline;
                const percent = total > 0 ? (item.val / total) * 100 : 0;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                        <span className="text-[11px] font-black text-slate-700 group-hover:text-brand-primary transition-colors">{item.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[11px] font-black text-slate-900">{Math.round(item.val).toLocaleString()} €</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded-full",
                        diff > 0 ? "bg-red-50 text-red-600" : diff < 0 ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                      )}>
                        {diff > 0 ? '+' : ''}{Math.round(diff).toLocaleString()} €
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[10px] font-black text-slate-400">{percent.toFixed(3)}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <span className="text-xs font-black uppercase tracking-widest opacity-60">Total Budget Mensuel</span>
          <span className="text-2xl font-black">{Math.round(total).toLocaleString()} €</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

const HelpTip = ({ title, content, position = 'top', align = 'center' }) => (
  <div className="group relative inline-block ml-1">
    <Info size={14} className="text-slate-300 hover:text-brand-primary cursor-help transition-colors" />
    <div className={cn(
      "absolute w-64 p-3 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[110] shadow-2xl",
      position === 'top' ? "bottom-full mb-2" : "top-full mt-2",
      align === 'center' ? "left-1/2 -translate-x-1/2" : align === 'right' ? "right-0" : "left-0"
    )}>
      <p className="font-black uppercase mb-1 text-brand-primary">{title}</p>
      <p className="font-medium leading-relaxed opacity-90">{content}</p>
      <div className={cn(
        "absolute border-8 border-transparent",
        position === 'top' ? "top-full border-t-slate-900" : "bottom-full border-b-slate-900",
        align === 'center' ? "left-1/2 -translate-x-1/2" : align === 'right' ? "right-4" : "left-4"
      )} />
    </div>
  </div>
);

function FeePercentRow({ label, rate, amount, base, baseLabel, onRate, onAmount }) {
  const [mode, setMode] = React.useState('pct');
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[9px] text-slate-400 shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => setMode(m => m === 'pct' ? 'eur' : 'pct')} className="text-[8px] font-black text-slate-300 hover:text-indigo-400 transition-colors px-1 py-0.5 rounded border border-slate-200 hover:border-indigo-300">
          {mode === 'pct' ? '%' : '€'}
        </button>
        {mode === 'pct' ? (
          <>
            <input
              type="number" step="0.001"
              value={rate}
              onChange={e => onRate(+e.target.value)}
              className="w-16 text-right text-[9px] font-black bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 outline-none focus:border-indigo-400"
            />
            <span className="text-[8px] text-slate-400">% {baseLabel ?? `= ${Math.round(amount).toLocaleString()} €`}</span>
          </>
        ) : (
          <>
            <input
              type="number" step="100"
              value={Math.round(amount)}
              onChange={e => onAmount(+e.target.value)}
              className="w-20 text-right text-[9px] font-black bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 outline-none focus:border-indigo-400"
            />
            <span className="text-[8px] text-slate-400">€</span>
          </>
        )}
      </div>
    </div>
  );
}

function FeeAmountRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[9px] text-slate-400 shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number" step="100"
          value={Math.round(value)}
          onChange={e => onChange(+e.target.value)}
          className="w-20 text-right text-[9px] font-black bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 outline-none focus:border-indigo-400"
        />
        <span className="text-[8px] text-slate-400">€</span>
      </div>
    </div>
  );
}

function SidebarFeeControl({ 
  label, 
  type = 'percent', 
  rate, 
  amount, 
  onRateChange, 
  onAmountChange, 
  resetValue, 
  precision = 2,
  isGuarantee = false,
  guaranteeOverride = false
}) {
  const [mode, setMode] = useState(isGuarantee && guaranteeOverride ? 'eur' : (type === 'percent' ? 'pct' : 'eur'));
  
  useEffect(() => {
    if (isGuarantee) {
      setMode(guaranteeOverride ? 'eur' : 'pct');
    }
  }, [guaranteeOverride, isGuarantee]);

  const handleModeToggle = () => {
    const newMode = mode === 'pct' ? 'eur' : 'pct';
    setMode(newMode);
    if (isGuarantee && newMode === 'pct') {
      onRateChange(rate);
    }
  };

  const step = 1 / Math.pow(10, precision);

  return (
    <div className="group space-y-1.5 py-1">
      <div className="flex justify-between items-center h-7">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight group-hover:text-slate-400 transition-colors">{label}</span>
        
        <div className="flex items-center gap-1.5">
          {/* Toggle button */}
          {type === 'percent' && (
            <button 
              onClick={handleModeToggle}
              className={cn(
                "w-6 h-6 flex items-center justify-center text-[9px] font-black rounded-lg transition-all border shadow-sm",
                mode === 'pct' 
                  ? "bg-slate-700 text-white border-slate-600 shadow-slate-900/20" 
                  : "bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-600"
              )}
            >
              {mode === 'pct' ? '%' : '€'}
            </button>
          )}
          
          <div className="flex items-center bg-slate-900/50 rounded-lg border border-slate-700/50 p-0.5 shadow-inner">
            <button 
              onClick={() => mode === 'pct' ? onRateChange(Number(Math.max(0, rate - step).toFixed(precision))) : onAmountChange(Math.max(0, Math.round(amount) - 100))}
              className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 rounded-md transition-all"
            >
              <Minus size={10} />
            </button>
            
            <input 
              type="number" 
              step={mode === 'pct' ? step : 100}
              value={mode === 'pct' ? rate : Math.round(amount)} 
              onChange={(e) => mode === 'pct' ? onRateChange(Number(e.target.value)) : onAmountChange(Number(e.target.value))} 
              className={cn(
                "bg-transparent text-white text-[11px] font-black text-center outline-none tabular-nums",
                mode === 'pct' ? (isGuarantee ? "w-14" : "w-10") : "w-16"
              )}
            />
            
            <button 
              onClick={() => mode === 'pct' ? onRateChange(Number((rate + step).toFixed(precision))) : onAmountChange(Math.round(amount) + 100)}
              className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 rounded-md transition-all"
            >
              <Plus size={10} />
            </button>
          </div>

          {resetValue !== undefined && (
            <button 
              onClick={() => {
                if (isGuarantee) setMode('pct');
                onRateChange(resetValue);
              }} 
              className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              title="Réinitialiser"
            >
              <RotateCcw size={10} />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex justify-end h-3">
         <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tight tabular-nums">
           {mode === 'pct' ? (isGuarantee ? "Sur capital emprunté" : `≈ ${Math.round(amount).toLocaleString()} €`) : (mode === 'eur' && type === 'percent' ? `${rate.toFixed(precision)} %` : "")}
         </span>
      </div>
    </div>
  );
}

function App() {
  const getInitialPage = () => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/recherche') return 'biens';
      if (window.location.pathname === '/analyse') return 'analyse';
    }
    return 'dashboard';
  };
  
  const [activePage, setActivePage] = useState(getInitialPage());
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => setActivePage(getInitialPage());
    window.addEventListener('popstate', handlePopState);
    // Assure l'URL initiale si on arrive sur la racine
    if (window.location.pathname === '/') {
      window.history.replaceState({}, '', '/dashboard');
    }
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (page) => {
    setActivePage(page);
    setIsMobileAsideOpen(false);
    const urls = { biens: '/recherche', analyse: '/analyse', dashboard: '/dashboard' };
    window.history.pushState({}, '', urls[page] || '/dashboard');
  };

  // 1. Définition des valeurs "Usine" (si rien n'est sauvegardé)
  const FACTORY_SETTINGS = {
    incomeJess: 4200,
    incomeRenaud: 1600,
    rent: 1020,
    epargneTotale: 200000,
    jessSalaire: { salaire: 3200, treizieme: 3200, prime: 1300, bonus: 4000, interessement: 1000, participation: 2500, bonusActif: false },
    renaudBnc: { collectedHT: 30618, billedHT: 35000, forecastHT: 40000, selectedMode: 'collected' },
    budget: {
      alimentation: 1000, electricite: 152.52, taxeFonciere: 125, carburant: 100,
      macif: 72, assuranceHab: 62, eau: 50, fraisBancaires: 30, internet: 27.47,
      telephones: 21.98,
      googleAiPro: 21.99, spotify: 21.00, claudeAi: 18.00, realdebrid: 2.67,
      hpInstantInk: 4.00, googlePlayPass: 2.50, microsoft365: 2.00,
      carlance: 10, stationnement: 10,
      divers: 0, epargne: 545
    }
  };

  // 2. Chargement initial synchrone du LocalStorage
  const loadInitialState = () => {
    try {
      const local = localStorage.getItem('financia_full_state');
      if (local) return JSON.parse(local);
    } catch (e) { console.error("Erreur lecture LocalStorage", e); }
    return null;
  };

  const initialState = loadInitialState();

  // 3. États principaux
  const [globalSettings, setGlobalSettings] = useState(initialState?.globalSettings || FACTORY_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentScenarioId, setCurrentScenarioId] = useState(initialState?.currentScenarioId || 0);
  const [compareWithId, setCompareWithId] = useState(null);
  const [renaudStats, setRenaudStats] = useState(initialState?.renaudStats || { ...FACTORY_SETTINGS.renaudBnc, monthsPassed: 4 });
  const [jessStats, setJessStats] = useState(initialState?.jessStats || { ...FACTORY_SETTINGS.jessSalaire });
  const [isJessCalcOpen, setIsJessCalcOpen] = useState(false);
  const [showFeeDetail, setShowFeeDetail] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  const [scenarios, setScenarios] = useState(() => {
    if (initialState?.scenarios) return initialState.scenarios;
    return [
      { 
        id: 0, name: "🏠 Actuel (Locataire)", price: 0, surface: 0, apport: 0, rate: 0, insurance: 0, duration: 25, dpe: 'D', travaux: 0, notaryRate: 7.276, agencyRate: 2.8,
        rent: FACTORY_SETTINGS.rent, income: FACTORY_SETTINGS.incomeJess, income2: FACTORY_SETTINGS.incomeRenaud,
        budget: { ...FACTORY_SETTINGS.budget } 
      },
      { 
        id: 1, name: "Option A", price: 430000, surface: 120, apport: 165000, rate: 3.8, insurance: 0.5, duration: 25, dpe: 'D', travaux: 0, notaryRate: 7.276, agencyRate: 2.8, brokerFee: 4120,
        rent: FACTORY_SETTINGS.rent, income: FACTORY_SETTINGS.incomeJess, income2: FACTORY_SETTINGS.incomeRenaud,
        budget: { ...FACTORY_SETTINGS.budget } 
      }
    ];
  });

  const [inflationRate, setInflationRate] = useState(2.0);
  const [isLocked, setIsLocked] = useState(true);
  const [isRenaudCalcOpen, setIsRenaudCalcOpen] = useState(false);
  const [isBncModalOpen, setIsBncModalOpen] = useState(false);
  const [isJessModalOpen, setIsJessModalOpen] = useState(false);
  const [isFraisAnnexesOpen, setIsFraisAnnexesOpen] = useState(false);

  useEffect(() => {
    // Migration : Séparer les dépenses qui auraient pu être concaténées
    let hasChanged = false;
    const migratedScenarios = scenarios.map(s => {
      const b = { ...s.budget };
      let changed = false;
      
      if (b.energie !== undefined) {
        b.electricite = (b.electricite || 153);
        b.eau = (b.eau || 50);
        delete b.energie;
        changed = true;
      }
      if (b.transport !== undefined) {
        b.carburant = (b.carburant || 100);
        b.stationnement = (b.stationnement || 10);
        delete b.transport;
        changed = true;
      }
      if (b.taxes !== undefined) {
        b.taxeFonciere = (b.taxeFonciere || 125);
        delete b.taxes;
        changed = true;
      }
      if (b.assurance !== undefined) {
        b.assuranceHab = (b.assuranceHab || 62);
        delete b.assurance;
        changed = true;
      }

      // Séparation des abonnements détaillés
      if (b.abonnements !== undefined) {
        b.googleAiPro = 21.99;
        b.spotify = 21.00;
        b.claudeAi = 18.00;
        b.realdebrid = 2.67;
        b.hpInstantInk = 4.00;
        b.googlePlayPass = 2.50;
        b.microsoft365 = 2.00;
        b.divers = 0;
        delete b.abonnements;
        changed = true;
      }

      if (changed) {
        hasChanged = true;
        return { ...s, budget: b };
      }
      return s;
    });

    if (hasChanged) {
      setScenarios(migratedScenarios);
    }

    // Migration de globalSettings
    const gb = { ...globalSettings.budget };
    let gChanged = false;
    if (gb.abonnements !== undefined) {
      gb.googleAiPro = 21.99; gb.spotify = 21.00; gb.claudeAi = 18.00;
      gb.realdebrid = 2.67; gb.hpInstantInk = 4.00; gb.googlePlayPass = 2.50;
      gb.microsoft365 = 2.00; gb.divers = 0;
      delete gb.abonnements;
      gChanged = true;
    }
    if (gb.energie !== undefined) { gb.electricite = 153; gb.eau = 50; delete gb.energie; gChanged = true; }
    if (gb.transport !== undefined) { gb.carburant = 100; gb.stationnement = 10; delete gb.transport; gChanged = true; }
    if (gb.taxes !== undefined) { gb.taxeFonciere = 125; delete gb.taxes; gChanged = true; }
    if (gb.assurance !== undefined) { gb.assuranceHab = 62; delete gb.assurance; gChanged = true; }

    if (globalSettings.epargneTotale === undefined) {
      gChanged = true;
    }

    if (gChanged) {
      setGlobalSettings({
        ...globalSettings,
        budget: gb,
        epargneTotale: globalSettings.epargneTotale ?? FACTORY_SETTINGS.epargneTotale,
      });
    }

    // Synchronisation optionnelle avec le serveur si dispo
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        if (data && !initialState) { // On ne charge le serveur que si le local est vide
          const isObject = !Array.isArray(data);
          if (isObject) {
            if (data.scenarios) setScenarios(data.scenarios);
            if (data.globalSettings) setGlobalSettings(data.globalSettings);
            if (data.renaudStats) setRenaudStats(data.renaudStats);
          } else {
            setScenarios(data);
          }
        }
      })
      .catch(err => console.log("Mode hors-ligne ou serveur non configuré."));
  }, []);

  useEffect(() => {
    const fullState = { scenarios, renaudStats, jessStats, currentScenarioId, globalSettings };
    localStorage.setItem('financia_full_state', JSON.stringify(fullState));
    
    fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullState)
    })
    .then(res => {
      if (res.ok) {
        setShowToast(true);
        const timer = setTimeout(() => setShowToast(false), 1500);
        return () => clearTimeout(timer);
      }
    })
    .catch(err => console.error("Échec synchro serveur", err));
  }, [scenarios, renaudStats, jessStats, currentScenarioId, globalSettings]);

  const renaudCalculated = useMemo(() => {
    const netFiscalCollected = (renaudStats.collectedHT * 0.66) / 12;
    const netFiscalBilled = (renaudStats.billedHT * 0.66) / 12;
    const netFiscalTotal = ((renaudStats.billedHT + renaudStats.forecastHT) * 0.66) / 12;
    return { netFiscalCollected, netFiscalBilled, netFiscalTotal };
  }, [renaudStats]);

  const jessCalculated = useMemo(() => {
    const lissageTreizieme = jessStats.treizieme / 12;
    const lissagePrime = jessStats.prime / 12;
    const lissageBonus = jessStats.bonus / 12;
    const lissageInteressement = (jessStats.interessement || 0) / 12;
    const lissageParticipation = jessStats.participation / 12;
    const netSansBonus = jessStats.salaire + lissageTreizieme + lissagePrime + lissageInteressement + lissageParticipation;
    const netAvecBonus = netSansBonus + lissageBonus;
    const netCourant = jessStats.bonusActif ? netAvecBonus : netSansBonus;
    return { lissageTreizieme, lissagePrime, lissageBonus, lissageInteressement, lissageParticipation, netSansBonus, netAvecBonus, netCourant };
  }, [jessStats]);

  const allResults = useMemo(() => {
    const bankIncome = globalSettings.incomeJess + globalSettings.incomeRenaud;

    return scenarios.map(s => {
      // Revenu utilisé pour le budget (sliders)
      const projectedIncome = (s.income || 0) + (s.income2 || 0);
      
      const agencyFees = s.price * ((s.agencyRate || 0) / 100);
      const notaryFees = s.price * ((s.notaryRate || 7.276) / 100);
      const guaranteeRate = s.guaranteeRate ?? 0.6345;

      // Frais annexes (Dossier, Garantie, Courtage) — 0 si pas de bien
      const bankFee = s.price > 0 ? (s.bankFee ?? 1500) : 0;
      const brokerFee = s.price > 0 ? (s.brokerFee ?? 4100) : 0;
      const initialTotal = s.price + agencyFees + notaryFees + (s.travaux || 0) + bankFee + brokerFee;
      const loanBeforeGuarantee = Math.max(0, initialTotal - s.apport);

      const guaranteeFee = s.price > 0 ? (s.guaranteeFee ?? (loanBeforeGuarantee * guaranteeRate / 100)) : 0;

      const totalAcquisition = initialTotal + guaranteeFee;
      const loanAmount = Math.max(0, totalAcquisition - s.apport);
      
      const totalBudget = Object.entries(s.budget).reduce((acc, [key, val]) => {
        if (key === 'epargne') return acc;
        if (val === undefined || val === null) return acc;
        return acc + (typeof val === 'number' ? val : (val.amount || 0));
      }, 0);

      // Calculs bancaires basés sur le revenu BANCAIRE
      const isBaselineScenario = s.id === 0;
      const payment = !isBaselineScenario && s.price > 0
        ? calculateMonthlyPayment(loanAmount, s.rate, s.duration, s.insurance)
        : { total: isBaselineScenario ? globalSettings.rent : (s.rent || 0), principal: 0, interest: 0, insurance: 0 };
      const debtRatio = !isBaselineScenario && s.price > 0 ? (payment.total / bankIncome) * 100 : 0;

      
      // RAV basé sur le revenu de PROJECTION
      const rav = projectedIncome - payment.total - totalBudget - (typeof s.budget.epargne === 'number' ? s.budget.epargne : s.budget.epargne.amount);
      
      const cost = calculateTotalCost(loanAmount, s.rate, s.duration, s.insurance);
      const amortization = generateAmortizationTable(loanAmount, s.rate, s.duration, s.insurance);
      
      const maxMonthly = bankIncome * 0.35;
      const monthlyRate = (s.rate || 0) / 100 / 12;
      const annualInsuranceRate = (s.insurance || 0) / 100;
      const n = (s.duration || 25) * 12;
      
      const denominator = (monthlyRate > 0) 
        ? (monthlyRate / (1 - Math.pow(1 + monthlyRate, -n))) + (annualInsuranceRate / 12)
        : (1 / n) + (annualInsuranceRate / 12);
        
      const factor = 1 / denominator;
      const loanCapacity = maxMonthly * factor;
      const monthlyExceeding = Math.max(0, payment.total - maxMonthly);
      
      // On ajuste le montant à réduire par le ratio de garantie (1.00869) 
      // car chaque euro d'apport en moins réduit aussi la garantie.
      const isGuaranteeDynamic = s.guaranteeFee === undefined || s.guaranteeFee === null;
      const guaranteeRateFactor = 1 + guaranteeRate / 100;
      const guaranteeRatio = isGuaranteeDynamic ? guaranteeRateFactor : 1;
      const loanToReduce = (monthlyExceeding * factor) / guaranteeRatio;

      const inflationData = Array.from({ length: 6 }, (_, i) => ({
        year: i * 5,
        realValue: calculateInflationImpact(payment.total, inflationRate, i * 5)
      }));

      const minApportAt35 = isGuaranteeDynamic
        ? Math.max(0, initialTotal - loanCapacity / guaranteeRateFactor)
        : Math.max(0, totalAcquisition - loanCapacity);

      return { 
        ...s, 
        projectedIncome,
        bankIncome,
        totalIncome: bankIncome,
        agencyFees,
        notaryFees, 
        loanAmount, 
        payment, 
        debtRatio, 
        rav, 
        cost, 
        inflationData, 
        amortization, 
        loanCapacity,
        minApportAt35,
        bankFee,
        guaranteeFee,
        guaranteeRate,
        brokerFee,
        totalAcquisition,
        requiredExtraApport: loanToReduce, 
        priceNegotiation: loanToReduce / (1 + (s.notaryRate || 7.276) / 100), 
        totalBudget 
      };
    });
  }, [scenarios, inflationRate, renaudStats, renaudCalculated, globalSettings]);

  const resetField = (field, defaultValue) => {
    setScenarios(prev => prev.map(s => s.id === currentScenarioId ? { ...s, [field]: defaultValue } : s));
  };

  const resetBudgetField = (key, defaultValue) => {
    if (defaultValue === undefined) return;
    setScenarios(prev => prev.map(s => s.id === currentScenarioId ? { ...s, budget: { ...s.budget, [key]: defaultValue } } : s));
  };

  const resetAll = () => {
    if (!confirm("Réinitialiser toutes les valeurs de ce scénario ?")) return;
    setScenarios(prev => prev.map(s => {
      if (s.id !== currentScenarioId) return s;
      return {
        ...s,
        income: globalSettings.incomeJess,
        income2: globalSettings.incomeRenaud,
        rent: globalSettings.rent,
        price: s.id === 0 ? 0 : 430000,
        surface: s.id === 0 ? 0 : 120,
        apport: s.id === 0 ? 0 : 165000,
        rate: s.id === 0 ? 0 : 3.8,
        insurance: s.id === 0 ? 0 : 0.5,
        duration: 25,
        agencyRate: 2.8,
        notaryRate: 7.276,
        brokerFee: s.id === 0 ? undefined : 4120,
        budget: { ...globalSettings.budget }
      };
    }));
  };

  const currentScenario = scenarios.find(s => s.id === currentScenarioId) || scenarios[0];
  const currentResults = allResults.find(r => r.id === currentScenarioId) || allResults[0];
  const baselineResults = allResults.find(r => r.id === 0) || allResults[0];

  const deltas = {
    payment: currentResults.payment.total - baselineResults.payment.total,
    rav: currentResults.rav - baselineResults.rav,
    epargne: currentScenario.budget.epargne - baselineResults.budget.epargne
  };

  const compareResults = compareWithId !== null ? allResults.find(r => r.id === compareWithId) ?? null : null;
  const compareScenario = compareWithId !== null ? scenarios.find(s => s.id === compareWithId) ?? null : null;

  const DeltaBadge = ({ current, compare, unit = '€', lowerIsBetter = false, isPercent = false }) => {
    if (compare === undefined || compare === null) return null;
    const d = current - compare;
    if (Math.abs(d) < 0.5) return null;
    const isPositive = lowerIsBetter ? d < 0 : d > 0;
    const sign = d > 0 ? '+' : '';
    const formatted = isPercent
      ? `${sign}${d.toFixed(3)} %`
      : `${sign}${Math.round(d).toLocaleString()} ${unit}`;
    return (
      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ml-1 ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
        {formatted}
      </span>
    );
  };

  const [newExpense, setNewExpense] = useState({ label: '', amount: '' });

  const currentBudgetItems = useMemo(() => {
    if (!currentScenario || !baselineResults) return [];
    const budgetColors = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c', '#2dd4bf'];
    return [
      { id: 'logement', label: 'Logement (Prêt/Loyer)', val: currentResults.payment.total, baseline: baselineResults.payment.total, color: '#6366f1' },
      ...Object.entries(currentScenario.budget).map(([key, val], idx) => ({ 
        id: key, 
        label: formatBudgetLabel(key), 
        val: val === undefined || val === null ? 0 : (typeof val === 'number' ? val : (val.amount || 0)), 
        baseline: typeof (baselineResults.budget[key]) === 'number' ? baselineResults.budget[key] : (baselineResults.budget[key]?.amount || 0), 
        color: budgetColors[idx % budgetColors.length]
      })).filter(item => item.val !== undefined),
      { id: 'rav', label: 'Reste à Vivre', val: Math.max(0, currentResults.rav), baseline: Math.max(0, baselineResults.rav), color: '#cbd5e1' }
    ].sort((a, b) => a.val - b.val);
  }, [currentScenario, currentResults, baselineResults]);

  const currentBudgetTotal = useMemo(() => currentBudgetItems.reduce((a, b) => a + b.val, 0), [currentBudgetItems]);

  const addCustomExpense = () => {
    if (!newExpense.label || !newExpense.amount) return;
    const id = `custom_${Date.now()}`;
    const newBudget = { ...currentScenario.budget, [id]: { label: newExpense.label, amount: Number(e.target.value), isCustom: true } };
    updateCurrentScenario('budget', newBudget);
    setNewExpense({ label: '', amount: '' });
  };

  const removeCustomExpense = (id) => {
    const newBudget = { ...currentScenario.budget };
    delete newBudget[id];
    updateCurrentScenario('budget', newBudget);
  };

  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobileAsideOpen, setIsMobileAsideOpen] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [tempName, setTempName] = useState('');
  const [distributionView, setDistributionView] = useState('doughnut');

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 300 && newWidth < 800) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const updateCurrentScenario = (field, value) => {
    setScenarios(prev => prev.map(s => {
      if (s.id !== currentScenarioId) return s;
      
      const newS = { ...s, [field]: value };
      
      // Auto-recalc guarantee if base parameters change
      if (['price', 'apport', 'agencyRate', 'notaryRate', 'travaux'].includes(field)) {
        newS.guaranteeFee = undefined;
      }
      
      return newS;
    }));
  };

  const handleSaveName = () => {
    if (!tempName.trim()) return;
    if (modalType === 'rename') {
      updateCurrentScenario('name', tempName);
    } else if (modalType === 'create') {
      const newId = Math.max(...scenarios.map(s => s.id)) + 1;
      setScenarios([...scenarios, { ...currentScenario, id: newId, name: tempName }]);
      setCurrentScenarioId(newId);
    }
    setModalType(null);
    setTempName('');
  };

  const removeScenario = (id) => {
    if (id === 0) return;
    setScenarios(prev => prev.filter(s => s.id !== id));
    setCurrentScenarioId(0);
  };

  const openModal = (type, initialValue = '') => {
    setModalType(type);
    setTempName(initialValue);
  };

  return (
    <div className="h-screen bg-[#f8fafc] flex overflow-hidden flex-col md:flex-row">
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalType(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-slate-100">
              <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">
                {modalType === 'rename' ? 'Renommer le scénario' : 'Nouveau Scénario'}
              </h3>
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nom de la simulation</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={tempName} 
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    placeholder={modalType === 'rename' ? "Nouveau nom..." : "Ex: Maison Vannes, Appart T3..."}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-brand-primary transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setModalType(null)} className="flex-1 px-6 py-4 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-slate-50 transition-all">Annuler</button>
                  <button onClick={handleSaveName} className="flex-[2] bg-brand-primary text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                    {modalType === 'rename' ? 'Enregistrer' : 'Créer la simulation'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Nav desktop : barre verticale gauche */}
      <nav className="hidden md:flex w-16 bg-slate-900 flex-col items-center py-6 gap-8">
        <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white"><Landmark size={20} /></div>
        <div className="flex flex-col gap-6 py-6">
          <button onClick={() => navigateTo('dashboard')} className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all group relative", activePage === 'dashboard' ? "bg-brand-primary text-white" : "text-slate-500 hover:bg-slate-800 hover:text-white")}>
            <PieChart size={20} />
            <span className="absolute left-16 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">Dashboard</span>
          </button>
          <button onClick={() => navigateTo('biens')} className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all group relative", activePage === 'biens' ? "bg-brand-primary text-white" : "text-slate-500 hover:bg-slate-800 hover:text-white")}>
            <Search size={20} />
            <span className="absolute left-16 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">Recherche Biens</span>
          </button>
          <button onClick={() => navigateTo('analyse')} className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all group relative", activePage === 'analyse' ? "bg-brand-primary text-white" : "text-slate-500 hover:bg-slate-800 hover:text-white")}>
            <TrendingUp size={20} />
            <span className="absolute left-16 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">Analyse Comparative</span>
          </button>
          <div className="w-8 h-px bg-slate-800 mx-auto" />
          <button onClick={() => setIsSettingsOpen(true)} className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-white transition-all group relative">
            <Settings size={20} />
            <span className="absolute left-16 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">Paramètres Globaux</span>
          </button>
        </div>
      </nav>

      {/* Nav mobile : barre fixe en bas */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-slate-900 flex items-center justify-around px-4 border-t border-slate-800">
        <button onClick={() => navigateTo('dashboard')} className={cn("flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all", activePage === 'dashboard' ? "text-brand-primary" : "text-slate-500")}>
          <PieChart size={20} /><span className="text-[9px] font-black uppercase">Dashboard</span>
        </button>
        <button onClick={() => navigateTo('biens')} className={cn("flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all", activePage === 'biens' ? "text-brand-primary" : "text-slate-500")}>
          <Search size={20} /><span className="text-[9px] font-black uppercase">Biens</span>
        </button>
        <button onClick={() => navigateTo('analyse')} className={cn("flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all", activePage === 'analyse' ? "text-brand-primary" : "text-slate-500")}>
          <TrendingUp size={20} /><span className="text-[9px] font-black uppercase">Analyse</span>
        </button>
        {activePage === 'dashboard' && (
          <button onClick={() => setIsMobileAsideOpen(true)} className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-slate-500">
            <Settings size={20} /><span className="text-[9px] font-black uppercase">Cockpit</span>
          </button>
        )}
        <button onClick={() => setIsSettingsOpen(true)} className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-slate-500">
          <Settings size={20} /><span className="text-[9px] font-black uppercase">Config</span>
        </button>
      </nav>
      
      <AnimatePresence>
        {currentResults.requiredExtraApport > 10 && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-6">
            <div className="bg-white/80 backdrop-blur-xl border-t-4 border-rose-500 shadow-2xl rounded-[2rem] p-6 flex items-center gap-6 overflow-hidden relative">
              <div className="p-4 bg-rose-500 text-white rounded-2xl animate-bounce"><AlertTriangle size={24} /></div>
              <div className="flex-1">
                <h4 className="text-sm font-black text-rose-900 uppercase">Dossier Bloqué à {currentResults.debtRatio.toFixed(2)}%</h4>
                <p className="text-xs text-rose-700">Il manque <strong>{Math.round(currentResults.requiredExtraApport).toLocaleString()} €</strong> d'apport.</p>
              </div>
              <button onClick={() => updateCurrentScenario('apport', Math.round(currentResults.minApportAt35))} className="bg-rose-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-md hover:bg-rose-600 transition-all">Appliquer l'apport</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
        {/* Page : Biens */}
        <div className={cn("flex-1 h-full overflow-hidden", activePage === 'biens' ? "block" : "hidden")}>
          <BienPage />
        </div>

        {/* Page : Analyse */}
        <div className={cn("flex-1 h-full overflow-hidden flex", activePage === 'analyse' ? "flex" : "hidden")}>
          <AnalysePage 
            currentScenario={currentScenario} 
            globalSettings={globalSettings} 
            currentResults={currentResults} 
            isMobileAsideOpen={isMobileAsideOpen}
            setIsMobileAsideOpen={setIsMobileAsideOpen} 
          />
        </div>

        {/* Page : Dashboard (Défaut) */}
        <div className={cn("flex-1 h-full overflow-hidden flex flex-col", (activePage === 'dashboard' || !activePage) ? "flex" : "hidden")}>
          <main className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6 pb-20 md:pb-6">
            <header className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  Renaud & Jessica <span className="text-slate-400 font-medium">| Dashboard</span>
                </h2>
                {currentScenario.adUrl && (
                  <a href={currentScenario.adUrl} target="_blank" rel="noopener noreferrer" className="inline-flex mt-1 bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase items-center gap-2 hover:bg-slate-200 transition-all">
                    Voir l'annonce <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </header>

            <div className="bg-white p-4 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              {/* Ligne 1 : bien + apport */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-0 lg:divide-x lg:divide-slate-100">
                <div className="p-2 lg:p-0 lg:pr-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Prix du Bien</p>
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <input type="number" className="bg-transparent border-none p-0 text-xl font-black text-slate-900 focus:ring-0 w-24" value={currentScenario.price} onChange={(e) => updateCurrentScenario('price', Number(e.target.value))} />
                    <span className="text-sm font-black text-slate-400">€</span>
                    <DeltaBadge current={currentScenario.price} compare={compareScenario?.price} />
                  </div>
                </div>
                <div className="p-2 lg:p-0 lg:px-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Surface</p>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <input type="number" className="bg-transparent border-none p-0 text-xl font-black text-slate-900 focus:ring-0 w-16" value={currentScenario.surface || 0} onChange={(e) => updateCurrentScenario('surface', Number(e.target.value))} />
                    <span className="text-sm font-black text-slate-400">m²</span>
                  </div>
                  {currentScenario.surface > 0 && <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{Math.round(currentScenario.price / currentScenario.surface).toLocaleString()} €/m²</p>}
                </div>
                <div className="p-2 lg:p-0 lg:px-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Votre Apport</p>
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <input type="number" className="bg-transparent border-none p-0 text-xl font-black text-brand-secondary focus:ring-0 w-24" value={currentScenario.apport} onChange={(e) => updateCurrentScenario('apport', Number(e.target.value))} />
                    <span className="text-sm font-black text-slate-400">€</span>
                    <DeltaBadge current={currentScenario.apport} compare={compareScenario?.apport} />
                  </div>
                </div>
                {(() => {
                  const restant = (globalSettings.epargneTotale ?? FACTORY_SETTINGS.epargneTotale) - currentScenario.apport;
                  return (
                    <div className="p-2 lg:p-0 lg:px-4">
                      <div className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                        Épargne Restante
                        <HelpTip title="Épargne Restante" content="Épargne totale disponible moins l'apport engagé dans ce scénario." position="bottom" />
                      </div>
                      <p className={`text-xl font-black leading-tight ${restant >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{Math.round(restant).toLocaleString()}&nbsp;€</p>
                      {compareScenario && <DeltaBadge current={restant} compare={(globalSettings.epargneTotale ?? FACTORY_SETTINGS.epargneTotale) - compareScenario.apport} lowerIsBetter={false} />}
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">sur {(globalSettings.epargneTotale ?? FACTORY_SETTINGS.epargneTotale).toLocaleString()} € total</p>
                    </div>
                  );
                })()}
                <div className="p-2 lg:p-0 lg:px-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                    Capacité Bancaire (35%)
                    <HelpTip title="Revenu de Référence" content="Basé sur le revenu bancaire de référence de Renaud et Jess cumulé." position="bottom" />
                  </div>
                  <p className="text-xl font-black text-slate-800">{Math.round(currentResults.bankIncome * 0.35).toLocaleString()}&nbsp;€</p>
                </div>
              </div>
              <div className="border-t border-slate-100" />
              {/* Ligne 2 : revenus + crédit params */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-0 lg:divide-x lg:divide-slate-100">
                <div className="p-2 lg:p-0 lg:pr-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                    Revenus Cumulés
                    <HelpTip title="Revenus Bancaires" content="Revenus configurés par défaut, utilisés comme référence bancaire pour le taux d'endettement." position="bottom" />
                  </div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Référence endettement</p>
                  <p className="text-xl font-black text-slate-900 leading-tight">{Math.round(currentResults.bankIncome).toLocaleString()}&nbsp;€</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Jess {Math.round(globalSettings.incomeJess).toLocaleString()} + Renaud {Math.round(globalSettings.incomeRenaud).toLocaleString()}</p>
                </div>
                <div className="p-2 lg:p-0 lg:px-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                    Revenus Cumulés
                    <HelpTip title="Revenus Mensuels Nets" content="Cumul des revenus nets mensuels configurés dans le scénario, pour le budget et le RAV." position="bottom" />
                  </div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Pour le budget &amp; RAV</p>
                  <p className="text-xl font-black text-slate-900 leading-tight">{Math.round((currentScenario.income || 0) + (currentScenario.income2 || 0)).toLocaleString()}&nbsp;€</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Jess {Math.round(currentScenario.income || 0).toLocaleString()} + Renaud {Math.round(currentScenario.income2 || 0).toLocaleString()}</p>
                </div>
                <div className="p-2 lg:p-0 lg:px-4">
                  <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">Épargne ({currentScenario.duration} ans)</p>
                  {(() => { const ep = typeof currentScenario.budget.epargne === 'number' ? currentScenario.budget.epargne : currentScenario.budget.epargne.amount; return (<>
                    <p className="text-xl font-black text-emerald-600 leading-tight">{Math.round(ep * 12 * currentScenario.duration).toLocaleString()}&nbsp;€</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{Math.round(ep).toLocaleString()}€ x 12 x {currentScenario.duration} ans</p>
                  </>); })()}
                </div>
                <div className="p-2 lg:p-0 lg:px-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                    Budget Mensuel
                    <HelpTip title="Budget Mensuel Détaillé" content="Somme de tous les postes du budget mensuel détaillé, hors épargne." position="bottom" />
                  </div>
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <p className="text-xl font-black text-slate-900">{Math.round(currentResults.totalBudget).toLocaleString()}&nbsp;€</p>
                    <DeltaBadge current={currentResults.totalBudget} compare={compareResults?.totalBudget} lowerIsBetter={true} />
                  </div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">hors épargne</p>
                </div>
                <div className="p-2 lg:p-0 lg:px-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Taux Fixe</p>
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <p className="text-xl font-black text-slate-900">{currentScenario.rate.toFixed(2)} %</p>
                    {compareScenario && <DeltaBadge current={currentScenario.rate} compare={compareScenario.rate} lowerIsBetter={true} isPercent={true} />}
                  </div>
                </div>
                <div className="p-2 lg:p-0 lg:px-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Durée</p>
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <p className="text-xl font-black text-slate-900">{currentScenario.duration} ans</p>
                    {compareScenario && <DeltaBadge current={currentScenario.duration} compare={compareScenario.duration} lowerIsBetter={false} />}
                  </div>
                </div>
              </div>
            </div>

            {/* LIGNE 1: INDICATEURS CLÉS (KPIs) */}
            <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-3 md:gap-4">
              {/* Total Opération — colonne gauche, toujours déployée */}
              <div className="glass-card p-5 rounded-[2rem]">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Opération</p>
                <div className="flex items-baseline gap-1 flex-wrap mb-4">
                  <p className="text-3xl font-black text-brand-primary">{Math.round(currentResults.totalAcquisition).toLocaleString()} €</p>
                  <DeltaBadge current={currentResults.totalAcquisition} compare={compareResults?.totalAcquisition} lowerIsBetter={true} />
                </div>
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  {[
                    { label: 'Prix du bien', value: currentScenario.price, base: true },
                    { label: `Frais d'agence`, value: currentResults.agencyFees },
                    { label: `Frais de notaire`, value: currentResults.notaryFees },
                    ...(currentScenario.travaux > 0 ? [{ label: 'Travaux', value: currentScenario.travaux }] : []),
                    { label: 'Frais bancaires', value: currentResults.bankFee },
                    { label: 'Courtage', value: currentResults.brokerFee },
                    { label: 'Garantie caution', value: currentResults.guaranteeFee },
                  ].map((row, i) => {
                    const pct = currentResults.totalAcquisition > 0 ? (row.value / currentResults.totalAcquisition) * 100 : 0;
                    return (
                      <div key={i} className="flex items-baseline justify-between gap-2">
                        <span className={`text-[11px] ${row.base ? 'font-black text-slate-700' : 'font-medium text-slate-400'}`}>
                          {!row.base && <span className="text-slate-300 mr-1">+</span>}{row.label}
                          {!row.base && <span className="text-[9px] font-bold text-brand-primary ml-1">({pct.toFixed(1)}%)</span>}
                        </span>
                        <span className={`text-[11px] font-black tabular-nums ${row.base ? 'text-slate-800' : 'text-slate-500'}`}>
                          {Math.round(row.value).toLocaleString()} €
                        </span>
                      </div>
                    );
                  })}
                  <div className="border-t border-slate-200 pt-2 mt-1 flex justify-between items-baseline">
                    <span className="text-[11px] font-black text-brand-primary uppercase tracking-wider">= Total</span>
                    <span className="text-[14px] font-black text-brand-primary">{Math.round(currentResults.totalAcquisition).toLocaleString()} €</span>
                  </div>
                </div>
              </div>

              {/* 5 autres KPIs — grille 2 colonnes */}
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="glass-card p-5 rounded-[2rem]">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Montant Emprunté</p>
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <p className="text-2xl font-black text-slate-900">{Math.round(currentResults.loanAmount).toLocaleString()} €</p>
                    <DeltaBadge current={currentResults.loanAmount} compare={compareResults?.loanAmount} lowerIsBetter={true} />
                  </div>
                </div>
                <div className="glass-card p-5 rounded-[2rem]">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Prix du Crédit</p>
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <p className="text-2xl font-black text-rose-500">{Math.round(currentResults.cost.totalInterests + currentResults.cost.totalInsurance).toLocaleString()} €</p>
                    <DeltaBadge current={currentResults.cost.totalInterests + currentResults.cost.totalInsurance} compare={compareResults ? compareResults.cost.totalInterests + compareResults.cost.totalInsurance : undefined} lowerIsBetter={true} />
                  </div>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[9px] font-bold text-slate-400">{Math.round(currentResults.cost.totalInterests).toLocaleString()} € intérêts</span>
                    <span className="text-[9px] font-bold text-slate-300">·</span>
                    <span className="text-[9px] font-bold text-slate-400">{Math.round(currentResults.cost.totalInsurance).toLocaleString()} € assurance</span>
                  </div>
                </div>
                <div className="glass-card p-5 rounded-[2rem]">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Mensualité Totale</p>
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <p className="text-2xl font-black text-brand-primary">{Math.round(currentResults.payment.total).toLocaleString()} €</p>
                    <DeltaBadge current={currentResults.payment.total} compare={compareResults?.payment.total} lowerIsBetter={true} />
                  </div>
                </div>
                <div className="glass-card p-5 rounded-[2rem]">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Reste à Vivre (RAV)</p>
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <p className={cn("text-2xl font-black", currentResults.rav > 500 ? "text-emerald-500" : "text-rose-500")}>{Math.round(currentResults.rav).toLocaleString()} €</p>
                    <DeltaBadge current={currentResults.rav} compare={compareResults?.rav} lowerIsBetter={false} />
                  </div>
                </div>
                <div className="glass-card p-5 rounded-[2rem] col-span-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Taux d'Endettement</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <p className={cn("text-2xl font-black", currentResults.debtRatio > 35 ? "text-rose-500" : "text-slate-900")}>{currentResults.debtRatio.toFixed(2)} %</p>
                      <DeltaBadge current={currentResults.debtRatio} compare={compareResults?.debtRatio} lowerIsBetter={true} isPercent={true} />
                    </div>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn("h-full transition-all duration-500", currentResults.debtRatio > 35 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${Math.min(100, currentResults.debtRatio)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

        {/* LIGNE 3: RÉPARTITION DU BUDGET (FULL WIDTH) */}
        <div className="glass-card p-10 rounded-[3.5rem] space-y-12 mb-12 relative z-0">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Répartition Détaillée du Budget</h3>
              <p className="text-xs text-slate-400 uppercase font-black tracking-widest">Analyse comparative des postes de dépenses mensuels</p>
            </div>
            <button 
              onClick={() => setIsBudgetModalOpen(true)}
              className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary transition-all shadow-xl shadow-slate-200 flex items-center gap-2 group"
            >
              <TableIcon size={14} className="group-hover:rotate-12 transition-transform" />
              Voir les détails
            </button>
          </div>

          <div className="h-[350px] w-full">
            <Bar 
              data={{
                labels: currentBudgetItems.map(i => i.label),
                datasets: [{
                  label: 'Montant Mensuel (€)',
                  data: currentBudgetItems.map(i => i.val),
                  backgroundColor: currentBudgetItems.map(i => i.color),
                  borderRadius: 12,
                  barThickness: 40,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { size: 12, weight: 'bold' },
                    bodyFont: { size: 14, weight: 'black' },
                    padding: 16,
                    displayColors: false,
                    callbacks: {
                      label: (context) => `${context.parsed.y.toLocaleString()} €`
                    }
                  }
                },
                scales: {
                  y: { 
                    beginAtZero: true,
                    grid: { color: '#f1f5f9', drawBorder: false },
                    ticks: { color: '#94a3b8', font: { weight: 'bold' }, callback: v => `${v}€` }
                  },
                  x: { 
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { weight: 'black', size: 10 } }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* LIGNE 2: ANALYSE PATRIMOINE & VERDICT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          <div className="lg:col-span-8 glass-card p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] h-[350px] md:h-[450px]">
             <div className="flex justify-between items-start mb-6">
               <div>
                 <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                   Évolution du Patrimoine Net
                   <HelpTip title="Projection Patrimoine" content="Simule la valeur de vos actifs sur 25 ans." />
                 </h3>
                 <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">Projection sur 25 ans</p>
               </div>
               <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
                 <HelpTip title="Taux d'inflation" content="Ajuste l'augmentation annuelle théorique de la valeur des biens et du coût de la vie. Un taux plus élevé accélère la prise de valeur du patrimoine immobilier." />
                 <input type="range" min="0" max="5" step="0.1" value={inflationRate} onChange={(e) => setInflationRate(Number(e.target.value))} className="w-24 h-1 accent-brand-primary" />
                 <span className="text-[10px] font-black text-slate-600 w-8">{inflationRate}%</span>
               </div>
             </div>
             <div className="h-[320px]">
                <Line 
                  data={{
                    labels: Array.from({ length: 26 }, (_, i) => `An ${i}`),
                    datasets: allResults
                      .filter(res => res.id === 0 || res.id === currentScenarioId)
                      .map((res) => ({
                        label: res.name,
                        data: Array.from({ length: 26 }, (_, year) => {
                          const cumulativeSavings = (res.budget.epargne * 12) * year;
                          if (res.id === 0) return cumulativeSavings;
                          const propertyValue = res.price * Math.pow(1 + (inflationRate/100), year);
                          const remainingDebt = year === 0 ? res.loanAmount : res.amortization[Math.min(year * 12 - 1, res.amortization.length - 1)].remainingBalance;
                          return (propertyValue - remainingDebt) + cumulativeSavings;
                        }),
                        borderColor: res.id === 0 ? '#94a3b8' : '#6366f1',
                        backgroundColor: res.id === 0 ? 'rgba(148, 163, 184, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                        borderWidth: 4, pointRadius: 0, tension: 0.4, fill: true
                      }))
                  }}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { 
                      y: { grid: { display: false }, ticks: { callback: v => `${(v/1000).toFixed(0)}k€` } },
                      x: { grid: { display: false } }
                    }
                  }}
                />
             </div>
          </div>

          <div className="col-span-4 glass-card p-8 rounded-[3rem] flex flex-col justify-between overflow-hidden relative border-2 border-brand-primary/10">
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">Verdict Expert</h3>
              {currentScenario.id !== 0 ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    {[
                      { label: 'Coût Logement', val: currentResults.payment.total - (baselineResults.rent || 0) },
                      { label: 'Charges & Taxes', val: Object.values(currentScenario.budget).reduce((a, b) => a + (typeof b === 'number' ? b : b.amount), 0) - Object.values(baselineResults.budget).reduce((a, b) => a + (typeof b === 'number' ? b : b.amount), 0) },
                      { 
                        label: (
                          <span className="flex items-center gap-1">
                            Variation de l'épargne
                            <HelpTip title="Variation Épargne" content="Différence entre l'épargne que vous prévoyez dans ce scénario et votre épargne actuelle de locataire." />
                          </span>
                        ), 
                        val: currentScenario.budget.epargne - (baselineResults.budget?.epargne || 0) 
                      }
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tighter">{row.label}</span>
                        <span className={cn("text-[11px] font-black", row.val < 0 ? "text-rose-500" : row.val > 0 ? "text-emerald-500" : "text-slate-400")}>
                          {row.val > 0 ? '+' : ''}{Math.round(row.val).toLocaleString()} €
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className={cn("p-6 rounded-[2rem] flex flex-col items-center text-center space-y-3 relative overflow-hidden", 
                    (currentResults.rav - baselineResults.rav) >= 0 ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-rose-500/5 border border-rose-500/20")}>
                    
                    <div className="flex flex-col items-center">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Impact sur Budget Mensuel</p>
                      <p className="text-[8px] text-slate-400 italic">Comparé à votre situation actuelle locataire</p>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", (currentResults.rav - baselineResults.rav) >= 0 ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500")}>
                          {(currentResults.rav - baselineResults.rav) >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                        </div>
                        <div className="flex flex-col items-start">
                          <p className={cn("text-3xl font-black tracking-tight", (currentResults.rav - baselineResults.rav) >= 0 ? "text-emerald-500" : "text-rose-500")}>
                            {(currentResults.rav - baselineResults.rav) >= 0 ? "+" : "-"}{Math.abs(Math.round(currentResults.rav - baselineResults.rav)).toLocaleString()} €
                          </p>
                          {baselineResults.rav > 0 && (
                            <span className={cn("text-[10px] font-black", (currentResults.rav - baselineResults.rav) >= 0 ? "text-emerald-500/70" : "text-rose-500/70")}>
                              {(currentResults.rav - baselineResults.rav) >= 0 ? "+" : ""}{(((currentResults.rav - baselineResults.rav) / baselineResults.rav) * 100).toFixed(3)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mt-1", (currentResults.rav - baselineResults.rav) >= 0 ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}>
                        {(currentResults.rav - baselineResults.rav) >= 0 ? "Gain Mensuel" : "Perte de pouvoir d'achat"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-4 opacity-30">
                  <TrendingUp size={32} />
                  <p className="text-[10px] font-black uppercase">Sélectionnez un scénario</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
    </div>

      {/* Overlay mobile pour fermer le panel */}
      {isMobileAsideOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileAsideOpen(false)} />
      )}

      <aside
        style={{ width: `${sidebarWidth}px` }}
        className={cn(
          "bg-slate-900 border-l border-slate-800 flex flex-col relative transition-none text-white",
          activePage === 'dashboard' ? "md:flex" : "hidden",
          isMobileAsideOpen
            ? "fixed inset-y-0 right-0 z-50 w-full sm:w-96 flex"
            : ""
        )}
      >
        <div onMouseDown={() => setIsResizing(true)} className="hidden md:block absolute left-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-brand-primary/30 z-50 active:bg-brand-primary transition-colors" />

        <div className="p-6 border-b border-slate-800 flex justify-between items-center px-4">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Settings size={14} className="text-brand-primary" /> Cockpit Expert
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={resetAll} className="text-[9px] font-black text-slate-500 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700">
              <RotateCcw size={10} /> RESET GLOBAL
            </button>
            <button onClick={() => setIsMobileAsideOpen(false)} className="md:hidden w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 relative">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Choisir une simulation</label>
              <button 
                onClick={() => setIsSelectOpen(!isSelectOpen)}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-sm font-black text-white flex justify-between items-center hover:bg-slate-700 transition-all"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                  <span className="truncate">{currentScenario.name}</span>
                </div>
                <ChevronRight size={18} className={cn("text-slate-500 transition-transform", isSelectOpen && "rotate-90")} />
              </button>

              <AnimatePresence>
                {isSelectOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 w-full mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-[60] overflow-hidden"
                  >
                    <div className="max-h-[300px] overflow-y-auto scrollbar-hide">
                      {scenarios.map(s => (
                        <div key={s.id} className="group relative flex items-center">
                          <button
                            onClick={() => {
                              setCurrentScenarioId(s.id);
                              setIsSelectOpen(false);
                            }}
                            className={cn(
                              "flex-1 text-left p-4 text-xs font-bold transition-colors flex items-center justify-between",
                              currentScenarioId === s.id ? "bg-brand-primary/20 text-brand-primary" : "text-slate-400 hover:bg-slate-700 hover:text-white"
                            )}
                          >
                            <span>{s.name}</span>
                            {currentScenarioId === s.id && <ShieldCheck size={14} />}
                          </button>
                          <div className="flex items-center pr-2 gap-1 bg-transparent group-hover:opacity-100 opacity-0 transition-opacity">
                            <button onClick={() => openModal('rename', s.name)} className="p-2 text-slate-500 hover:text-white transition-colors">
                              <FileText size={14} />
                            </button>
                            {s.id !== 0 && (
                              <button onClick={() => removeScenario(s.id)} className="p-2 text-rose-500/50 hover:text-rose-500 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => openModal('create')}
                      className="w-full p-4 text-[10px] font-black uppercase text-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10 transition-all border-t border-slate-700 flex items-center justify-center gap-2"
                    >
                      <Plus size={14} /> Nouveau Scénario
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-6">

            {currentScenario.id !== 0 && (
              <div className="bg-slate-800/40 p-6 rounded-[2rem] space-y-4 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-primary/20 text-brand-primary rounded-xl">
                    <Home size={18} />
                  </div>
                  <h3 className="text-sm font-black text-white tracking-tight uppercase">Le Projet</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Lien de l'annonce</label>
                    <input type="text" placeholder="https://..." value={currentScenario.adUrl || ""} onChange={(e) => updateCurrentScenario('adUrl', e.target.value)} className="w-full bg-slate-800 rounded-lg p-2 text-xs font-medium text-white outline-none border border-slate-700 focus:border-brand-primary" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">DPE</label>
                    <select 
                      className="w-full bg-slate-800 rounded-lg p-2 text-xs font-bold text-white outline-none border border-slate-700 focus:border-brand-primary appearance-none text-center"
                      value={currentScenario.dpe || 'D'}
                      onChange={(e) => updateCurrentScenario('dpe', e.target.value)}
                    >
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(grade => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Prix Net (€)</label>
                      <input 
                        type="number" 
                        value={currentScenario.price} 
                        onChange={(e) => updateCurrentScenario('price', Number(e.target.value))}
                        className="w-full bg-slate-800 rounded-lg p-2 text-xs font-black text-white outline-none border border-slate-700 focus:border-brand-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Surface (m²)</label>
                      <input 
                        type="number" 
                        value={currentScenario.surface || ''} 
                        onChange={(e) => updateCurrentScenario('surface', Number(e.target.value))}
                        className="w-full bg-slate-800 rounded-lg p-2 text-xs font-black text-white outline-none border border-slate-700 focus:border-brand-primary"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateCurrentScenario('price', Math.max(0, currentScenario.price - 1000))} className="text-slate-500 hover:text-brand-primary"><Minus size={12} /></button>
                    <input type="range" min="100000" max="800000" step="1000" value={currentScenario.price} onChange={(e) => updateCurrentScenario('price', Number(e.target.value))} className="flex-1 h-1 accent-brand-primary cursor-pointer" />
                    <button onClick={() => updateCurrentScenario('price', Math.min(800000, currentScenario.price + 1000))} className="text-slate-500 hover:text-brand-primary"><Plus size={12} /></button>
                  </div>
                </div>
                <div className="pt-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Frais</label>
                  
                  {/* Agency Fee Control */}
                  <SidebarFeeControl 
                    label="Agence" 
                    type="percent"
                    rate={currentScenario.agencyRate ?? 2.8}
                    amount={currentResults.agencyFees}
                    onRateChange={(v) => updateCurrentScenario('agencyRate', v)}
                    onAmountChange={(v) => currentScenario.price > 0 && updateCurrentScenario('agencyRate', +(v / currentScenario.price * 100).toFixed(4))}
                    resetValue={2.8}
                  />

                  {/* Notary Fee Control */}
                  <SidebarFeeControl 
                    label="Notaire" 
                    type="percent"
                    rate={currentScenario.notaryRate ?? 7.276}
                    amount={currentResults.notaryFees}
                    onRateChange={(v) => updateCurrentScenario('notaryRate', v)}
                    onAmountChange={(v) => currentScenario.price > 0 && updateCurrentScenario('notaryRate', +(v / currentScenario.price * 100).toFixed(4))}
                    resetValue={7.276}
                    precision={3}
                  />

                  {/* Guarantee Fee Control */}
                  <SidebarFeeControl 
                    label="Garantie caution" 
                    type="percent"
                    rate={currentResults.guaranteeRate}
                    amount={currentResults.guaranteeFee}
                    onRateChange={(v) => { updateCurrentScenario('guaranteeRate', v); updateCurrentScenario('guaranteeFee', undefined); }}
                    onAmountChange={(v) => updateCurrentScenario('guaranteeFee', v)}
                    resetValue={0.6345}
                    precision={4}
                    isGuarantee={true}
                    guaranteeOverride={currentScenario.guaranteeFee !== undefined}
                  />

                  {/* Bank Fee Control */}
                  <SidebarFeeControl 
                    label="Frais bancaires" 
                    type="amount"
                    amount={currentResults.bankFee}
                    onAmountChange={(v) => updateCurrentScenario('bankFee', v)}
                  />

                  {/* Broker Fee Control */}
                  <SidebarFeeControl 
                    label="Courtage" 
                    type="amount"
                    amount={currentResults.brokerFee}
                    onAmountChange={(v) => updateCurrentScenario('brokerFee', v)}
                  />
                </div>
              </div>
            )}

            {currentScenario.id !== 0 && (
              <div className="bg-slate-800/40 p-6 rounded-[2rem] space-y-6 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-secondary/20 text-brand-secondary rounded-xl">
                    <Landmark size={18} />
                  </div>
                  <h3 className="text-sm font-black text-white tracking-tight uppercase">Financement</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateCurrentScenario('apport', Math.round(currentResults.minApportAt35))} className="bg-brand-secondary/20 text-brand-secondary px-2 py-1 rounded text-[8px] font-black uppercase hover:bg-brand-secondary hover:text-white transition-all">Opti</button>
                      <button onClick={() => updateCurrentScenario('apport', Math.round(currentResults.notaryFees))} className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-[8px] font-black uppercase hover:bg-slate-600 transition-all">Notaire</button>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Apport</label>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateCurrentScenario('apport', Math.max(0, currentScenario.apport - 1000))} className="text-slate-500 hover:text-white"><Minus size={8} /></button>
                      <input type="number" value={currentScenario.apport} onChange={(e) => updateCurrentScenario('apport', Number(e.target.value))} className="w-20 bg-slate-800 text-white text-xs font-black rounded p-0.5 text-right outline-none border border-slate-700" />
                      <button onClick={() => updateCurrentScenario('apport', Math.min(1000000, currentScenario.apport + 1000))} className="text-slate-500 hover:text-white"><Plus size={8} /></button>
                      <span className="text-[10px] font-black text-slate-500 ml-0.5">€</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateCurrentScenario('apport', Math.max(0, currentScenario.apport - 1000))} className="text-slate-500 hover:text-brand-secondary"><Minus size={12} /></button>
                    <input type="range" min="0" max="250000" step="1000" value={currentScenario.apport} onChange={(e) => updateCurrentScenario('apport', Number(e.target.value))} className="flex-1 h-1 accent-brand-secondary cursor-pointer" />
                    <button onClick={() => updateCurrentScenario('apport', Math.min(250000, currentScenario.apport + 1000))} className="text-slate-500 hover:text-brand-secondary"><Plus size={12} /></button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Taux</label>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateCurrentScenario('rate', Math.max(1, currentScenario.rate - 0.05))} className="text-slate-500 hover:text-white"><Minus size={8} /></button>
                        <input type="number" step="0.01" value={currentScenario.rate} onChange={(e) => updateCurrentScenario('rate', Number(e.target.value))} className="w-14 bg-slate-800 text-white text-[10px] font-bold rounded p-0.5 text-right outline-none border border-slate-700" />
                        <button onClick={() => updateCurrentScenario('rate', Math.min(6, currentScenario.rate + 0.05))} className="text-slate-500 hover:text-white"><Plus size={8} /></button>
                        <span className="text-[9px] text-slate-500 ml-0.5">%</span>
                        <button onClick={() => updateCurrentScenario('rate', 3.8)} className="p-1 text-slate-600 hover:text-white transition-colors ml-1"><RotateCcw size={10} /></button>
                      </div>
                    </div>
                    <input type="range" min="1" max="6" step="0.01" value={currentScenario.rate} onChange={(e) => updateCurrentScenario('rate', Number(e.target.value))} className="w-full h-1 accent-white cursor-pointer" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ass.</label>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateCurrentScenario('insurance', Math.max(0, currentScenario.insurance - 0.01))} className="text-slate-500 hover:text-white"><Minus size={8} /></button>
                        <input type="number" step="0.01" value={currentScenario.insurance} onChange={(e) => updateCurrentScenario('insurance', Number(e.target.value))} className="w-12 bg-slate-800 text-white text-[10px] font-bold rounded p-0.5 text-right outline-none border border-slate-700" />
                        <button onClick={() => updateCurrentScenario('insurance', Math.min(2, currentScenario.insurance + 0.01))} className="text-slate-500 hover:text-white"><Plus size={8} /></button>
                        <span className="text-[9px] text-slate-500 ml-0.5">%</span>
                        <button onClick={() => updateCurrentScenario('insurance', 0.5)} className="p-1 text-slate-600 hover:text-white transition-colors ml-1"><RotateCcw size={10} /></button>
                      </div>
                    </div>
                    <input type="range" min="0" max="2" step="0.01" value={currentScenario.insurance} onChange={(e) => updateCurrentScenario('insurance', Number(e.target.value))} className="w-full h-1 accent-emerald-400 cursor-pointer" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Durée</label>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateCurrentScenario('duration', Math.max(10, currentScenario.duration - 1))} className="text-slate-500 hover:text-white"><Minus size={8} /></button>
                        <input type="number" value={currentScenario.duration} onChange={(e) => updateCurrentScenario('duration', Number(e.target.value))} className="w-10 bg-slate-800 text-white text-[10px] font-bold rounded p-0.5 text-right outline-none border border-slate-700" />
                        <button onClick={() => updateCurrentScenario('duration', Math.min(25, currentScenario.duration + 1))} className="text-slate-500 hover:text-white"><Plus size={8} /></button>
                        <span className="text-[9px] text-slate-500 ml-0.5">ans</span>
                      </div>
                    </div>
                    <input type="range" min="10" max="25" step="1" value={currentScenario.duration} onChange={(e) => updateCurrentScenario('duration', Number(e.target.value))} className="w-full h-1 accent-white cursor-pointer" />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-700/50">
                  <button onClick={() => setIsFraisAnnexesOpen(!isFraisAnnexesOpen)} className="w-full flex justify-between items-center py-2 group">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-amber-400 transition-colors">Frais Bancaires & Courtage</span>
                    <ChevronRight size={14} className={cn("text-slate-600 transition-transform", isFraisAnnexesOpen && "rotate-90 text-amber-400")} />
                  </button>
                  <AnimatePresence>
                    {isFraisAnnexesOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4 pt-2 pb-1">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Frais Banque</label>
                             <div className="flex items-center gap-1">
                               <button onClick={() => updateCurrentScenario('bankFee', Math.max(0, (currentScenario.bankFee ?? 1500) - 100))} className="text-slate-500 hover:text-white"><Minus size={8} /></button>
                               <input type="number" value={currentScenario.bankFee ?? 1500} onChange={(e) => updateCurrentScenario('bankFee', Number(e.target.value))} className="w-14 bg-slate-800 text-white text-[10px] font-bold rounded p-0.5 text-right outline-none border border-slate-700" />
                               <button onClick={() => updateCurrentScenario('bankFee', Math.min(10000, (currentScenario.bankFee ?? 1500) + 100))} className="text-slate-500 hover:text-white"><Plus size={8} /></button>
                               <span className="text-[9px] text-slate-500 ml-0.5">€</span>
                               <button onClick={() => updateCurrentScenario('bankFee', undefined)} className="text-slate-600 hover:text-white ml-1"><RotateCcw size={8} /></button>
                             </div>
                          </div>
                          <input type="range" min="0" max="3000" step="100" value={currentScenario.bankFee ?? 1500} onChange={(e) => updateCurrentScenario('bankFee', Number(e.target.value))} className="w-full h-1 accent-amber-500 cursor-pointer" />
                        </div>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Garantie</label>
                               <div className="flex items-center gap-1">
                                <button onClick={() => updateCurrentScenario('guaranteeFee', Math.max(0, Math.round(currentScenario.guaranteeFee ?? currentResults.guaranteeFee) - 100))} className="text-slate-500 hover:text-white"><Minus size={8} /></button>
                                <input type="number" value={Math.round(currentScenario.guaranteeFee ?? currentResults.guaranteeFee)} onChange={(e) => updateCurrentScenario('guaranteeFee', Number(e.target.value))} className="w-14 bg-slate-800 text-white text-[10px] font-bold rounded p-0.5 text-right outline-none border border-slate-700" />
                                <button onClick={() => updateCurrentScenario('guaranteeFee', Math.min(20000, Math.round(currentScenario.guaranteeFee ?? currentResults.guaranteeFee) + 100))} className="text-slate-500 hover:text-white"><Plus size={8} /></button>
                                <span className="text-[9px] text-slate-500 ml-0.5">€</span>
                                <button onClick={() => updateCurrentScenario('guaranteeFee', undefined)} className="text-slate-600 hover:text-white ml-1"><RotateCcw size={8} /></button>
                              </div>
                            </div>
                            <input type="range" min="0" max="10000" step="100" value={currentScenario.guaranteeFee ?? currentResults.guaranteeFee} onChange={(e) => updateCurrentScenario('guaranteeFee', Number(e.target.value))} className="w-full h-1 accent-amber-500 cursor-pointer" />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Courtage</label>
                              <div className="flex items-center gap-1">
                                <button onClick={() => updateCurrentScenario('brokerFee', Math.max(0, (currentScenario.brokerFee ?? 4100) - 100))} className="text-slate-500 hover:text-white"><Minus size={8} /></button>
                                <input type="number" value={currentScenario.brokerFee ?? 4100} onChange={(e) => updateCurrentScenario('brokerFee', Number(e.target.value))} className="w-14 bg-slate-800 text-white text-[10px] font-bold rounded p-0.5 text-right outline-none border border-slate-700" />
                                <button onClick={() => updateCurrentScenario('brokerFee', Math.min(10000, (currentScenario.brokerFee ?? 4100) + 100))} className="text-slate-500 hover:text-white"><Plus size={8} /></button>
                                <span className="text-[9px] text-slate-500 ml-0.5">€</span>
                                <button onClick={() => updateCurrentScenario('brokerFee', undefined)} className="text-slate-600 hover:text-white ml-1"><RotateCcw size={8} /></button>
                              </div>
                            </div>
                            <input type="range" min="0" max="10000" step="100" value={currentScenario.brokerFee ?? 4100} onChange={(e) => updateCurrentScenario('brokerFee', Number(e.target.value))} className="w-full h-1 accent-amber-500 cursor-pointer" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            <div className="bg-slate-800/40 p-6 rounded-[2rem] space-y-6 border border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-xl">
                    <TrendingUp size={18} />
                  </div>
                  <h3 className="text-sm font-black text-white tracking-tight uppercase">Situation Revenus</h3>
                </div>
                {currentScenarioId === 0 && (
                  <button onClick={() => setIsLocked(!isLocked)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-all border border-slate-700">
                    {isLocked ? <Lock size={12} className="text-rose-500" /> : <Unlock size={12} className="text-emerald-500" />}
                    <span className="text-[10px] font-black text-slate-300 uppercase">{isLocked ? "Verrouillé" : "Déverrouillé"}</span>
                  </button>
                )}
              </div>

              <div className={cn("space-y-3 transition-all", (isLocked && currentScenarioId === 0) && "opacity-50")}>
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                    Jess (Salariat)
                    <button onClick={() => setIsJessModalOpen(true)} className="w-3 h-3 rounded-full bg-rose-500/20 flex items-center justify-center text-[8px] text-rose-400 hover:bg-rose-500 hover:text-white transition-colors">?</button>
                  </label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => resetField('income', globalSettings.incomeJess)} className="p-1 text-slate-600 hover:text-rose-400 transition-colors" title="Réinitialiser"><RotateCcw size={10} /></button>
                    <span className="text-sm font-black text-white">{currentScenario.income.toLocaleString()} €</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button disabled={isLocked && currentScenarioId === 0} onClick={() => updateCurrentScenario('income', Math.max(0, currentScenario.income - 50))} className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-rose-500 hover:bg-slate-700 disabled:opacity-30"><Minus size={12} /></button>
                  <input type="range" min="0" max="8000" step="50" disabled={isLocked && currentScenarioId === 0} value={currentScenario.income} onChange={(e) => updateCurrentScenario('income', Number(e.target.value))} className="flex-1 h-1 accent-rose-500 cursor-pointer disabled:opacity-30" />
                  <button disabled={isLocked && currentScenarioId === 0} onClick={() => updateCurrentScenario('income', Math.min(8000, currentScenario.income + 50))} className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-rose-500 hover:bg-slate-700 disabled:opacity-30"><Plus size={12} /></button>
                </div>
                <button onClick={() => setIsJessCalcOpen(!isJessCalcOpen)} className="text-[9px] font-bold text-rose-400/80 hover:text-rose-400 flex items-center gap-1">
                  {isJessCalcOpen ? "Masquer l'assistant" : "Détailler la rémunération"} <ChevronRight size={10} className={cn("transition-transform", isJessCalcOpen && "rotate-90")} />
                </button>
                <AnimatePresence>
                  {isJessCalcOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 space-y-3">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-300 uppercase leading-none">Salaire net / mois</p>
                        <input type="number" value={jessStats.salaire} onChange={(e) => setJessStats({...jessStats, salaire: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs font-bold text-white outline-none focus:border-rose-400" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: '13e mois', key: 'treizieme', hint: 'Mai + Nov' },
                          { label: "Prime fin d'année", key: 'prime', hint: 'Décembre' },
                          { label: 'Intéressement', key: 'interessement', hint: 'Annuel' },
                          { label: 'Participation', key: 'participation', hint: 'Annuelle' },
                        ].map(field => (
                          <div key={field.key} className="space-y-1">
                            <p className="text-[8px] font-black text-slate-300 uppercase leading-none">{field.label}</p>
                            <input type="number" value={jessStats[field.key]} onChange={(e) => setJessStats({...jessStats, [field.key]: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs font-bold text-white outline-none focus:border-rose-400" />
                          </div>
                        ))}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-[8px] font-black text-slate-300 uppercase leading-none">Bonus</p>
                            <button onClick={() => setJessStats({...jessStats, bonusActif: !jessStats.bonusActif})} className={cn("text-[7px] font-black px-2 py-0.5 rounded-full transition-all", jessStats.bonusActif ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400")}>
                              {jessStats.bonusActif ? "ON" : "OFF"}
                            </button>
                          </div>
                          <input type="number" value={jessStats.bonus} onChange={(e) => setJessStats({...jessStats, bonus: Number(e.target.value)})} className={cn("w-full bg-slate-900 border rounded-lg p-1.5 text-xs font-bold text-white outline-none", jessStats.bonusActif ? "border-emerald-500/50" : "border-slate-700 opacity-60")} />
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-700/50">
                        <button onClick={() => updateCurrentScenario('income', Math.round(jessCalculated.netCourant))} className={cn("w-full text-[9px] font-black text-white py-1.5 rounded-lg transition-colors", jessStats.bonusActif ? "bg-emerald-500 hover:bg-emerald-400" : "bg-rose-500 hover:bg-rose-400")}>
                          Appliquer : {Math.round(jessCalculated.netCourant)} €/mois
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className={cn("space-y-3 transition-all", (isLocked && currentScenarioId === 0) && "opacity-50")}>
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                    Renaud (Indép.)
                    <button onClick={() => setIsBncModalOpen(true)} className="w-3 h-3 rounded-full bg-sky-500/20 flex items-center justify-center text-[8px] text-sky-400 hover:bg-sky-500 hover:text-white transition-colors">?</button>
                  </label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => resetField('income2', globalSettings.incomeRenaud)} className="p-1 text-slate-600 hover:text-sky-400 transition-colors" title="Réinitialiser"><RotateCcw size={10} /></button>
                    <span className="text-sm font-black text-white">{currentScenario.income2.toLocaleString()} €</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button disabled={isLocked && currentScenarioId === 0} onClick={() => updateCurrentScenario('income2', Math.max(0, currentScenario.income2 - 50))} className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-sky-500 hover:bg-slate-700 disabled:opacity-30"><Minus size={12} /></button>
                  <input type="range" min="0" max="8000" step="50" disabled={isLocked && currentScenarioId === 0} value={currentScenario.income2} onChange={(e) => updateCurrentScenario('income2', Number(e.target.value))} className="flex-1 h-1 accent-sky-500 cursor-pointer disabled:opacity-30" />
                  <button disabled={isLocked && currentScenarioId === 0} onClick={() => updateCurrentScenario('income2', Math.min(8000, currentScenario.income2 + 50))} className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-sky-500 hover:bg-slate-700 disabled:opacity-30"><Plus size={12} /></button>
                </div>
                <button onClick={() => setIsRenaudCalcOpen(!isRenaudCalcOpen)} className="text-[9px] font-bold text-sky-500/80 hover:text-sky-400 flex items-center gap-1">
                  {isRenaudCalcOpen ? 'Masquer l\'assistant' : 'Ajuster via Pilotage BNC'} <ChevronRight size={10} className={cn("transition-transform", isRenaudCalcOpen && "rotate-90")} />
                </button>
                <AnimatePresence>
                  {isRenaudCalcOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 mt-2 space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'collected', label: 'Encaissé HT', sub: 'Année', key: 'collectedHT', accent: 'focus:border-sky-500' },
                          { id: 'billed',    label: 'Facturé HT',  sub: 'Signé', key: 'billedHT',   accent: 'focus:border-slate-400' },
                          { id: 'forecast',  label: 'Prévisionnel',sub: 'HT',    key: 'forecastHT', accent: 'focus:border-emerald-500' }
                        ].map(mode => (
                          <div key={mode.id} className="space-y-1">
                            <p className="text-[8px] font-black text-slate-300 uppercase leading-none">{mode.label}</p>
                            <input type="number" value={renaudStats[mode.key]} onChange={(e) => setRenaudStats({...renaudStats, [mode.key]: Number(e.target.value)})} className={cn("w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs font-bold text-white outline-none", mode.accent)} />
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2 pt-1 border-t border-slate-700/50">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-sky-400 uppercase">Vue Encaissée</span>
                          <button onClick={() => updateCurrentScenario('income2', Math.round(renaudCalculated.netFiscalCollected))} className="text-[9px] font-black bg-sky-500 text-white px-2 py-1.5 rounded-lg hover:bg-sky-400 transition-colors">
                            Appliquer : {Math.round(renaudCalculated.netFiscalCollected)} €
                          </button>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase">Vue Facturée</span>
                          <button onClick={() => updateCurrentScenario('income2', Math.round(renaudCalculated.netFiscalBilled))} className="text-[9px] font-black bg-slate-700 text-white px-2 py-1.5 rounded-lg hover:bg-slate-600 transition-colors">
                            Appliquer : {Math.round(renaudCalculated.netFiscalBilled)} €
                          </button>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-emerald-400 uppercase">Vue + Prévisionnel</span>
                          <button onClick={() => updateCurrentScenario('income2', Math.round(renaudCalculated.netFiscalTotal))} className="text-[9px] font-black bg-emerald-500 text-white px-2 py-1.5 rounded-lg hover:bg-emerald-400 transition-colors">
                            Appliquer : {Math.round(renaudCalculated.netFiscalTotal)} €
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {currentScenario.id === 0 && (
                <div className="pt-4 border-t border-slate-700/50 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Loyer Actuel</p>
                    <p className="text-[8px] text-slate-600">Défini dans Configuration</p>
                  </div>
                  <span className="text-sm font-black text-white">{globalSettings.rent.toLocaleString()} €</span>
                </div>
              )}
            </div>

            {/* BUDGET DÉTAILLÉ */}
            <div className="pt-6 border-t border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <PieChart size={16} className="text-brand-secondary" />
                <h4 className="text-[10px] font-black text-slate-500 uppercase">Budget Mensuel Détaillé</h4>
              </div>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
                {Object.keys(currentScenario.budget).filter(k => !k.startsWith('custom_')).map(key => {
                  const val = typeof currentScenario.budget[key] === 'number' ? currentScenario.budget[key] : currentScenario.budget[key].amount;
                  return (
                    <div key={key} className={cn("group", (isLocked && currentScenarioId === 0) && "opacity-50")}>
                      <div className="flex justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <button onClick={() => resetBudgetField(key, globalSettings.budget[key])} className="p-1 text-slate-600 hover:text-white transition-colors">
                            <RotateCcw size={8} />
                          </button>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{formatBudgetLabel(key)}</label>
                        </div>
                        <span className="text-[11px] font-black text-white">{Math.round(val)} €</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button disabled={isLocked && currentScenarioId === 0} onClick={() => updateCurrentScenario('budget', { ...currentScenario.budget, [key]: Math.max(0, val - 10) })} className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-700 disabled:opacity-30"><Minus size={12} /></button>
                        <input type="range" min="0" max="1500" step="10" disabled={isLocked && currentScenarioId === 0} value={val} onChange={(e) => updateCurrentScenario('budget', { ...currentScenario.budget, [key]: Number(e.target.value) })} className="flex-1 h-1 accent-slate-600 cursor-pointer" />
                        <button disabled={isLocked && currentScenarioId === 0} onClick={() => updateCurrentScenario('budget', { ...currentScenario.budget, [key]: Math.min(1500, val + 10) })} className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-700 disabled:opacity-30"><Plus size={12} /></button>
                      </div>
                    </div>
                  );
                })}

                {/* Dépenses personnalisées */}
                {Object.entries(currentScenario.budget).filter(([k, v]) => v?.isCustom).map(([id, item]) => (
                  <div key={id} className="p-4 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-brand-primary uppercase flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-brand-primary" /> {item.label}
                      </span>
                      <button onClick={() => removeCustomExpense(id)} className="text-rose-500/50 hover:text-rose-500 transition-colors"><Trash2 size={12} /></button>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-black text-white">{item.amount} €</span>
                       <input type="range" min="0" max="1000" value={item.amount} onChange={(e) => updateCurrentScenario('budget', { ...currentScenario.budget, [id]: { ...item, amount: Number(e.target.value) } })} className="w-24 h-1 accent-brand-primary" />
                    </div>
                  </div>
                ))}

                {/* Indicateurs financiers rapides */}
                <div className="pt-4 mt-6 border-t border-slate-800 space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase">Taux d'endettement</p>
                      <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Banque : {Math.round(currentResults.bankIncome).toLocaleString()}€</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className={cn("text-2xl font-black leading-none", 
                        currentResults.debtRatio > 35 ? "text-rose-500" : 
                        currentResults.debtRatio > 33 ? "text-amber-500" : "text-emerald-400"
                      )}>
                        {currentResults.debtRatio.toFixed(3)}%
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-tighter mt-1 opacity-60">
                        {currentResults.debtRatio <= 35 ? "✓ Limite HCSF Respectée" : "✕ Hors Limites HCSF"}
                      </span>
                    </div>
                  </div>

                  {/* Ajout de dépense */}
                  <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 space-y-3">
                    <p className="text-[9px] font-black text-slate-500 uppercase text-center">Ajouter une dépense</p>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Nom..." value={newExpense.label} onChange={(e) => setNewExpense({...newExpense, label: e.target.value})} className="flex-1 bg-slate-900 text-white rounded-lg p-2 text-xs font-bold outline-none border border-slate-700 focus:border-brand-primary" />
                      <input type="number" placeholder="€" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})} className="w-20 bg-slate-900 text-white rounded-lg p-2 text-xs font-bold outline-none border border-slate-700 focus:border-brand-primary" />
                    </div>
                    <button onClick={addCustomExpense} className="w-full bg-brand-primary/10 text-brand-primary py-2 rounded-xl font-black text-[10px] uppercase hover:bg-brand-primary hover:text-white transition-all flex items-center justify-center gap-2">
                      Valider <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </aside>

      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-[2rem] md:rounded-[3rem] p-5 md:p-10 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-3xl"
            >
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-3xl bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                    <Settings size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">Configuration Master</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Définition des variables par défaut</p>
                  </div>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-10">
                <section>
                  <h3 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-8 h-px bg-slate-800" /> Rémunération Jess (Salariat)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {[
                      { label: 'Salaire net / mois', key: 'salaire' },
                      { label: '13e mois (annuel)', key: 'treizieme' },
                      { label: "Prime fin d'année", key: 'prime' },
                      { label: 'Bonus (incertain)', key: 'bonus' },
                      { label: 'Intéressement', key: 'interessement' },
                      { label: 'Participation (annuel)', key: 'participation' },
                    ].map(f => (
                      <div key={f.key} className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">{f.label}</label>
                        <input
                          type="number"
                          value={globalSettings.jessSalaire?.[f.key] ?? jessStats[f.key]}
                          onChange={(e) => {
                            const updated = { ...(globalSettings.jessSalaire || jessStats), [f.key]: Number(e.target.value) };
                            setGlobalSettings({...globalSettings, jessSalaire: updated });
                            setJessStats(updated);
                          }}
                          className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-black focus:border-rose-400 outline-none transition-colors"
                        />
                      </div>
                    ))}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-rose-300 uppercase">Revenu mensuel de référence</label>
                      <div className="bg-slate-800 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Vue prudente (sans bonus)</span>
                        <span className="font-black text-rose-400">{Math.round(jessCalculated.netSansBonus)} €</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 md:gap-3">
                    <span className="text-[9px] text-slate-500 uppercase font-bold w-full sm:w-auto">Revenu de référence bancaire Jess</span>
                    <input
                      type="number"
                      value={globalSettings.incomeJess}
                      onChange={(e) => setGlobalSettings({...globalSettings, incomeJess: Number(e.target.value)})}
                      className="w-32 bg-slate-800 border border-slate-700 rounded-xl p-3 text-white font-black text-sm focus:border-rose-400 outline-none"
                    />
                    <button onClick={() => setGlobalSettings({...globalSettings, incomeJess: Math.round(jessCalculated.netSansBonus)})} className="text-[9px] font-black bg-rose-500/20 text-rose-400 px-3 py-2 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                      ← Vue prudente
                    </button>
                    <button onClick={() => setGlobalSettings({...globalSettings, incomeJess: Math.round(jessCalculated.netAvecBonus)})} className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-3 py-2 rounded-xl hover:bg-emerald-500 hover:text-white transition-all">
                      ← Vue optimiste
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-8 h-px bg-slate-800" /> Rémunération Renaud (BNC Indépendant)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Encaissé HT (Année)</label>
                      <input type="number" value={globalSettings.renaudBnc?.collectedHT ?? 0} onChange={(e) => setGlobalSettings({...globalSettings, renaudBnc: { ...globalSettings.renaudBnc, collectedHT: Number(e.target.value) }})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-black focus:border-sky-500 outline-none transition-colors" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Facturé HT (Année)</label>
                      <input type="number" value={globalSettings.renaudBnc?.billedHT ?? 0} onChange={(e) => setGlobalSettings({...globalSettings, renaudBnc: { ...globalSettings.renaudBnc, billedHT: Number(e.target.value) }})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-black focus:border-sky-500 outline-none transition-colors" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Prévisionnel HT</label>
                      <input type="number" value={globalSettings.renaudBnc?.forecastHT ?? 0} onChange={(e) => setGlobalSettings({...globalSettings, renaudBnc: { ...globalSettings.renaudBnc, forecastHT: Number(e.target.value) }})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-black focus:border-emerald-500 outline-none transition-colors" />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-[9px] text-slate-500 uppercase font-bold w-full sm:w-auto">Revenu de référence bancaire Renaud</span>
                    <input type="number" value={globalSettings.incomeRenaud} onChange={(e) => setGlobalSettings({...globalSettings, incomeRenaud: Number(e.target.value)})} className="w-32 bg-slate-800 border border-slate-700 rounded-xl p-3 text-white font-black text-sm focus:border-sky-500 outline-none" />
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-8 h-px bg-slate-800" /> Patrimoine & Épargne
                  </h3>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Épargne totale disponible</label>
                    <input
                      type="number"
                      value={globalSettings.epargneTotale ?? FACTORY_SETTINGS.epargneTotale}
                      onChange={(e) => setGlobalSettings({...globalSettings, epargneTotale: Number(e.target.value)})}
                      className="w-48 bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-black focus:border-emerald-400 outline-none transition-colors"
                    />
                    <p className="text-[9px] text-slate-500">Utilisé pour calculer l'épargne restante après apport</p>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-8 h-px bg-slate-800" /> Logement Actuel
                  </h3>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Loyer mensuel</label>
                    <input type="number" value={globalSettings.rent} onChange={(e) => setGlobalSettings({...globalSettings, rent: Number(e.target.value)})} className="w-48 bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-black focus:border-brand-primary outline-none transition-colors" />
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="w-8 h-px bg-slate-800" /> Budget Détaillé par défaut
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
                    {Object.keys(globalSettings.budget).map(key => (
                      <div key={key} className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{formatBudgetLabel(key)}</label>
                        <input 
                          type="number" 
                          value={globalSettings.budget[key]}
                          onChange={(e) => setGlobalSettings({
                            ...globalSettings, 
                            budget: { ...globalSettings.budget, [key]: Number(e.target.value) }
                          })}
                          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-sm text-white font-bold focus:border-brand-primary outline-none transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <div className="p-4 md:p-6 bg-brand-primary/5 border border-brand-primary/20 rounded-[2rem] flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                   <div className="flex items-center gap-4 text-brand-primary">
                     <AlertTriangle size={20} />
                     <p className="text-[10px] font-bold uppercase leading-tight max-w-md">
                       Ces valeurs seront utilisées pour initialiser tout nouveau scénario et lors des réinitialisations (Reset).
                     </p>
                   </div>
                   <button 
                    onClick={() => {
                      // Mise à jour de l'état Renaud avec les nouvelles valeurs globales
                      setRenaudStats({
                        ...renaudStats,
                        collectedHT: globalSettings.renaudBnc.collectedHT,
                        billedHT: globalSettings.renaudBnc.billedHT,
                        forecastHT: globalSettings.renaudBnc.forecastHT
                      });
                      
                      // Mise à jour du scénario Actuel
                      setScenarios(prev => prev.map(s => s.id === 0 ? {
                        ...s,
                        income: globalSettings.incomeJess,
                        income2: globalSettings.incomeRenaud,
                        rent: globalSettings.rent,
                        budget: { ...globalSettings.budget }
                      } : s));
                      setIsSettingsOpen(false);
                    }}
                    className="px-8 py-4 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-transform"
                   >
                     Sauvegarder & Appliquer
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isBncModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setIsBncModalOpen(false)}
                className="absolute top-6 right-6 text-slate-500 hover:text-white"
              >
                <Plus size={24} className="rotate-45" />
              </button>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 flex items-center justify-center text-sky-400">
                  <Calculator size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Détails des calculs BNC</h3>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Méthode de lissage bancaire</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-700">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Pour un auto-entrepreneur en <span className="text-sky-400 font-bold">BNC (Prestations de services)</span>, les banques et le fisc appliquent un abattement forfaitaire de <span className="font-bold text-white">34%</span> pour couvrir vos charges.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm font-black text-white">
                    <span>Revenu Net</span>
                    <span className="text-slate-500 text-xs">=</span>
                    <span className="px-2 py-0.5 bg-sky-500/20 text-sky-400 rounded">CA HT × 0.66</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-slate-700/50 pb-2">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase">Vue Encaissée</p>
                      <p className="text-[10px] text-slate-400 italic">({renaudStats.collectedHT}€ × 0.66) / 12</p>
                    </div>
                    <p className="text-lg font-black text-white">{Math.round(renaudCalculated.netFiscalCollected)} €</p>
                  </div>

                  <div className="flex justify-between items-end border-b border-slate-700/50 pb-2">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase">Vue Facturée (Signé)</p>
                      <p className="text-[10px] text-slate-400 italic">({renaudStats.billedHT}€ × 0.66) / 12</p>
                    </div>
                    <p className="text-lg font-black text-white">{Math.round(renaudCalculated.netFiscalBilled)} €</p>
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-emerald-500 uppercase">Vue + Prévisionnel</p>
                      <p className="text-[10px] text-slate-400 italic">(({renaudStats.billedHT}€ + {renaudStats.forecastHT}€) × 0.66) / 12</p>
                    </div>
                    <p className="text-lg font-black text-emerald-400">{Math.round(renaudCalculated.netFiscalTotal)} €</p>
                  </div>
                </div>

                <button 
                  onClick={() => setIsBncModalOpen(false)}
                  className="w-full py-4 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-lg"
                >
                  J'ai compris
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[200] px-4 py-2 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-2"
          >
            <ShieldCheck size={14} />
            Données synchronisées
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isJessModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setIsJessModalOpen(false)}
                className="absolute top-6 right-6 text-slate-500 hover:text-white"
              >
                <Plus size={24} className="rotate-45" />
              </button>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400">
                  <Calculator size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Détails des calculs Jess</h3>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Lissage des primes annuelles</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-700">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Pour une vision bancaire cohérente, nous additionnons le <span className="text-rose-400 font-bold">salaire fixe</span> et toutes les <span className="font-bold text-white">primes lissées sur 12 mois</span>.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-slate-700/50 pb-2">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase">Salaire Fixe</p>
                    </div>
                    <p className="text-sm font-black text-white">{jessStats.salaire} €</p>
                  </div>

                  <div className="flex justify-between items-end border-b border-slate-700/50 pb-2">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase">Primes lissées (13e, Fin d'année, Part., Int.)</p>
                      <p className="text-[10px] text-slate-400 italic">({jessStats.treizieme + jessStats.prime + jessStats.participation + (jessStats.interessement || 0)}€) / 12</p>
                    </div>
                    <p className="text-sm font-black text-white">+{Math.round(jessCalculated.lissageTreizieme + jessCalculated.lissagePrime + jessCalculated.lissageParticipation + jessCalculated.lissageInteressement)} €</p>
                  </div>

                  <div className="flex justify-between items-end bg-rose-500/5 p-3 rounded-xl border border-rose-500/20">
                    <div>
                      <p className="text-[10px] font-black text-rose-400 uppercase">Vue Prudente (Référence)</p>
                    </div>
                    <p className="text-xl font-black text-rose-400">{Math.round(jessCalculated.netSansBonus)} € / mois</p>
                  </div>

                  {jessStats.bonusActif && (
                    <div className="flex justify-between items-end bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/20">
                      <div>
                        <p className="text-[10px] font-black text-emerald-500 uppercase">Vue Optimiste (avec Bonus)</p>
                        <p className="text-[10px] text-slate-400 italic">+{Math.round(jessCalculated.lissageBonus)}€ de bonus lissé</p>
                      </div>
                      <p className="text-xl font-black text-emerald-400">{Math.round(jessCalculated.netAvecBonus)} € / mois</p>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setIsJessModalOpen(false)}
                  className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-lg"
                >
                  J'ai compris
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isBudgetModalOpen && (
          <BudgetModal 
            isOpen={isBudgetModalOpen} 
            onClose={() => setIsBudgetModalOpen(false)} 
            items={currentBudgetItems} 
            total={currentBudgetTotal}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
