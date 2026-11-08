export default function DashboardSkeleton() {
  return (
    <div
      aria-hidden
      className="grid min-h-[2000px] gap-5 md:min-h-[1450px] xl:min-h-[1040px] xl:grid-cols-[1.72fr_minmax(0,1fr)] xl:gap-6"
    >
      <div className="flex min-w-0 flex-col gap-5">
        <div className="h-[190px] rounded-[22px] bg-soft2 motion-safe:animate-pulse sm:h-[200px]" />

        <div>
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div className="h-5 w-36 rounded bg-soft" />
            <div className="h-5 w-20 rounded-full bg-soft" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-[120px] rounded-[18px] bg-soft2 motion-safe:animate-pulse" />
            ))}
          </div>
          <div className="mt-3 h-[58px] rounded-2xl bg-soft2 motion-safe:animate-pulse" />
        </div>

        <div className="h-[310px] rounded-[20px] bg-soft2 motion-safe:animate-pulse" />
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:flex xl:flex-col xl:gap-3 xl:rounded-[24px] xl:bg-soft2 xl:p-4">
        <div className="h-[210px] rounded-2xl bg-card/70 motion-safe:animate-pulse sm:col-span-2 xl:col-span-1" />
        <div className="h-[150px] rounded-2xl bg-card/70 motion-safe:animate-pulse" />
        <div className="h-[140px] rounded-2xl bg-card/70 motion-safe:animate-pulse" />
        <div className="h-[180px] rounded-2xl bg-card/70 motion-safe:animate-pulse sm:col-span-2 xl:col-span-1" />
      </div>
    </div>
  );
}
