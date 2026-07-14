import type { Feasibility } from "@/lib/graph";

const STYLES: Record<Feasibility, string> = {
  native: "text-seafoam border-seafoam/40 bg-seafoam/10",
  partial: "text-beam border-beam/40 bg-beam/10",
  impossible: "text-blaze border-blaze/40 bg-blaze/10",
};

/** The verdict chip: JetBrains Mono, Seafoam / Beam / Blaze. */
export default function FeasibilityChip({ feasibility, confidence }: { feasibility: Feasibility; confidence?: number }) {
  return (
    <span
      className={`meta-mono inline-flex items-center gap-2 rounded-md border px-2.5 py-1 ${STYLES[feasibility]}`}
    >
      {feasibility}
      {confidence !== undefined && (
        <span className="opacity-70">{Math.round(confidence * 100)}%</span>
      )}
    </span>
  );
}
