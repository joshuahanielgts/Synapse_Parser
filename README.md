# ⚡ Synapse Parser | BFHL Neural Grid

> A high-performance full-stack graph analysis dashboard built for the **Bajaj Finserv Health Full-Stack Engineering Challenge**. Synapse Parser interfaces with a secure Node.js REST API to process directed edge strings, construct multi-tree hierarchies, detect pure cycles using DFS, and visualize the results in a retro-terminal CRT aesthetic UI.

---

### 🔗 Live Deployments

| Layer | Platform | URL |
|---|---|---|
| 🖥️ Frontend Dashboard | Vercel | [bfhl-hierarchy-graph-api-visualizer.vercel.app](https://bfhl-hierarchy-graph-api-visualizer.vercel.app) |
| ⚙️ Backend REST API | Render | [bfhl-hierarchy-graph-api-visualizer.onrender.com](https://bfhl-hierarchy-graph-api-visualizer.onrender.com) |
| 📦 GitHub (Original) | GitHub | [BFHL-Hierarchy-Graph-API-Visualizer](https://github.com/joshuahanielgts/BFHL-Hierarchy-Graph-API-Visualizer) |
| 📦 GitHub (Rebranded) | GitHub | [Synapse_Parser](https://github.com/joshuahanielgts/Synapse_Parser) |

---

## 👤 Candidate Information

| Field | Value |
|---|---|
| **Name** | J Joshua Haniel |
| **User ID** | `jjoshuahaniel_09012006` |
| **Email** | jj9568@srmist.edu.in |
| **Roll Number** | RA2311003040056 |
| **Institution** | SRM Institute of Science and Technology (CSE) |

---

## ⚙️ Core Architecture & Tech Stack

The system is split into a robust backend processing engine and a high-fidelity, retro-terminal inspired frontend visualizer.

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS (CRT/Terminal aesthetic) |
| **Backend** | Node.js, Express.js, CORS (ES Module, single-file `index.js`) |
| **Deployment** | Vercel (Frontend) · Render (Backend) |
| **API Contract** | `POST /bfhl` — JSON body `{ "data": [...] }` |

---

## 📡 API Specification

### `GET /`

Returns a health-check response confirming the API is online.

```json
{
  "system": "BFHL Neural Grid API",
  "status": "Online",
  "endpoint": "POST /bfhl",
  "message": "Send a POST request to /bfhl to initialize the pipeline.",
  "author": "J Joshua Haniel",
  "email": "jj9568@srmist.edu.in",
  "roll": "RA2311003040056"
}
```

---

### `POST /bfhl`

Processes an array of directed edge strings (`X->Y`) to construct trees and identify cyclic dependencies.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "data": ["A->B", "A->C", "B->D", "C->E", "E->F"]
}
```

**Response Schema:**
```json
{
  "user_id": "jjoshuahaniel_09012006",
  "email_id": "jj9568@srmist.edu.in",
  "college_roll_number": "RA2311003040056",
  "hierarchies": [
    {
      "root": "A",
      "tree": {
        "B": { "D": {} },
        "C": { "E": { "F": {} } }
      },
      "depth": 4
    }
  ],
  "invalid_entries": [],
  "duplicate_edges": [],
  "summary": {
    "total_trees": 1,
    "total_cycles": 0,
    "largest_tree_root": "A"
  }
}
```

**Cycle example:**
```json
{
  "root": "X",
  "tree": {},
  "has_cycle": true
}
```

---

## 🧠 Algorithmic Execution Rules

| Rule | Behaviour |
|---|---|
| **Validation** | Trims whitespace · enforces `^[A-Z]->[A-Z]$` regex · rejects self-loops (e.g., `A->A`) · pushes failures to `invalid_entries` |
| **Duplicate Edges** | First occurrence is accepted · all subsequent identical edges go to `duplicate_edges` |
| **First-Parent-Wins** | If a child already has a parent, a second parent edge is discarded into `duplicate_edges` |
| **Root Detection** | Any node never appearing as a child is a root |
| **Cycle Root** | Pure cycle groups (no natural root) use the **lexicographically smallest** node as synthetic root |
| **Cycle Detection** | DFS with recursion-stack tracking · back-edge hit → `has_cycle: true`, tree collapses to `{}`, no `depth` field |
| **Depth** | Longest root-to-leaf path (leaf = depth 1) |
| **Largest Tree Root** | Root of deepest non-cyclic tree · ties broken by lexicographically smaller root |

---

## 💻 Local Developer Setup

### Prerequisites
```bash
node -v    # v18+ recommended
npm -v     # v9+
```

### 1. Clone the Repository
```bash
git clone https://github.com/joshuahanielgts/Synapse_Parser.git
cd Synapse_Parser
```

### 2. Install All Dependencies
```bash
npm install          # installs frontend (Vite/React) deps
npm install express cors   # installs backend deps
```

### 3. Run the Backend (Express API)
```bash
node index.js
# → Synapse Parser API running on http://localhost:3000
```

Test the API:
```bash
curl -X POST http://localhost:3000/bfhl \
  -H "Content-Type: application/json" \
  -d "{\"data\": [\"A->B\", \"A->C\", \"B->D\", \"hello\", \"A->B\"]}"
```

### 4. Run the Frontend (Vite React) — separate terminal
```bash
npm run dev
# → http://localhost:5173
```

---

## ☁️ Production Deployment

### Backend → Render

| Setting | Value |
|---|---|
| **Runtime** | Node |
| **Build Command** | `npm install express cors` |
| **Start Command** | `node index.js` |
| **Environment Vars** | None required (Render injects `PORT` automatically) |

### Frontend → Vercel

| Setting | Value |
|---|---|
| **Framework** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Backend URL** | Hardcoded in `src/pages/Index.tsx` line 6 |

---

## 📁 Project Structure

```
Synapse_Parser/
├── index.js              ← Express REST API (Backend — deploy on Render)
├── index.html            ← Vite SPA entry + SEO meta tags
├── src/
│   └── pages/
│       └── Index.tsx     ← Full React UI (Synapse Parser visualizer)
├── vercel.json           ← Vercel SPA rewrite config
├── package.json          ← Frontend deps + scripts (type: module)
├── HOWTORUN.md           ← Full deployment walkthrough
└── README.md             ← This file
```

---

*Built with 🧬 by J Joshua Haniel — SRM IST, Chennai*