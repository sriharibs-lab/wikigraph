const BLACKLIST_PATTERNS = [
  /^\d{1,4}$/,
  /^\d{1,2}(st|nd|rd|th)\s/i,
  /^(January|February|March|April|May|June|July|August|September|October|November|December)\s/i,
  /^List of/i,
  /\(disambiguation\)/i,
  /^ISO\s/,
  /^United States$/,
  /^United Kingdom$/,
  /^Wikipedia:/,
  /^Category:/,
  /^File:/,
  /^Help:/,
  /^Template:/,
];

export function isValidLink(
  title: string,
  existingIds: Set<string>
): boolean {
  if (existingIds.has(title)) return false;
  return !BLACKLIST_PATTERNS.some((pattern) => pattern.test(title));
}

export function filterLinks(
  titles: string[],
  existingIds: Set<string>,
  maxLinks = 25
): string[] {
  return titles.filter((t) => isValidLink(t, existingIds)).slice(0, maxLinks);
}
