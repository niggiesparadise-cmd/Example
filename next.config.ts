import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Emit a plain static site into `out/`.
   *
   * Every route in the app prerenders — there are no server actions, route
   * handlers or dynamic rendering — so the whole dashboard ships as static
   * HTML, CSS and JS that any file host can serve.
   */
  output: "export",

  /**
   * Write `courses/index.html` rather than `courses.html`.
   *
   * Extensionless-URL rewriting differs between static hosts; directory
   * indexes are the one shape every one of them serves correctly.
   */
  trailingSlash: true,

  /**
   * Set `basePath` when the site is served from a subdirectory rather than a
   * domain root — GitHub Pages project sites, for example:
   *
   *   basePath: "/study-dashboard",
   */
};

export default nextConfig;
