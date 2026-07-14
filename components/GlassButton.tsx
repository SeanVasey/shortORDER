"use client";

import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

const BASE =
  "glass glass-radius-sm inline-flex items-center justify-center gap-2 font-semibold tracking-wide " +
  "transition-transform duration-200 active:scale-[0.97] select-none cursor-pointer " +
  "disabled:opacity-50 disabled:cursor-default";

const SIZES = {
  md: "px-5 py-3 text-sm",
  lg: "px-7 py-4 text-base",
};

// "ready" is the plated-and-served moment — Lime, the loudest VASEY/AI
// accent, reserved for the successful direct-import CTA.
const TONES = {
  default: "text-chalk",
  ready: "text-lime",
};

function Inner({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="glass-refract" aria-hidden="true" />
      <div className="glass-spec" aria-hidden="true" />
      <span className="glass-content inline-flex items-center gap-2">{children}</span>
    </>
  );
}

function classes(size: keyof typeof SIZES, accent: boolean | undefined, tone: keyof typeof TONES, className: string) {
  return `${BASE} ${SIZES[size]} ${TONES[tone]} ${accent ? "[--glass-glow:0.95]" : "[--glass-glow:0.4]"} ${className}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: keyof typeof SIZES;
  accent?: boolean;
  tone?: keyof typeof TONES;
};

export default function GlassButton({ size = "md", accent, tone = "default", className = "", children, ...rest }: ButtonProps) {
  return (
    <button {...rest} className={classes(size, accent, tone, className)}>
      <Inner>{children}</Inner>
    </button>
  );
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  size?: keyof typeof SIZES;
  accent?: boolean;
  tone?: keyof typeof TONES;
};

export function GlassLink({ size = "md", accent, tone = "default", className = "", children, ...rest }: LinkProps) {
  return (
    <a {...rest} className={classes(size, accent, tone, className)}>
      <Inner>{children}</Inner>
    </a>
  );
}
