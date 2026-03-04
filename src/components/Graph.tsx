/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { GraphData, GraphNode } from "@/lib/types";
import { getCategoryColor } from "@/lib/colors";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface GraphProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
}

export default function Graph({ data, onNodeClick, onNodeHover }: GraphProps) {
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
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

      // Use smaller visual radii (node.size is in graph coords)
      const baseR = category === "root" ? 8 : 5;
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
      //   - Root node: always
      //   - Hovered or connected to hovered: always
      //   - All others: only when zoomed in close (globalScale > 1.5)
      const isRoot = category === "root";
      const showLabel = isRoot || hovered || (hoveredNodeId != null && connected) || globalScale > 1.5;

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
      ref={graphRef}
      graphData={data}
      width={dimensions.width}
      height={dimensions.height}
      backgroundColor="#FAFAF9"
      nodeCanvasObject={drawNode}
      nodePointerAreaPaint={(node: any, color, ctx) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }}
      linkCanvasObject={drawLink}
      onNodeClick={handleNodeClick}
      onNodeHover={handleNodeHover}
      enablePanInteraction={true}
      enableZoomInteraction={true}
      enableNodeDrag={true}
      nodeId="id"
    />
  );
}
