import type { ReactNode } from "react";

/**
 * Renders Old design components (Tailwind, --accent/--border/... tokens) in the Refine palette.
 * `display: contents` keeps layout untouched; the class only re-points the Old token names
 * (see the bridge block in refine-tokens.css).
 */
export function LegacyScope({ children }: { children: ReactNode }) {
  return (
    <div className="refine-legacy" style={{ display: "contents" }}>
      {children}
    </div>
  );
}
