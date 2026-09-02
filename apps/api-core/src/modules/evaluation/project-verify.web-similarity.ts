import { createHash } from 'node:crypto';
import { z } from 'zod';
import { PROJECT_VERIFY_WEB_SEARCH_HITS, REDIS_TTL_SECONDS } from '@smart/contracts';
import { duplicateScore } from './project-verify.heuristics.js';

const GITHUB_SEARCH = 'https://api.github.com/search/repositories';
const DUCKDUCKGO = 'https://api.duckduckgo.com/';
const FETCH_MS = 2_500;

const PublicProjectHitSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.url(),
  snippet: z.string().max(2_000),
});
export type PublicProjectHit = z.infer<typeof PublicProjectHitSchema>;

const PublicWebSimilaritySchema = z.object({
  ok: z.boolean(),
  score: z.number().min(0).max(100),
  hits: z.array(PublicProjectHitSchema).max(PROJECT_VERIFY_WEB_SEARCH_HITS),
});
export type PublicWebSimilarity = z.infer<typeof PublicWebSimilaritySchema>;

const GithubSearchItemSchema = z.object({
  full_name: z.string().min(1),
  html_url: z.string(),
  description: z.string().nullable().optional(),
  name: z.string().optional(),
});

const GithubSearchBodySchema = z.object({
  items: z.array(z.unknown()).optional(),
});

const DdgTopicSchema: z.ZodType<{ Text?: string; FirstURL?: string; Topics?: unknown }> = z.lazy(
  () =>
    z.object({
      Text: z.string().optional(),
      FirstURL: z.string().optional(),
      Topics: z.array(z.unknown()).optional(),
    }),
);

const DdgBodySchema = z.object({
  Abstract: z.string().optional(),
  AbstractURL: z.string().optional(),
  RelatedTopics: z.array(z.unknown()).optional(),
});

export interface TtlCache {
  get(key: string): Promise<string | null>;
  setex(key: string, ttlSeconds: number, value: string): Promise<unknown>;
}

export function buildPublicSearchQuery(title: string, stack: string): string {
  const cleaned = title.replace(/["<>]/gu, ' ').replace(/\s+/gu, ' ').trim().slice(0, 80);
  const lang = stack.split(/[,/]/u)[0]?.trim().slice(0, 40) ?? '';
  return lang ? `${cleaned} ${lang}` : cleaned;
}

function cacheKey(query: string): string {
  const digest = createHash('sha256').update(query).digest('hex').slice(0, 32);
  return `project:websim:${digest}`;
}

function httpsUrl(value: string): string | null {
  const parsed = z.url().safeParse(value);
  if (!parsed.success || !parsed.data.startsWith('https://')) return null;
  return parsed.data;
}

async function githubHits(
  query: string,
  exclude: ReadonlySet<string>,
  fetchImpl: typeof fetch,
): Promise<PublicProjectHit[]> {
  const url = `${GITHUB_SEARCH}?q=${encodeURIComponent(query)}&per_page=${String(PROJECT_VERIFY_WEB_SEARCH_HITS)}`;
  const response = await fetchImpl(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'smart-evaluation',
    },
    signal: AbortSignal.timeout(FETCH_MS),
  });
  if (!response.ok) throw new Error(`github_search_${String(response.status)}`);
  const body = GithubSearchBodySchema.parse(await response.json());
  const hits: PublicProjectHit[] = [];
  for (const item of body.items ?? []) {
    const row = GithubSearchItemSchema.safeParse(item);
    if (!row.success) continue;
    const fullName = row.data.full_name.toLowerCase();
    if (exclude.has(fullName)) continue;
    const htmlUrl = httpsUrl(row.data.html_url);
    if (!htmlUrl) continue;
    const parsed = PublicProjectHitSchema.safeParse({
      title: fullName,
      url: htmlUrl,
      snippet: row.data.description ?? row.data.name ?? '',
    });
    if (parsed.success) hits.push(parsed.data);
    if (hits.length >= PROJECT_VERIFY_WEB_SEARCH_HITS) break;
  }
  return hits;
}

