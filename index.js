import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Validate format: single uppercase letter -> single uppercase letter, no self-loops */
function isValidEdge(str) {
  return /^[A-Z]->[A-Z]$/.test(str);
}

/**
 * Build the directed graph from the data array.
 * Returns { adjList, invalid_entries, duplicate_edges }
 */
function buildGraph(data) {
  const invalid_entries = [];
  const duplicate_edges = [];

  // adjList[parent] = [child, ...]
  const adjList = {};
  // Track which edges we have already added (for duplicate detection)
  const seenEdges = new Set();
  // Track which nodes have already been assigned a parent (first-parent-wins)
  const childParent = {}; // child -> parent that "won"

  for (const raw of data) {
    const str = String(raw).trim();

    // --- Validate ---
    if (!isValidEdge(str)) {
      invalid_entries.push(raw);
      continue;
    }

    const [src, dst] = str.split("->");

    // Self-loop check (already excluded by regex, but belt-and-suspenders)
    if (src === dst) {
      invalid_entries.push(raw);
      continue;
    }

    // --- Duplicate edge check ---
    if (seenEdges.has(str)) {
      duplicate_edges.push(str);
      continue;
    }
    seenEdges.add(str);

    // --- First-parent-wins for children ---
    if (childParent.hasOwnProperty(dst)) {
      // dst already has a parent; discard this edge
      duplicate_edges.push(str);
      continue;
    }

    // Accept the edge
    childParent[dst] = src;
    if (!adjList[src]) adjList[src] = [];
    adjList[src].push(dst);
    // Make sure dst exists in adjList even if it has no children
    if (!adjList[dst]) adjList[dst] = [];
  }

  return { adjList, childParent, invalid_entries, duplicate_edges };
}

/**
 * Identify roots from the graph.
 * A root is a node that never appears as a child.
 */
function findRoots(adjList, childParent) {
  const allNodes = new Set(Object.keys(adjList));
  const children = new Set(Object.keys(childParent));
  const roots = [];
  for (const node of allNodes) {
    if (!children.has(node)) {
      roots.push(node);
    }
  }
  return roots.sort(); // lexicographic order
}

/**
 * Find all strongly connected components using Tarjan's algorithm.
 * We only need to identify pure-cycle groups (nodes with no natural root).
 */
function findSCCs(adjList) {
  const nodes = Object.keys(adjList);
  const index = {};
  const lowlink = {};
  const onStack = {};
  const stack = [];
  const sccs = [];
  let idx = 0;

  function strongconnect(v) {
    index[v] = lowlink[v] = idx++;
    stack.push(v);
    onStack[v] = true;

    for (const w of (adjList[v] || [])) {
      if (!index.hasOwnProperty(w)) {
        strongconnect(w);
        lowlink[v] = Math.min(lowlink[v], lowlink[w]);
      } else if (onStack[w]) {
        lowlink[v] = Math.min(lowlink[v], index[w]);
      }
    }

    if (lowlink[v] === index[v]) {
      const scc = [];
      let w;
      do {
        w = stack.pop();
        onStack[w] = false;
        scc.push(w);
      } while (w !== v);
      sccs.push(scc);
    }
  }

  for (const n of nodes) {
    if (!index.hasOwnProperty(n)) {
      strongconnect(n);
    }
  }

  return sccs;
}

/**
 * DFS to build the tree object and detect cycles.
 * Returns { tree, depth, hasCycle }
 */
