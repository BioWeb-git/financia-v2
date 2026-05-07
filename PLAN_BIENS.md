# Page Recherche de Biens Immobiliers

Ajouter une nouvelle page dédiée à la recherche et au suivi des biens immobiliers au sein du dashboard existant. L'IA parsera le texte brut collé depuis une annonce pour remplir automatiquement le tableau.

## Points à valider avant implémentation

> **⚠️ Appel API IA** : Pour le parsing du texte d'annonce, deux options :
> - **Option A** : Utiliser l'API Google Gemini — clé à renseigner dans un `.env`
> - **Option B** : Fallback intelligent sans API — un parseur regex/heuristique extrait les infos courantes (prix, surface, ville, DPE, etc.) sans IA externe
>
> **Recommandation** : Implémenter l'Option B d'abord (instantané, pas de config) avec un bouton "Analyser" qui fonctionne offline, et prévoir facilement l'upgrade vers Gemini.

> **ℹ️ Stockage des données** : Les biens seront sauvegardés dans le même `localStorage` + serveur `/api/save` que le reste du dashboard, dans une clé `biens`.

## Questions ouvertes

- Veux-tu que les biens soient liés à un scénario existant (pour comparer directement) ou indépendants ?
- As-tu déjà des colonnes en tête qu'on devrait mettre par défaut dans le tableau (au-delà de ce que l'IA extrait) ?
- Clé Gemini API disponible ou on part sur le parseur heuristique offline ?

## Changements prévus

### Navigation

#### MODIFY — App.jsx
- Ajouter un état `activePage` (`'dashboard'` | `'biens'`)
- Ajouter un bouton `<Search>` dans la sidebar (`w-16 bg-slate-900`) qui switche vers la page biens
- La page existante = page `'dashboard'`, la nouvelle = `'biens'`

---

### Nouveau composant : `BienPage.jsx`

#### NEW — src/BienPage.jsx

**Structure de la page :**

```
┌──────────────────────────────────────────────────────────┐
│  🏠 Recherche de Biens          [+ Ajouter un bien]      │
│  [Gérer les colonnes ▼]                                  │
├──────────────────────────────────────────────────────────┤
│  Tableau des biens avec colonnes :                       │
│  • Nom / Source        (texte + lien annonce)           │
│  • Ville               (auto-parsé)                      │
│  • Prix                (auto-parsé)                      │
│  • Surface             (auto-parsé)                      │
│  • Prix/m²             (calculé automatiquement)         │
│  • DPE                 (auto-parsé, badge coloré)        │
│  • Travaux             (saisie manuelle)                 │
│  • Visité ✓            (checkbox)                        │
│  • Google Maps 🗺       (input URL manuel)               │
│  • Notes               (saisie libre)                    │
│  + colonnes personnalisées ajoutables à la volée         │
└──────────────────────────────────────────────────────────┘
```

**Fonctionnalités :**

1. **Bouton "Ajouter un bien"** → ouvre une modale avec :
   - Zone textarea "Coller le texte de l'annonce ici"
   - Bouton "Analyser" → parsing heuristique intelligent (regex sur prix `XXX XXX €`, surface `XX m²`, ville, DPE `DPE : X`, etc.)
   - Champs pré-remplis modifiables avant validation
   - Champ "Lien annonce" (URL)

2. **Tableau évolutif** :
   - Colonnes fixes : Bien, Ville, Prix, Surface, Prix/m², DPE, Visité, Maps, Notes
   - Colonnes custom : bouton "➕ Colonne" → saisir un nom → ajouté à droite
   - Chaque cellule est éditable inline (click → input)
   - Colonnes custom supprimables

3. **Checkbox "Visité"** : badge vert "Visité ✓" ou gris "À visiter"

4. **Lien Google Maps** : bouton 🗺 ouvre un mini-input pour coller l'URL, puis devient un lien cliquable

5. **Persistance** : sauvegardé dans `localStorage` clé `biens_data` + envoyé avec le reste sur `/api/save`

---

### Parseur heuristique (offline)

Extraction sans API, basée sur regex :
- Prix : `(\d[\d\s]*)\s*€` → nombre avant `€`
- Surface : `(\d+)\s*m[²2]`
- DPE : `DPE\s*:?\s*([A-G])` ou `classe\s+([A-G])`
- Ville : détection après `à `, `Ville :`, ou dans le titre
- Charges : `charges\s*:?\s*(\d+)\s*€`
- Nombre de pièces : `(\d+)\s*(pièces?|p\.)`
- Étage, année de construction, etc.

**Option Gemini (future)** : envoyer le texte à `generativelanguage.googleapis.com` avec un prompt structuré → retourne un JSON propre.

---

## Plan de vérification

### Tests manuels
1. Ajouter un bien en collant un texte d'annonce type SeLoger / LeBonCoin
2. Vérifier que les champs sont bien pré-remplis
3. Éditer une cellule inline
4. Ajouter une colonne personnalisée
5. Cocher "Visité"
6. Ajouter un lien Google Maps
7. Rafraîchir la page → vérifier persistance localStorage
