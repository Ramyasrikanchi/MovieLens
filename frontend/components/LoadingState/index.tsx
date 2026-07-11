type LoadingStateProps = {
  label?: string;
  skeleton?: boolean;
};

export function LoadingState({ label = "Loading", skeleton = false }: LoadingStateProps) {
  if (skeleton) {
    return (
      <div className="space-y-4">
        <div className="stone-card h-24 animate-pulse bg-white" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="stone-card h-[520px] animate-pulse bg-white" />
          <div className="stone-card h-[520px] animate-pulse bg-white" />
          <div className="stone-card h-[520px] animate-pulse bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="stone-card flex items-center gap-3 px-5 py-4 text-[15px] tracking-[-0.2px] text-graphite">
      <span className="size-3 animate-pulse rounded-full bg-ember-orange" />
      {label}
    </div>
  );
}
