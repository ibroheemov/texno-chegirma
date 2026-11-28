"use client";

import { useEffect, useState } from "react";
import "./refine-tokens.css";
import "./refine-ui.css";

/**
 * Renders a New design (Refine) view inside the Old design shell. It scopes the Refine tokens and
 * component classes to this subtree and mirrors the Old design's light/dark choice
 * (`data-theme` on <html>) onto Refine's `.theme-dark` class.
 */
export function RefineEmbed({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.getAttribute("data-theme") === "dark");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    // Same vertical rhythm as the New shell's `.content` (a flex column with a --sp-6 gap), which the
    // Refine page sections rely on for the spacing between header, cards and tables.
    <div
      className={`refine-ds rf-embed${dark ? " theme-dark" : ""}`}
      style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)", background: "transparent" }}
    >
      {children}
    </div>
  );
}
