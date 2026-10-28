# Graphiques CA — Alphitan

Générateur de graphiques de chiffre d’affaires aux couleurs Alphitan. Il propose cinq types : évolution, comparatif groupé, pont, courbe et histogramme + courbe. L’outil comprend des dossiers, des modèles et des exports PNG et SVG.

Tout tient sur **GitHub + Netlify**, sans base de données externe. Les graphiques, dossiers et modèles sont stockés dans **Netlify Blobs**, le stockage intégré à Netlify, via une petite fonction serveur.

```
graphiques-ca/
├── public/
│   └── index.html              L’application (un seul fichier)
├── netlify/
│   └── functions/
│       └── api.mjs             API /api/* : lecture et écriture dans Netlify Blobs
├── netlify.toml                Configuration Netlify
├── package.json                Dépendance : @netlify/blobs
├── package-lock.json
├── .env.example                Variable à renseigner pour le développement local
└── .gitignore
```

## Mise en route

### 1. Déposer le dossier sur GitHub

Créez un dépôt **privé** nommé `graphiques-ca`, puis, depuis ce dossier :

```bash
git init
git add .
git commit -m "Graphiques CA : première version"
git branch -M main
git remote add origin https://github.com/VOTRE-COMPTE/graphiques-ca.git
git push -u origin main
```

Vous pouvez aussi passer par l’interface web : **Add file → Upload files**, puis glisser le contenu du dossier. Vérifiez que `.gitignore` est bien envoyé, car certains systèmes masquent les fichiers commençant par un point.

### 2. Déployer sur Netlify

1. **Add new site → Import an existing project → GitHub**, puis choisissez `graphiques-ca`. Les réglages sont lus dans `netlify.toml` : il n’y a rien à saisir.
2. **Site configuration → Environment variables**, ajoutez `ACCESS_TOKEN` : un code d’accès long, que vous communiquerez aux personnes autorisées (cochez *Contains secret values*).
3. Lancez un déploiement (**Deploys → Trigger deploy**) pour que la variable soit prise en compte.

Netlify Blobs est activé automatiquement : il n’y a rien à créer ni à configurer.

### 3. Première connexion

Ouvrez l’adresse du site et saisissez le code d’accès. Il est mémorisé dans le navigateur.

### 4. Récupérer les graphiques de la version Claude

Dans l’outil publié sur Claude, ouvrez **Mes graphiques**, puis cliquez sur **Exporter une sauvegarde** : un fichier `.json` est téléchargé. Sur le site Netlify, faites **Mes graphiques → Importer une sauvegarde** avec ce fichier. Graphiques, dossiers et modèles sont recréés à l’identique.

## Où sont les données

Dans Netlify : **Project → Blobs**, store `graphiques-ca`. Chaque élément y est un fichier JSON :

- `charts/<id>` pour les graphiques ;
- `folders/<id>` pour les dossiers ;
- `templates/<id>` pour les modèles.

Pour une copie de secours lisible, utilisez **Exporter une sauvegarde** dans l’application. Le fichier peut être réimporté à tout moment.

## Développement local

```bash
npm install
cp .env.example .env      # puis renseignez ACCESS_TOKEN
npx netlify link          # relie le dossier au site Netlify
npx netlify dev           # http://localhost:8888
```

Ouvert directement depuis le disque (`public/index.html`), l’outil fonctionne aussi. Il enregistre alors dans le navigateur, puis transfère ces éléments sur le site à la première connexion réussie.

## Sécurité et limites

- Le stockage n’est accessible que par la fonction `/api`, protégée par `ACCESS_TOKEN`.
- Toute personne qui a le code d’accès voit et modifie le même espace de graphiques. Pour retirer un accès, changez `ACCESS_TOKEN` puis redéployez.
- Gardez le dépôt privé et ne versionnez jamais le fichier `.env`.
- En cas d’enregistrements simultanés sur un même graphique, la dernière version enregistrée l’emporte.
