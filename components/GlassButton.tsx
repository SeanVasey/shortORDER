"use client";

import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

const BASE =
  "glass inline-flex items-center justify-center gap-2 font-semibold tracking-wide " +
  "transition-transform duration-200 active:scale-[0.97] select-none cursor-pointer " +
  "disabled:opacity-50 disabled:cursor-default text-chalk";

const SIZES = {
  md: "px-5 py-3 text-sm [--glass-radius:0.9rem]",
  lg: "px-7 py-4 text-base [--glass-radius:1.1rem]",
};

function Inner({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="glass-spec" aria-hidden="true" />
      <span className="glass-content inline-flex items-center gap-2">{children}</span>
    </>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: keyof typeof SIZES;
  accent?: boolean;
};

export default function GlassButton({ size = "md", accent, className = "", children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={`${BASE} ${SIZES[size]} ${accent ? "[--glass-glow:0.95]" : "[--glass-glow:0.4]"} ${className}`}
    >
      <Inner>{children}</Inner>
    </button>
  );
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  size?: keyof typeof SIZES;
  accent?: boolean;
};

export function GlassLink({ size = "md", accent, className = "", children, ...rest }: LinkProps) {
  return (
    <a
      {...rest}
      className={`${BASE} ${SIZES[size]} ${accent ? "[--glass-glow:0.95]" : "[--glass-glow:0.4]"} ${className}`}
    >
      <Inner>{children}</Inner>
    </a>
  );
}
