import { NodeCategory } from "./types";
import { filterLinks } from "./filters";

const REST_BASE = "https://en.wikipedia.org/api/rest_v1";
const ACTION_BASE = "https://en.wikipedia.org/w/api.php";
const USER_AGENT = "WikiGraph/1.0 (educational project)";
const TIMEOUT_MS = 5000;

interface PageSummary {
  title: string;
  extract: string;
  thumbnail?: string;
  description?: string;
}

interface PageData {
  summary: PageSummary;
  links: string[];
  category: NodeCategory;
}

async function wikiGet(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { "Api-User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Wikipedia API ${res.status}: ${res.statusText}`);
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchSummary(title: string): Promise<PageSummary> {
  const encoded = encodeURIComponent(title);
  const res = await wikiGet(`${REST_BASE}/page/summary/${encoded}`);
  const data = await res.json();

  return {
    title: data.title,
    extract: data.extract ?? "",
    thumbnail: data.thumbnail?.source,
    description: data.description,
  };
}

export async function fetchIntroLinks(
  title: string,
  existingIds: Set<string>
): Promise<string[]> {
  const encoded = encodeURIComponent(title);
  const url = `${ACTION_BASE}?action=parse&page=${encoded}&prop=links&section=0&format=json&origin=*`;
  const res = await wikiGet(url);
  const data = await res.json();

  if (!data.parse?.links) return [];

  const rawTitles: string[] = data.parse.links
    .filter((link: { ns: number }) => link.ns === 0)
    .map((link: { "*": string }) => link["*"]);

  return filterLinks(rawTitles, existingIds);
}

export async function detectCategory(title: string): Promise<NodeCategory> {
  const encoded = encodeURIComponent(title);
  const url = `${ACTION_BASE}?action=query&titles=${encoded}&prop=categories&cllimit=20&format=json&origin=*`;

  try {
    const res = await wikiGet(url);
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return "concept";

    const page = Object.values(pages)[0] as {
      categories?: { title: string }[];
    };
    const cats = (page.categories ?? [])
      .map((c) => c.title.toLowerCase())
      .join(" ");

    if (/people|born in|deaths|birth|living people/.test(cats)) return "person";
    if (/cities|countries|geography|places|populated/.test(cats)) return "place";
    if (/events|wars|battles|conflicts/.test(cats)) return "event";
    if (/science|physics|biology|chemistry|mathematics|computing/.test(cats))
      return "science";
    if (/art|music|literature|film|novels|albums/.test(cats)) return "art";
    if (/companies|organizations|organisations/.test(cats))
      return "organization";

    return "concept";
  } catch {
    return "concept";
  }
}

export async function fetchPageData(
  title: string,
  existingIds: Set<string> = new Set()
): Promise<PageData> {
  const [summary, links, category] = await Promise.all([
    fetchSummary(title),
    fetchIntroLinks(title, existingIds),
    detectCategory(title),
  ]);

  return { summary, links, category };
}
