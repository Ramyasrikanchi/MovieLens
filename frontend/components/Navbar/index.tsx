import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-warm-canvas" style={{ boxShadow: "var(--shadow-subtle-3)" }}>
      <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 sm:px-8">
        <Link className="flex items-center gap-3 text-[15px] font-medium tracking-[-0.2px] text-charcoal-primary" href="/">
          <span className="grid size-9 place-items-center rounded-[10px] bg-parchment-card shadow-[var(--shadow-subtle)]">
            <span className="size-4 rounded-full bg-ember-orange" />
          </span>
          FilmyMatch
        </Link>

        <div className="hidden items-center gap-8 text-[14px] font-medium tracking-[-0.18px] text-charcoal-primary md:flex">
          <Link href="/">Home</Link>
          <Link href="/search">Search</Link>
          <a href="http://127.0.0.1:8000/docs" rel="noreferrer" target="_blank">
            API
          </a>
        </div>

        <div className="flex items-center gap-2">
          <a className="pill-light hidden items-center sm:flex" href="http://127.0.0.1:8000/docs" rel="noreferrer" target="_blank">
            API Docs
          </a>
          <Link className="pill-dark flex items-center" href="/search">
            Start
          </Link>
        </div>
      </nav>
    </header>
  );
}
