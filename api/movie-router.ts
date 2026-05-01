import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { collections, getNextId, nowIso } from "./queries/connection";
import { env } from "./lib/env";

type OmdbSearchItem = {
  Title: string;
  Year: string;
  imdbID: string;
  Type: "movie" | "series" | "episode";
  Poster: string;
};

type OmdbSearchResponse = {
  Search?: OmdbSearchItem[];
  totalResults?: string;
  Response: "True" | "False";
  Error?: string;
};

type OmdbDetailResponse = {
  Title: string;
  Year: string;
  imdbID: string;
  Type: "movie" | "series" | "episode";
  Poster: string;
  Plot?: string;
  Released?: string;
  Genre?: string;
  Ratings?: Array<{ Source: string; Value: string }>;
  imdbRating?: string;
  imdbVotes?: string;
  Runtime?: string;
  Response: "True" | "False";
  Error?: string;
};

type JikanAnime = {
  mal_id: number;
  title: string;
  synopsis?: string;
  type?: string;
  episodes?: number | null;
  score?: number | null;
  scored_by?: number | null;
  year?: number | null;
  aired?: {
    from?: string | null;
  };
  images?: {
    jpg?: {
      image_url?: string | null;
      large_image_url?: string | null;
    };
  };
};

type JikanSearchResponse = {
  data?: JikanAnime[];
};

type JikanDetailResponse = {
  data?: JikanAnime;
};

const OMDB_API_URL = "https://www.omdbapi.com/";
const JIKAN_API_URL = "https://api.jikan.moe/v4";

function normalizePoster(url?: string | null) {
  if (!url || url === "N/A") return null;
  return url;
}

function yearToDate(year?: string | number | null) {
  if (!year) return "";
  const text = String(year);
  return /^\d{4}$/.test(text) ? `${text}-01-01` : text;
}

function jikanDate(item: JikanAnime) {
  return item.aired?.from?.slice(0, 10) || (item.year ? `${item.year}-01-01` : "");
}

function omdbToMovie(item: OmdbSearchItem | OmdbDetailResponse) {
  const isSeries = item.Type === "series";
  return {
    tmdbId: `omdb:${item.imdbID}`,
    title: item.Title || "Untitled",
    overview: "Plot" in item ? item.Plot || "" : "",
    posterPath: normalizePoster(item.Poster),
    backdropPath: null,
    releaseDate:
      "Released" in item && item.Released && item.Released !== "N/A"
        ? item.Released
        : yearToDate(item.Year),
    type: isSeries ? "series" : "movie",
    popularity: String(
      "imdbVotes" in item && item.imdbVotes
        ? Number.parseInt(item.imdbVotes.replace(/,/g, ""), 10) || 0
        : 0,
    ),
    voteAverage: String(
      "imdbRating" in item && item.imdbRating && item.imdbRating !== "N/A"
        ? Number(item.imdbRating)
        : 0,
    ),
    voteCount:
      "imdbVotes" in item && item.imdbVotes
        ? Number.parseInt(item.imdbVotes.replace(/,/g, ""), 10) || 0
        : 0,
    genre: "Genre" in item ? item.Genre || "" : "",
  };
}

function jikanToMovie(item: JikanAnime) {
  return {
    tmdbId: `jikan:${item.mal_id}`,
    title: item.title || "Untitled",
    overview: item.synopsis || "",
    posterPath: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || null,
    backdropPath: null,
    releaseDate: jikanDate(item),
    type: "anime" as const,
    popularity: String(item.scored_by || 0),
    voteAverage: String(item.score || 0),
    voteCount: item.scored_by || 0,
    genre: item.type || "",
  };
}

