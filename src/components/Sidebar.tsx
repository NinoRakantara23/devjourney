import { useLayoutEffect, useRef, useState, type Ref } from 'react';
import { allNavItems, navItems, skillItem, type NavItem, type RouteId } from '../navigation';

const focusActive =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-panel';
const focusInactive =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand';

function DesktopNavLink({
  item,
  active,
  linkRef,
}: {
  item: NavItem;
  active: boolean;
  linkRef?: Ref<HTMLAnchorElement>;
}) {
  const Icon = item.Icon;

  return (
    <a
      ref={linkRef}
      href={item.href}
      aria-current={active ? 'page' : undefined}
      aria-label={item.label}
      title={item.label}
      className={`relative z-10 grid h-12 w-12 place-items-center rounded-[16px] transition-colors ${
        active
          ? `text-brand ${focusActive}`
          : `text-white/85 hover:bg-white/10 hover:text-white ${focusInactive}`
      }`}
    >
      <Icon size={21} strokeWidth={1.9} aria-hidden />
    </a>
  );
}

function MobileNavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.Icon;

  return (
    <a
      href={item.href}
      aria-current={active ? 'page' : undefined}
      aria-label={item.label}
      title={item.label}
      className={`grid h-11 w-11 place-items-center rounded-[14px] transition-colors max-[340px]:h-10 max-[340px]:w-10 ${
        active
          ? `bg-white text-brand shadow-[0_8px_18px_rgba(39,16,92,.24)] ${focusActive}`
          : `text-white/85 hover:bg-white/10 hover:text-white ${focusInactive}`
      }`}
    >
      <Icon size={20} strokeWidth={1.9} aria-hidden />
    </a>
  );
}

export default function Sidebar({ activeRoute }: { activeRoute: RouteId }) {
  const asideRef = useRef<HTMLElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const activeRef = useRef<HTMLAnchorElement | null>(null);
  const [indicatorY, setIndicatorY] = useState<number | null>(null);

  useLayoutEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;

    let frame = 0;

    const measure = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const active = activeRef.current;
        if (!active) {
          setIndicatorY(null);
          return;
        }

        const asideRect = aside.getBoundingClientRect();
        const activeRect = active.getBoundingClientRect();
        const nextY = activeRect.top - asideRect.top + activeRect.height / 2 - 32;

        setIndicatorY((previous) =>
          previous !== null && Math.abs(previous - nextY) < 0.5 ? previous : nextY,
        );
      });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(aside);
    if (navRef.current) observer.observe(navRef.current);
    if (activeRef.current) observer.observe(activeRef.current);

    window.addEventListener('resize', measure);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [activeRoute]);

  return (
    <>
      <aside
        ref={asideRef}
        aria-label="Navigasi utama"
        data-active-route={activeRoute}
        className="relative hidden min-h-[860px] flex-col items-center overflow-hidden rounded-[40px] bg-brand px-3 pb-16 pt-5 text-white lg:flex"
      >
        {indicatorY !== null ? (
          <span
            aria-hidden
            data-active-indicator
            className="pointer-events-none absolute left-5 top-0 z-0 h-16 w-[92px] rounded-l-[32px] bg-panel transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none"
            style={{
              transform: `translate3d(0, ${indicatorY}px, 0)`,
              filter: 'drop-shadow(0 10px 18px rgba(39,16,92,.18))',
            }}
          >
            <span className="absolute right-[-30px] top-[-30px] h-[60px] w-[60px] rounded-full bg-panel" />
            <span className="absolute bottom-[-30px] right-[-30px] h-[60px] w-[60px] rounded-full bg-panel" />
          </span>
        ) : null}

        <div
          aria-hidden
          className="relative z-10 mb-7 grid h-11 w-11 place-items-center rounded-[15px] border border-white/15 bg-white/10 text-[11px] font-extrabold tracking-[0.18em]"
        >
          DJ
        </div>

        <nav ref={navRef} className="relative z-10 mt-[80px] flex w-full flex-col gap-12">
          {navItems.map((item) => (
            <div key={item.id} className="relative flex h-12 w-full justify-center">
              <DesktopNavLink
                item={item}
                active={activeRoute === item.id}
                linkRef={activeRoute === item.id ? activeRef : undefined}
              />
            </div>
          ))}
        </nav>

        <div className="relative z-10 mt-auto w-full pt-6">
          <div aria-hidden className="mx-auto mb-4 h-px w-8 bg-white/15" />
          <div className="flex w-full justify-center">
            <DesktopNavLink
              item={skillItem}
              active={activeRoute === skillItem.id}
              linkRef={activeRoute === skillItem.id ? activeRef : undefined}
            />
          </div>
        </div>
      </aside>

      <nav
        aria-label="Navigasi utama seluler"
        className="fixed inset-x-3 bottom-3 z-30 mx-auto grid max-w-[560px] grid-cols-7 place-items-center rounded-[22px] bg-brand p-2 text-white shadow-panelLift sm:inset-x-5 lg:hidden"
      >
        {allNavItems.map((item) => (
          <MobileNavLink key={item.id} item={item} active={activeRoute === item.id} />
        ))}
      </nav>
    </>
  );
}
