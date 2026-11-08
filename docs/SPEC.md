> Original build brief given to Claude Code; kept as design spec.

# WikiGraph — Claude Code Build Prompt

## What This Is

You are building **WikiGraph**, a web app where users search any topic and see it as an interactive force-directed graph of connected concepts. Data comes from Wikipedia. Think "Google meets mind map" — a single search box that explodes into a visual knowledge constellation.

---

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **react-force-graph-2d** (graph rendering)
- **Tailwind CSS** (styling)
- **Wikipedia REST + Action API** (data source)

---

## Design System

### Typography
- Font stack: `-apple-system, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, sans-serif`
- Headings: weight 600, letter-spacing -0.03em
- Body: weight 400, letter-spacing -0.01em
- Keep text minimal. The graph IS the content.

### Colors (Pastel on Warm White)
```
Background:      #FAFAF9  (warm off-white)
Text:            #1A1A1A
Text muted:      #8E8E93
Text light:      #AEAEB2
Surface:         rgba(255,255,255,0.72) + backdrop-blur
Border:          rgba(0,0,0,0.06)

Node colors (pastel):
  Root/search topic:  #1A1A1A (dark, the anchor)
  People:             fill #B8D4E3, stroke #89B4CE
  Places:             fill #B8E3C8, stroke #7CC99A
  Concepts:           fill #D4B8E3, stroke #B48CCC
  Events:             fill #E3D4B8, stroke #CCBA8C
  Science:            fill #B8C8E3, stroke #8CA4CC
  Arts:               fill #E3B8C8, stroke #CC8CA4
  Organizations:      fill #C8E3E3, stroke #8CCCCC
  Other:              fill #D5D5DA, stroke #AEAEB2
```

### UI Style
- Glass-morphism on overlays: `background: rgba(255,255,255,0.88)`, `backdrop-filter: blur(20px) saturate(180%)`
- Border radius: 16px on cards/search, 20px on chips
- Shadows: soft and minimal, e.g. `0 4px 24px rgba(0,0,0,0.06)`
- Animations: cubic-bezier(0.4, 0, 0.2, 1), subtle fade-in-up on load
- The landing page is ultra-minimal like Google: title, one line, search box, suggestion chips. Nothing else.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main page (landing + graph view)
│   ├── layout.tsx            # Root layout with metadata
│   └── api/
│       └── wiki/
│           └── route.ts      # Wikipedia API proxy
├── components/
│   ├── Graph.tsx             # ForceGraph2D wrapper
│   ├── SearchBar.tsx         # Search input with autocomplete
│   └── InfoPanel.tsx         # Node detail sidebar
├── lib/
│   ├── types.ts              # TypeScript interfaces
│   ├── wikipedia.ts          # Wikipedia API service
│   ├── filters.ts            # Link filtering heuristics
│   └── colors.ts             # Design tokens and node color mapping
└── public/
    └── favicon.ico
```

---

## Data Types

```typescript
// lib/types.ts

export interface GraphNode {
  id: string;           // Wikipedia page title (URL-decoded)
  label: string;        // Display name
  summary?: string;     // Short extract from Wikipedia
  thumbnail?: string;   // Wikipedia thumbnail URL
  category: NodeCategory;
  depth: number;        // 0 = search root, 1 = first expansion, etc.
  expanded: boolean;
  size: number;         // Visual radius
}

export type NodeCategory =
  | "root" | "person" | "place" | "concept" | "event"
  | "science" | "art" | "organization" | "other";

