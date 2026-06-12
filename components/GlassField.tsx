"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";

type GlassFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

/** The order window: the glass search/description field. */
const GlassField = forwardRef<HTMLTextAreaElement, GlassFieldProps>(
  function GlassField({ label, className = "", ...rest }, ref) {
    return (
      <div className="glass [--glass-radius:1.25rem] [--glass-glow:0.7]">
        <div className="glass-refract" aria-hidden="true" />
        <div className="glass-spec" aria-hidden="true" />
        <div className="glass-content p-1">
          <label className="sr-only" htmlFor={rest.id ?? "order-field"}>
            {label}
          </label>
          <textarea
            ref={ref}
            id={rest.id ?? "order-field"}
            rows={3}
            className={
              "w-full resize-none bg-transparent px-5 py-4 text-base leading-relaxed " +
              "text-chalk placeholder:text-muted focus:outline-none " +
              className
            }
            {...rest}
          />
        </div>
      </div>
    );
  },
);

export default GlassField;
