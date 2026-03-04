# Polyuserstats — Polymarket Intelligence Platform

**Advanced analytics, wallet tracking, sniper detection, and real-time market intelligence for Polymarket.**

---

## What Polyuserstats Does

Polyuserstats is a web application that helps Polymarket users make smarter decisions by providing:

- **Dashboard** — Live overview of trending markets and top earners
- **Top Earners** — Leaderboard of most profitable wallets (daily/weekly/monthly/all-time)
- **High Stakes Live** — Real-time feed of large bets being placed on Polymarket
- **Snipers** — Detects new wallets placing suspicious high-stakes bets (possible insider signals)
- **Trending Markets** — Most-bet-on markets with sports filtering and "starting soon" indicators
- **Wallet Tracker** — Favorite wallets and receive notifications when they trade
- **Wallet Detail** — Deep dive into any wallet's positions, trades, and activity

---

## Setup Instructions (Step by Step)

### Prerequisites

You need to install **Node.js** on your computer first. Node.js is the platform that runs the code.

#### Step 1: Install Node.js

1. Go to https://nodejs.org
2. Click the big green button that says **"LTS"** (Long Term Support)
3. Download and run the installer
4. Follow the installation wizard (just click "Next" on everything)
5. When done, restart your computer

**To verify Node.js is installed:** Open Terminal (Mac) or Command Prompt (Windows) and type:
```
node --version
```
You should see something like `v20.x.x`. If you see an error, try restarting your computer.

#### Step 2: Extract the ZIP file

1. Extract/unzip the `polyuserstats.zip` file to a folder on your computer
2. Remember where you extracted it (e.g., `Desktop/polyuserstats` or `Downloads/polyuserstats`)

#### Step 3: Open Terminal/Command Prompt in the project folder

**On Windows:**
- Open File Explorer and navigate to the `polyuserstats` folder
- Click the address bar at the top, type `cmd`, and press Enter
- A black Command Prompt window will open

**On Mac:**
- Open Terminal (search for "Terminal" in Spotlight)
- Type `cd ` (with a space after it), then drag the `polyuserstats` folder into the Terminal window
- Press Enter

#### Step 4: Install dependencies

In the Terminal/Command Prompt, type:
```
npm install
```
Wait for it to finish. This downloads all the code libraries the project needs. It might take 1-2 minutes.

#### Step 5: Start the development server

```
npm run dev
```

You should see something like:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
```

#### Step 6: Open in your browser

Open your web browser (Chrome, Firefox, Edge, etc.) and go to:
```
http://localhost:3000
```

**That's it! Polyuserstats is now running on your computer.**

To stop the server, press `Ctrl + C` in the Terminal window.

---

## Deploying to the Internet (Making it Public)

To make your website accessible to everyone, you need to deploy it. Here are the easiest options:

### Option A: Vercel (Recommended — Free)

1. Go to https://vercel.com and create a free account
2. Install Vercel CLI: `npm install -g vercel`
3. In the polyuserstats folder, run: `vercel`
4. Follow the prompts (accept defaults)
5. Your site will be live at something like `polyuserstats.vercel.app`

### Option B: Netlify (Free)

1. Go to https://netlify.com and create a free account
2. First build the project: `npm run build`
3. Drag and drop the `dist` folder into the Netlify dashboard
4. Your site will be live instantly

### Option C: Custom Domain

After deploying to Vercel or Netlify:
1. Buy a domain (e.g., `polyuserstats.io`) from Namecheap, GoDaddy, etc.
2. In your Vercel/Netlify dashboard, go to "Domains" settings
3. Add your custom domain and follow the DNS instructions

---

## Project Structure

```
polyuserstats/
├── index.html              # Main HTML page
├── package.json            # Project dependencies
├── vite.config.js          # Build tool config
├── tailwind.config.js      # Styling config
├── postcss.config.js       # CSS processing config
├── public/
│   └── favicon.svg         # Browser tab icon
└── src/
    ├── main.jsx            # App entry point
    ├── App.jsx             # Routes and providers
    ├── index.css           # Global styles
    ├── components/
    │   ├── Layout.jsx      # Sidebar + header layout
    │   ├── NotificationPanel.jsx
    │   └── UI.jsx          # Reusable UI components
    ├── pages/
    │   ├── Dashboard.jsx
    │   ├── TopEarners.jsx
    │   ├── WalletDetail.jsx
    │   ├── HighStakes.jsx
    │   ├── Snipers.jsx
    │   ├── TrendingMarkets.jsx
    │   └── WalletTracker.jsx
    └── utils/
        ├── api.js          # Polymarket API integration
        └── store.jsx       # App state (favorites, notifications)
```

---

## API Endpoints Used

All data comes from Polymarket's **public** APIs — no authentication required:

| API | Base URL | Purpose |
|-----|----------|---------|
| Gamma API | `gamma-api.polymarket.com` | Market discovery, events, metadata |
| Data API | `data-api.polymarket.com` | Positions, trades, leaderboard, activity |
| CLOB API | `clob.polymarket.com` | Prices, order books |

---

## Security Notes

⚠️ **NEVER share your private keys or API secrets with anyone.** Polyuserstats uses only public read-only APIs and does not require any private keys or authentication to function.

---

## Applying for a Polymarket Badge

To apply for a Polymarket ecosystem badge:

1. Make sure your site is deployed and publicly accessible
2. Visit the Polymarket Discord community
3. Contact the Polymarket team about the Builder Program
4. Share your website URL and explain how it benefits Polymarket users
5. More info: https://docs.polymarket.com/developers/builders/builder-intro

---

## Troubleshooting

**"npm is not recognized"** → Node.js isn't installed properly. Reinstall from https://nodejs.org

**Page shows errors** → Some API endpoints may be rate-limited. Refresh the page after a few seconds.

**Blank page** → Make sure you're visiting `http://localhost:3000` (not https)

**"EACCES permission denied"** (Mac) → Try: `sudo npm install`

---

Built with React, Vite, Tailwind CSS, and the Polymarket API.
