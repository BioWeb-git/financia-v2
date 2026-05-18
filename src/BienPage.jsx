import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, MapPin, Euro, Clipboard, Trash2, ExternalLink, 
  CheckCircle2, Check, Star, Columns, X, AlertCircle, Loader2, 
  Map as MapIcon, ChevronUp, ChevronDown, Calendar, Phone, Edit2, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BIENS_STORAGE_KEY = 'financia_biens_state';

const loadBiensFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem(BIENS_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
};

const BienPage = () => {
  const initData = loadBiensFromStorage();
  const [biens, setBiens] = useState(initData?.biens || []);
  const [customColumns, setCustomColumns] = useState(initData?.customColumns || [
    { id: 'custom_1778169397374', label: 'Commentaire' },
    { id: 'custom_1778177173176', label: 'Contact' }
  ]);
  const [columnOrder, setColumnOrder] = useState(initData?.columnOrder || []);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [newBienText, setNewBienText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [addMode, setAddMode] = useState(null); // 'ai' or 'manual'
  const [newColumnName, setNewColumnName] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [expandedBiens, setExpandedBiens] = useState({});

  const saveAll = (updatedBiens, updatedCols, updatedOrder) => {
    const data = {
      biens: updatedBiens ?? biens,
      customColumns: updatedCols ?? customColumns,
      columnOrder: updatedOrder ?? columnOrder,
    };
    localStorage.setItem(BIENS_STORAGE_KEY, JSON.stringify(data));
    fetch('/api/biens/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});
  };

  useEffect(() => {
    fetch('/api/biens')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setBiens(data.biens || []);
        const cols = data.customColumns && data.customColumns.length > 0 ? data.customColumns : [
          { id: 'custom_1778169397374', label: 'Commentaire' },
          { id: 'custom_1778177173176', label: 'Contact' }
        ];
        setCustomColumns(cols);
        setColumnOrder(data.columnOrder || []);
        
        // Initialiser tous les biens comme réduits par défaut au chargement
        const initialExpanded = {};
        (data.biens || []).forEach(b => {
          initialExpanded[b.id] = false;
        });
        setExpandedBiens(initialExpanded);

        localStorage.setItem(BIENS_STORAGE_KEY, JSON.stringify({
          biens: data.biens || [],
          customColumns: cols,
          columnOrder: data.columnOrder || [],
        }));
      })
      .catch(() => {
        // Fallback
        const initialExpanded = {};
        biens.forEach(b => {
          initialExpanded[b.id] = false;
        });
        setExpandedBiens(initialExpanded);
      });
  }, []);

  const toggleExpand = (id) => {
    setExpandedBiens(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const areAllExpanded = useMemo(() => {
    const actifs = biens.filter(b => !b.abandonne);
    if (actifs.length === 0) return false;
    return actifs.every(b => expandedBiens[b.id] === true);
  }, [biens, expandedBiens]);

  const toggleAllExpanded = () => {
    const nextState = !areAllExpanded;
    const updated = { ...expandedBiens };
    biens.filter(b => !b.abandonne).forEach(b => {
      updated[b.id] = nextState;
    });
    setExpandedBiens(updated);
  };

  const sortedBiens = useMemo(() => {
    let sortableItems = [...biens];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'prixM2') {
          aValue = a.surface > 0 ? Math.round(a.prix / a.surface) : 0;
          bValue = b.surface > 0 ? Math.round(b.prix / b.surface) : 0;
        } else if (sortConfig.key.startsWith('custom_')) {
          aValue = a.customValues?.[sortConfig.key] || '';
          bValue = b.customValues?.[sortConfig.key] || '';
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }

        if (typeof aValue === 'boolean') aValue = aValue ? 1 : 0;
        if (typeof bValue === 'boolean') bValue = bValue ? 1 : 0;

        if (aValue === undefined || aValue === null) aValue = '';
        if (bValue === undefined || bValue === null) bValue = '';

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const aNum = parseFloat(aValue);
          const bNum = parseFloat(bValue);
          if (!isNaN(aNum) && !isNaN(bNum) && aValue.trim() !== '' && bValue.trim() !== '') {
            return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
          }
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [biens, sortConfig]);

  const actifs = useMemo(() => sortedBiens.filter(b => !b.abandonne), [sortedBiens]);
  const abandonnes = useMemo(() => sortedBiens.filter(b => b.abandonne), [sortedBiens]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      setSortConfig({ key: null, direction: 'asc' });
      return;
    }
    setSortConfig({ key, direction });
  };

  const parseAdTextHeuristic = (text) => {
    const data = {
      nom: "Nouveau Bien",
      ville: "",
      prix: 0,
      surface: 0,
      dpe: "-",
      visite: false,
      abandonne: false,
      url: "",
      maps: "",
      notes: "",
      customValues: {}
    };

    const prixMatch = text.match(/(\d[\d\s.]*)\s*€/);
    if (prixMatch) data.prix = parseInt(prixMatch[1].replace(/[\s.]/g, ''));

    const surfaceMatch = text.match(/(\d+)\s*m[²2]/);
    if (surfaceMatch) data.surface = parseInt(surfaceMatch[1]);

    const dpeMatch = text.match(/(?:DPE|Classe|classe)\s*:?\s*([A-G])/i);
    if (dpeMatch) data.dpe = dpeMatch[1].toUpperCase();

    const villeMatch = text.match(/(?:à|Ville\s*:)\s*([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s[A-ZÀ-ÿ][a-zà-ÿ]+)*)/);
    if (villeMatch) data.ville = villeMatch[1] || "";

    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 0) data.nom = lines[0].substring(0, 50);

    return data;
  };

  const handleAnalyze = async () => {
    if (!newBienText.trim()) return;
    setAnalysisError(null);
    let apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) apiKey = apiKey.trim().replace(/^["']|["']$/g, '');
    
    if (!apiKey || apiKey.includes("INSÉRER")) {
      setParsedData({...parseAdTextHeuristic(newBienText), id: Date.now()});
      setIsAnalyzing(false);
      return;
    }

    setIsAnalyzing(true);
    try {
      const prompt = `Tu es un expert en immobilier. Analyse l'annonce suivante et extrait les informations techniques avec précision.
      Retourne UNIQUEMENT un objet JSON pur (pas de texte, pas de blabla) respectant ce format :
      {
        "nom": "Titre accrocheur",
        "agence": "Nom de l'agence immobilière",
        "ville": "Ville",
        "prix": nombre,
        "surface": nombre,
        "dpe": "A-G",
        "chambres": nombre,
        "sdb": nombre,
        "terrain": nombre (m2),
        "annee": "année ou inconnu",
        "stationnement": "Garage/Carport/Parking/Aucun",
        "travaux": "Non/Rafraîchissement/Important",
        "notes": "Résumé rapide des points forts"
      }

      Annonce à analyser :
      ${newBienText}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(`${result.error.message}`);
      }

      if (!result.candidates || !result.candidates[0]) {
        throw new Error("L'IA n'a pas renvoyé de réponse");
      }

      let aiText = result.candidates[0].content.parts[0].text;
      
      const start = aiText.indexOf('{');
      const end = aiText.lastIndexOf('}');
      
      if (start === -1 || end === -1) {
        throw new Error("Réponse IA non structurée en JSON");
      }
      
      const jsonStr = aiText.substring(start, end + 1);
      const aiData = JSON.parse(jsonStr);
      
      setParsedData({
        ...aiData,
        id: Date.now(),
        visite: false,
        abandonne: false,
        url: "",
        maps: "",
        customValues: {}
      });
    } catch (err) {
      setAnalysisError(err.message || "Erreur inconnue");
      setParsedData({...parseAdTextHeuristic(newBienText), id: Date.now()});
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addBien = () => {
    const updated = [parsedData, ...biens];
    setBiens(updated);
    setExpandedBiens(prev => ({ ...prev, [parsedData.id]: true }));
    saveAll(updated);
    setIsAddModalOpen(false);
    setParsedData(null);
    setNewBienText('');
    setAddMode(null);
  };

  const startManualAdd = () => {
    setParsedData({
      id: Date.now(),
      nom: "",
      agence: "",
      ville: "",
      prix: 0,
      surface: 0,
      chambres: 0,
      terrain: 0,
      dpe: "-",
      stationnement: "",
      travaux: "Non",
      annee: "",
      visite: false,
      abandonne: false,
      contact: false,
      visitePrevue: false,
      url: "",
      maps: "",
      customValues: {}
    });
    setAddMode('manual');
  };

  const updateBien = (id, field, value) => {
    const updated = biens.map(b => {
      if (b.id === id) {
        if (field.startsWith('custom_')) {
          return { ...b, customValues: { ...b.customValues, [field]: value } };
        }
        return { ...b, [field]: value };
      }
      return b;
    });
    setBiens(updated);
    saveAll(updated);
  };

  const deleteBien = (id) => {
    if (!confirm("Supprimer ce bien ?")) return;
    const updated = biens.filter(b => b.id !== id);
    setBiens(updated);
    saveAll(updated);
  };

  const addColumn = () => {
    const id = `custom_${Date.now()}`;
    const updated = [...customColumns, { id, label: newColumnName }];
    const updatedOrder = [...columnOrder, id];
    setCustomColumns(updated);
    setColumnOrder(updatedOrder);
    saveAll(null, updated, updatedOrder);
    setNewColumnName('');
    setIsColumnModalOpen(false);
  };

  const deleteColumn = (id) => {
    if (!confirm("Supprimer cette colonne et toutes ses données ?")) return;
    const updatedCols = customColumns.filter(c => c.id !== id);
    const updatedOrder = columnOrder.filter(cid => cid !== id);
    const updatedBiens = biens.map(b => {
      const newCustom = { ...b.customValues };
      delete newCustom[id];
      return { ...b, customValues: newCustom };
    });
    setCustomColumns(updatedCols);
    setColumnOrder(updatedOrder);
    setBiens(updatedBiens);
    saveAll(updatedBiens, updatedCols, updatedOrder);
  };

  const promptEditUrl = (bien, type) => {
    const fieldName = type === 'maps' ? 'maps' : 'url';
    const label = type === 'maps' ? 'lien Google Maps' : "lien de l'annonce";
    const currentValue = bien[fieldName] || '';
    const newValue = prompt(`Saisir ou modifier le ${label} :`, currentValue);
    if (newValue !== null) {
      updateBien(bien.id, fieldName, newValue);
    }
  };

  const renderTableSection = (list, isArchive = false) => {
    return (
      <div className={`rounded-[2.5rem] shadow-xl shadow-slate-200/50 border overflow-hidden transition-all duration-300 ${
        isArchive 
          ? 'bg-slate-50/40 border-slate-200 opacity-90 hover:opacity-100' 
          : 'bg-white border-slate-300'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-slate-50/80 border-b border-slate-300">
              <tr>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center w-28">
                  <button 
                    onClick={() => requestSort('note')}
                    className={`flex items-center justify-center gap-1 mx-auto font-black hover:text-slate-700 transition-colors cursor-pointer ${sortConfig.key === 'note' ? 'text-brand-primary' : ''}`}
                  >
                    <span>Note</span>
                    {sortConfig.key === 'note' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    )}
                  </button>
                </th>

                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center w-[160px]">
                  <span>Suivi / Étapes</span>
                </th>

                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-left min-w-[280px]">
                  <button 
                    onClick={() => requestSort('nom')}
                    className={`flex items-center gap-1 font-black hover:text-slate-700 transition-colors cursor-pointer ${sortConfig.key === 'nom' ? 'text-brand-primary' : ''}`}
                  >
                    <span>Bien / Nom & Liens</span>
                    {sortConfig.key === 'nom' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    )}
                  </button>
                </th>

                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-left w-44">
                  <button 
                    onClick={() => requestSort('ville')}
                    className={`flex items-center gap-1 font-black hover:text-slate-700 transition-colors cursor-pointer ${sortConfig.key === 'ville' ? 'text-brand-primary' : ''}`}
                  >
                    <span>Ville</span>
                    {sortConfig.key === 'ville' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    )}
                  </button>
                </th>

                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right w-28">
                  <button 
                    onClick={() => requestSort('surface')}
                    className={`flex items-center justify-end gap-1 w-full font-black hover:text-slate-700 transition-colors cursor-pointer ${sortConfig.key === 'surface' ? 'text-brand-primary' : ''}`}
                  >
                    <span>Surface</span>
                    {sortConfig.key === 'surface' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    )}
                  </button>
                </th>

                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right w-36">
                  <button 
                    onClick={() => requestSort('prix')}
                    className={`flex items-center justify-end gap-1 w-full font-black hover:text-slate-700 transition-colors cursor-pointer ${sortConfig.key === 'prix' ? 'text-brand-primary' : ''}`}
                  >
                    <span>Prix</span>
                    {sortConfig.key === 'prix' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    )}
                  </button>
                </th>

                <th className="px-3 py-3 w-24 text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Détails</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-0">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                        <Search size={48} />
                      </div>
                      <p className="font-black uppercase text-[10px] tracking-widest">
                        {isArchive ? "Aucun bien écarté" : "Aucun bien enregistré"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : list.map(bien => {
                const isExpanded = expandedBiens[bien.id] ?? false;
                const prixM2 = bien.surface > 0 ? Math.round(bien.prix / bien.surface) : 0;
                const borderClass = isArchive 
                  ? 'border-b-2 border-slate-200/80' 
                  : 'border-b-2 border-slate-300';
                
                return (
                  <React.Fragment key={bien.id}>
                    <tr className={`transition-colors duration-200 border-l-4 ${
                      bien.abandonne 
                        ? 'border-l-rose-500 bg-rose-50/10 hover:bg-rose-50/20' 
                        : isExpanded 
                          ? 'border-l-brand-primary bg-indigo-50/5 hover:bg-indigo-50/10' 
                          : 'border-l-transparent hover:bg-slate-50/50'
                    } ${isExpanded ? 'border-b border-slate-100/50' : borderClass}`}>
                      <td className="px-3 py-3.5 text-center align-middle">
                        <div className="flex items-center justify-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              onClick={() => updateBien(bien.id, 'note', bien.note === star ? 0 : star)}
                              className="focus:outline-none hover:scale-120 active:scale-90 transition-transform cursor-pointer"
                            >
                              <Star 
                                size={14} 
                                className={`transition-colors duration-150 ${
                                  (bien.note || 0) >= star 
                                    ? "fill-amber-400 text-amber-400" 
                                    : "text-slate-200 hover:text-amber-200"
                                }`} 
                              />
                            </button>
                          ))}
                        </div>
                      </td>

                      <td className="px-3 py-3.5 text-center align-middle">
                        <div className="flex items-center justify-center gap-1.5 bg-slate-100/80 p-1 rounded-xl w-fit mx-auto border border-slate-200">
                          <button 
                            onClick={() => updateBien(bien.id, 'contact', !bien.contact)}
                            title="1er Contact"
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                              bien.contact 
                                ? 'bg-amber-500 text-white shadow-sm font-black scale-105' 
                                : 'text-slate-400 hover:bg-amber-50 hover:text-amber-600'
                            }`}
                          >
                            <Phone size={13} />
                          </button>
                          
                          <button 
                            onClick={() => updateBien(bien.id, 'visitePrevue', !bien.visitePrevue)}
                            title="Visite prévue"
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                              bien.visitePrevue 
                                ? 'bg-indigo-500 text-white shadow-sm font-black scale-105' 
                                : 'text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'
                            }`}
                          >
                            <Calendar size={13} />
                          </button>

                          <button 
                            onClick={() => updateBien(bien.id, 'visite', !bien.visite)}
                            title="Visité"
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                              bien.visite 
                                ? 'bg-emerald-500 text-white shadow-sm font-black scale-105' 
                                : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                            }`}
                          >
                            <Check size={13} />
                          </button>

                          <button 
                            onClick={() => updateBien(bien.id, 'abandonne', !bien.abandonne)}
                            title="Abandonné"
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                              bien.abandonne 
                                ? 'bg-rose-500 text-white shadow-sm font-black scale-105' 
                                : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'
                            }`}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex flex-col space-y-1 w-full">
                          <input 
                            className="bg-transparent border border-transparent hover:border-slate-300 focus:border-brand-primary focus:bg-white rounded-lg px-2 py-1 font-bold text-slate-800 text-xs focus:ring-0 w-full transition-all outline-none"
                            value={bien.nom}
                            onChange={(e) => updateBien(bien.id, 'nom', e.target.value)}
                            placeholder="Nom du bien..."
                          />
                          <div className="flex items-center gap-2 pl-2">
                            {bien.url ? (
                              <div className="flex items-center bg-sky-50 border border-sky-100 rounded-lg pr-1">
                                <a 
                                  href={bien.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-black text-sky-600 hover:text-sky-800 transition-colors"
                                >
                                  <ExternalLink size={10} /> ANNONCE
                                </a>
                                <button 
                                  onClick={() => promptEditUrl(bien, 'url')}
                                  title="Modifier le lien de l'annonce"
                                  className="p-1 text-sky-400 hover:text-sky-700 transition-colors cursor-pointer"
                                >
                                  <Edit2 size={8} />
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => promptEditUrl(bien, 'url')}
                                className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-500 rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                              >
                                <Plus size={8} /> ANNONCE
                              </button>
                            )}

                            {bien.maps ? (
                              <div className="flex items-center bg-emerald-50 border border-emerald-100 rounded-lg pr-1">
                                <a 
                                  href={bien.maps} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-black text-emerald-600 hover:text-emerald-800 transition-colors"
                                >
                                  <MapIcon size={10} /> GOOGLE MAPS
                                </a>
                                <button 
                                  onClick={() => promptEditUrl(bien, 'maps')}
                                  title="Modifier le lien Google Maps"
                                  className="p-1 text-emerald-400 hover:text-emerald-700 transition-colors cursor-pointer"
                                >
                                  <Edit2 size={8} />
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => promptEditUrl(bien, 'maps')}
                                className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-500 rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                              >
                                <Plus size={8} /> GOOGLE MAPS
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3.5 align-middle">
                        <div className="flex items-center gap-1 text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 focus-within:border-brand-primary focus-within:bg-white transition-all">
                          <MapPin size={11} className="text-slate-400 shrink-0" />
                          <input 
                            className="bg-transparent border-none p-0 font-bold text-xs focus:ring-0 w-full outline-none text-slate-700"
                            value={bien.ville}
                            onChange={(e) => updateBien(bien.id, 'ville', e.target.value)}
                            placeholder="Ville..."
                          />
                        </div>
                      </td>

                      <td className="px-3 py-3.5 align-middle text-right">
                        <div className="flex items-center justify-end gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 focus-within:border-brand-primary focus-within:bg-white transition-all w-[90px] ml-auto">
                          <input 
                            type="number"
                            className="bg-transparent border-none p-0 font-black text-xs text-right focus:ring-0 w-full outline-none text-slate-800"
                            value={bien.surface || ''}
                            onChange={(e) => updateBien(bien.id, 'surface', Number(e.target.value))}
                            placeholder="0"
                          />
                          <span className="text-slate-400 font-extrabold text-[9px] select-none">m²</span>
                        </div>
                      </td>

                      <td className="px-3 py-3.5 align-middle text-right">
                        <div className="flex flex-col justify-center items-end space-y-0.5">
                          <div className="flex items-center justify-end gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 focus-within:border-brand-primary focus-within:bg-white transition-all w-28 ml-auto">
                            <input 
                              type="number"
                              className="bg-transparent border-none p-0 font-black text-xs text-right focus:ring-0 w-full outline-none text-slate-900"
                              value={bien.prix || ''}
                              onChange={(e) => updateBien(bien.id, 'prix', Number(e.target.value))}
                              placeholder="0"
                            />
                            <span className="text-slate-400 font-extrabold text-[9px] select-none">€</span>
                          </div>
                          {prixM2 > 0 && (
                            <span className="text-[10px] font-black text-slate-400 pr-1 tracking-tight">
                              {prixM2.toLocaleString()} €/m²
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3.5 align-middle text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => toggleExpand(bien.id)}
                            title={isExpanded ? "Masquer les détails" : "Afficher les détails"}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${isExpanded ? 'bg-indigo-50 border-indigo-200 text-brand-primary' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                          >
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                          
                          <button 
                            onClick={() => deleteBien(bien.id)}
                            title="Supprimer ce bien"
                            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-300 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <tr className={borderClass}>
                          <td colSpan={7} className="px-4 py-0 border-t-0 align-top bg-slate-50/20">
                            <motion.div 
                              initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="py-3"
                            >
                              <div className="bg-white rounded-3xl border border-slate-300 shadow-md p-5 grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
                                <div className="absolute top-4 right-4 bg-slate-50 px-2 py-0.5 rounded-md text-[8px] font-black text-slate-400 uppercase tracking-widest border border-slate-200 pointer-events-none select-none">
                                  ID: {bien.id}
                                </div>

                                <div className="space-y-4">
                                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                    <Info size={14} className="text-brand-primary" /> Caractéristiques techniques
                                  </h4>
                                  
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Agence Immobilière</label>
                                      <input 
                                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-brand-primary focus:bg-white rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none transition-all"
                                        value={bien.agence || ''}
                                        placeholder="Nom de l'agence..."
                                        onChange={(e) => updateBien(bien.id, 'agence', e.target.value)}
                                      />
                                    </div>
                                    
                                    <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Chambres</label>
                                      <input 
                                        type="number"
                                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-brand-primary focus:bg-white rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none text-center transition-all"
                                        value={bien.chambres || ''}
                                        placeholder="-"
                                        onChange={(e) => updateBien(bien.id, 'chambres', Number(e.target.value))}
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Jardin / Terrain</label>
                                      <div className="relative">
                                        <input 
                                          type="number"
                                          className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-brand-primary focus:bg-white rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none text-center transition-all"
                                          value={bien.terrain || ''}
                                          placeholder="-"
                                          onChange={(e) => updateBien(bien.id, 'terrain', Number(e.target.value))}
                                        />
                                        {bien.terrain > 0 && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold">m²</span>}
                                      </div>
                                    </div>

                                    <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Classe Énergie (DPE)</label>
                                      <select 
                                        className={`w-full border rounded-lg px-2 py-1.5 text-xs font-black text-center outline-none cursor-pointer transition-all ${
                                          bien.dpe === 'A' || bien.dpe === 'B' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                                          bien.dpe === 'C' || bien.dpe === 'D' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                                          bien.dpe === '-' ? 'bg-slate-50 border-slate-200 text-slate-400' :
                                          'bg-rose-50 border-rose-200 text-rose-600'
                                        }`}
                                        value={bien.dpe || '-'}
                                        onChange={(e) => updateBien(bien.id, 'dpe', e.target.value)}
                                      >
                                        <option value="-">-</option>
                                        {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(grade => (
                                          <option key={grade} value={grade}>{grade}</option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">État / Travaux</label>
                                      <select 
                                        className={`w-full border rounded-lg px-2 py-1.5 text-xs font-black text-center outline-none cursor-pointer transition-all ${
                                          bien.travaux === 'Non' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                                          bien.travaux === 'Rafraîchissement' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                                          'bg-rose-50 border-rose-200 text-rose-600'
                                        }`}
                                        value={bien.travaux || 'Non'}
                                        onChange={(e) => updateBien(bien.id, 'travaux', e.target.value)}
                                      >
                                        <option value="Non">Non</option>
                                        <option value="Rafraîchissement">Raf.</option>
                                        <option value="Important">Imp.</option>
                                      </select>
                                    </div>

                                    <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Stationnement</label>
                                      <input 
                                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-brand-primary focus:bg-white rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none transition-all"
                                        value={bien.stationnement || ''}
                                        placeholder="ex: Garage"
                                        onChange={(e) => updateBien(bien.id, 'stationnement', e.target.value)}
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Année</label>
                                      <input 
                                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-brand-primary focus:bg-white rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none text-center transition-all"
                                        value={bien.annee || ''}
                                        placeholder="-"
                                        onChange={(e) => updateBien(bien.id, 'annee', e.target.value)}
                                      />
                                    </div>
                                  </div>

                                  {customColumns.filter(c => c.id !== 'custom_1778169397374' && c.id !== 'custom_1778177173176').map(col => (
                                    <div key={col.id} className="mt-3">
                                      <div className="flex justify-between items-center mb-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{col.label}</label>
                                        <button 
                                          onClick={() => deleteColumn(col.id)}
                                          className="text-rose-400 hover:text-rose-600 text-[8px] font-bold uppercase transition-all cursor-pointer"
                                        >
                                          Suppr.
                                        </button>
                                      </div>
                                      <input 
                                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-brand-primary focus:bg-white rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none transition-all"
                                        value={bien.customValues?.[col.id] || ''}
                                        onChange={(e) => updateBien(bien.id, col.id, e.target.value)}
                                        placeholder="..."
                                      />
                                    </div>
                                  ))}
                                </div>

                                <div className="flex flex-col space-y-3 h-full lg:border-l lg:border-slate-100 lg:pl-6">
                                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                    <Clipboard size={14} className="text-amber-500" /> Suivi & Commentaires
                                  </h4>
                                  
                                  <div className="flex-1 flex flex-col space-y-3 min-h-[140px]">
                                    <div className="flex-1 flex flex-col">
                                      <textarea 
                                        className="flex-1 w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-brand-primary focus:bg-white rounded-xl p-3 text-xs font-bold text-slate-700 outline-none resize-none transition-all shadow-inner leading-relaxed"
                                        value={bien.customValues?.['custom_1778169397374'] || ''}
                                        onChange={(e) => updateBien(bien.id, 'custom_1778169397374', e.target.value)}
                                        placeholder="Votre commentaire sur ce bien (ex: Travaux à prévoir, négociation possible, quartier calme, état de l'électricité...)"
                                      />
                                    </div>
                                    
                                    {bien.notes && (
                                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500 leading-relaxed font-semibold max-h-[160px] overflow-y-auto">
                                        <span className="font-black text-[9px] uppercase tracking-wider text-slate-400 block mb-1">Résumé IA / Annonce</span>
                                        {bien.notes}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col space-y-3 h-full lg:border-l lg:border-slate-100 lg:pl-6">
                                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                    <Phone size={14} className="text-emerald-500" /> Contact & Démarches
                                  </h4>
                                  
                                  <div className="flex-grow flex flex-col min-h-[140px]">
                                    <textarea 
                                      className="flex-grow w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-brand-primary focus:bg-white rounded-xl p-3 text-xs font-bold text-slate-700 outline-none resize-none transition-all shadow-inner leading-relaxed"
                                      value={bien.customValues?.['custom_1778177173176'] || ''}
                                      onChange={(e) => updateBien(bien.id, 'custom_1778177173176', e.target.value)}
                                      placeholder="Coordonnées (nom, tél, mail), détails de l'agent immobilier, historique des relances..."
                                    />
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-0 min-w-0 p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto pb-20 md:pb-8">
      <header className="flex flex-wrap gap-3 justify-between items-start">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Recherche de Biens</h2>
          <p className="text-xs md:text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Organisation et suivi des annonces</p>
        </div>
        <div className="flex gap-2 md:gap-3 flex-wrap">
          {biens.length > 0 && (
            <button
              onClick={toggleAllExpanded}
              className={`px-3 md:px-4 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-1.5 border transition-all cursor-pointer ${
                areAllExpanded 
                  ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100' 
                  : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              {areAllExpanded ? (
                <><ChevronUp size={14} /> Tout réduire</>
              ) : (
                <><ChevronDown size={14} /> Tout déplier</>
              )}
            </button>
          )}
          <button
            onClick={() => setIsColumnModalOpen(true)}
            className="px-3 md:px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase flex items-center gap-1.5 hover:bg-slate-200 transition-all cursor-pointer"
          >
            <Columns size={14} /> <span className="hidden sm:inline">Ajouter </span>Colonne
          </button>
          <button
            onClick={() => {
              setAddMode('ai');
              setParsedData(null);
              setNewBienText('');
              setIsAddModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2 px-4 md:px-6 cursor-pointer"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Ajouter un </span>bien
          </button>
        </div>
      </header>

      {/* SECTION DES BIENS ACTIFS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            En cours de recherche ({actifs.length})
          </h3>
        </div>
        {renderTableSection(actifs, false)}
      </div>

      {/* SECTION DES BIENS ABANDONNÉS */}
      {abandonnes.length > 0 && (
        <div className="space-y-4 pt-10 border-t border-slate-200 mt-12">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
              Biens écartés / Archives ({abandonnes.length})
            </h3>
          </div>
          {renderTableSection(abandonnes, true)}
        </div>
      )}

      {/* MODALES */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-3xl rounded-[3rem] p-8 shadow-2xl border border-slate-300 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Ajouter un bien</h3>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all cursor-pointer"><X size={20} /></button>
              </div>

              <div className="space-y-6">
                {addMode === 'ai' && !parsedData && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex flex-col">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Importer via IA</label>
                        <p className="text-[9px] text-slate-400 font-medium">Collez le texte de l'annonce pour extraire les données</p>
                      </div>
                      <button 
                        onClick={startManualAdd}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all text-[9px] font-black uppercase tracking-wider cursor-pointer"
                      >
                        <Plus size={12} /> Saisie Manuelle
                      </button>
                    </div>
                    
                    <textarea 
                      autoFocus
                      className="w-full h-48 bg-slate-50 border border-slate-400 rounded-2xl p-4 text-sm font-medium text-slate-700 outline-none focus:border-brand-primary transition-all resize-none shadow-inner"
                      placeholder="Collez le texte de l'annonce ici (Le Bon Coin, SeLoger, etc.)..."
                      value={newBienText}
                      onChange={(e) => setNewBienText(e.target.value)}
                    />

                    <div className="flex justify-end">
                      <button 
                        onClick={handleAnalyze}
                        disabled={!newBienText.trim() || isAnalyzing}
                        className="bg-slate-900 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10 cursor-pointer"
                      >
                        {isAnalyzing ? <><Loader2 size={14} className="animate-spin" /> Analyse en cours...</> : <><Search size={14} /> Analyser l'annonce</>}
                      </button>
                    </div>
                  </div>
                )}

                {analysisError && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-[10px] font-black uppercase">
                    <AlertCircle size={14} /> {analysisError}
                  </div>
                )}

                {parsedData && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-emerald-50/50 border border-emerald-300 rounded-3xl space-y-6">
                    <div className="flex items-center gap-2 text-emerald-700 font-black text-[10px] uppercase tracking-widest">
                      <Check size={14} /> Informations extraites (Vérifiez et modifiez si besoin)
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="col-span-2">
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Nom du bien</p>
                        <input className="w-full bg-white border border-emerald-300 rounded-xl p-2 text-sm font-bold text-slate-800 outline-none focus:border-brand-primary" value={parsedData.nom} onChange={(e) => setParsedData({...parsedData, nom: e.target.value})} />
                      </div>
                      <div className="col-span-2">
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Agence</p>
                        <input className="w-full bg-white border border-emerald-300 rounded-xl p-2 text-sm font-bold text-slate-800 outline-none focus:border-brand-primary" value={parsedData.agence} onChange={(e) => setParsedData({...parsedData, agence: e.target.value})} />
                      </div>
                      <div className="col-span-2">
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Ville</p>
                        <input className="w-full bg-white border border-emerald-300 rounded-xl p-2 text-sm font-bold text-slate-800 outline-none focus:border-brand-primary" value={parsedData.ville} onChange={(e) => setParsedData({...parsedData, ville: e.target.value})} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Prix (€)</p>
                        <input type="number" className="w-full bg-white border border-emerald-300 rounded-xl p-2 text-sm font-bold text-slate-800 outline-none focus:border-brand-primary" value={parsedData.prix} onChange={(e) => setParsedData({...parsedData, prix: Number(e.target.value)})} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Surface (m²)</p>
                        <input type="number" className="w-full bg-white border border-emerald-300 rounded-xl p-2 text-sm font-bold text-slate-800 outline-none focus:border-brand-primary" value={parsedData.surface} onChange={(e) => setParsedData({...parsedData, surface: Number(e.target.value)})} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Chambres</p>
                        <input type="number" className="w-full bg-white border border-emerald-300 rounded-xl p-2 text-sm font-bold text-slate-800 outline-none focus:border-brand-primary" value={parsedData.chambres} onChange={(e) => setParsedData({...parsedData, chambres: Number(e.target.value)})} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Terrain (m²)</p>
                        <input type="number" className="w-full bg-white border border-emerald-300 rounded-xl p-2 text-sm font-bold text-slate-800 outline-none focus:border-brand-primary" value={parsedData.terrain} onChange={(e) => setParsedData({...parsedData, terrain: Number(e.target.value)})} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">DPE</p>
                        <select 
                          className="w-full bg-white border border-emerald-300 rounded-xl p-2 text-sm font-bold text-slate-800 uppercase text-center appearance-none outline-none focus:border-brand-primary cursor-pointer" 
                          value={parsedData.dpe} 
                          onChange={(e) => setParsedData({...parsedData, dpe: e.target.value})}
                        >
                          <option value="-">-</option>
                          {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(grade => (
                            <option key={grade} value={grade}>{grade}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Stationnement</p>
                        <input className="w-full bg-white border border-emerald-300 rounded-xl p-2 text-sm font-bold text-slate-800 outline-none focus:border-brand-primary" value={parsedData.stationnement} onChange={(e) => setParsedData({...parsedData, stationnement: e.target.value})} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Travaux</p>
                        <select className="w-full bg-white border border-emerald-300 rounded-xl p-2 text-sm font-bold text-slate-800 outline-none focus:border-brand-primary cursor-pointer" value={parsedData.travaux} onChange={(e) => setParsedData({...parsedData, travaux: e.target.value})}>
                          <option value="Non">Non</option>
                          <option value="Rafraîchissement">Rafraîchissement</option>
                          <option value="Important">Important</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Année</p>
                        <input className="w-full bg-white border border-emerald-300 rounded-xl p-2 text-sm font-bold text-slate-800 outline-none focus:border-brand-primary" value={parsedData.annee} onChange={(e) => setParsedData({...parsedData, annee: e.target.value})} />
                      </div>
                    </div>
                    
                    <button onClick={addBien} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 cursor-pointer">
                      Ajouter ce bien au tableau
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {isColumnModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsColumnModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl border border-slate-300"
            >
              <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">Ajouter une colonne personnalisée</h3>
              <div className="space-y-4">
                <input 
                  autoFocus
                  className="input-field"
                  placeholder="Nom de la colonne (ex: Garage, État...)"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addColumn()}
                />
                <button onClick={addColumn} className="w-full btn-primary cursor-pointer">AJOUTER</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BienPage;