export interface GraphLink {
  source: string;
  target: string;
  strength: number;     // 0-1
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
```

---

## Wikipedia API Service

```typescript
// lib/wikipedia.ts — implement these functions

// 1. Fetch page summary
// GET https://en.wikipedia.org/api/rest_v1/page/summary/{title}
// Returns: title, extract, thumbnail?.source, description
// Always send header: 'Api-User-Agent': 'WikiGraph/1.0 (educational project)'

// 2. Fetch links from intro section only
// GET https://en.wikipedia.org/w/api.php?action=parse&page={title}&prop=links&section=0&format=json
// Returns: parse.links[] where each has { *, ns }
// Filter: only keep ns === 0
// Then apply filtering heuristics (see below)
// Cap at 12 links max

// 3. Category detection (for node coloring)
// GET https://en.wikipedia.org/w/api.php?action=query&titles={title}&prop=categories&cllimit=20&format=json
// Use category names to infer NodeCategory:
//   - contains "people", "born in", "deaths" → "person"
//   - contains "cities", "countries", "geography" → "place"
//   - contains "events", "wars", "battles" → "event"
//   - contains "science", "physics", "biology", "chemistry", "mathematics" → "science"
//   - contains "art", "music", "literature", "film" → "art"
//   - contains "companies", "organizations" → "organization"
//   - default → "concept" (not "other" — most Wikipedia articles are concepts)
```

---

## Link Filtering Heuristics

```typescript
// lib/filters.ts

// These patterns should be EXCLUDED from the graph.
// They create noise without meaning.

const BLACKLIST_PATTERNS = [
  /^\d{1,4}$/,                    // Years: "1847", "2023"
  /^\d{1,2}(st|nd|rd|th)\s/i,    // "1st century", "3rd millennium"  
  /^(January|February|March|April|May|June|July|August|September|October|November|December)\s/i,
  /^List of/i,
  /\(disambiguation\)/i,
  /^ISO\s/,
  /^United States$/,              // Appears on nearly everything
  /^United Kingdom$/,
  /^Wikipedia:/,
  /^Category:/,
  /^File:/,
  /^Help:/,
  /^Template:/,
];

// A link passes if:
// 1. It doesn't match any blacklist pattern
// 2. Its namespace is 0
// 3. It hasn't already been added to the graph (dedup)
```

---

## Phase 1 Build Steps

Build these in order. Each step should result in working code before moving on.

### Step 1: Project Init
Initialize Next.js 14 with App Router, TypeScript, Tailwind. Install react-force-graph-2d. Set up the folder structure above. Configure tailwind.config.ts with the custom color tokens. Set up the root layout with the font stack and dark metadata theme-color.

### Step 2: Design Tokens + Types
Create `lib/colors.ts` with all the color constants and a `getCategoryColor(category)` function. Create `lib/types.ts` with the interfaces above.

### Step 3: Wikipedia Service + Filters
Create `lib/wikipedia.ts` and `lib/filters.ts`. The wikipedia service should export:
- `fetchPageData(title: string)` → returns summary, links, and inferred category
- All Wikipedia API calls should happen server-side (in the API route), never from the client

Make sure to handle Wikipedia API errors gracefully (page not found, network issues). URL-encode titles properly.

### Step 4: API Route
Create `app/api/wiki/route.ts`:
- GET `?title=SearchTerm`
- Fetches the root topic data
- Fetches summary for each linked topic (use Promise.allSettled, not Promise.all — some pages may fail)
- Returns `GraphData` JSON with:
  - Root node: depth 0, size 24, expanded true, category from detection
  - Child nodes: depth 1, size 12-18 (vary slightly for visual interest), expanded false
  - Links: strength based on position in the intro (earlier = stronger, range 0.5-0.9)
- Response should be fast. Set reasonable timeouts (5s per Wikipedia call).

### Step 5: Search Bar Component
Create `components/SearchBar.tsx`:
- Centered, large input with search icon (inline SVG, not an icon library)
- Glass-morphism container matching the design system
- States: empty, typing, loading (spinner), has-results
- On Enter: calls onSearch callback
- Clear button (×) when text is present
- Auto-focus on mount
- The search bar should accept a `compact` prop:
  - `compact={false}`: large, centered (landing page)
  - `compact={true}`: smaller, top-left or top-center (graph view)
- Add Wikipedia opensearch autocomplete:
  - GET `https://en.wikipedia.org/w/api.php?action=opensearch&search={query}&limit=5&format=json`
  - Show dropdown below input
  - Debounce 300ms
  - Click suggestion or arrow-key navigate + Enter to select

### Step 6: Graph Component
Create `components/Graph.tsx` using ForceGraph2D from react-force-graph-2d:
- **Canvas rendering** (not SVG) — this is the default for react-force-graph-2d
- Dark background: NO. Use `#FAFAF9` to match our warm white theme
- Use `backgroundColor` prop on ForceGraph2D
- Custom node rendering with `nodeCanvasObject`:
  - Draw filled circle with category fill color
  - Draw 1.5px stroke with category stroke color
  - Root node: filled with #1A1A1A, larger
  - On hover: slightly larger, stronger shadow, brighter
  - Draw label below node: 11px, weight 500, color rgba(26,26,26,0.72)
  - Truncate labels longer than 18 chars
- Custom link rendering with `linkCanvasObject` or `linkColor`/`linkWidth`:
  - Color: rgba(0,0,0,0.07), on hover rgba(0,0,0,0.18)
  - Width: based on link strength (0.5 to 2px range)
- Force configuration:
  - Charge: -300
  - Link distance: 150
  - Center force: enabled
  - Collision radius: node size + 10
- Graph should fill the entire viewport behind the search bar
- Enable zoom, pan, drag (these are default behaviors)
- `onNodeClick` → callback to parent
- `onNodeHover` → highlight node and connected links
- Responsive: use a ResizeObserver or `width={window.innerWidth}` with resize listener
- Add a subtle dot-grid background (draw in `onRenderFramePre` callback):
  - Tiny dots (0.6px radius) every 24px
  - Color: rgba(0,0,0,0.03)

### Step 7: Info Panel
Create `components/InfoPanel.tsx`:
- Slides in from the right on desktop (top 80px, right 20px, width 320px)
- Bottom sheet style on mobile (bottom 0, full width, max-height 50vh)
- Glass-morphism background
- Shows: category badge with colored dot, title, summary text, thumbnail if available
- Two buttons: "Expand" (dark bg) and "Wikipedia ↗" (light bg, opens in new tab)
- Close button (×) in top right
- Animate in with translateX on desktop, translateY on mobile
- Click outside to close

### Step 8: Main Page Assembly
Wire everything together in `app/page.tsx`:
- Two visual states:
  1. **Landing** (no search yet): centered title "WikiGraph", subtitle "Explore knowledge, visually", large search bar, suggestion chips below ("Try: Quantum Entanglement, Renaissance, Black Holes, Stoicism, CRISPR, Silk Road")
  2. **Graph view** (after search): search bar shrinks to top, graph fills viewport, info panel available
- Smooth transition between states (CSS transitions, 500ms)
- Suggestion chips: clicking one immediately triggers search
- Node count badge: bottom-left, shows "N concepts" + "Clear" button
- Color legend: bottom-right, small dots with labels for each category
- Keyboard shortcut: "/" focuses search bar (add global keydown listener)
- URL state: update URL to `?q=SearchTerm` on search, read from URL on page load

### Step 9: Click-to-Expand (Rabbit Hole)
This is the killer feature. When a user clicks an unexpanded node:
1. Fetch that node's data from `/api/wiki?title={nodeId}`
2. Merge new nodes into existing graph (don't replace):
   - If a new node already exists in the graph, just add the link (no duplicate nodes)
   - New nodes get depth = clicked node's depth + 1
   - New nodes get slightly smaller size (depth 2 = size 10-14, depth 3+ = size 8-10)
3. Mark the clicked node as expanded (change its visual — add a subtle ring/outline)
4. The graph should smoothly accommodate new nodes (react-force-graph handles this if you update the data prop)
5. Update the node count badge

### Step 10: Polish
- Add loading states everywhere (skeleton/spinner while Wikipedia API responds)
- Error handling: show a toast or subtle message if a search fails ("Topic not found" or "Something went wrong")
- Add `<title>` and Open Graph meta tags in layout.tsx
- Test on mobile viewport (375px width)
- Add a fade-in animation on the landing page elements (stagger: title 0ms, search 150ms, chips 300ms)
- Handle edge cases: empty search, special characters in titles, very short Wikipedia articles with few links
- Make sure the graph doesn't break with 80+ nodes (test by expanding several nodes)

---

## Commands to Get Started

```bash
npx create-next-app@latest wikigraph --typescript --tailwind --app --src-dir --no-import-alias
cd wikigraph
npm install react-force-graph-2d
```

---

## API Endpoint Reference

```
# Page summary (REST API)
GET https://en.wikipedia.org/api/rest_v1/page/summary/{title}
Headers: Api-User-Agent: WikiGraph/1.0

# Intro links (Action API)  
GET https://en.wikipedia.org/w/api.php?action=parse&page={title}&prop=links&section=0&format=json

# Categories (Action API)
GET https://en.wikipedia.org/w/api.php?action=query&titles={title}&prop=categories&cllimit=20&format=json

# Autocomplete (Action API)
GET https://en.wikipedia.org/w/api.php?action=opensearch&search={query}&limit=5&format=json
```

---

## Definition of Done

The app is done when:
- [ ] Landing page looks clean and minimal (like Google — just search box + suggestions)
- [ ] Searching "Albert Einstein" shows a beautiful graph with 8-12 pastel nodes
- [ ] Each node is colored by category (people, places, concepts, etc.)
- [ ] Clicking any node expands it with new connections (rabbit hole works)
- [ ] Info panel shows Wikipedia summary when a node is selected
- [ ] Autocomplete suggestions appear while typing
- [ ] Works on both desktop and mobile
- [ ] URL updates with search term (?q=Einstein)
- [ ] Graph handles 50+ nodes without breaking
- [ ] Pressing "/" focuses the search bar
