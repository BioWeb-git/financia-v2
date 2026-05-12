# FinancIA - Dashboard v2

Interface moderne de gestion de patrimoine, d'analyse financière comparative et de suivi des annonces immobilières.

## 🚀 Démarrage du projet en local

Pour faire fonctionner l'application complète avec la persistance des données (sauvegarde locale dans les fichiers JSON), deux processus doivent être en cours d'exécution : le serveur frontend (Vite) et le serveur backend de persistance (Node.js).

### Option 1 : Commande combinée (Recommandée)
Lance simultanément le backend et le frontend dans un seul terminal :
```bash
npm run dev:full
```

---

### Option 2 : Commandes séparées
Si vous préférez exécuter les services dans deux terminaux distincts :

1. **Démarrer le backend Node.js** (sur le port 3001) :
   ```bash
   node server.cjs
   ```
   *(ou via la commande de raccourci : `npm run server`)*

2. **Démarrer le frontend React/Vite** (dans un second terminal) :
   ```bash
   npm run dev
   ```

---

## 📂 Architecture des Données

Les données dynamiques de l'application sont stockées et synchronisées dans le dossier `data/` :
- `data/biens.json` : Suivi et organisation des annonces de recherche de biens.
- `data/analyse.json` : Scénarios et simulations d'analyses comparatives.
- `data/scenarios.json` : Configurations globales de financement.