function flattenDdgTopics(value: unknown, acc: PublicProjectHit[]): void {
  if (!Array.isArray(value) || acc.length >= PROJECT_VERIFY_WEB_SEARCH_HITS) return;
  for (const row of value) {
    const topic = DdgTopicSchema.safeParse(row);
    if (!topic.success) continue;
    if (topic.data.Topics) {
      flattenDdgTopics(topic.data.Topics, acc);
      continue;
    }
    const text = topic.data.Text ?? '';
    const url = topic.data.FirstURL ? httpsUrl(topic.data.FirstURL) : null;
    if (!text || !url) continue;
    const parsed = PublicProjectHitSchema.safeParse({
      title: text.slice(0, 120),
      url,
      snippet: text.slice(0, 2_000),
    });
    if (parsed.success) acc.push(parsed.data);
    if (acc.length >= PROJECT_VERIFY_WEB_SEARCH_HITS) return;
  }
}

async function duckDuckGoHits(query: string, fetchImpl: typeof fetch): Promise<PublicProjectHit[]> {
  const url = `${DUCKDUCKGO}?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(FETCH_MS) });
  if (!response.ok) throw new Error(`ddg_${String(response.status)}`);
  const body = DdgBodySchema.parse(await response.json());
  const hits: PublicProjectHit[] = [];
  const abstractUrl = body.AbstractURL ? httpsUrl(body.AbstractURL) : null;
  if (body.Abstract && abstractUrl) {
    const parsed = PublicProjectHitSchema.safeParse({
      title: body.Abstract.slice(0, 120),
      url: abstractUrl,
      snippet: body.Abstract.slice(0, 2_000),
    });
    if (parsed.success) hits.push(parsed.data);
  }
  flattenDdgTopics(body.RelatedTopics, hits);
  return hits.slice(0, PROJECT_VERIFY_WEB_SEARCH_HITS);
}

function mergeHits(groups: readonly PublicProjectHit[][]): PublicProjectHit[] {
  const seen = new Set<string>();
  const merged: PublicProjectHit[] = [];
  for (const group of groups) {
    for (const hit of group) {
      const key = hit.url.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(hit);
      if (merged.length >= PROJECT_VERIFY_WEB_SEARCH_HITS) return merged;
    }
  }
  return merged;
}

export function publicSimilarityDigest(result: PublicWebSimilarity): string {
  if (!result.ok) {
    return 'Public web similarity search unavailable. Do not treat the project as unique; keep confidence low.';
  }
  if (result.hits.length === 0) {
    return 'Public web similarity search returned no close matches on GitHub or DuckDuckGo snippets.';
  }
  return `Public similar projects (snippets only, not cloned):\n${result.hits
    .map((hit) => `- ${hit.title} ${hit.url} :: ${hit.snippet.slice(0, 280)}`)
    .join('\n')}`;
}

export async function searchPublicProjectMatches(input: {
  title: string;
  stack: string;
  currentText: string;
  excludeFullNames: readonly string[];
  fetchImpl?: typeof fetch;
  cache?: TtlCache;
}): Promise<PublicWebSimilarity> {
  const query = buildPublicSearchQuery(input.title, input.stack);
  if (query.length < 3) return { ok: true, score: 0, hits: [] };

  const key = cacheKey(query);
  if (input.cache) {
    try {
      const cached = await input.cache.get(key);
      if (cached) {
        const parsed = PublicWebSimilaritySchema.safeParse(JSON.parse(cached) as unknown);
        if (parsed.success) return parsed.data;
      }
    } catch {
      /* cache miss */
    }
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const exclude = new Set(input.excludeFullNames.map((name) => name.toLowerCase()));
  const settled = await Promise.allSettled([
    githubHits(query, exclude, fetchImpl),
    duckDuckGoHits(`${query} project`, fetchImpl),
  ]);
  const ok = settled.some((row) => row.status === 'fulfilled');
  const hits = mergeHits(settled.map((row) => (row.status === 'fulfilled' ? row.value : [])));
  const score = duplicateScore(
    input.currentText,
    hits.map((hit) => `${hit.title} ${hit.snippet}`),
  );
  const result = PublicWebSimilaritySchema.parse({ ok, score, hits });
  if (input.cache) {
    try {
      await input.cache.setex(key, REDIS_TTL_SECONDS.projectWebSimilarity, JSON.stringify(result));
    } catch {
      /* still return the live result */
    }
  }
  return result;
}
