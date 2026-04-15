# StockAlert API

API de gestion d'alertes de stock pour une boutique en ligne.
Une alerte est automatiquement créée quand le stock d'un produit passe sous son seuil.

## Stack

- **Runtime** — Node.js 18 (sans framework)
- **Stockage** — en mémoire (pas de base de données)

## Structure

```
stockalert/
├── app.js         ← API REST
├── app.test.js    ← tests unitaires
├── package.json
├── Dockerfile
└── .gitignore
```

## API

| Méthode | Route | Description |
|---|---|---|
| GET | `/health` | État de l'app et statistiques |
| GET | `/products` | Liste tous les produits |
| POST | `/products` | Ajouter un produit `{ name, stock, threshold? }` |
| PATCH | `/products/:id/stock` | Mettre à jour le stock `{ stock }` |
| GET | `/alerts` | Liste toutes les alertes |
| GET | `/alerts/active` | Alertes non résolues uniquement |
| PATCH | `/alerts/:id/resolve` | Résoudre une alerte |
| DELETE | `/alerts/:id` | Supprimer une alerte |

**Sévérités :** `critical` (stock = 0) · `warning` (stock < threshold)

## Lancer en local

```bash
npm install
npm start
# → http://localhost:3000
```

## Tests

```bash
npm test
npm run lint
```

## Variables d'environnement

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3000` | Port du serveur |
| `APP_ENV` | `development` | Environnement |
| `APP_VERSION` | `1.0.0` | Version |
| `DEFAULT_THRESHOLD` | `10` | Seuil d'alerte par défaut |

---

*Projet support du TP CI/CD — DevOps Bachelor 3*
