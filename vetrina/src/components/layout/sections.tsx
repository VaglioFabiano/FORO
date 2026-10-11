/**
 * Navigazione a pagina unica: link alle sezioni della home e "scroll spy".
 * Usa <SectionLink to="orari"> ovunque (anche fuori dalla home: porta a /#orari).
 */
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { scrollToTarget } from "./Layout";

export function useGoToSection() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (id: string) => {
    if (pathname === "/") {
      if (id === "top") scrollToTarget(0, 0);
      else scrollToTarget(`#${id}`);
      history.replaceState(null, "", id === "top" ? "/" : `/#${id}`);
    } else {
      navigate(id === "top" ? "/" : `/#${id}`);
    }
  };
}

export function SectionLink({
  to,
  children,
  className,
  onClick,
  ...rest
}: {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  "aria-current"?: "true" | undefined;
  title?: string;
}) {
  const go = useGoToSection();
  return (
    <a
      href={to === "top" ? "/" : `/#${to}`}
      className={className}
      onClick={(e: MouseEvent) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onClick?.();
        go(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

/** id della sezione attualmente in lettura (solo sulla home) */
export function useActiveSection(ids: readonly string[]) {
  const { pathname } = useLocation();
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (pathname !== "/") {
      setActive(null);
      return;
    }
    let raf = 0;
    const compute = () => {
      const line = window.innerHeight * 0.35;
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= line && r.bottom > line) current = id;
      }
      setActive(current);
    };
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    const t = setTimeout(compute, 300);
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, [pathname, ids]);
  return active;
}
