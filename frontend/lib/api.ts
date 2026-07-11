import type { MediaType, MovieProfile, Recommendation, RecommendationResponse, SearchResponse, WhyRecommended } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

async function requestJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  console.info("[FilmyMatch Frontend] API request", url);

  const response = await fetch(url, {
    method: "GET",
    signal,
    headers: {
      Accept: "application/json"
    }
  });

  const payload = await response.json().catch(() => null);
  console.info("[FilmyMatch Frontend] API response", url, payload);
  if (!response.ok) {
    const detail = payload?.detail ?? "Request failed.";
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  return payload as T;
}

export function searchTmdb(query: string, signal?: AbortSignal) {
  return requestJson<SearchResponse>(`/search?q=${encodeURIComponent(query)}`, signal);
}

export function getTmdbRecommendations(
  tmdbId: number,
  mediaType: MediaType,
  topN = 10,
  signal?: AbortSignal
) {
  const params = new URLSearchParams({
    media_type: mediaType,
    top_n: String(topN)
  });
  return requestJson<RecommendationResponse>(`/recommend/tmdb/${tmdbId}?${params}`, signal);
}

function extractReleaseYear(releaseDate?: string | null, releaseYear?: number | null) {
  if (typeof releaseYear === "number") {
    return releaseYear;
  }
  if (!releaseDate) {
    return null;
  }
  const year = Number(releaseDate.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function normalizeWhyRecommended(input: Partial<WhyRecommended> | null | undefined): WhyRecommended {
  return {
    shared_genres: Array.isArray(input?.shared_genres) ? input.shared_genres : [],
    shared_keywords: Array.isArray(input?.shared_keywords) ? input.shared_keywords : [],
    shared_cast: Array.isArray(input?.shared_cast) ? input.shared_cast : [],
    shared_director: Boolean(input?.shared_director)
  };
}

export function normalizeMovieProfile(input: Partial<MovieProfile> | null | undefined): MovieProfile | null {
  if (!input?.title || !input.media_type) {
    return null;
  }

  return {
    tmdb_id: input.tmdb_id ?? null,
    title: input.title,
    media_type: input.media_type,
    overview: input.overview ?? null,
    poster_path: input.poster_path ?? null,
    release_date: input.release_date ?? null,
    release_year: extractReleaseYear(input.release_date, input.release_year),
    vote_average: input.vote_average ?? null,
    genres: Array.isArray(input.genres) ? input.genres : [],
    keywords: Array.isArray(input.keywords) ? input.keywords : [],
    cast: Array.isArray(input.cast) ? input.cast : [],
    director: Array.isArray(input.director) ? input.director : [],
    top_genres: Array.isArray(input.top_genres)
      ? input.top_genres
      : Array.isArray(input.genres)
        ? input.genres.slice(0, 3)
        : []
  };
}

function normalizeRecommendation(input: Partial<Recommendation>): Recommendation {
  return {
    title: input.title ?? "Untitled",
    score: typeof input.score === "number" ? input.score : 0,
    tmdb_id: input.tmdb_id ?? null,
    poster_path: input.poster_path ?? null,
    release_date: input.release_date ?? null,
    release_year: extractReleaseYear(input.release_date, input.release_year),
    media_type: input.media_type ?? null,
    vote_average: input.vote_average ?? null,
    genres: Array.isArray(input.genres) ? input.genres : [],
    top_genres: Array.isArray(input.top_genres)
      ? input.top_genres
      : Array.isArray(input.genres)
        ? input.genres.slice(0, 3)
        : [],
    overview_snippet: input.overview_snippet ?? null,
    why_recommended: normalizeWhyRecommended(input.why_recommended)
  };
}

export function normalizeRecommendationResponse(input: Partial<RecommendationResponse>): RecommendationResponse {
  return {
    movie: input.movie ?? "",
    source: input.source === "local" ? "local" : "external",
    selected_movie: normalizeMovieProfile(input.selected_movie),
    recommendations: Array.isArray(input.recommendations) ? input.recommendations.map(normalizeRecommendation) : []
  };
}

export function posterUrl(path?: string | null) {
  return path ? `https://image.tmdb.org/t/p/w342${path}` : null;
}

export function backdropUrl(path?: string | null) {
  return path ? `https://image.tmdb.org/t/p/w780${path}` : null;
}
