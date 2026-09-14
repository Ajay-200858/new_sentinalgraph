# SentinelGraph Frontend

**SentinelGraph** is an AI-powered Cybersecurity SOC Dashboard and Interactive Network Graph Analysis Platform.

## 🚀 Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + PostCSS + Autoprefixer
- **State Management**: Zustand
- **Routing**: React Router v6 (`react-router-dom`)
- **Network Graph**: Cytoscape.js (`cytoscape`, `cytoscape-cose-bilkent`, `cytoscape-popper`)
- **Charts & Telemetry**: Recharts
- **HTTP Client**: Axios
- **Icons**: Lucide React

---

## 🛠️ Quick Start

### 1. Installation

```bash
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Default `.env` configuration for standalone mock mode:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCK_DATA=true
```

### 3. Development Server

Start the local development server:

```bash
npm run dev
```

Application will open at `http://localhost:3000` (or `http://localhost:3002`).

---

## 📦 Production Build & Deployment

### Build for Production

```bash
npm run build
```

This compiles TypeScript and outputs production assets to the `/dist` directory.

### Preview Production Build

```bash
npm run preview
```

### Vercel Deployment

SentinelGraph is configured for 1-click deployment on **Vercel**:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **SPA Rewrites**: Included in `vercel.json`

---

## 🔒 Security & Privacy

- SentinelGraph does **not** store or expose API keys, database credentials, or secret tokens in frontend code.
- Mock mode (`VITE_USE_MOCK_DATA=true`) enables complete frontend evaluation without backend dependencies.

---

## 📖 Feature Overview

- **Overview Dashboard** (`/dashboard/overview`): KPI Cards, Attack Distribution Donut Chart, Predictive Risk Projection Line Chart, and Live Security Events Stream.
- **Network Graph** (`/dashboard/graph`): Cytoscape.js interactive network topology, node risk inspection drawer, and Cose physics layout controls.
- **Forecast & Attack Escalation** (`/dashboard/forecast`): Active threat status, AI prescriptive mitigation actions, and forward-looking attack escalation timeline.
- **Security Events** (`/dashboard/events`): Live event stream with search, severity and event-type filtering, pagination, inspector modal, and CSV export.
- **Simulation Replay** (`/simulation/replay`): Dataset selector (CICIDS2017, UNSW-NB15), speed velocity controls (`0.5x`, `1x`, `2x`, `5x`), and playback progress telemetry.
- **Simulation Settings** (`/simulation/settings`): Telemetry sampling rates, auto-start options, and theme controls.
- **MITRE ATT&CK Matrix** (`/analysis/mitre`): 14-tactic horizontally scrollable matrix, technique risk filtering, and technique inspector modal.
- **Host Details** (`/analysis/host-details`): Target IP selection, host vulnerability metrics, threat breakdown, communication partner edges, and host event log stream.
