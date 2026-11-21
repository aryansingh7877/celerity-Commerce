/** Lightweight typo-tolerant match for storefront search (no deps). */
export function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 1;
  if (t.includes(q)) return 1;

  // common commerce typos
  const aliases: Record<string, string[]> = {
    laptop: ['labtop', 'laptpo', 'notbook', 'notebook'],
    phone: ['phne', 'moble', 'mobile'],
    headphone: ['headfone', 'hedphone'],
  };
  for (const [canonical, typos] of Object.entries(aliases)) {
    if (typos.some((ty) => q.includes(ty)) && t.includes(canonical)) return 0.92;
  }

  // subsequence score
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  if (qi === q.length) return 0.75;

  // token overlap
  const qTokens = q.split(/\s+/).filter(Boolean);
  const hit = qTokens.filter((tok) => t.includes(tok)).length;
  return hit / Math.max(qTokens.length, 1);
}

export function interpretQuery(query: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  if (/labtop|laptpo|notbook/.test(q)) return 'laptop';
  if (/hedphone|headfone/.test(q)) return 'headphone';
  if (/phne|moble/.test(q)) return 'phone';
  return null;
}
