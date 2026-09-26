"use client";

/**
 * ScrollReveal — site-wide scroll animation system.
 *
 * Any element with class `reveal` (optionally `reveal-left`, `reveal-right`,
 * `reveal-zoom`) animates in when it enters the viewport. Stagger children
 * by setting `style={{ "--reveal-delay": "120ms" }}` on the element.
 *
 * Respects prefers-reduced-motion (CSS keeps content visible), and disables
 * itself entirely for browsers without IntersectionObserver.
 */

import { useEffect } from "react";

export default function ScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll<HTMLElement>(".reveal").forEach((el) => el.classList.add("is-visible"));
      return;
    }

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

    const nodes = document.querySelectorAll<HTMLElement>(".reveal:not(.is-visible)");
    nodes.forEach((el) => observer.observe(el));

    // Re-scan briefly after route content settles (Next.js lazy sections).
    const rescan = window.setTimeout(() => {
      document.querySelectorAll<HTMLElement>(".reveal:not(.is-visible)").forEach((el) => observer.observe(el));
    }, 1200);

    return () => {
      window.clearTimeout(rescan);
      observer.disconnect();
    };
  }, []);

  return null;
}
