import { NodeCategory } from "./types";

export const COLORS = {
  background: "#FAFAF9",
  text: "#1A1A1A",
  textMuted: "#8E8E93",
  textLight: "#AEAEB2",
  border: "rgba(0,0,0,0.06)",
} as const;

export const CATEGORY_COLORS: Record<
  NodeCategory,
  { fill: string; stroke: string; label: string }
> = {
  root: { fill: "#1A1A1A", stroke: "#1A1A1A", label: "Search Topic" },
  person: { fill: "#B8D4E3", stroke: "#89B4CE", label: "People" },
  place: { fill: "#B8E3C8", stroke: "#7CC99A", label: "Places" },
  concept: { fill: "#D4B8E3", stroke: "#B48CCC", label: "Concepts" },
  event: { fill: "#E3D4B8", stroke: "#CCBA8C", label: "Events" },
  science: { fill: "#B8C8E3", stroke: "#8CA4CC", label: "Science" },
  art: { fill: "#E3B8C8", stroke: "#CC8CA4", label: "Arts" },
  organization: { fill: "#C8E3E3", stroke: "#8CCCCC", label: "Organizations" },
  other: { fill: "#D5D5DA", stroke: "#AEAEB2", label: "Other" },
};

export function getCategoryColor(category: NodeCategory) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
}
