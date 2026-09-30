"use client";

/**
 * ScrollReveal — site-wide scroll animation system.
 *
 * Any element with class `reveal` (optionally `reveal-left`, `reveal-right`,
 * `reveal-zoom`) animates in when it enters the viewport. Stagger children
 * by setting `style={{ "--reveal-delay": "120ms" }}` on the element.
 *
 * Progressive enhancement: CSS only hides `.reveal` elements when the root
 * <html> has the `js-reveal` class — which this component adds on mount.
 * If JavaScript never runs (extensions, blocked scripts, crawlers), content
 * stays fully visible. Respects prefers-reduced-motion and disables itself
 * for browsers without IntersectionObserver.
 */

import { useEffect } from "react";

export default function ScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("IntersectionObserver" in window)) return; // CSS never hides anything

    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // CSS keeps content visible

    root.classList.add("js-reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target); // animate once, then stop watching
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    const scan = () => {
      document.querySelectorAll<HTMLElement>(".reveal:not(.is-visible)").forEach((el) => observer.observe(el));
    };

    scan();
    // Re-scan briefly after route content settles (Next.js lazy sections).
    const rescan = window.setTimeout(scan, 1200);

    return () => {
      window.clearTimeout(rescan);
      observer.disconnect();
      root.classList.remove("js-reveal");
    };
  }, []);

  return null;
}
