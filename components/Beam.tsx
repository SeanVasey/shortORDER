"use client";

/**
 * The beam-as-playhead: a fixed 25° beam of Beam-Blue light whose vertical
 * position is bound to --scroll-progress (published by lib/lenis.ts),
 * sweeping the page like a transport playhead reading a track.
 */
export default function Beam() {
  return (
    <div
      aria-hidden="true"
      className="beam-playhead pointer-events-none fixed inset-x-[-20%] z-0 h-[2px]"
    />
  );
}
