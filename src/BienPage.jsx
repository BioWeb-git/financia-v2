import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, MapPin, Euro, Maximize2, Clipboard, 
  Trash2, ExternalLink, CheckCircle2, Circle, Check, Star,
  Columns, X, Save, AlertCircle, Loader2, Map as MapIcon, ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BienPage = () => {
  const [biens, setBiens] = useState([]);
  const [customColumns, setCustomColumns] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [newBienText, setNewBienText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [newColumnName, setNewColumnName] = useState('');

  // Fetch data on mount
  useEffect(() => {
    fetchBiens();
  }, []);

  const fetchBiens = async () => {
    try {
      const res = await fetch('/api/biens');
      const data = await res.json();
      setBiens(data.biens || []);
      setCustomColumns(data.customColumns || []);
    } catch (err) {
      console.error("Erreur chargement biens:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAll = async (updatedBiens, updatedCols) => {
    try {
      await fetch('/api/biens/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          biens: updatedBiens || biens, 
          customColumns: updatedCols || customColumns 
        })
      });
    } catch (err) {
      console.error("Erreur sauvegarde:", err);
    }
  };

  // Heuristic Parser (Fallback)
  const parseAdTextHeuristic = (text) => {
    const data = {
      nom: "Nouveau Bien",
      ville: "",
      prix: 0,
      surface: 0,
      dpe: "-",
      visite: false,
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
    
    console.log("Tentative d'analyse avec Gemini...");
    
    if (!apiKey || apiKey.includes("INSÉRER")) {
      console.warn("Clé VITE_GEMINI_API_KEY manquante ou invalide dans .env.local");
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
        throw new Error(`${result.error.message} (Status: ${result.error.status}, Code: ${result.error.code})`);
      }

      if (!result.candidates || !result.candidates[0]) {
        throw new Error("L'IA n'a pas renvoyé de réponse (Censuré ou vide)");
      }

      let aiText = result.candidates[0].content.parts[0].text;
      console.log("RÉPONSE BRUTE IA:", aiText);
      
      // Nettoyage ultra-robuste du JSON
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
        url: "",
        maps: "",
        customValues: {}
      });
    } catch (err) {
      console.error("ERREUR IA DÉTAILLÉE:", err);
      setAnalysisError(err.message || "Erreur inconnue");
      setParsedData({...parseAdTextHeuristic(newBienText), id: Date.now()});
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addBien = () => {
    const updated = [parsedData, ...biens];
    setBiens(updated);
    saveAll(updated);
    setIsAddModalOpen(false);
    setParsedData(null);
    setNewBienText('');
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
    if (!newColumnName.trim()) return;
    const id = `custom_${Date.now()}`;
    const updated = [...customColumns, { id, label: newColumnName }];
    setCustomColumns(updated);
    saveAll(null, updated);
    setNewColumnName('');
    setIsColumnModalOpen(false);
  };

  const deleteColumn = (id) => {
    if (!confirm("Supprimer cette colonne et toutes ses données ?")) return;
    const updatedCols = customColumns.filter(c => c.id !== id);
    const updatedBiens = biens.map(b => {
      const newCustom = { ...b.customValues };
      delete newCustom[id];
      return { ...b, customValues: newCustom };
    });
    setCustomColumns(updatedCols);
    setBiens(updatedBiens);
    saveAll(updatedBiens, updatedCols);
  };

  const moveColumn = (id, direction) => {
    const index = customColumns.findIndex(c => c.id === id);
    if (index < 0) return;
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === customColumns.length - 1) return;

    const updatedCols = [...customColumns];
    const temp = updatedCols[index];
    updatedCols[index] = updatedCols[index + direction];
    updatedCols[index + direction] = temp;

    setCustomColumns(updatedCols);
    saveAll(null, updatedCols);
  };

  const getDpeColor = (dpe) => {
    const colors = {
      'A': 'bg-emerald-600',
      'B': 'bg-emerald-500',
      'C': 'bg-yellow-400',
      'D': 'bg-yellow-500',
      'E': 'bg-orange-500',
      'F': 'bg-red-500',
      'G': 'bg-red-700'
    };
    return colors[dpe] || 'bg-slate-300';
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Recherche de Biens</h2>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Organisation et suivi des annonces</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsColumnModalOpen(true)}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-slate-200 transition-all"
          >
            <Columns size={14} /> Gérer Colonnes
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary flex items-center gap-2 px-6"
          >
            <Plus size={18} /> Ajouter un bien
          </button>
        </div>
      </header>

      {/* Tableau principal */}
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">Visité</th>
                <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Note</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[180px]">Bien / Nom</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Agence</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Ville</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Prix</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Surface</th>
                <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Chambres</th>
                <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Terrain</th>
                <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">DPE</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Stationnement</th>
                <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Travaux</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Prix/m²</th>
                <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Liens</th>
                {customColumns.map((col, index) => (
                  <th key={col.id} className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest group/col relative min-w-[120px]">
                    <div className="flex items-center gap-1.5">
                      {index > 0 && (
                        <button onClick={() => moveColumn(col.id, -1)} className="opacity-0 group-hover/col:opacity-100 hover:text-brand-primary transition-opacity bg-slate-100 rounded p-0.5"><ChevronLeft size={10} /></button>
                      )}
                      <span>{col.label}</span>
                      {index < customColumns.length - 1 && (
                        <button onClick={() => moveColumn(col.id, 1)} className="opacity-0 group-hover/col:opacity-100 hover:text-brand-primary transition-opacity bg-slate-100 rounded p-0.5"><ChevronRight size={10} /></button>
                      )}
                    </div>
                    <button onClick={() => deleteColumn(col.id)} className="absolute top-1/2 -translate-y-1/2 right-2 opacity-0 group-hover/col:opacity-100 text-rose-400 hover:text-rose-600 transition-opacity bg-rose-50 rounded p-1">
                      <Trash2 size={10} />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {biens.length === 0 ? (
                <tr>
                  <td colSpan={13 + customColumns.length} className="px-6 py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                        <Search size={48} />
                      </div>
                      <p className="font-black uppercase text-[10px] tracking-widest">Aucun bien enregistré</p>
                    </div>
                  </td>
                </tr>
              ) : biens.map(bien => (
                <tr key={bien.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-4 py-4 text-center">
                    <button 
                      onClick={() => updateBien(bien.id, 'visite', !bien.visite)}
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${bien.visite ? 'bg-emerald-500 text-white border-2 border-emerald-500 shadow-md scale-110' : 'bg-slate-50 border-2 border-slate-300 text-transparent hover:border-emerald-400 hover:bg-emerald-50'}`}
                    >
                      <Check size={14} className={bien.visite ? 'opacity-100' : 'opacity-0'} />
                    </button>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => updateBien(bien.id, 'note', bien.note === star ? 0 : star)}
                          className="focus:outline-none hover:scale-110 transition-transform"
                        >
                          <Star 
                            size={14} 
                            className={`transition-colors ${
                              (bien.note || 0) >= star 
                                ? "fill-amber-400 text-amber-400" 
                                : "text-slate-200 hover:text-amber-200"
                            }`} 
                          />
                        </button>
                      ))}
                    </div>
                  </td>
                  
                  <td className="px-4 py-4">
                    <input 
                      className="bg-transparent border-none p-0 font-black text-slate-800 text-sm focus:ring-0 w-full"
                      value={bien.nom}
                      onChange={(e) => updateBien(bien.id, 'nom', e.target.value)}
                    />
                    <input 
                      placeholder="Lien de l'annonce..."
                      className="bg-transparent border-none p-0 text-[10px] font-bold text-slate-400 focus:ring-0 w-full mt-0.5"
                      value={bien.url}
                      onChange={(e) => updateBien(bien.id, 'url', e.target.value)}
                    />
                  </td>

                  <td className="px-4 py-4">
                    <input 
                      className="bg-transparent border-none p-0 font-bold text-slate-500 text-xs focus:ring-0 w-full"
                      value={bien.agence || ''}
                      placeholder="Agence..."
                      onChange={(e) => updateBien(bien.id, 'agence', e.target.value)}
                    />
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <MapPin size={12} className="text-slate-300" />
                      <input 
                        className="bg-transparent border-none p-0 font-bold text-sm focus:ring-0 w-full"
                        value={bien.ville}
                        onChange={(e) => updateBien(bien.id, 'ville', e.target.value)}
                      />
                    </div>
                  </td>

                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input 
                        type="number"
                        className="bg-transparent border-none p-0 font-black text-slate-900 text-sm focus:ring-0 w-20 text-right"
                        value={bien.prix}
                        onChange={(e) => updateBien(bien.id, 'prix', Number(e.target.value))}
                      />
                      <span className="text-slate-400 font-bold text-xs">€</span>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input 
                        type="number"
                        className="bg-transparent border-none p-0 font-black text-slate-900 text-sm focus:ring-0 w-16 text-right"
                        value={bien.surface}
                        onChange={(e) => updateBien(bien.id, 'surface', Number(e.target.value))}
                      />
                      <span className="text-slate-400 font-bold text-xs">m²</span>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-center text-sm font-bold text-slate-700">
                    {bien.chambres || '-'}
                  </td>

                  <td className="px-4 py-4 text-center text-sm font-bold text-slate-700">
                    {bien.terrain ? `${bien.terrain} m²` : '-'}
                  </td>

                  <td className="px-4 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-black ${
                      bien.dpe === 'A' || bien.dpe === 'B' ? 'bg-emerald-100 text-emerald-600' :
                      bien.dpe === 'C' || bien.dpe === 'D' ? 'bg-amber-100 text-amber-600' :
                      'bg-rose-100 text-rose-600'
                    }`}>
                      {bien.dpe}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-[10px] font-bold text-slate-500">
                    {bien.stationnement || '-'}
                  </td>

                  <td className="px-4 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${
                      bien.travaux === 'Non' ? 'text-emerald-500 bg-emerald-50' :
                      bien.travaux === 'Rafraîchissement' ? 'text-amber-500 bg-amber-50' :
                      'text-rose-500 bg-rose-50'
                    }`}>
                      {bien.travaux || '-'}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-xs font-black text-slate-400 text-right">
                    {bien.surface > 0 ? Math.round(bien.prix / bien.surface).toLocaleString() : 0} €
                  </td>

                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => {
                          const url = prompt("Coller le lien Google Maps :", bien.maps || '');
                          if (url !== null) updateBien(bien.id, 'maps', url);
                        }}
                        className={`p-2 rounded-lg transition-all shadow-sm ${bien.maps ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        title="Éditer le lien Maps"
                      >
                        <MapIcon size={14} />
                      </button>
                      
                      {bien.maps && (
                        <a href={bien.maps} target="_blank" rel="noopener noreferrer" className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-sm" title="Ouvrir Google Maps">
                          <ExternalLink size={14} />
                        </a>
                      )}

                      {bien.url && (
                        <a href={bien.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-brand-primary hover:text-white transition-all shadow-sm" title="Ouvrir l'annonce">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </td>

                  {customColumns.map(col => (
                    <td key={col.id} className="px-4 py-4">
                      <input 
                        className="bg-transparent border-none p-0 font-bold text-slate-700 text-sm focus:ring-0 w-full"
                        value={bien.customValues?.[col.id] || ''}
                        onChange={(e) => updateBien(bien.id, col.id, e.target.value)}
                        placeholder="..."
                      />
                    </td>
                  ))}

                  <td className="px-4 py-4 text-center">
                    <button 
                      onClick={() => deleteBien(bien.id)}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALES */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-3xl rounded-[3rem] p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Ajouter un bien</h3>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"><X size={20} /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Annonce (Copier-Coller)</label>
                  <textarea 
                    autoFocus
                    className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-medium text-slate-700 outline-none focus:border-brand-primary transition-all resize-none"
                    placeholder="Collez le texte ici..."
                    value={newBienText}
                    onChange={(e) => setNewBienText(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <button 
                      onClick={handleAnalyze}
                      disabled={!newBienText.trim() || isAnalyzing}
                      className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      {isAnalyzing ? <><Loader2 size={14} className="animate-spin" /> Analyse...</> : <><Search size={14} /> Analyser avec l'IA</>}
                    </button>
                  </div>
                </div>

                {analysisError && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-[10px] font-black uppercase">
                    <AlertCircle size={14} /> {analysisError}
                  </div>
                )}

                {parsedData && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-3xl space-y-6">
                    <div className="flex items-center gap-2 text-emerald-700 font-black text-[10px] uppercase tracking-widest">
                      <Check size={14} /> Informations extraites (Vérifiez et modifiez si besoin)
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="col-span-2">
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Nom du bien</p>
                        <input className="w-full bg-white border border-emerald-100 rounded-xl p-2 text-sm font-bold text-slate-800" value={parsedData.nom} onChange={(e) => setParsedData({...parsedData, nom: e.target.value})} />
                      </div>
                      <div className="col-span-2">
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Agence</p>
                        <input className="w-full bg-white border border-emerald-100 rounded-xl p-2 text-sm font-bold text-slate-800" value={parsedData.agence} onChange={(e) => setParsedData({...parsedData, agence: e.target.value})} />
                      </div>
                      <div className="col-span-2">
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Ville</p>
                        <input className="w-full bg-white border border-emerald-100 rounded-xl p-2 text-sm font-bold text-slate-800" value={parsedData.ville} onChange={(e) => setParsedData({...parsedData, ville: e.target.value})} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Prix (€)</p>
                        <input type="number" className="w-full bg-white border border-emerald-100 rounded-xl p-2 text-sm font-bold text-slate-800" value={parsedData.prix} onChange={(e) => setParsedData({...parsedData, prix: Number(e.target.value)})} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Surface (m²)</p>
                        <input type="number" className="w-full bg-white border border-emerald-100 rounded-xl p-2 text-sm font-bold text-slate-800" value={parsedData.surface} onChange={(e) => setParsedData({...parsedData, surface: Number(e.target.value)})} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Chambres</p>
                        <input type="number" className="w-full bg-white border border-emerald-100 rounded-xl p-2 text-sm font-bold text-slate-800" value={parsedData.chambres} onChange={(e) => setParsedData({...parsedData, chambres: Number(e.target.value)})} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Terrain (m²)</p>
                        <input type="number" className="w-full bg-white border border-emerald-100 rounded-xl p-2 text-sm font-bold text-slate-800" value={parsedData.terrain} onChange={(e) => setParsedData({...parsedData, terrain: Number(e.target.value)})} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">DPE</p>
                        <input className="w-full bg-white border border-emerald-100 rounded-xl p-2 text-sm font-bold text-slate-800 uppercase text-center" value={parsedData.dpe} onChange={(e) => setParsedData({...parsedData, dpe: e.target.value.toUpperCase()})} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Stationnement</p>
                        <input className="w-full bg-white border border-emerald-100 rounded-xl p-2 text-sm font-bold text-slate-800" value={parsedData.stationnement} onChange={(e) => setParsedData({...parsedData, stationnement: e.target.value})} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Travaux</p>
                        <select className="w-full bg-white border border-emerald-100 rounded-xl p-2 text-sm font-bold text-slate-800" value={parsedData.travaux} onChange={(e) => setParsedData({...parsedData, travaux: e.target.value})}>
                          <option value="Non">Non</option>
                          <option value="Rafraîchissement">Rafraîchissement</option>
                          <option value="Important">Important</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase mb-1">Année</p>
                        <input className="w-full bg-white border border-emerald-100 rounded-xl p-2 text-sm font-bold text-slate-800" value={parsedData.annee} onChange={(e) => setParsedData({...parsedData, annee: e.target.value})} />
                      </div>
                    </div>
                    
                    <button onClick={addBien} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
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
              className="relative bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl border border-slate-100"
            >
              <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">Ajouter une colonne</h3>
              <div className="space-y-4">
                <input 
                  autoFocus
                  className="input-field"
                  placeholder="Nom de la colonne (ex: Garage, État...)"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addColumn()}
                />
                <button onClick={addColumn} className="w-full btn-primary">AJOUTER</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BienPage;
