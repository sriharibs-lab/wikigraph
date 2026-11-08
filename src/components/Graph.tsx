/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import dynamic from "next/dynamic";
import { GraphData, GraphNode } from "@/lib/types";
import { getCategoryColor } from "@/lib/colors";
import { forceCollide, forceX, forceY } from "d3-force";

// next/dynamic's LoadableComponent swallows `ref`, so the instance ref is
// passed as a plain prop (`forwardedRef`) and attached inside the chunk.
// Without this `graphRef` stays null and zoomToFit / d3Force never run.
const ForceGraph2D = dynamic(
  () =>
    import("react-force-graph-2d").then((mod) => {
      const FG = mod.default as any;
      return function ForceGraphWithRef({
        forwardedRef,
        ...props
      }: { forwardedRef: React.Ref<any> } & Record<string, any>) {
        return <FG {...props} ref={forwardedRef} />;
      };
    }),
  { ssr: false }
);

/**
 * Visual radius (px at scale 1) from the API-assigned `size`:
 * root 24 -> ~11, depth-1 12..18 -> ~5.5..8, depth-2 10..14 -> ~4.5..6.3,
 * deeper 8..10 -> ~4..4.5.
 */
function nodeRadius(node: any): number {
  const size = typeof node?.size === "number" ? node.size : 10;
  if (node?.category === "root" || node?.depth === 0) return 11;
  return Math.max(4, Math.min(8, size * 0.45));
}

interface GraphProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
}

