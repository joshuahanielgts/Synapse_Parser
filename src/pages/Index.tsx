import { useMemo, useState } from "react";

// =============================================================================
// Update this constant with your deployed endpoint.
// =============================================================================
const API_URL = "YOUR_RENDER_URL_HERE/bfhl";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type TreeNode = { [key: string]: TreeNode } | null | Record<string, unknown>;

interface Hierarchy {
  root: string;
  depth: number;
  has_cycle: boolean;
  tree: Record<string, unknown>;
}

interface ApiResponse {
  user_id?: string;
  email_id?: string;
  college_roll_number?: string;
  total_trees?: number;
  total_cycles?: number;
  largest_tree_root?: string;
  hierarchies?: Hierarchy[];
  invalid_entries?: string[];
  duplicate_edges?: string[];
  [key: string]: unknown;
}

type LogFilter = "all" | "invalid" | "duplicate";
type ValidationState =
  | { status: "empty" }
  | { status: "valid"; count: number }
  | { status: "invalid-array"; reason: string }
  | { status: "invalid-json"; reason: string };

function validateInput(raw: string): ValidationState {
  const trimmed = raw.trim();
  if (!trimmed) return { status: "empty" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    return { status: "invalid-json", reason: (e as Error).message };
  }
  if (!Array.isArray(parsed)) {
    return { status: "invalid-array", reason: "Root value must be an array." };
  }
  const bad = parsed.findIndex((v) => typeof v !== "string");
  if (bad !== -1) {
    return {
      status: "invalid-array",
      reason: `Element [${bad}] is not a string (got ${typeof parsed[bad]}).`,
    };
  }
  return { status: "valid", count: parsed.length };
}

