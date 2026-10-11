import { Suspense, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import Lenis from "lenis";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { CookieBanner } from "./CookieBanner";
import { HeaderToneProvider } from "./tone";
import { Toaster } from "@/components/ui/Toast";
import { LogoSymbol } from "@/brand/Logo";

let lenisRef: Lenis | null = null;
/** scroll morbido verso un'ancora o un elemento (usa Lenis se attivo) */
export function scrollToTarget(target: string | HTMLElement | number, offset = -88) {
  if (lenisRef) lenisRef.scrollTo(target as never, { offset, duration: 1.2 });
  else if (typeof target === "number") window.scrollTo({ top: target, behavior: "smooth" });
  else {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (el) window.scrollTo({ top: (el as HTMLElement).getBoundingClientRect().top + window.scrollY + offset, behavior: "smooth" });
  }
}

function useSmoothScroll() {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
    lenisRef = lenis;
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisRef = null;
    };
  }, [reduce]);
}

/** la home e /eventi/:slug (drawer) sono la stessa pagina */
const pageGroup = (p: string) => (p === "/" || p.startsWith("/eventi/") ? "/" : p);

function ScrollManager() {
  const { pathname, hash } = useLocation();
  const first = useRef(true);
  const prevGroup = useRef(pageGroup(pathname));
  useEffect(() => {
    const group = pageGroup(pathname);
    const sameGroup = group === prevGroup.current;
    prevGroup.current = group;
    if (hash) {
      const t = setTimeout(() => scrollToTarget(hash), first.current ? 450 : 120);
      first.current = false;
      return () => clearTimeout(t);
    }
    if (sameGroup && !first.current) return;
    if (lenisRef) lenisRef.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
    first.current = false;
  }, [pathname, hash]);
  return null;
}

/** intercetta i click su link interni con hash sulla stessa pagina */
function useHashLinks() {
  useEffect(() => {
    const on = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href^='#']") as HTMLAnchorElement | null;
      if (!a) return;
      const id = a.getAttribute("href")!;
      if (id.length > 1 && document.querySelector(id)) {
        e.preventDefault();
        scrollToTarget(id);
        history.replaceState(null, "", id);
      }
    };
    document.addEventListener("click", on);
    return () => document.removeEventListener("click", on);
  }, []);
}

export function PageFallback() {
  return (
    <div className="page-fallback" aria-busy="true" aria-label="Caricamento">
      <motion.div animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
        <LogoSymbol size={44} />
      </motion.div>
    </div>
  );
}

export function PublicLayout() {
  useSmoothScroll();
  useHashLinks();
  const { pathname } = useLocation();
  return (
    <HeaderToneProvider>
      <a href="#contenuto" className="skip-link">
        Vai al contenuto
      </a>
      <SiteHeader />
      <main id="contenuto" className="site-main">
        <Suspense fallback={<PageFallback />}>
          <motion.div
            key={pageGroup(pathname)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </Suspense>
      </main>
      <SiteFooter />
      <CookieBanner />
      <Toaster />
      <ScrollManager />
    </HeaderToneProvider>
  );
}

/** Area volontari: shell propria (niente header/footer pubblici) */
export function BareLayout() {
  return (
    <>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
      <Toaster />
      <ScrollManager />
    </>
  );
}
