"use client";

import { useEffect, type ReactNode } from "react";
import { initLenis } from "@/lib/lenis";

export default function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => initLenis(), []);
  return <>{children}</>;
}