// -----------------------------------------------------------------------------
// ASCII tree renderer
// -----------------------------------------------------------------------------
function buildAsciiTree(node: Record<string, unknown> | null | undefined, prefix = "", isLast = true, isRoot = true): string {
  if (!node || typeof node !== "object") return "";
  const entries = Object.entries(node);
  let out = "";

  entries.forEach(([key, value], idx) => {
    const last = idx === entries.length - 1;
    if (isRoot && idx === 0 && entries.length === 1) {
      out += `◉ ${key}\n`;
      out += buildAsciiTree(value as Record<string, unknown>, "", last, false);
      return;
    }
    const branch = last ? "└── " : "├── ";
    out += `${prefix}${branch}${key}\n`;
    const childPrefix = prefix + (last ? "    " : "│   ");
    out += buildAsciiTree(value as Record<string, unknown>, childPrefix, last, false);
  });

  return out;
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------
function StatCard({
  label,
  value,
  tone,
  pulse,
}: {
  label: string;
  value: string | number;
  tone: "cyan" | "red" | "amber";
  pulse?: boolean;
}) {
  const glow =
    tone === "cyan" ? "glow-cyan" : tone === "red" ? "glow-red" : "glow-amber";
  const text =
    tone === "cyan"
      ? "text-neon-cyan text-glow-cyan"
      : tone === "red"
        ? "text-neon-red text-glow-red"
        : "text-neon-amber text-glow-amber";

  return (
    <div
      className={`relative bg-card/70 backdrop-blur-sm rounded-md p-5 ${glow} ${
        pulse ? "animate-pulse-red" : ""
      } overflow-hidden`}
    >
      <div className="absolute inset-0 scanlines opacity-40 pointer-events-none" />
      <div className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
        // {label}
      </div>
      <div className={`mt-2 text-4xl font-bold font-display ${text} break-all`}>
        {value}
      </div>
    </div>
  );
}

function LogPanel({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "amber" | "red";
}) {
  const glow = tone === "amber" ? "glow-amber" : "glow-red";
  const accent =
    tone === "amber"
      ? "text-neon-amber text-glow-amber"
      : "text-neon-red text-glow-red";

  return (
    <div className={`relative bg-card/70 backdrop-blur-sm rounded-md ${glow} overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 bg-background/40">
        <div className={`text-xs tracking-[0.25em] font-bold ${accent}`}>
          [ {title} ]
        </div>
        <div className="text-[10px] text-muted-foreground">
          ENTRIES :: {items.length.toString().padStart(3, "0")}
        </div>
      </div>
      <div className="max-h-64 overflow-auto p-3 text-sm space-y-1 font-mono">
        {items.length === 0 ? (
          <div className="text-muted-foreground italic px-2 py-1">
            // NO ANOMALIES DETECTED
          </div>
        ) : (
          items.map((entry, i) => (
            <div
              key={`${entry}-${i}`}
              className={`flex gap-2 px-2 py-1 rounded border border-transparent hover:border-border/60 hover:bg-background/40 transition-colors`}
            >
              <span className="text-muted-foreground select-none">
                {String(i + 1).padStart(3, "0")} &gt;
              </span>
              <span className={accent}>"{entry}"</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function HierarchyCard({
  h,
  index,
  initialCollapsed = false,
}: {
  h: Hierarchy;
  index: number;
  initialCollapsed?: boolean;
}) {
  const ascii = useMemo(
    () => buildAsciiTree({ [h.root]: h.tree as Record<string, unknown> }),
    [h],
  );
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const lineCount = ascii ? ascii.split("\n").filter(Boolean).length : 0;

  return (
    <div className="relative bg-card/70 backdrop-blur-sm rounded-md glow-cyan overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-border/60 bg-background/40">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          className="text-xs tracking-[0.25em] text-neon-cyan text-glow-cyan font-bold inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
          title={collapsed ? "Expand tree" : "Collapse tree"}
        >
          <span className="inline-block w-4 text-center">{collapsed ? "▸" : "▾"}</span>
          <span>▣ NODE_{String(index + 1).padStart(2, "0")}</span>
        </button>
        <div className="text-xs text-muted-foreground">
          ROOT :: <span className="text-foreground">{h.root}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          DEPTH :: <span className="text-neon-cyan text-glow-cyan">{h.depth}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          LINES :: <span className="text-foreground">{lineCount}</span>
        </div>
        <div
          className={`ml-auto text-[10px] tracking-[0.2em] px-2 py-1 rounded border ${
            h.has_cycle
              ? "border-neon-red text-neon-red text-glow-red animate-pulse-red"
              : "border-border text-muted-foreground"
          }`}
        >
          HAS_CYCLE :: {h.has_cycle ? "TRUE" : "FALSE"}
        </div>
      </div>
      {collapsed ? (
        <div className="relative px-4 py-3 text-[11px] text-muted-foreground italic flex items-center gap-2">
          <span className="text-neon-cyan">…</span>
          <span>TREE COLLAPSED // {lineCount} NODES HIDDEN</span>
        </div>
      ) : (
        <div className="relative p-4">
          <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />
          <pre className="relative text-sm leading-6 text-neon-cyan text-glow-cyan whitespace-pre overflow-auto font-mono max-h-96">
            {ascii || "// EMPTY TREE"}
          </pre>
        </div>
      )}
    </div>
  );
}

function ValidationPanel({ state }: { state: ValidationState }) {
  const config =
    state.status === "valid"
      ? {
          glow: "glow-cyan",
          accent: "text-neon-cyan text-glow-cyan",
          border: "border-neon-cyan",
          icon: "✓",
          label: "VALID JSON ARRAY",
          detail: `${state.count} ELEMENT${state.count === 1 ? "" : "S"} :: READY TO TRANSMIT`,
        }
      : state.status === "empty"
        ? {
            glow: "",
            accent: "text-muted-foreground",
            border: "border-border",
            icon: "○",
            label: "AWAITING INPUT",
            detail: "// PASTE A JSON ARRAY OF EDGE STRINGS",
          }
        : state.status === "invalid-json"
          ? {
              glow: "glow-red",
              accent: "text-neon-red text-glow-red",
              border: "border-neon-red",
              icon: "✕",
              label: "JSON_PARSE_ERROR",
              detail: state.reason,
            }
          : {
              glow: "glow-amber",
              accent: "text-neon-amber text-glow-amber",
              border: "border-neon-amber",
              icon: "!",
              label: "SCHEMA_ERROR",
              detail: state.reason,
            };

  return (
    <div
      className={`mt-3 relative bg-background/60 border ${config.border} ${config.glow} rounded p-3 overflow-hidden`}
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />
      <div className="relative flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`text-sm font-bold ${config.accent}`}>{config.icon}</span>
        <span className={`text-[11px] tracking-[0.25em] font-bold ${config.accent}`}>
          [ {config.label} ]
        </span>
        <span className="text-[11px] text-muted-foreground break-words flex-1 min-w-0">
          {config.detail}
        </span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main page
// -----------------------------------------------------------------------------
const Index = () => {
  const DEFAULT_INPUT = '["A->B", "A->C", "B->D", "C->E", "E->F"]';
  const [input, setInput] = useState<string>(DEFAULT_INPUT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [logFilter, setLogFilter] = useState<LogFilter>("all");
  const [copied, setCopied] = useState(false);
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [collapseSignal, setCollapseSignal] = useState(0); // bump to remount cards

  const validation = useMemo(() => validateInput(input), [input]);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      setLoading(false);
      setError(`JSON_PARSE_ERROR :: ${(e as Error).message}`);
      return;
    }
    if (!Array.isArray(parsed)) {
      setLoading(false);
      setError("VALIDATION_ERROR :: Input must be a JSON array of edge strings.");
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: parsed }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} :: ${text || res.statusText}`);
      }
      const json: ApiResponse = await res.json();
      setData(json);
    } catch (e) {
      setError(`PIPELINE_FAILURE :: ${(e as Error).message}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    void handleSubmit();
  };

  const handleClearConsole = () => {
    setInput(DEFAULT_INPUT);
    setError(null);
    setData(null);
    setLogFilter("all");
    setCopied(false);
  };

  const handleCopyJson = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const toggleAllTrees = () => {
    setAllCollapsed((c) => !c);
    setCollapseSignal((n) => n + 1);
  };

  return (
    <main className="min-h-screen text-foreground font-mono px-4 sm:px-6 md:px-10 py-8 max-w-7xl mx-auto">
      {/* ============================ HEADER ============================ */}
      <header className="mb-8">
        <div className="flex items-center gap-3 text-xs text-muted-foreground tracking-[0.3em] mb-2">
          <span className="inline-block w-2 h-2 rounded-full bg-neon-cyan glow-cyan animate-blink" />
          <span className="text-neon-cyan text-glow-cyan">[ SYSTEM ONLINE ]</span>
          <span>//</span>
          <span>v0.1.4-ALPHA</span>
          <span>//</span>
          <span>NODE :: HAWKINS-LAB</span>
        </div>
        <h1
          className="text-3xl sm:text-5xl md:text-6xl font-display font-bold text-neon-cyan text-glow-cyan animate-glitch select-none"
          data-text=">_ HIERARCHY GRAPH MONITOR"
        >
          &gt;_ HIERARCHY GRAPH MONITOR
          <span className="inline-block ml-2 text-neon-cyan animate-blink">█</span>
        </h1>
        <div className="mt-2 text-xs text-muted-foreground">
          // BFHL EDGE-LIST PIPELINE :: REAL-TIME GRAPH RECONSTRUCTION & CYCLE DETECTION
        </div>

        {data && (data.user_id || data.email_id || data.college_roll_number) && (
          <div className="mt-4 text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 border-t border-border/60 pt-3">
            <span>USER_ID :: <span className="text-neon-cyan text-glow-cyan">{data.user_id ?? "—"}</span></span>
            <span>│</span>
            <span>EMAIL :: <span className="text-neon-cyan text-glow-cyan">{data.email_id ?? "—"}</span></span>
            <span>│</span>
            <span>ROLL :: <span className="text-neon-cyan text-glow-cyan">{data.college_roll_number ?? "—"}</span></span>
          </div>
        )}
      </header>

      {/* ============================ INPUT ============================ */}
      <section className="mb-8 bg-card/70 backdrop-blur-sm rounded-md glow-cyan overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 bg-background/40">
          <div className="text-xs tracking-[0.25em] text-neon-cyan text-glow-cyan font-bold">
            // INPUT :: EDGE LIST (JSON ARRAY)
          </div>
          <div className="text-[10px] text-muted-foreground">
            ENDPOINT :: <span className="text-foreground break-all">{API_URL}</span>
          </div>
        </div>
        <div className="p-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            rows={6}
            className="w-full bg-background/60 border border-border focus:border-neon-cyan focus:outline-none focus:ring-0 rounded p-3 font-mono text-sm text-neon-cyan text-glow-cyan caret-neon-cyan resize-y"
            placeholder='["A->B", "A->C", "B->D"]'
          />

          {/* Live validation panel */}
          <ValidationPanel state={validation} />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading || validation.status !== "valid"}
              className={`group relative inline-flex items-center gap-2 px-6 py-3 bg-background/80 border border-neon-red text-neon-red text-glow-red font-bold tracking-[0.2em] text-sm rounded transition-all
                hover:bg-neon-red/10 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed
                glow-red animate-pulse-red`}
            >
              {loading ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-neon-red border-t-transparent rounded-full animate-spin" />
                  <span>▮ TRANSMITTING…</span>
                </>
              ) : (
                <>
                  <span>▶</span>
                  <span>INITIALIZE PIPELINE</span>
                </>
              )}
            </button>

            {error && (
              <button
                onClick={handleRetry}
                disabled={loading || validation.status !== "valid"}
                className="inline-flex items-center gap-2 px-4 py-3 bg-background/80 border border-neon-amber text-neon-amber text-glow-amber font-bold tracking-[0.2em] text-xs rounded transition-all hover:bg-neon-amber/10 disabled:opacity-50 disabled:cursor-not-allowed glow-amber"
                title="Retry the last request"
              >
                <span>↻</span>
                <span>RETRY</span>
              </button>
            )}

            <button
              onClick={handleClearConsole}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-3 bg-background/80 border border-border text-muted-foreground hover:text-neon-cyan hover:border-neon-cyan font-bold tracking-[0.2em] text-xs rounded transition-all disabled:opacity-50"
              title="Reset input, logs, and error state"
            >
              <span>⌫</span>
              <span>CLEAR CONSOLE</span>
            </button>

            <div className="text-[11px] text-muted-foreground">
              POST :: <span className="text-neon-cyan">{`{ "data": [...] }`}</span>
            </div>
          </div>

          {loading && (
            <div className="mt-4 h-1 w-full bg-background/60 overflow-hidden rounded">
              <div className="h-full w-1/3 bg-neon-cyan glow-cyan animate-scan" />
            </div>
          )}

          {error && (
            <div className="mt-4 relative bg-background/80 border border-neon-red rounded p-4 glow-red animate-pulse-red overflow-hidden">
              <div className="absolute inset-0 scanlines opacity-40 pointer-events-none" />
              <div className="text-xs tracking-[0.25em] text-neon-red text-glow-red font-bold mb-1">
                ✕ [ ERROR :: PIPELINE FAILURE ]
              </div>
              <div className="text-sm text-neon-red text-glow-red break-words">{error}</div>
              <div className="text-[10px] text-muted-foreground mt-2">
                // CHECK API_URL CONSTANT, NETWORK CONNECTION, AND INPUT FORMAT.
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleRetry}
                  disabled={loading || validation.status !== "valid"}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-background/80 border border-neon-amber text-neon-amber text-glow-amber font-bold tracking-[0.2em] text-[10px] rounded hover:bg-neon-amber/10 disabled:opacity-50"
                >
                  ↻ RETRY
                </button>
                <button
                  onClick={handleClearConsole}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-background/80 border border-border text-muted-foreground hover:text-neon-cyan hover:border-neon-cyan font-bold tracking-[0.2em] text-[10px] rounded"
                >
                  ⌫ CLEAR CONSOLE
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ============================ DASHBOARD ============================ */}
      {data && !error && (
        <>
          {/* Action bar */}
          <section className="mb-6 flex flex-wrap items-center gap-3">
            <button
              onClick={handleCopyJson}
              className="inline-flex items-center gap-2 px-4 py-2 bg-background/80 border border-neon-cyan text-neon-cyan text-glow-cyan font-bold tracking-[0.2em] text-xs rounded glow-cyan hover:bg-neon-cyan/10 transition-all"
              title="Copy raw API response JSON to clipboard"
            >
              <span>{copied ? "✓" : "⎘"}</span>
              <span>{copied ? "COPIED TO CLIPBOARD" : "COPY RAW JSON"}</span>
            </button>
            <button
              onClick={toggleAllTrees}
              className="inline-flex items-center gap-2 px-4 py-2 bg-background/80 border border-border text-muted-foreground hover:text-neon-cyan hover:border-neon-cyan font-bold tracking-[0.2em] text-xs rounded transition-all"
              title="Collapse or expand all hierarchy trees"
            >
              <span>{allCollapsed ? "▸" : "▾"}</span>
              <span>{allCollapsed ? "EXPAND ALL TREES" : "COLLAPSE ALL TREES"}</span>
            </button>
            <button
              onClick={handleClearConsole}
              className="inline-flex items-center gap-2 px-4 py-2 bg-background/80 border border-border text-muted-foreground hover:text-neon-red hover:border-neon-red font-bold tracking-[0.2em] text-xs rounded transition-all ml-auto"
              title="Reset input, logs, and error state"
            >
              <span>⌫</span>
              <span>CLEAR CONSOLE</span>
            </button>
          </section>

          {/* Stat cards */}
          <section className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="TOTAL_TREES"
              value={data.total_trees ?? "—"}
              tone="cyan"
            />
            <StatCard
              label="TOTAL_CYCLES"
              value={data.total_cycles ?? 0}
              tone="red"
              pulse={(data.total_cycles ?? 0) > 0}
            />
            <StatCard
              label="LARGEST_TREE_ROOT"
              value={data.largest_tree_root ?? "—"}
              tone="amber"
            />
          </section>

          {/* Hierarchies */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg sm:text-xl tracking-[0.25em] text-neon-cyan text-glow-cyan font-bold">
                // HIERARCHIES
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-neon-cyan/60 to-transparent" />
              <div className="text-[10px] text-muted-foreground">
                COUNT :: {(data.hierarchies?.length ?? 0).toString().padStart(2, "0")}
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {(data.hierarchies ?? []).map((h, i) => (
                <HierarchyCard
                  key={`${h.root}-${i}-${collapseSignal}-${allCollapsed ? "c" : "e"}`}
                  h={h}
                  index={i}
                  initialCollapsed={allCollapsed}
                />
              ))}
              {(data.hierarchies ?? []).length === 0 && (
                <div className="text-muted-foreground italic">// NO HIERARCHIES RETURNED</div>
              )}
            </div>
          </section>

          {/* System logs */}
          <section className="mb-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h2 className="text-lg sm:text-xl tracking-[0.25em] text-neon-red text-glow-red font-bold">
                // SYSTEM LOGS
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-neon-red/60 to-transparent" />
              <div role="tablist" aria-label="Log filter" className="inline-flex rounded border border-border overflow-hidden text-[10px] tracking-[0.25em] font-bold">
                {(["all", "invalid", "duplicate"] as const).map((f) => {
                  const active = logFilter === f;
                  const label =
                    f === "all" ? "ALL" : f === "invalid" ? "INVALID" : "DUPLICATES";
                  return (
                    <button
                      key={f}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setLogFilter(f)}
                      className={`px-3 py-1.5 transition-colors ${
                        active
                          ? f === "invalid"
                            ? "bg-neon-amber/20 text-neon-amber text-glow-amber"
                            : f === "duplicate"
                              ? "bg-neon-red/20 text-neon-red text-glow-red"
                              : "bg-neon-cyan/20 text-neon-cyan text-glow-cyan"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div
              className={`grid gap-4 ${
                logFilter === "all" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
              }`}
            >
              {(logFilter === "all" || logFilter === "invalid") && (
                <LogPanel
                  title="INVALID_ENTRIES"
                  items={data.invalid_entries ?? []}
                  tone="amber"
                />
              )}
              {(logFilter === "all" || logFilter === "duplicate") && (
                <LogPanel
                  title="DUPLICATE_EDGES"
                  items={data.duplicate_edges ?? []}
                  tone="red"
                />
              )}
            </div>
          </section>
        </>
      )}

      {/* ============================ FOOTER ============================ */}
      <footer className="mt-12 pt-4 border-t border-border/60 text-[10px] tracking-[0.3em] text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
        <span>© HAWKINS-LAB // {new Date().getFullYear()}</span>
        <span>UPLINK :: SECURE</span>
        <span>SIGNAL :: <span className="text-neon-cyan">●●●●●</span></span>
        <span className="ml-auto animate-blink">_</span>
      </footer>
    </main>
  );
};

export default Index;