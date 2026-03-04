import { NextRequest, NextResponse } from "next/server";
import { fetchPageData, fetchSummary, detectCategory } from "@/lib/wikipedia";
import { GraphData, GraphNode, GraphLink } from "@/lib/types";

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title");

  if (!title) {
    return NextResponse.json(
      { error: "Missing ?title= parameter" },
      { status: 400 }
    );
  }

  try {
    const trimmed = title.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: "Search term cannot be empty" },
        { status: 400 }
      );
    }

    const rootData = await fetchPageData(trimmed);

    const rootNode: GraphNode = {
      id: rootData.summary.title,
      label: rootData.summary.title,
      summary: rootData.summary.extract,
      thumbnail: rootData.summary.thumbnail,
      category: "root",
      depth: 0,
      expanded: true,
      size: 24,
    };

    const existingIds = new Set([rootNode.id]);

    // Fetch summaries + categories for each linked topic in parallel
    const childResults = await Promise.allSettled(
      rootData.links.map(async (linkTitle, index) => {
        const [summary, category] = await Promise.all([
          fetchSummary(linkTitle),
          detectCategory(linkTitle),
        ]);
        return { summary, category, index };
      })
    );

    const nodes: GraphNode[] = [rootNode];
    const links: GraphLink[] = [];

    for (const result of childResults) {
      if (result.status !== "fulfilled") continue;

      const { summary, category, index } = result.value;

      // Skip if already added (dedup by resolved title)
      if (existingIds.has(summary.title)) continue;
      existingIds.add(summary.title);

      // Size varies slightly for visual interest
      const size = 12 + Math.round(Math.random() * 6);

      // Strength: earlier in intro = stronger link (0.9 down to 0.5)
      const strength =
        0.9 - (index / rootData.links.length) * 0.4;

      nodes.push({
        id: summary.title,
        label: summary.title,
        summary: summary.extract,
        thumbnail: summary.thumbnail,
        category,
        depth: 1,
        expanded: false,
        size,
      });

      links.push({
        source: rootNode.id,
        target: summary.title,
        strength: Math.round(strength * 100) / 100,
      });
    }

    const data: GraphData = { nodes, links };
    return NextResponse.json(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("404")) {
      return NextResponse.json(
        { error: `Topic not found: "${title}"` },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: msg || "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
