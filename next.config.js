const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

const withNextra = require("nextra")({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
});

module.exports = (phase) => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return withNextra({
    basePath: isDev ? "" : "/clover-iiif",
    images: {
      unoptimized: true,
    },
    // Skip ESLint during the docs build; we run lint separately.
    eslint: {
      ignoreDuringBuilds: true,
    },
    // Static export disables API routes; keep dev as a normal server so
    // /api/3d-afy/bake works for the local "save as IIIF" flow.
    ...(isDev ? {} : { output: "export" }),
  });
};
