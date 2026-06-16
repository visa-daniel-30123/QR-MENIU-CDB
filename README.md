# Casuta dintre brazi — Meniu QR + Comenzi

Site static cu meniul terasei **Casuta dintre brazi**, coș de comandă pentru clienți și panou admin pentru comenzi live.

## Publicare pe GitHub Pages

Site-ul tău va fi la:

**https://visa-daniel-30123.github.io/QR-MENIU-CDB/**

Admin: **https://visa-daniel-30123.github.io/QR-MENIU-CDB/admin.html**

### Pas 1 — Activează GitHub Pages

1. Repo GitHub → **Settings** → **Pages**
2. La **Build and deployment** → Source: **GitHub Actions**

### Pas 2 — Adaugă secretele (pentru comenzi + admin)

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | Valoare (din `config.js`) |
|--------|---------------------------|
| `FIREBASE_API_KEY` | apiKey |
| `FIREBASE_AUTH_DOMAIN` | authDomain |
| `FIREBASE_PROJECT_ID` | projectId |
| `FIREBASE_STORAGE_BUCKET` | storageBucket |
| `FIREBASE_MESSAGING_SENDER_ID` | messagingSenderId |
| `FIREBASE_APP_ID` | appId |
| `ADMIN_PASSWORD` | parola ta admin |

### Pas 3 — Push pe GitHub

```bash
git add .
git commit -m "Fix căi GitHub Pages"
git push
```

La fiecare push, GitHub Actions generează `config.js` și publică site-ul (inclusiv imagini).

**Important:** `config.js` nu e în Git (e în `.gitignore`) — se creează automat la deploy din secrete.

## Cum îl deschizi local

Deschide fișierul `index.html` în browser sau rulează un server local:

```bash
npx serve .
```

**Important:** comenzile necesită un server (nu merge din `file://` din cauza modulelor ES). Folosește `npx serve .` sau publică pe Netlify / GitHub Pages.

## Pagini

| Fișier | Rol |
|--------|-----|
| `index.html` | Meniu + coș comandă (clienți) |
| `admin.html` | Panou comenzi live (personal) |

## Configurare Firebase (o singură dată)

1. Creează un proiect gratuit pe [Firebase Console](https://console.firebase.google.com/)
2. Adaugă o aplicație **Web** și copiază config-ul
3. Activează **Firestore Database** (mod Production)
4. Copiază `config.example.js` în `config.js` (dacă nu există deja) și completează datele
5. Setează parola admin în `config.js` (`ADMIN_PASSWORD`)
6. În Firestore → **Rules**, lipește conținutul din `firestore.rules` și publică

### Reguli Firestore

Fișierul `firestore.rules` permite:
- **create** — oricine poate trimite o comandă nouă
- **read / update** — pentru panoul admin (protejat cu parolă în aplicație)

Pentru securitate mai bună pe termen lung, poți adăuga Firebase Authentication.

## Utilizare

### Clienți (QR meniu)
1. Scanează QR-ul → deschide meniul
2. Apasă **+** lângă produse
3. Completează numele și trimite comanda

### Personal (admin)
1. Deschide `admin.html` pe tabletă/telefon (salvează la favorite)
2. Introdu parola admin
3. Comenzile noi apar automat, cu sunet
4. **Preia comanda** → **Marchează gata** când e livrată

## Structură fișiere

- `index.html` — meniul
- `admin.html` — panou comenzi
- `style.css` / `admin.css` — stiluri
- `script.js` — filtrare categorii
- `cart.js` — coș și trimitere comandă
- `admin.js` — listă comenzi live
- `firebase-app.js` — inițializare Firebase
- `config.js` — configurare (nu publica parola pe repo public)

## Categorii meniu

- **Mâncare** — preparate calde, la grătar, chiflă/pâine
- **Dulciuri** — kürtős, înghețată
- **Băuturi** — calde, sucuri, apă, bere
