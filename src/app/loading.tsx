export default function Loading() {
  return (
    <div className="site-loading mx-auto flex min-h-[50vh] w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="site-loading__bar h-3 w-40 animate-pulse rounded-full" />
      <div className="site-loading__bar h-10 w-3/4 max-w-xl animate-pulse rounded-xl" />
      <div className="site-loading__bar h-4 w-full max-w-2xl animate-pulse rounded-lg" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="site-loading__card overflow-hidden rounded-2xl border"
          >
            <div className="site-loading__bar aspect-video animate-pulse" />
            <div className="space-y-3 p-4">
              <div className="site-loading__bar h-3 w-24 animate-pulse rounded" />
              <div className="site-loading__bar h-5 w-full animate-pulse rounded" />
              <div className="site-loading__bar h-4 w-4/5 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
