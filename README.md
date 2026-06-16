# Casuta dintre brazi — Meniu QR + Comenzi

Site static cu meniul terasei **Casuta dintre brazi**, coș de comandă pentru clienți și panou admin pentru comenzi live.

## Cum îl deschizi

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
