## Cyberpunk Hierarchy Graph Dashboard

A single-page React dashboard (Vite + React Router — this project is not Next.js) that calls your `/bfhl` endpoint and visualizes the returned hierarchy graph in a heavy "Stranger Things × cyberpunk" aesthetic.

> **Note on framework**: The original brief asked for a Next.js `app/page.tsx`. This project is Vite + React, so I'll build the equivalent as `src/pages/Index.tsx`. All functionality, styling, and the editable `API_URL` constant remain identical — you can copy the JSX into a Next.js page later if needed.

---

### Design system (added to `index.css` + `tailwind.config.ts`)
- **Background**: deep black `#05060a` with a faint cyan grid + animated scanline overlay
- **Accents**: neon cyan `#00f0ff`, neon red `#ff2a3d`, warning amber `#ffb020`
- **Fonts**: load `JetBrains Mono` (or `Share Tech Mono`) via Google Fonts for everything
- **Effects**:
  - CRT scanlines overlay (fixed, `pointer-events-none`)
  - Glitch / flicker animation on the main `>_ HIERARCHY GRAPH MONITOR` header
  - Soft neon `box-shadow` glow on borders, buttons, stat cards
  - Blinking terminal cursor `█` next to headers

---

### Page layout (`src/pages/Index.tsx`)

Top of file:
```ts
const API_URL = "YOUR_RENDER_URL_HERE/bfhl";
```

**1. Header bar**
- Glitching title: `>_ HIERARCHY GRAPH MONITOR`
- Status line: `[ SYSTEM ONLINE ]` with blinking cyan dot

**2. Identity tag** (visible only after a successful response)
- Small mono row: `USER_ID :: ... │ EMAIL :: ... │ ROLL :: ...`

**3. Input panel**
- Bordered cyan terminal-style card labeled `// INPUT :: EDGE LIST (JSON ARRAY)`
- Large monospaced `<textarea>` prefilled with example: `["A->B", "A->C", "B->D"]`
- Glowing red **`▶ INITIALIZE PIPELINE`** button
- On click: `POST API_URL` with body `{ "data": <parsed array> }`
- Local JSON parse validation before sending

**4. State handling**
- `loading`: button shows `▮ TRANSMITTING…`, animated cyan progress bar
- `error`: aggressive red panel — `[ ERROR :: PIPELINE FAILURE ]` with the message, red glow + flicker
- Catches network errors, non-2xx responses, and JSON parse errors

**5. Summary metrics** (3 neon-bordered stat cards, responsive grid)
- `TOTAL_TREES` (cyan border)
- `TOTAL_CYCLES` (red border, pulses if > 0)
- `LARGEST_TREE_ROOT` (amber border)

**6. Hierarchy graph display**
- Section header: `// HIERARCHIES`
- For each entry in `hierarchies[]`, a card showing:
  - `ROOT :: <root>` · `DEPTH :: <n>` · `HAS_CYCLE :: TRUE/FALSE` (red badge if true)
  - **ASCII terminal tree** rendered from the nested `tree` object using `├──`, `└──`, `│   ` connectors in a `<pre>` block with cyan glow
  - Recursive renderer handles arbitrary depth

**7. System logs** (bottom, two side-by-side scrollable panels)
- `[ INVALID_ENTRIES ]` — amber-bordered scroll panel listing each invalid entry
- `[ DUPLICATE_EDGES ]` — red-bordered scroll panel listing each duplicate edge
- Both are `max-h-64 overflow-auto` with monospace rows like `> "A->"  // malformed`
- Show `// NO ANOMALIES DETECTED` when empty

---

### Files changed
- `src/pages/Index.tsx` — entire dashboard (single file, all logic + components inline)
- `src/index.css` — add CRT scanline overlay, glitch keyframes, neon glow utilities, mono font import
- `tailwind.config.ts` — extend with neon color tokens, glitch/flicker/scanline animations, `mono` font family
- `index.html` — preconnect + load Google Fonts (JetBrains Mono / Share Tech Mono)

No backend, no new dependencies — pure Tailwind + React `fetch`.