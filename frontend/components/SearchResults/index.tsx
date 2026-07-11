import { posterUrl } from "@/lib/api";
import type { SearchResult } from "@/lib/types";

type SearchResultsProps = {
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
  variant?: "dropdown" | "stack";
};

export function SearchResults({
  results,
  onSelect,
  variant = "dropdown",
}: SearchResultsProps) {
  if (results.length === 0) {
    return null;
  }

  const containerClassName =
    variant === "dropdown"
      ? "stone-card absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-[420px] overflow-auto p-2"
      : "stone-card mt-4 max-h-[520px] overflow-auto p-3";

  return (
    <div className={containerClassName}>
      {results.map((result) => {
        const poster = posterUrl(result.poster_path);
        const year = result.release_date?.slice(0, 4);
        return (
          <button
            className="flex w-full items-center gap-4 rounded-[10px] p-3 text-left transition duration-200 ease-in-out hover:bg-parchment-card"
            key={`${result.media_type}-${result.tmdb_id}`}
            onClick={() => onSelect(result)}
            type="button"
          >
            <div className="h-20 w-14 shrink-0 overflow-hidden rounded-[10px] bg-parchment-card shadow-[var(--shadow-subtle)]">
              {poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  src={poster}
                />
              ) : (
                <div className="grid h-full place-items-center bg-sunburst-yellow text-[12px] font-semibold text-midnight">
                  ML
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold tracking-[-0.2px] text-charcoal-primary">
                {result.title}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] leading-[1.58] tracking-[-0.14px] text-ash">
                <span className="rounded-[6px] bg-stone-surface px-2 py-1 uppercase text-[11px] text-charcoal-primary">
                  {result.media_type}
                </span>
                {year ? <span>{year}</span> : null}
                <span>{result.confidence}% match</span>
                {typeof result.vote_average === "number" ? (
                  <span>{result.vote_average.toFixed(1)} rating</span>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
