# 📦 Jimbo Business Tracker

A private, login-protected web app that tracks every sale and expense in your
3D-printing business, with a heavily-decorated stats dashboard and four bonus
tools. No build step, no Node — it's plain HTML/CSS/JS using the Firebase Web
SDK and Chart.js straight from a CDN.

---

## ⭐ What's inside

| Page | What it does |
|------|--------------|
| **Overview** | Hero **True Net Profit** card, a "how net profit is built" breakdown, KPI cards (with vs-previous-period deltas), revenue/profit trend chart, platform doughnut, monthly stacked chart, top products and a platform table. Date-range presets + per-platform toggles. |
| **Sales** | Searchable, sortable table of every order. Add / edit / delete with a live profit preview and item autocomplete. Export to CSV. |
| **Expenses** | Same, for spending. Category split chart + "where the money goes" ranking. |
| **Smart Insights** 💡 | Auto-generated, plain-English findings (biggest earner, best margins, best platform, pitch-fee drag, best day, trend, loss-making sales) + a typo-normalised product catalogue you can sort by profit / revenue / units / margin. |
| **Filament** 🧵 | Filament **bought** (expenses) vs **used** (per-sale landing cost), remaining value, weekly burn rate and **weeks of runway** left, with a restock warning. |
| **Goals** 🎯 | Monthly revenue & profit targets with animated progress rings and a **month-end forecast** based on your current pace. |
| **Tax Year** 🇬🇧 | UK self-assessment helper: profit per tax year (6 Apr – 5 Apr), an estimated tax set-aside figure and an exportable summary. |
| **Settings** ⚙️ | Account, the profit-rule explainer, data import / export, and a danger-zone wipe. |

### The profit rule (no double-counting)

> **Net Profit = (Revenue − Landing Cost) − Expenses _excluding_ Filament**

Your per-sale **landing cost** already represents the filament used by that item,
so filament is expensed there. Filament you _buy_ is logged under Expenses for
cash-flow and the Filament runway page — but it is **never subtracted from profit
a second time**. Everything else (equipment, packaging, wages, software, tools)
is subtracted normally.

---

## 🔧 One-time setup (~5 minutes)

The app needs your own free Firebase project so your data is private and synced
across devices.

### 1. Create the Firebase project
1. Go to <https://console.firebase.google.com> → **Add project** (free Spark plan is fine).
2. Click the **`</>`** (Web) icon to register a web app. Firebase shows you a
   `firebaseConfig = { … }` block — keep that tab open.

### 2. Paste your keys
Open **`js/firebase-config.js`** and replace the `PASTE_…` placeholders with the
values Firebase just showed you. (These web keys are **not secret** — your data
is protected by the login and the security rules below.)

### 3. Turn on Google sign-in
In the console: **Build → Authentication → Get started → Sign-in method →
Google → Enable** (pick a support email, Save). The app signs you in with Google
and is locked to a single address — set in `js/firebase-config.js`
(`ALLOWED_EMAIL`) and enforced again in `firestore.rules`. Anyone else who tries
Google sign-in is rejected immediately, so it stays private to you.

### 4. Create the database + lock it down
1. **Build → Firestore Database → Create database** → Production mode → pick a region.
2. Open the **Rules** tab, paste the entire contents of **`firestore.rules`**
   (in this folder) and **Publish**. This guarantees only your signed-in account
   can read or write your data.

### 5. Run it
Serve the folder over `http://localhost` (Firebase Auth needs http, not `file://`).
From this folder:

```bash
python -m http.server 5188
```

Then open <http://localhost:5188>, sign in, and on first launch click
**“Import my spreadsheet data”** to load your 464 sales + 54 expenses.

> `localhost` is already an authorised domain in Firebase. When you deploy
> (below), add your live domain under **Authentication → Settings → Authorized domains**.

---

## 🚀 Deploying (so you can use it anywhere)

It's a static site — host the folder on any static host:

- **Firebase Hosting** (keeps everything in one place):
  install the CLI, `firebase init hosting` (public dir = this folder), `firebase deploy`.
- **Netlify**: drag-and-drop this folder onto the Netlify dashboard, or connect the repo.

After deploying, add the live URL to **Firebase → Authentication → Settings →
Authorized domains**.

---

## 🔁 Refreshing the starter data

The bundled data in `js/seed-data.js` was generated from your CSV exports by
`tools/parse_csv.py`. To regenerate it from new exports:

```bash
python tools/parse_csv.py            # reads the CSVs from your Downloads folder
# or point it at specific files:
python tools/parse_csv.py "Sales.csv" "Expenses.csv"
```

(Day-to-day you'll just add entries in the app — this is only for a bulk refresh.)

---

## 🗂️ Project structure

```
index.html              app shell + boot splash
firestore.rules         security rules (paste into Firebase)
css/styles.css          the whole design system
js/
  firebase-config.js    ← you paste your keys here
  firebase.js           SDK init
  auth.js               login / logout
  store.js              Firestore CRUD + realtime cache + seed import
  finance.js            all money math (the no-double-count rule lives here)
  insights.js           the Smart Insights engine
  filters.js            global date / platform filter state
  charts.js             Chart.js helpers
  utils.js              formatting, dates, DOM helpers
  layout.js / router.js app shell + hash router
  login.js              login + first-time setup screen
  seed-data.js          your imported sales + expenses (auto-generated)
  components/           modal, forms, table, widgets, filter bar, CSV export
  pages/                overview, sales, expenses, insights, filament, goals, tax, settings
tools/parse_csv.py      CSV → seed-data.js converter
```

---

## 🛟 Notes

- **Tax figures are estimates** to help you plan and set money aside — not formal
  accounting advice. Confirm with HMRC or an accountant.
- "Cancelled" rows (including car-boot **PITCH FEE** entries) are counted by
  default because they're real costs. Use the **Showing cancelled** toggle to hide them.
- All amounts are GBP.
