"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getTmdbRecommendations,
  normalizeMovieProfile,
  normalizeRecommendationResponse,
  posterUrl,
  searchTmdb,
} from "@/lib/api";
import type {
  MediaType,
  MovieProfile,
  Recommendation,
  RecommendationResponse,
  SearchResult,
} from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { Navbar } from "@/components/Navbar";
import { RecommendationGrid } from "@/components/RecommendationGrid";

type RecommendationPageProps = {
  mediaType: MediaType;
  tmdbId: number;
};

function releaseYear(profile?: MovieProfile | null) {
  if (!profile) {
    return null;
  }
  if (typeof profile.release_year === "number") {
    return String(profile.release_year);
  }
  if (profile.release_date) {
    return profile.release_date.slice(0, 4);
  }
  return null;
}

function searchResultToMovieProfile(result: SearchResult): MovieProfile {
  return {
    tmdb_id: result.tmdb_id,
    title: result.title,
    media_type: result.media_type,
    overview: null,
    poster_path: result.poster_path ?? null,
    release_date: result.release_date ?? null,
    release_year: result.release_date
      ? Number(result.release_date.slice(0, 4))
      : null,
    vote_average: result.vote_average ?? null,
    genres: [],
    keywords: [],
    cast: [],
    director: [],
    top_genres: [],
  };
}

function pickSearchMatch(
  title: string,
  mediaType: MediaType,
  results: SearchResult[],
) {
  const exactMatch = results.find(
    (result) =>
      result.title.trim().toLowerCase() === title.trim().toLowerCase() &&
      result.media_type === mediaType,
  );
  if (exactMatch) {
    return exactMatch;
  }

  const mediaMatch = results.find((result) => result.media_type === mediaType);
  if (mediaMatch) {
    return mediaMatch;
  }

  return results[0] ?? null;
}

async function hydrateSelectedMovie(
  selectedMovie: MovieProfile | null,
  movieTitle: string,
  mediaType: MediaType,
  signal: AbortSignal,
) {
  if (
    selectedMovie?.poster_path &&
    (selectedMovie.release_year || selectedMovie.release_date)
  ) {
    return selectedMovie;
  }

  try {
    const response = await searchTmdb(movieTitle, signal);
    const match = pickSearchMatch(movieTitle, mediaType, response.results);
    if (!match) {
      return selectedMovie;
    }

    return selectedMovie
      ? {
          ...selectedMovie,
          poster_path: selectedMovie.poster_path ?? match.poster_path ?? null,
          release_date:
            selectedMovie.release_date ?? match.release_date ?? null,
          release_year:
            selectedMovie.release_year ??
            (match.release_date
              ? Number(match.release_date.slice(0, 4))
              : null),
          vote_average:
            selectedMovie.vote_average ?? match.vote_average ?? null,
        }
      : searchResultToMovieProfile(match);
  } catch {
    return selectedMovie;
  }
}

async function hydrateRecommendations(
  recommendations: Recommendation[],
  signal: AbortSignal,
) {
  const uniqueTitles = [
    ...new Set(recommendations.map((item) => item.title).filter(Boolean)),
  ];
  const metadataByTitle = new Map<string, SearchResult | null>();

  await Promise.all(
    uniqueTitles.map(async (title) => {
      try {
        const response = await searchTmdb(title, signal);
        const match = pickSearchMatch(title, "movie", response.results);
        metadataByTitle.set(title, match);
      } catch {
        metadataByTitle.set(title, null);
      }
    }),
  );

  return recommendations.map((item) => {
    if (
      item.poster_path &&
      (item.release_year || item.release_date) &&
      typeof item.vote_average === "number"
    ) {
      return item;
    }

    const match = metadataByTitle.get(item.title);
    if (!match) {
      return item;
    }

    return {
      ...item,
      tmdb_id: item.tmdb_id ?? match.tmdb_id,
      media_type: item.media_type ?? match.media_type,
      poster_path: item.poster_path ?? match.poster_path ?? null,
      release_date: item.release_date ?? match.release_date ?? null,
      release_year:
        item.release_year ??
        (match.release_date ? Number(match.release_date.slice(0, 4)) : null),
      vote_average: item.vote_average ?? match.vote_average ?? null,
    };
  });
}