function dfsTree(node, adjList, visited, recStack) {
  if (recStack.has(node)) {
    return { tree: null, depth: 0, hasCycle: true };
  }
  if (visited.has(node)) {
    // Already processed in this traversal path; treat as leaf (no re-expansion)
    return { tree: {}, depth: 1, hasCycle: false };
  }

  visited.add(node);
  recStack.add(node);

  const children = adjList[node] || [];
  const treeObj = {};
  let maxChildDepth = 0;

  for (const child of children) {
    const result = dfsTree(child, adjList, visited, recStack);
    if (result.hasCycle) {
      recStack.delete(node);
      return { tree: null, depth: 0, hasCycle: true };
    }
    treeObj[child] = result.tree;
    if (result.depth > maxChildDepth) maxChildDepth = result.depth;
  }

  recStack.delete(node);
  return { tree: treeObj, depth: maxChildDepth + 1, hasCycle: false };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get("/", (req, res) => {
  res.status(200).json({
    system: "BFHL Neural Grid API",
    status: "Online",
    endpoint: "POST /bfhl",
    message: "Send a POST request to /bfhl to initialize the pipeline.",
    author: "J Joshua Haniel",
    email: "jj9568@srmist.edu.in",
    roll: "RA2311003040056",
  });
});

app.post("/bfhl", (req, res) => {
  const { data } = req.body || {};

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: "data must be an array" });
  }

  // 1. Build graph
  const { adjList, childParent, invalid_entries, duplicate_edges } =
    buildGraph(data);

  // 2. Find natural roots
  let roots = findRoots(adjList, childParent);

  // 3. Find nodes that belong to pure-cycle groups (no natural root)
  //    Use SCCs: any SCC with size > 1 that has no external incoming edges
  //    OR self-referential single-node SCC... but self-loops are invalid, so
  //    we only worry about multi-node cycles.
  //    Actually, an SCC entirely within nodes that have no natural root =
  //    pure cycle group.
  const naturallyRooted = new Set();
  function markReachable(node, visited) {
    if (visited.has(node)) return;
    visited.add(node);
    for (const child of adjList[node] || []) markReachable(child, visited);
  }
  for (const r of roots) markReachable(r, naturallyRooted);

  // Nodes not reachable from any natural root
  const unreachableNodes = Object.keys(adjList).filter(
    (n) => !naturallyRooted.has(n)
  );

  // Among unreachable nodes, find SCCs (they form cycle groups)
  // Build sub-adjList for unreachable nodes
  const subAdj = {};
  for (const n of unreachableNodes) {
    subAdj[n] = (adjList[n] || []).filter((c) => !naturallyRooted.has(c));
  }
  const sccs = findSCCs(subAdj);

  // For each SCC (cycle group), pick lexicographically smallest as synthetic root
  const syntheticRoots = [];
  for (const scc of sccs) {
    if (scc.length === 0) continue;
    const sortedScc = [...scc].sort();
    syntheticRoots.push(sortedScc[0]);
  }

  // All roots (natural + synthetic), sorted lexicographically
  const allRoots = [...roots, ...syntheticRoots].sort();

  // 4. Traverse each root, build hierarchy entries
  const hierarchies = [];
  const globalVisited = new Set();

  let total_trees = 0;
  let total_cycles = 0;
  let largest_tree_root = null;
  let largest_tree_depth = -1;

  for (const root of allRoots) {
    const recStack = new Set();
    const localVisited = new Set();
    const { tree, depth, hasCycle } = dfsTree(
      root,
      adjList,
      localVisited,
      recStack
    );

    // Merge into global visited
    for (const n of localVisited) globalVisited.add(n);

    if (hasCycle) {
      total_cycles++;
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      total_trees++;
      hierarchies.push({ root, tree, depth });

      if (
        depth > largest_tree_depth ||
        (depth === largest_tree_depth &&
          (largest_tree_root === null || root < largest_tree_root))
      ) {
        largest_tree_depth = depth;
        largest_tree_root = root;
      }
    }
  }

  // 5. Build response
  const response = {
    user_id: "jjoshuahaniel_09012006",
    email_id: "jj9568@srmist.edu.in",
    college_roll_number: "RA2311003040056",
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees,
      total_cycles,
      largest_tree_root,
    },
  };

  return res.status(200).json(response);
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Synapse Parser API running on http://localhost:${PORT}`);
});
