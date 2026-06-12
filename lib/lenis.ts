/**
 * Lenis smooth-scroll setup + the scroll-progress variable that drives the
 * beam playhead and the glass parallax. CSS scroll-driven timelines aren't
 * reliable on current iOS Safari, so progress is published as a custom
 * property (--scroll-progress) from Lenis's rAF-driven scroll events.
 */

import Lenis from "lenis";

export function initLenis(): () => void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduced.matches) {
    // No inertial scroll, no playhead choreography — opacity reveals only.
    document.documentElement.style.setProperty("--scroll-progress", "0");
    return () => {};
  }

  const lenis = new Lenis({ lerp: 0.12, smoothWheel: true });

  let raf = 0;
  const frame = (time: number) => {
    lenis.raf(time);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    document.documentElement.style.setProperty("--scroll-progress", p.toFixed(4));
  };
  lenis.on("scroll", onScroll);
  onScroll();

  return () => {
    cancelAnimationFrame(raf);
    lenis.destroy();
  };
}
