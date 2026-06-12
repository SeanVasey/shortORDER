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
      className="pointer-events-none fixed inset-x-[-20%] z-0 h-[2px]"
      style={{
        top: "calc(8vh + var(--scroll-progress) * 84vh)",
        transform: "rotate(calc(-1 * var(--beam-angle)))",
        background:
          "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--color-teal) 50%, transparent) 30%, var(--color-beam) 50%, color-mix(in srgb, var(--color-teal) 50%, transparent) 70%, transparent 100%)",
        boxShadow:
          "0 0 18px 2px color-mix(in srgb, var(--color-beam) 45%, transparent), 0 0 60px 8px color-mix(in srgb, var(--color-teal) 18%, transparent)",
        opacity: 0.7,
      }}
    />
  );
}