async function omdbFetch<T>(params: Record<string, string>): Promise<T | null> {
  const url = new URL(OMDB_API_URL);
  url.searchParams.set("apikey", env.omdbApiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const resp = await fetch(url.toString());
  if (!resp.ok) {
    throw new Error(`OMDb error: ${resp.status}`);
  }
  const data = (await resp.json()) as T & { Response?: "True" | "False"; Error?: string };
  if ("Response" in data && data.Response === "False") {
    return null;
  }
  return data;
}

async function jikanFetch<T>(path: string): Promise<T | null> {
  const resp = await fetch(`${JIKAN_API_URL}${path}`);
  if (!resp.ok) {
    throw new Error(`Jikan error: ${resp.status}`);
  }
  return (await resp.json()) as T;
}

async function searchOmdb(query: string, page: number, type?: "movie" | "series") {
  const data = await omdbFetch<OmdbSearchResponse>({
    s: query,
    page: String(page),
    ...(type ? { type } : {}),
  });

  return (data?.Search ?? []).map(omdbToMovie);
}

async function searchJikan(query: string, page: number) {
  const data = await jikanFetch<JikanSearchResponse>(
    `/anime?q=${encodeURIComponent(query)}&page=${page}&limit=20&sfw=true`,
  );

  return (data?.data ?? []).map(jikanToMovie);
}

async function fetchOmdbDetails(imdbId: string) {
  const data = await omdbFetch<OmdbDetailResponse>({ i: imdbId, plot: "full" });
  return data ? omdbToMovie(data) : null;
}

async function fetchJikanDetails(malId: string) {
  const data = await jikanFetch<JikanDetailResponse>(`/anime/${malId}/full`);
  return data?.data ? jikanToMovie(data.data) : null;
}

function parseExternalId(inputId: string) {
  if (inputId.startsWith("omdb:")) {
    return { source: "omdb" as const, id: inputId.slice(5) };
  }
  if (inputId.startsWith("jikan:")) {
    return { source: "jikan" as const, id: inputId.slice(6) };
  }
  return { source: null as null, id: inputId };
}

async function fetchExternalMovie(inputId: string) {
  const parsed = parseExternalId(inputId);
  if (parsed.source === "omdb") {
    return fetchOmdbDetails(parsed.id);
  }
  if (parsed.source === "jikan") {
    return fetchJikanDetails(parsed.id);
  }

  const fromOmdb = await fetchOmdbDetails(parsed.id).catch(() => null);
  if (fromOmdb) return fromOmdb;
  return fetchJikanDetails(parsed.id).catch(() => null);
}

export const movieRouter = createRouter({
  search: publicQuery
    .input(z.object({ query: z.string().min(1), page: z.number().default(1) }))
    .query(async ({ input }) => {
      const [movies, series, anime] = await Promise.all([
        searchOmdb(input.query, input.page, "movie").catch(() => []),
        searchOmdb(input.query, input.page, "series").catch(() => []),
        searchJikan(input.query, input.page).catch(() => []),
      ]);

      const results = [...movies, ...series, ...anime];
      return { results, page: input.page, totalPages: 1 };
    }),

  autocomplete: publicQuery
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      if (input.query.length < 2) return [];
      const [movies, series, anime] = await Promise.all([
        searchOmdb(input.query, 1, "movie").catch(() => []),
        searchOmdb(input.query, 1, "series").catch(() => []),
        searchJikan(input.query, 1).catch(() => []),
      ]);

      return [...movies, ...series, ...anime].slice(0, 8).map((movie) => ({
        tmdbId: movie.tmdbId,
        title: movie.title,
        posterPath: movie.posterPath,
        releaseDate: movie.releaseDate,
        type: movie.type,
      }));
    }),

  getOrCreate: publicQuery
    .input(
      z.object({
        tmdbId: z.string().optional(),
        custom: z.boolean().default(false),
        movieData: z.any().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const movies = await collections.movies();

      if (input.tmdbId && !input.custom) {
        const existing = await movies.findOne({ tmdbId: input.tmdbId });
        if (existing) return existing;

        const details = await fetchExternalMovie(input.tmdbId);
        if (!details) {
          throw new Error("Movie not found");
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
          type: details.type as "movie" | "series" | "anime",
          popularity: details.popularity,
          voteAverage: details.voteAverage,
          voteCount: details.voteCount,
          genre: details.genre,
          isCustom: false,
          createdAt: nowIso(),
        };
        await movies.insertOne(doc);
        return doc;
      }

      if (input.custom && input.movieData) {
        const id = await getNextId("movies");
        const doc = {
          id,
          title: input.movieData.title,
          overview: input.movieData.overview || "",
          posterPath: input.movieData.posterPath || null,
          releaseDate: input.movieData.releaseDate || "",
          type: (input.movieData.type || "movie") as "movie" | "series" | "anime",
          isCustom: true,
          createdAt: nowIso(),
        };
        await movies.insertOne(doc);
        return doc;
      }

      throw new Error("Invalid request");
    }),

  trending: publicQuery
    .input(z.object({ type: z.enum(["movie", "series", "anime"]).default("movie"), page: z.number().default(1) }))
    .query(async ({ input }) => {
      const movies = await collections.movies();
      const rows = await movies.find({ type: input.type }).toArray();
      return rows
        .sort((a, b) => Number(b.popularity || 0) - Number(a.popularity || 0))
        .slice(0, 20);
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await (await collections.movies()).findOne({ id: input.id });
    }),

  popular: publicQuery
    .input(z.object({ limit: z.number().default(10), excludeIds: z.array(z.number()).default([]) }))
    .query(async ({ input }) => {
      const rows = await (await collections.movies()).find({}).toArray();
      return rows
        .filter((movie) => !input.excludeIds.includes(movie.id || 0))
        .sort((a, b) => Number(b.popularity || 0) - Number(a.popularity || 0))
        .slice(0, input.limit);
    }),
});