export function RecommendationPage({
  mediaType,
  tmdbId,
}: RecommendationPageProps) {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [fallbackSelectedMovie, setFallbackSelectedMovie] =
    useState<MovieProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.info("[Recommendation Page] route params", { tmdbId, mediaType });
    let sessionFallback: MovieProfile | null = null;

    if (typeof window !== "undefined") {
      const raw = window.sessionStorage.getItem(
        `movielens:selected:${mediaType}:${tmdbId}`,
      );
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as SearchResult;
          sessionFallback = searchResultToMovieProfile(parsed);
          setFallbackSelectedMovie(sessionFallback);
        } catch {
          setFallbackSelectedMovie(null);
        }
      } else {
        setFallbackSelectedMovie(null);
      }
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    getTmdbRecommendations(tmdbId, mediaType, 10, controller.signal)
      .then(async (response) => {
        const normalized = normalizeRecommendationResponse(response);
        const hydratedSelectedMovie = await hydrateSelectedMovie(
          normalized.selected_movie ?? sessionFallback,
          normalized.movie,
          mediaType,
          controller.signal,
        );
        const hydratedRecommendations = await hydrateRecommendations(
          normalized.recommendations,
          controller.signal,
        );
        const hydratedPayload: RecommendationResponse = {
          ...normalized,
          selected_movie: hydratedSelectedMovie,
          recommendations: hydratedRecommendations,
        };
        console.info("[Recommendation Page] payload", hydratedPayload);
        setData(hydratedPayload);
      })
      .catch((err: Error) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [mediaType, tmdbId]);

  const selectedMovie =
    normalizeMovieProfile(data?.selected_movie) ?? fallbackSelectedMovie;
  const selectedPoster = posterUrl(selectedMovie?.poster_path);
  const recommendationCount = data?.recommendations.length ?? 0;

  useEffect(() => {
    console.info(
      `[Recommendation Page]\ntmdbId=${tmdbId}\nmediaType=${mediaType}\nselectedMovieLoaded=${Boolean(selectedMovie)}\nrecommendationCount=${recommendationCount}`,
    );
  }, [tmdbId, mediaType, selectedMovie, recommendationCount]);

  return (
    <main className="min-h-screen bg-warm-canvas">
      <Navbar />

      <section className="mx-auto max-w-[1200px] px-5 pb-10 pt-12 sm:px-8">
        <Link
          className="pill-light inline-flex items-center gap-2"
          href="/search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to search
        </Link>
      </section>

      {isLoading ? (
        <section className="mx-auto max-w-[1200px] px-5 pb-24 sm:px-8">
          <LoadingState label="Loading recommendations" skeleton />
        </section>
      ) : null}

      {error && !isLoading ? (
        <section className="mx-auto max-w-[1200px] px-5 pb-24 sm:px-8">
          <EmptyState body={error} title="Recommendation request failed" />
        </section>
      ) : null}

      {!isLoading && !error && data ? (
        <>
          <section className="mx-auto max-w-[1200px] px-5 pb-16 sm:px-8">
            <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-center">
              <div className="stone-card overflow-hidden p-4">
                <div className="aspect-[3/4] overflow-hidden rounded-[10px] bg-parchment-card">
                  {selectedPoster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={selectedMovie?.title ?? data.movie}
                      className="h-full w-full object-cover"
                      src={selectedPoster}
                    />
                  ) : (
                    <div className="grid h-full place-items-center bg-sunburst-yellow text-[18px] font-semibold text-midnight">
                      ML
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[14px] font-medium tracking-[-0.18px] text-ember-orange">
                  {data.source === "external"
                    ? "External TMDB title"
                    : "Local dataset title"}
                </p>
                <h1 className="hero-display mt-4 max-w-[760px]">
                  {selectedMovie?.title ?? data.movie}
                </h1>
                <div className="mt-5 flex flex-wrap gap-2 text-[12px] leading-[1.58] tracking-[-0.14px] text-ash">
                  <span className="rounded-[32px] bg-white px-3 py-1 uppercase shadow-[var(--shadow-subtle)]">
                    {selectedMovie?.media_type ?? mediaType}
                  </span>
                  {releaseYear(selectedMovie) ? (
                    <span className="rounded-[32px] bg-white px-3 py-1 shadow-[var(--shadow-subtle)]">
                      {releaseYear(selectedMovie)}
                    </span>
                  ) : null}
                  {typeof selectedMovie?.vote_average === "number" ? (
                    <span className="rounded-[32px] bg-white px-3 py-1 shadow-[var(--shadow-subtle)]">
                      {selectedMovie.vote_average.toFixed(1)} Rating
                    </span>
                  ) : null}
                </div>
                <p className="mt-5 max-w-[760px] text-[16px] leading-[1.5] tracking-[-0.18px] text-graphite">
                  {selectedMovie?.overview ??
                    "MovieLens is comparing this title against the local TMDB 5000 corpus using the baseline TF-IDF tags model."}
                </p>
                {selectedMovie?.genres.length ? (
                  <div className="mt-4 flex flex-wrap gap-2 text-[12px] leading-[1.58] tracking-[-0.14px] text-ash">
                    {selectedMovie.genres.slice(0, 4).map((genre) => (
                      <span
                        className="rounded-[32px] bg-white px-3 py-1 shadow-[var(--shadow-subtle)]"
                        key={genre}
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            {!selectedMovie ? (
              <div className="mt-6">
                <EmptyState
                  title="Movie metadata unavailable"
                  body="Recommendations loaded, but detailed metadata for the selected movie could not be resolved from the current API payload."
                />
              </div>
            ) : null}
          </section>

          <section className="mx-auto max-w-[1200px] px-5 pb-10 sm:px-8">
            <div className="stone-card p-6">
              <p className="text-[13px] font-semibold tracking-[-0.16px] text-ember-orange">
                Why these results look the way they do
              </p>
              <h2 className="mt-3 text-[28px] font-semibold leading-[1.15] tracking-[-0.5px] text-charcoal-primary">
                Recommendation explainability
              </h2>
              <p className="mt-3 max-w-[820px] text-[15px] leading-[1.5] tracking-[-0.2px] text-graphite">
                Each card breaks out overlap signals from the selected title:
                shared genres, shared keywords, shared cast, and whether the
                director matches. The ranking itself still comes from the
                unchanged baseline cosine similarity model.
              </p>
            </div>
          </section>

          <section className="mx-auto max-w-[1200px] px-5 pb-24 sm:px-8">
            <div className="mb-8">
              <p className="text-[14px] font-medium tracking-[-0.18px] text-ember-orange">
                Recommendations
              </p>
              <h2 className="section-heading mt-3">
                Nearest local neighbors for this selection.
              </h2>
            </div>
            <RecommendationGrid
              recommendations={data.recommendations}
              selected={selectedMovie}
            />
          </section>
        </>
      ) : null}
    </main>
  );
}
