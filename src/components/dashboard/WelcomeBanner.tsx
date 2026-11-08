import { Info, ListChecks, Target } from "lucide-react";
import JourneyIllustration from "./JourneyIllustration";

export default function WelcomeBanner({
  focus,
  openTasks,
  activeProjects,
  preview,
  previewNote,
}: {
  focus: string;
  openTasks: number;
  activeProjects: number;
  preview: boolean;
  previewNote: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[22px] border border-[#f4dfae] bg-banner px-5 py-5 shadow-cardLift dark:border-[#5b4a28] md:px-6 md:py-5">
      <div className="relative z-10 grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_220px] lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-[28px] font-semibold leading-tight tracking-[-0.02em] text-bannerInk md:text-[31px]">
              Welcome Back!
            </h1>
            {preview ? (
              <span
                className="rounded-full border border-[#ecd39b] bg-white/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-bannerInk dark:border-white/15 dark:bg-white/10"
                title={previewNote || "Data contoh untuk pratinjau."}
              >
                Preview data
              </span>
            ) : null}
          </div>

          <p className="mt-2 max-w-[390px] text-[12.5px] leading-relaxed text-bannerMuted">
            Keep building, keep learning, and make progress one step at a time.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-lg bg-white/55 text-bannerInk dark:bg-white/10">
                <Target size={15} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-bannerMuted">
                  Fokus hari ini
                </p>
                <p
                  className="mt-0.5 break-words text-[11.5px] font-semibold leading-snug text-bannerInk"
                  title={focus}
                >
                  {focus}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-lg bg-white/55 text-bannerInk dark:bg-white/10">
                <ListChecks size={15} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-bannerMuted">
                  Ringkasan
                </p>
                <p className="mt-0.5 text-[11.5px] font-semibold text-bannerInk">
                  {openTasks} tugas tersisa · {activeProjects} proyek aktif
                </p>
              </div>
            </div>
          </div>

          {preview ? (
            <p className="mt-3 flex items-center gap-1.5 text-[10px] font-medium text-bannerMuted">
              <Info size={12} aria-hidden />{" "}
              {previewNote || "Data contoh untuk pratinjau."}
            </p>
          ) : null}
        </div>

        <JourneyIllustration className="hidden w-full md:block" />
      </div>
    </section>
  );
}
