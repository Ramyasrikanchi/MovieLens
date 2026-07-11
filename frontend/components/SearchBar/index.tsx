"use client";

import { useDeferredValue, useEffect, useRef, useState, useTransition } from "react";
import { searchTmdb } from "@/lib/api";
import type { SearchResult } from "@/lib/types";
import { SearchResults } from "@/components/SearchResults";

type SearchBarProps = {
  onSelect: (result: SearchResult) => void;
  placeholder?: string;
  variant?: "dropdown" | "stack";
  autoFocus?: boolean;
};

export function SearchBar({
  onSelect,
  placeholder = "Search Oppenheimer, M3GAN, Breaking Bad...",
  variant = "dropdown",
  autoFocus = false,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const controllerRef = useRef<AbortController | null>(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const trimmed = deferredQuery.trim();
    controllerRef.current?.abort();

    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    const timeout = window.setTimeout(() => {
      setIsLoading(true);
      setError(null);
      searchTmdb(trimmed, controller.signal)
        .then((response) =>
          startTransition(() => {
            setResults(response.results);
          })
        )
        .catch((err: Error) => {
          if (controller.signal.aborted) {
            return;
          }
          startTransition(() => {
            setResults([]);
            setError(err.message);
          });
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [deferredQuery, startTransition]);

  function handleSelect(result: SearchResult) {
    setQuery(result.title);
    setResults([]);
    setError(null);
    onSelect(result);
  }

  return (
    <div className="relative mx-auto w-full max-w-[760px]" id="search">
      <div className="stone-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="movie-search">
          Search movies or TV shows
        </label>
        <input
          autoFocus={autoFocus}
          autoComplete="off"
          className="min-h-14 flex-1 rounded-[10px] bg-parchment-card px-5 text-[17px] tracking-[-0.22px] text-charcoal-primary outline-none placeholder:text-smoke"
          id="movie-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          value={query}
        />
        <div className="flex min-h-10 items-center justify-center rounded-[32px] bg-midnight px-4 text-[14px] font-semibold tracking-[-0.18px] text-white">
          {isLoading || isPending ? "Searching" : "TMDB Search"}
        </div>
      </div>

      <SearchResults onSelect={handleSelect} results={results} variant={variant} />

      {error ? (
        <div className="mt-3 rounded-[10px] bg-parchment-card px-4 py-3 text-[14px] tracking-[-0.18px] text-coral-red shadow-[var(--shadow-subtle)]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
