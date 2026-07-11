"use client";

import { useEffect, useState } from "react";
import type { MovieProfile, Recommendation, SearchResult } from "@/lib/types";
import { RecommendationCard } from "@/components/RecommendationCard";
import { EmptyState } from "@/components/EmptyState";

type RecommendationGridProps = {
  selected: MovieProfile | SearchResult | null;
  recommendations: Recommendation[];
};

export function RecommendationGrid({ selected, recommendations }: RecommendationGridProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [recommendations]);

  if (!selected) {
    return (
      <EmptyState
        title="Search for a title to begin"
        body="Choose the exact TMDB movie or TV result first. Recommendations appear after FilmyMatch compares that title against the local dataset."
      />
    );
  }

  if (recommendations.length === 0) {
    return (
      <EmptyState
        title="No recommendations yet"
        body="The selected title is ready, but no recommendations have been returned. Try another title or check the API connection."
      />
    );
  }

  const visibleIndex = Math.min(activeIndex, recommendations.length - 1);
  const activeRecommendation = recommendations[visibleIndex];
  const isFirst = visibleIndex === 0;
  const isLast = visibleIndex === recommendations.length - 1;

  function cardTransform(index: number) {
    const offset = index - visibleIndex;
    const clampedOffset = Math.max(-2, Math.min(2, offset));

    if (clampedOffset === 0) {
      return {
        opacity: 1,
        transform: "translateX(0) translateZ(0) rotateY(0deg) scale(1)",
        zIndex: 30,
      };
    }

    if (clampedOffset === -1) {
      return {
        opacity: 0.58,
        transform: "translateX(-68%) translateZ(-120px) rotateY(34deg) scale(0.82)",
        zIndex: 20,
      };
    }

    if (clampedOffset === 1) {
      return {
        opacity: 0.58,
        transform: "translateX(68%) translateZ(-120px) rotateY(-34deg) scale(0.82)",
        zIndex: 20,
      };
    }

    return {
      opacity: 0,
      transform: `translateX(${clampedOffset < 0 ? "-96%" : "96%"}) translateZ(-240px) rotateY(${clampedOffset < 0 ? "58deg" : "-58deg"}) scale(0.7)`,
      zIndex: 10,
    };
  }

  function showPrevious() {
    setActiveIndex((currentIndex) => Math.max(0, currentIndex - 1));
  }

  function showNext() {
    setActiveIndex((currentIndex) => Math.min(recommendations.length - 1, currentIndex + 1));
  }

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h3 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.5px] text-charcoal-primary">
          Recommendation {visibleIndex + 1} of {recommendations.length}
        </h3>
        <span className="text-[14px] font-medium tracking-[-0.18px] text-ash">
          {Math.round(activeRecommendation.score * 100)}% similar
        </span>
      </div>

      <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 sm:grid-cols-[52px_minmax(0,1fr)_52px] sm:gap-5">
        <button
          aria-label="Previous recommendation"
          className="grid size-11 place-items-center rounded-[32px] bg-midnight text-white shadow-[var(--shadow-subtle-3)] transition duration-200 ease-in-out hover:bg-charcoal-primary disabled:cursor-not-allowed disabled:bg-stone-surface disabled:text-smoke disabled:opacity-70 sm:size-13"
          disabled={isFirst}
          onClick={showPrevious}
          type="button"
        >
          <span aria-hidden="true" className="-mt-0.5 text-[30px] font-light leading-none">
            ‹
          </span>
        </button>

        <div
          className="min-w-0 overflow-hidden py-5 [perspective:1400px]"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
          }}
        >
          <div className="grid [transform-style:preserve-3d]">
            {recommendations.map((recommendation, index) => (
              <div
                aria-hidden={index !== visibleIndex}
                className="col-start-1 row-start-1 mx-auto w-[78%] max-w-[460px] transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] [backface-visibility:hidden] [transform-style:preserve-3d]"
                key={`${recommendation.title}-${index}`}
                style={{
                  ...cardTransform(index),
                  pointerEvents: index === visibleIndex ? "auto" : "none",
                }}
              >
                <RecommendationCard rank={index + 1} recommendation={recommendation} />
              </div>
            ))}
          </div>
        </div>

        <button
          aria-label="Next recommendation"
          className="grid size-11 place-items-center rounded-[32px] bg-midnight text-white shadow-[var(--shadow-subtle-3)] transition duration-200 ease-in-out hover:bg-charcoal-primary disabled:cursor-not-allowed disabled:bg-stone-surface disabled:text-smoke disabled:opacity-70 sm:size-13"
          disabled={isLast}
          onClick={showNext}
          type="button"
        >
          <span aria-hidden="true" className="-mt-0.5 text-[30px] font-light leading-none">
            ›
          </span>
        </button>
      </div>
    </div>
  );
}
