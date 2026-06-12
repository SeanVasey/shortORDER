"use client";

import { useEffect } from "react";

/**
 * Shared SVG filter defs for the liquid-glass material.
 *
 * #so-distort: fractal noise → blur → displacement. Applied via regular
 * `filter:` on the duplicated texture layer (Safari-safe baseline). Where
 * Chromium allows SVG filters inside backdrop-filter, html.bf-svg promotes
 * it to refract the live page (progressive enhancement, detected here).
 */
export default function GlassFilters() {
  useEffect(() => {
    // Detect, don't assume: only Chromium currently accepts SVG url()
    // filters in backdrop-filter. Safari must keep the layered baseline.
    try {
      if (
        typeof CSS !== "undefined" &&
        CSS.supports("backdrop-filter", "url('#so-distort')") &&
        !/^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      ) {
        document.documentElement.classList.add("bf-svg");
      }
    } catch {
      /* baseline stays */
    }

    // The living surface breathes via SMIL; honor prefers-reduced-motion.
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      document
        .querySelectorAll<SVGAnimateElement>("#so-distort animate")
        .forEach((el) => (mq.matches ? el.setAttribute("dur", "0") : el.setAttribute("dur", "18s")));
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <filter id="so-distort" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="7" result="noise">
            <animate
              attributeName="baseFrequency"
              values="0.012 0.018;0.016 0.022;0.012 0.018"
              dur="18s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feGaussianBlur in="noise" stdDeviation="2.2" result="smooth" />
          <feDisplacementMap in="SourceGraphic" in2="smooth" scale="26" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
