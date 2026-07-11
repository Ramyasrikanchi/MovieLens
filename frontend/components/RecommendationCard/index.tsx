import { posterUrl } from "@/lib/api";
import type { Recommendation } from "@/lib/types";
import { RecommendationReason } from "@/components/RecommendationReason";

export function RecommendationCard({ recommendation, rank }: { recommendation: Recommendation; rank: number }) {
  const poster = posterUrl(recommendation.poster_path);
  const year = recommendation.release_year ?? (recommendation.release_date ? Number(recommendation.release_date.slice(0, 4)) : null);
  const genres = (recommendation.top_genres?.length ? recommendation.top_genres : recommendation.genres ?? []).slice(0, 3);

  return (
    <article className="stone-card group overflow-hidden ring-1 ring-[#e3ded6] transition duration-200 ease-in-out hover:shadow-[var(--shadow-sm)]">
      <div className="bg-parchment-card p-[14px]">
        <div className="aspect-[3/4] overflow-hidden rounded-[12px] bg-warm-canvas">
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="h-full w-full object-cover" src={poster} />
          ) : (
            <div className="relative flex h-full items-center justify-center">
              <div className="absolute left-5 top-6 size-10 rounded-[72px] bg-sky-blue" />
              <div className="absolute bottom-8 right-6 size-12 rounded-[72px] bg-meadow-green" />
              <div className="relative grid size-24 place-items-center rounded-[72px] bg-sunburst-yellow">
                <span className="absolute left-8 top-9 size-2 rounded-full bg-midnight" />
                <span className="absolute right-8 top-9 size-2 rounded-full bg-midnight" />
                <span className="absolute bottom-8 h-3 w-8 rounded-b-full border-b-2 border-midnight" />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between gap-3 text-[12px] leading-[1.58] tracking-[-0.14px] text-ash">
          <span>#{rank}</span>
          <span>{Math.round(recommendation.score * 100)}% similar</span>
        </div>
        <div className="space-y-3">
          <h3 className="text-[19px] font-semibold leading-[1.38] tracking-[-0.25px] text-charcoal-primary">{recommendation.title}</h3>
          <div className="flex flex-wrap gap-2 text-[12px] leading-[1.58] tracking-[-0.14px] text-ash">
            {recommendation.media_type ? (
              <span className="rounded-[6px] bg-stone-surface px-2 py-1 text-charcoal-primary">{recommendation.media_type}</span>
            ) : null}
            {year ? <span className="rounded-[6px] bg-stone-surface px-2 py-1">{year}</span> : null}
            {typeof recommendation.vote_average === "number" ? (
              <span className="rounded-[6px] bg-stone-surface px-2 py-1">{recommendation.vote_average.toFixed(1)} rating</span>
            ) : null}
          </div>
        </div>
        <div className="rounded-[10px] bg-white">
          <h4 className="text-[13px] font-semibold tracking-[-0.16px] text-charcoal-primary">Movie metadata</h4>
          <div className="mt-3 flex flex-wrap gap-2 text-[12px] leading-[1.58] tracking-[-0.14px] text-ash">
            {genres.map((genre) => (
              <span className="rounded-[32px] bg-stone-surface px-3 py-1" key={genre}>
                {genre}
              </span>
            ))}
          </div>
          {recommendation.overview_snippet ? (
            <p className="mt-3 text-[14px] leading-[1.5] tracking-[-0.18px] text-graphite">{recommendation.overview_snippet}</p>
          ) : null}
        </div>
        <div className="rounded-[10px] bg-white">
          <h4 className="text-[13px] font-semibold tracking-[-0.16px] text-charcoal-primary">Similarity information</h4>
          <p className="mt-2 text-[14px] leading-[1.5] tracking-[-0.18px] text-graphite">
            Ranked by cosine similarity against the baseline TF-IDF tags model.
          </p>
          <p className="mt-1 text-[14px] font-medium tracking-[-0.18px] text-charcoal-primary">
            Score: {recommendation.score.toFixed(4)}
          </p>
        </div>
        <RecommendationReason reason={recommendation.why_recommended} />
      </div>
    </article>
  );
}
