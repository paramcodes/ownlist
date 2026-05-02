import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { collections, getNextId, nowIso } from "./queries/connection";
import { env } from "./lib/env";

type RawgGame = {
  id: number;
  name: string;
  released?: string | null;
  background_image?: string | null;
  rating?: number | null;
  ratings_count?: number | null;
  genres?: Array<{ name: string }>;
  platforms?: Array<{ platform?: { name?: string } }>;
};

type RawgSearchResponse = {
  results?: RawgGame[];
};

type RawgDetailResponse = RawgGame & {
  description_raw?: string;
};

const RAWG_API_URL = "https://api.rawg.io/api";

function toGameMedia(item: RawgGame | RawgDetailResponse) {
  const platformNames = (item.platforms ?? [])
    .map((entry) => entry.platform?.name)
    .filter((name): name is string => Boolean(name));

  return {
    tmdbId: `rawg:${item.id}`,
    title: item.name || "Untitled",
    overview: "description_raw" in item ? item.description_raw || "" : "",
    posterPath: item.background_image || null,
    backdropPath: item.background_image || null,
    releaseDate: item.released || "",
    type: "game" as const,
    popularity: String(item.ratings_count || 0),
    voteAverage: String(item.rating || 0),
    voteCount: item.ratings_count || 0,
    genre: (item.genres ?? []).map((genre) => genre.name).join(", "),
    platforms: platformNames.join(", "),
  };
}

async function rawgFetch<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  if (!env.rawgApiKey) {
    return null;
  }

  const url = new URL(`${RAWG_API_URL}${path}`);
  url.searchParams.set("key", env.rawgApiKey);
  for (const [key, value] of Object.entries(params || {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`RAWG error: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function searchGames(query: string, page: number) {
  const data = await rawgFetch<RawgSearchResponse>("/games", {
    search: query,
    page: String(page),
    page_size: "20",
  });

  return (data?.results ?? []).map(toGameMedia);
}

async function fetchGameDetails(rawgId: string) {
  const normalized = rawgId.startsWith("rawg:") ? rawgId.slice(5) : rawgId;
  const data = await rawgFetch<RawgDetailResponse>(`/games/${encodeURIComponent(normalized)}`);
  return data ? toGameMedia(data) : null;
}

export const gameRouter = createRouter({
  search: publicQuery
    .input(z.object({ query: z.string().min(1), page: z.number().default(1) }))
    .query(async ({ input }) => {
      const results = await searchGames(input.query, input.page).catch(() => []);
      return { results, page: input.page, totalPages: 1 };
    }),

  getOrCreate: publicQuery
    .input(
      z.object({
        rawgId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const movies = await collections.movies();
      const externalId = input.rawgId.startsWith("rawg:") ? input.rawgId : `rawg:${input.rawgId}`;
      const existing = await movies.findOne({ tmdbId: externalId });
      if (existing) return existing;

      const details = await fetchGameDetails(externalId);
      if (!details) {
        throw new Error("Game not found or RAWG_API_KEY missing");
      }

      const id = await getNextId("movies");
      const doc = {
        id,
        tmdbId: details.tmdbId,
        title: details.title,
        overview: details.overview,
        posterPath: details.posterPath,
        backdropPath: details.backdropPath,
        releaseDate: details.releaseDate,
        type: "game" as const,
        popularity: details.popularity,
        voteAverage: details.voteAverage,
        voteCount: details.voteCount,
        genre: details.genre,
        platforms: details.platforms,
        isCustom: false,
        createdAt: nowIso(),
      };

      await movies.insertOne(doc);
      return doc;
    }),
});
