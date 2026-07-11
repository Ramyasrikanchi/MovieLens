"use client";

import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SearchBar } from "@/components/SearchBar";
import type { SearchResult } from "@/lib/types";

export function SearchPage() {
  const router = useRouter();

  function handleSelect(result: SearchResult) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(`filmymatch:selected:${result.media_type}:${result.tmdb_id}`, JSON.stringify(result));
    }
    router.push(`/recommend/${result.media_type}/${result.tmdb_id}`);
  }

  return (
    <main className="min-h-screen bg-warm-canvas">
      <Navbar />

      <section className="mx-auto max-w-[1200px] px-5 pb-12 pt-20 sm:px-8">
        <div className="mx-auto max-w-[760px] text-center">
          <p className="text-[14px] font-medium tracking-[-0.18px] text-ember-orange">Search TMDB first</p>
          <h1 className="hero-display mt-4">Choose the exact movie or TV show before generating recommendations.</h1>
          <p className="mx-auto mt-6 max-w-[640px] text-[16px] leading-[1.5] tracking-[-0.18px] text-graphite">
            This page only resolves candidates. Once you select one result, FilmyMatch moves into a separate recommendation screen for that TMDB id.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-[860px]">
          <SearchBar autoFocus onSelect={handleSelect} placeholder="Search by movie or TV title..." variant="stack" />
        </div>
      </section>
    </main>
  );
}
