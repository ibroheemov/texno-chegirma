import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* This is a live POS/inventory app: every admin route reads fresh DB
     state per-request, so static Cache Components semantics are disabled
     in favor of standard per-request dynamic rendering. */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
