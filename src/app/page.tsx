"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import Graph from "@/components/Graph";
import InfoPanel from "@/components/InfoPanel";
import { GraphData, GraphNode } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/colors";

const SUGGESTIONS = [
  "Quantum Entanglement",
  "Renaissance",
  "Black Holes",
  "Stoicism",
  "CRISPR",
  "Silk Road",
];

const LEGEND_CATEGORIES = (
  Object.entries(CATEGORY_COLORS) as [string, { fill: string; label: string }][]
).filter(([key]) => key !== "root");

function WikiGraphApp() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGraphView = graphData !== null;

  // Load from URL on mount
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !graphData) {
      handleSearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "/" shortcut to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes(
          (e.target as HTMLElement)?.tagName ?? ""
        )
      ) {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>(
          'input[type="text"]'
        );
        input?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = useCallback(
    async (query: string) => {
      setLoading(true);
      setError(null);
      setSelectedNode(null);

      try {
        const res = await fetch(
          `/api/wiki?title=${encodeURIComponent(query)}`
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch topic");
        }
        const data: GraphData = await res.json();
        setGraphData(data);
        router.replace(`?q=${encodeURIComponent(query)}`, { scroll: false });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
  }, []);

  const handleExpand = useCallback(
    async (node: GraphNode) => {
      if (!graphData || node.expanded) return;

      setLoading(true);
      try {
        const res = await fetch(
          `/api/wiki?title=${encodeURIComponent(node.id)}`
        );
        if (!res.ok) throw new Error("Failed to expand");
        const newData: GraphData = await res.json();

        setGraphData((prev) => {
          if (!prev) return prev;

          const existingIds = new Set(prev.nodes.map((n) => n.id));
          const newNodes: GraphNode[] = [];
          const newLinks = [...prev.links];

          for (const n of newData.nodes) {
            if (n.depth === 0) continue; // skip the root of the expansion
            if (existingIds.has(n.id)) {
              // Just add the link, no duplicate node
              newLinks.push({
                source: node.id,
                target: n.id,
                strength: 0.6,
              });
            } else {
              existingIds.add(n.id);
              const depthOffset = node.depth + 1;
              const size =
                depthOffset === 2
                  ? 10 + Math.round(Math.random() * 4)
                  : 8 + Math.round(Math.random() * 2);
              newNodes.push({
                ...n,
                depth: depthOffset,
                size,
              });
              newLinks.push({
                source: node.id,
                target: n.id,
                strength: 0.6,
              });
            }
          }

          // Mark clicked node as expanded
          const updatedNodes = prev.nodes.map((n) =>
            n.id === node.id ? { ...n, expanded: true } : n
          );

          return {
            nodes: [...updatedNodes, ...newNodes],
            links: newLinks,
          };
        });

        setSelectedNode((prev) =>
          prev?.id === node.id ? { ...prev, expanded: true } : prev
        );
      } catch {
        setError("Failed to expand node");
      } finally {
        setLoading(false);
      }
    },
    [graphData]
  );

  const handleClear = useCallback(() => {
    setGraphData(null);
    setSelectedNode(null);
    setError(null);
    router.replace("/", { scroll: false });
  }, [router]);

  const nodeCount = graphData?.nodes.length ?? 0;

  // Dynamic page title
  useEffect(() => {
    const q = searchParams.get("q");
    document.title = q
      ? `${q} — WikiGraph`
      : "WikiGraph — Explore Knowledge Visually";
  }, [searchParams]);

  // Auto-dismiss error after 5s
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">
      {/* Error toast */}
      {error && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 glass rounded-card shadow-soft border border-border px-5 py-3 text-sm text-foreground animate-fade-in max-w-sm text-center">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 text-muted hover:text-foreground"
          >
            &times;
          </button>
        </div>
      )}

      {/* Full-page loading overlay (initial search only) */}
      {loading && !isGraphView && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-background/80">
          <svg
            className="animate-spin text-muted mb-4"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-muted">Loading topic&hellip;</p>
        </div>
      )}

      {/* ===== LANDING STATE ===== */}
      {!isGraphView && (
        <div className="flex flex-col items-center justify-center h-full px-6">
          <div className="w-full max-w-xl flex flex-col items-center gap-6 animate-stagger">
            <h1
              className="text-4xl md:text-5xl font-semibold text-foreground tracking-tight opacity-0"
              style={{ animation: "fadeInUp 600ms cubic-bezier(0.4,0,0.2,1) forwards" }}
            >
              WikiGraph
            </h1>
            <p
              className="text-muted text-lg opacity-0"
              style={{
                animation:
                  "fadeInUp 600ms cubic-bezier(0.4,0,0.2,1) 80ms forwards",
              }}
            >
              Explore knowledge, visually
            </p>
            <div
              className="w-full opacity-0"
              style={{
                animation:
                  "fadeInUp 600ms cubic-bezier(0.4,0,0.2,1) 150ms forwards",
              }}
            >
              <SearchBar onSearch={handleSearch} loading={loading} />
            </div>
            <div
              className="flex flex-wrap justify-center gap-2 opacity-0"
              style={{
                animation:
                  "fadeInUp 600ms cubic-bezier(0.4,0,0.2,1) 300ms forwards",
              }}
            >
              <span className="text-sm text-light mr-1">Try:</span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSearch(s)}
                  className="px-3.5 py-1.5 text-sm rounded-chip bg-black/[0.03] text-muted hover:bg-black/[0.06] hover:text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== GRAPH STATE ===== */}
      {isGraphView && (
        <>
          {/* Graph (behind everything) */}
          <Graph
            data={graphData}
            onNodeClick={handleNodeClick}
          />

          {/* Search bar (top) */}
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4">
            <SearchBar
              onSearch={handleSearch}
              compact
              loading={loading}
            />
          </div>

          {/* Node count badge (bottom-left) */}
          <div className="fixed bottom-4 left-4 md:bottom-5 md:left-5 z-30 glass rounded-card shadow-glass border border-border px-3 py-2 md:px-4 md:py-2.5 flex items-center gap-3 text-sm">
            <span className="text-foreground font-medium">
              {nodeCount} concepts
            </span>
            <button
              onClick={handleClear}
              className="text-muted hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Color legend (bottom-right) */}
          <div className="fixed bottom-5 right-5 z-30 glass rounded-card shadow-glass border border-border px-4 py-3 hidden md:block">
            <div className="flex flex-col gap-1.5">
              {LEGEND_CATEGORIES.map(([key, { fill, label }]) => (
                <div key={key} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: fill }}
                  />
                  <span className="text-xs text-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Info panel */}
          {selectedNode && (
            <InfoPanel
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onExpand={handleExpand}
            />
          )}
        </>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeInUp 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <WikiGraphApp />
    </Suspense>
  );
}
