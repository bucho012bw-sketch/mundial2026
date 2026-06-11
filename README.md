# ⚽ Mundial 2026 – Typer

Multi-user typer Mistrzostw Świata 2026. Znajomi otwierają URL, wpisują nick i typują. Żadnych kont.

## Stack
- React + Vite (frontend)
- Supabase (baza danych + realtime)
- Vercel (hosting)

---

## 🚀 Setup (ok. 10 minut)

### 1. Supabase – utwórz tabelę

1. Wejdź na https://supabase.com → Twój projekt → SQL Editor
2. Wklej zawartość pliku `supabase_schema.sql` → kliknij **Run**

### 2. Pobierz klucze Supabase

Supabase Dashboard → **Settings → API**:
- `Project URL` → skopiuj
- `anon (public)` key → skopiuj

### 3. Skonfiguruj aplikację

```bash
cp .env.example .env
```

Otwórz `.env` i wklej swoje klucze:
```
VITE_SUPABASE_URL=https://TWÓJ_PROJEKT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
```

### 4. Zainstaluj i uruchom lokalnie (test)

```bash
npm install
npm run dev
# Otwórz http://localhost:5173
```

### 5. Deploy na Vercel

```bash
git init
git add .
git commit -m "Mundial 2026 Typer"
# Połącz z GitHub i importuj projekt w Vercel
# LUB użyj Vercel CLI:
vercel --prod
```

**⚠️ W Vercel dodaj env vars:**
Vercel Dashboard → Project → Settings → Environment Variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 🔒 Blokady typowania

| Co | Kiedy blokuje |
|---|---|
| Zwycięzca grupy A | 11 cze 21:00 CET (Mexico vs South Africa) |
| Zwycięzca grupy B | 12 cze 21:00 CET |
| Zwycięzca grupy C | 14 cze 00:00 CET |
| Zwycięzca grupy D | 13 cze 03:00 CET |
| Zwycięzca grupy E | 14 cze 19:00 CET |
| Zwycięzca grupy F | 14 cze 22:00 CET |
| Zwycięzca grupy G | 15 cze 00:00 CET |
| Zwycięzca grupy H | 15 cze 19:00 CET |
| Zwycięzca grupy I | 16 cze 21:00 CET |
| Zwycięzca grupy J | 17 cze 03:00 CET |
| Zwycięzca grupy K | 17 cze 19:00 CET |
| Zwycięzca grupy L | 17 cze 22:00 CET |
| Półfinały / Finał / Mistrz / Top strzelec | 28 cze 02:00 CET |

---

## 📊 Punktacja

| Typowanie | Punkty |
|---|---|
| Zwycięzca grupy (×12) | 3 pkt |
| Półfinalista (×4) | 3 pkt |
| Finalista (×2) | 5 pkt |
| Mistrz świata | 10 pkt |
| Kraj top strzelca | 5 pkt |
| **Maksimum** | **73 pkt** |

---

## 📁 Struktura plików

```
mundial2026/
├── src/
│   ├── App.jsx          ← główna aplikacja
│   ├── main.jsx         ← entry point
│   ├── lib/
│   │   └── supabase.js  ← klient Supabase
│   └── data/
│       └── schedule.js  ← grupy, flagi, blokady
├── index.html
├── vite.config.js
├── package.json
├── supabase_schema.sql  ← SQL do wklejenia w Supabase
├── .env.example         ← template do konfiguracji
└── .env                 ← TWOJE klucze (nie commituj!)
```

## ⚠️ Ważne

- Plik `.env` **NIE powinien trafiać do git** – dodaj go do `.gitignore`
- Klucz `anon` jest publiczny i może trafić do przeglądarki – to normalne dla Supabase
- Row Level Security w Supabase jest włączone – tylko read/insert/update, brak delete
