import Link from "next/link";

function Blob({
  className,
  color,
  delay = "0ms"
}: {
  className: string;
  color: string;
  delay?: string;
}) {
  return (
    <div
      className={`blob-float absolute hidden rounded-[72px] md:block ${className}`}
      style={{
        background: color,
        animationDelay: delay
      }}
      aria-hidden="true"
    >
      <span className="absolute left-[34%] top-[34%] size-2 rounded-full bg-midnight" />
      <span className="absolute right-[34%] top-[34%] size-2 rounded-full bg-midnight" />
      <span className="absolute bottom-[30%] left-1/2 h-3 w-7 -translate-x-1/2 rounded-b-full border-b-2 border-midnight" />
      <span className="absolute -bottom-5 left-1/3 h-7 w-1 rounded-full bg-midnight" />
      <span className="absolute -bottom-5 right-1/3 h-7 w-1 rounded-full bg-midnight" />
    </div>
  );
}

type HeroProps = {
  eyebrow?: string;
  title?: string;
  body?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function Hero({
  eyebrow = "Search first. Recommend from the right match.",
  title = "Movie discovery that feels like a warm little adventure.",
  body = "Find a movie or TV show from TMDB, select the exact result, and let MovieLens compare it with the local recommendation engine.",
  primaryHref = "/search",
  primaryLabel = "Search titles",
  secondaryHref = "/recommend/movie/157336",
  secondaryLabel = "See example",
}: HeroProps) {
  return (
    <section className="relative mx-auto flex min-h-[560px] max-w-[1200px] flex-col items-center justify-center px-5 pb-14 pt-20 text-center sm:px-8">
      <Blob className="left-10 top-28 h-24 w-28 rotate-[-8deg]" color="var(--color-sky-blue)" delay="80ms" />
      <Blob className="right-16 top-32 h-20 w-24 rotate-[10deg]" color="var(--color-sunburst-yellow)" delay="160ms" />
      <Blob className="bottom-28 left-24 h-16 w-20 rotate-[12deg]" color="var(--color-meadow-green)" delay="220ms" />
      <Blob className="bottom-32 right-28 h-24 w-20 rotate-[-13deg]" color="var(--color-ember-orange)" delay="300ms" />

      <p className="mb-4 text-[14px] font-medium tracking-[-0.18px] text-ember-orange">{eyebrow}</p>
      <h1 className="hero-display max-w-[830px]">{title}</h1>
      <p className="mt-6 max-w-[520px] text-[16px] leading-[1.47] tracking-[-0.16px] text-graphite">{body}</p>
      <div className="mt-8 flex items-center gap-3">
        <Link className="pill-dark flex items-center" href={primaryHref}>
          {primaryLabel}
        </Link>
        <Link className="pill-light flex items-center" href={secondaryHref}>
          {secondaryLabel}
        </Link>
      </div>
    </section>
  );
}
