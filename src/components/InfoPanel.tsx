"use client";

import { useEffect, useRef } from "react";
import { GraphNode } from "@/lib/types";
import { getCategoryColor } from "@/lib/colors";

interface InfoPanelProps {
  node: GraphNode;
  onClose: () => void;
  onExpand: (node: GraphNode) => void;
}

export default function InfoPanel({ node, onClose, onExpand }: InfoPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    // Delay listener to avoid closing immediately from the click that opened it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  const colors = getCategoryColor(node.category);
  const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(node.id)}`;

  return (
    <>
      {/* Desktop: slide from right */}
      <div
        ref={panelRef}
        className="
          fixed z-40
          /* Desktop */
          max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:max-h-[50vh] max-md:rounded-t-[20px]
          /* Mobile bottom sheet */
          md:top-20 md:right-5 md:w-80 md:rounded-card
          glass shadow-soft border border-border
          overflow-y-auto
          animate-in
        "
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/[0.05] transition-colors text-muted"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="p-5">
          {/* Category badge */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: colors.fill }}
            />
            <span className="text-xs font-medium text-muted uppercase tracking-wide">
              {colors.label}
            </span>
          </div>

          {/* Thumbnail */}
          {node.thumbnail && (
            <div className="mb-4 rounded-xl overflow-hidden relative h-40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={node.thumbnail}
                alt={node.label}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Title */}
          <h2 className="text-lg font-semibold text-foreground leading-tight mb-2">
            {node.label}
          </h2>

          {/* Summary */}
          {node.summary && (
            <p className="text-sm text-muted leading-relaxed mb-5">
              {node.summary}
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            {!node.expanded && (
              <button
                onClick={() => onExpand(node)}
                className="
                  flex-1 px-4 py-2.5 rounded-xl text-sm font-medium
                  bg-foreground text-background
                  hover:opacity-90 transition-opacity
                "
              >
                Expand
              </button>
            )}
            <a
              href={wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="
                flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-center
                bg-black/[0.04] text-foreground
                hover:bg-black/[0.07] transition-colors
              "
            >
              Wikipedia &#x2197;
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-in {
          animation: slideIn 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @media (min-width: 768px) {
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        }
        @media (max-width: 767px) {
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(40px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        }
      `}</style>
    </>
  );
}
