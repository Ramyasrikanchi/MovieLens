import Link from "next/link";
import { Hero } from "@/components/Hero";
import { Navbar } from "@/components/Navbar";

export function HomePage() {
  return (
    <main className="min-h-screen bg-warm-canvas">
      <Navbar />
      <Hero
        body="MovieLens separates search from recommendation so you can resolve the right TMDB title first, then inspect richer recommendation cards with explainable overlap."
        primaryHref="/search"
        primaryLabel="Start searching"
        secondaryHref="/recommend/movie/157336"
        secondaryLabel="Open sample results"
        title="A recommendation product, not just a widget."
      />

      <section className="mx-auto max-w-[1200px] px-5 pb-24 sm:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          <article className="stone-card p-6">
            <p className="text-[13px] font-semibold tracking-[-0.16px] text-ember-orange">1. Search cleanly</p>
            <h2 className="mt-3 text-[24px] font-semibold leading-[1.2] tracking-[-0.4px] text-charcoal-primary">
              Dedicated search flow
            </h2>
            <p className="mt-3 text-[15px] leading-[1.5] tracking-[-0.2px] text-graphite">
              Search movies and TV shows in a separate workspace with debounced TMDB autocomplete and candidate selection.
            </p>
          </article>

          <article className="stone-card p-6">
            <p className="text-[13px] font-semibold tracking-[-0.16px] text-ember-orange">2. Compare precisely</p>
            <h2 className="mt-3 text-[24px] font-semibold leading-[1.2] tracking-[-0.4px] text-charcoal-primary">
              Baseline model stays in production
            </h2>
            <p className="mt-3 text-[15px] leading-[1.5] tracking-[-0.2px] text-graphite">
              The app keeps using the baseline TF-IDF similarity model while preserving weighted experiments separately in the repository.
            </p>
          </article>

          <article className="stone-card p-6">
            <p className="text-[13px] font-semibold tracking-[-0.16px] text-ember-orange">3. Explain the match</p>
            <h2 className="mt-3 text-[24px] font-semibold leading-[1.2] tracking-[-0.4px] text-charcoal-primary">
              Human-readable reasons
            </h2>
            <p className="mt-3 text-[15px] leading-[1.5] tracking-[-0.2px] text-graphite">
              Recommendation cards separate metadata, similarity score, and shared genres, keywords, cast, or director signals.
            </p>
          </article>
        </div>

        <div className="stone-card mt-8 flex flex-col items-start justify-between gap-4 p-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-[13px] font-semibold tracking-[-0.16px] text-ember-orange">Ready to use it</p>
            <h3 className="mt-2 text-[28px] font-semibold leading-[1.15] tracking-[-0.5px] text-charcoal-primary">
              Move into search, pick a title, inspect the neighbors.
            </h3>
          </div>
          <Link className="pill-dark flex items-center" href="/search">
            Go to search
          </Link>
        </div>
      </section>
    </main>
  );
}
