import type { WhyRecommended } from "@/lib/types";

type RecommendationReasonProps = {
  reason?: WhyRecommended | null;
};

function joinValues(values: string[]) {
  return values.join(", ");
}

export function RecommendationReason({ reason }: RecommendationReasonProps) {
  const safeReason: WhyRecommended = {
    shared_genres: reason?.shared_genres ?? [],
    shared_keywords: reason?.shared_keywords ?? [],
    shared_cast: reason?.shared_cast ?? [],
    shared_director: reason?.shared_director ?? false
  };

  const hasReason =
    safeReason.shared_genres.length > 0 ||
    safeReason.shared_keywords.length > 0 ||
    safeReason.shared_cast.length > 0 ||
    safeReason.shared_director;

  if (!hasReason) {
    return (
      <div className="rounded-[10px] bg-parchment-card p-4">
        <h4 className="text-[13px] font-semibold tracking-[-0.16px] text-charcoal-primary">Why was this recommended?</h4>
        <p className="mt-2 text-[13px] leading-[1.5] tracking-[-0.16px] text-graphite">
          The TF-IDF profile of this title is close to the selected movie based on its overview and metadata blend.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] bg-parchment-card p-4">
      <h4 className="text-[13px] font-semibold tracking-[-0.16px] text-charcoal-primary">Why was this recommended?</h4>
      <div className="mt-2 space-y-1 text-[13px] leading-[1.5] tracking-[-0.16px] text-graphite">
        {safeReason.shared_genres.length > 0 ? <p>- Shared genres: {joinValues(safeReason.shared_genres)}</p> : null}
        {safeReason.shared_keywords.length > 0 ? <p>- Shared keywords: {joinValues(safeReason.shared_keywords)}</p> : null}
        {safeReason.shared_cast.length > 0 ? <p>- Shared cast: {joinValues(safeReason.shared_cast)}</p> : null}
        {safeReason.shared_director ? <p>- Same director</p> : null}
      </div>
    </div>
  );
}
