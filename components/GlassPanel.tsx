"use client";

import { useCallback, useRef, type CSSProperties, type ReactNode } from "react";

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** 0–1 strength of the under-glow */
  glow?: number;
  style?: CSSProperties;
}

/**
 * The liquid-glass primitive. Layer order lives in styles/glass.css;
 * this component supplies the DOM layers and the pointer-reactive
 * specular highlight (one highlight, well-tuned).
 */
export default function GlassPanel({
  children,
  className = "",
  contentClassName = "",
  glow = 0.55,
  style,
}: GlassPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--sx", `${(((e.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`);
    el.style.setProperty("--sy", `${(((e.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`);
  }, []);

  return (
    <div
      ref={ref}
      className={`glass ${className}`}
      style={{ ...style, "--glass-glow": glow } as CSSProperties}
      onPointerMove={onPointerMove}
    >
      <div className="glass-refract" aria-hidden="true">
        {/* the duplicated texture lives in ::before; this hosts overflow clipping */}
      </div>
      <div className="glass-spec" aria-hidden="true" />
      <div className={`glass-content ${contentClassName}`}>{children}</div>
    </div>
  );
}