export default function Graph({ data, onNodeClick, onNodeHover }: GraphProps) {
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  // Fit-to-view bookkeeping: fit once per new search / expand, never on tick.
  const pendingFitRef = useRef(false);
  const fitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fitKey = useMemo(() => {
    const root = data.nodes.find((n) => n.depth === 0)?.id ?? "";
    return `${root}::${data.nodes.length}`;
  }, [data.nodes]);

  const runFit = useCallback(() => {
    if (!pendingFitRef.current) return;
    const fg = graphRef.current;
    if (!fg) return;
    pendingFitRef.current = false;
    if (fitTimerRef.current) {
      clearTimeout(fitTimerRef.current);
      fitTimerRef.current = null;
    }
    // Mobile: top search bar (~70px) and bottom badge (~56px) overlay the
    // canvas, so leave more room; the bottom sheet only appears after a tap.
    // Padding is uniform, so it must clear the tallest overlay: the floating
    // search bar (~70px) plus a label row under the lowest node. Labels are
    // not part of the fitted bounds, so phones get extra room on the sides.
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    fg.zoomToFit(400, isMobile ? 84 : 110);
  }, []);

  // Configure forces + schedule a fit whenever the graph content changes.
  useEffect(() => {
    pendingFitRef.current = true;
    let cancelled = false;
    let tries = 0;

    function configure() {
      if (cancelled) return;
      const fg = graphRef.current;
      if (!fg) {
        if (tries++ < 120) requestAnimationFrame(configure);
        return;
      }
      fg.d3Force("link")?.distance((link: any) => {
        const sd = link.source?.depth ?? 0;
        const td = link.target?.depth ?? 1;
        const d = Math.min(sd, td);
        return d === 0 ? 110 : d === 1 ? 70 : 50;
      });
      fg.d3Force("charge")?.strength(-320).distanceMax(600);
      // Shape the cluster to the viewport: a portrait phone gets a tall
      // ellipse (pull x in harder than y), landscape gets a wide one.
      const portrait =
        typeof window !== "undefined" && window.innerWidth < window.innerHeight;
      fg.d3Force("x", forceX(0).strength(portrait ? 0.55 : 0.02));
      fg.d3Force("y", forceY(0).strength(portrait ? 0.005 : 0.06));
      fg.d3Force(
        "collide",
        forceCollide((node: any) => nodeRadius(node) + (portrait ? 22 : 14))
      );
      fg.d3ReheatSimulation();
    }
    configure();

    // Fallback: if the engine has not stopped within ~1.5s, fit anyway.
    fitTimerRef.current = setTimeout(runFit, 1500);

    return () => {
      cancelled = true;
      if (fitTimerRef.current) {
        clearTimeout(fitTimerRef.current);
        fitTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Connected link lookup for hover highlighting
  const connectedLinks = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const link of data.links) {
      const src = typeof link.source === "object" ? (link.source as any).id : link.source;
      const tgt = typeof link.target === "object" ? (link.target as any).id : link.target;
      if (!map.has(src)) map.set(src, new Set());
      if (!map.has(tgt)) map.set(tgt, new Set());
      map.get(src)!.add(tgt);
      map.get(tgt)!.add(src);
    }
    return map;
  }, [data.links]);

  // Responsive sizing
  useEffect(() => {
    function update() {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isConnected = useCallback(
    (nodeId: string) => {
      if (!hoveredNodeId) return false;
      if (nodeId === hoveredNodeId) return true;
      return connectedLinks.get(hoveredNodeId)?.has(nodeId) ?? false;
    },
    [hoveredNodeId, connectedLinks]
  );

  const handleNodeHover = useCallback(
    (node: any) => {
      setHoveredNodeId(node?.id ?? null);
      onNodeHover?.(node as GraphNode | null);
    },
    [onNodeHover]
  );

  const handleNodeClick = useCallback(
    (node: any) => {
      onNodeClick?.(node as GraphNode);
    },
    [onNodeClick]
  );

  // Custom node rendering
  const drawNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const { x, y, id, label, category, expanded } = node;
      if (x == null || y == null) return;

      const colors = getCategoryColor(category);
      const hovered = hoveredNodeId === id;
      const connected = isConnected(id);
      const dimmed = hoveredNodeId != null && !connected;

      const baseR = nodeRadius(node);
      const r = hovered ? baseR + 1.5 : baseR;
      const alpha = dimmed ? 0.3 : 1;

      ctx.globalAlpha = alpha;

      // Shadow on hover
      if (hovered) {
        ctx.shadowColor = "rgba(0,0,0,0.15)";
        ctx.shadowBlur = 8;
      }

      // Filled circle
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = colors.fill;
      ctx.fill();

      // Stroke
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      // Expanded ring
      if (expanded && category !== "root") {
        ctx.beginPath();
        ctx.arc(x, y, r + 2, 0, Math.PI * 2);
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1 / globalScale;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Label — show selectively to avoid overlap:
      //   - Root and depth-1 nodes: always
      //   - Hovered or connected to hovered: always
      //   - Deeper nodes: only when zoomed in (globalScale > 1.4)
      const isRoot = category === "root";
      const showLabel =
        isRoot ||
        (node.depth ?? 1) <= 1 ||
        hovered ||
        (hoveredNodeId != null && connected) ||
        globalScale > 1.4;

      if (showLabel) {
        const fontSize = Math.min(12 / globalScale, 14);
        if (fontSize >= 2) {
          ctx.font = `500 ${fontSize}px -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";

          // Background pill behind label for readability
          let displayLabel = label ?? id;
          if (displayLabel.length > 20) {
            displayLabel = displayLabel.slice(0, 19) + "\u2026";
          }

          const textWidth = ctx.measureText(displayLabel).width;
          const padX = 3 / globalScale;
          const padY = 1.5 / globalScale;
          const labelY = y + r + 3;

          ctx.fillStyle = "rgba(250,250,249,0.85)";
          ctx.beginPath();
          ctx.roundRect(
            x - textWidth / 2 - padX,
            labelY - padY,
            textWidth + padX * 2,
            fontSize + padY * 2,
            2 / globalScale
          );
          ctx.fill();

          ctx.fillStyle = dimmed
            ? "rgba(26,26,26,0.25)"
            : hovered
              ? "rgba(26,26,26,0.9)"
              : "rgba(26,26,26,0.65)";
          ctx.fillText(displayLabel, x, labelY);
        }
      }

      ctx.globalAlpha = 1;
    },
    [hoveredNodeId, isConnected]
  );

  // Custom link rendering
  const drawLink = useCallback(
    (link: any, ctx: CanvasRenderingContext2D) => {
      const src = link.source;
      const tgt = link.target;
      if (src?.x == null || tgt?.x == null) return;

      const srcId = src.id ?? src;
      const tgtId = tgt.id ?? tgt;
      const linked =
        hoveredNodeId != null &&
        (srcId === hoveredNodeId || tgtId === hoveredNodeId);
      const dimmed = hoveredNodeId != null && !linked;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = dimmed
        ? "rgba(0,0,0,0.03)"
        : linked
          ? "rgba(0,0,0,0.18)"
          : "rgba(0,0,0,0.07)";
      ctx.lineWidth = linked ? 1.5 : 0.8;
      ctx.stroke();
    },
    [hoveredNodeId]
  );

  if (dimensions.width === 0) return null;

  return (
    <ForceGraph2D
      forwardedRef={graphRef}
      graphData={data}
      width={dimensions.width}
      height={dimensions.height}
      backgroundColor="#FAFAF9"
      nodeCanvasObject={drawNode}
      nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(10, nodeRadius(node) + 4), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }}
      linkCanvasObject={drawLink}
      onNodeClick={handleNodeClick}
      onNodeHover={handleNodeHover}
      onEngineStop={runFit}
      warmupTicks={40}
      cooldownTime={4000}
      d3AlphaDecay={0.04}
      d3VelocityDecay={0.35}
      enablePanInteraction={true}
      enableZoomInteraction={true}
      enableNodeDrag={true}
      nodeId="id"
    />
  );
}
