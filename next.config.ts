import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The AI prompts are read from data/prompts/*.md at runtime rather than
   * imported, which is what lets them be edited as content. Nothing in the
   * module graph references those files, so Next's file tracing — which
   * follows `import` statements — has no reason to include them in the
   * serverless bundle. Declaring them here is what makes the routes work in
   * a deployed build as well as in `next dev`.
   */
  outputFileTracingIncludes: {
    "/api/**/*": ["./data/prompts/**/*"],
  },
};

export default nextConfig;
