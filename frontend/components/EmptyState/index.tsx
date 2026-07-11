export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="stone-card p-8 text-center">
      <div className="mx-auto mb-5 grid size-20 place-items-center rounded-[72px] bg-parchment-card">
        <div className="relative size-12 rounded-[22px] bg-sunburst-yellow">
          <span className="absolute left-3 top-4 size-1.5 rounded-full bg-midnight" />
          <span className="absolute right-3 top-4 size-1.5 rounded-full bg-midnight" />
          <span className="absolute bottom-3 left-1/2 h-2 w-5 -translate-x-1/2 rounded-b-full border-b-2 border-midnight" />
        </div>
      </div>
      <h3 className="text-[19px] font-semibold leading-[1.38] tracking-[-0.25px] text-charcoal-primary">{title}</h3>
      <p className="mx-auto mt-2 max-w-[420px] text-[15px] leading-[1.47] tracking-[-0.2px] text-graphite">{body}</p>
    </div>
  );
}

