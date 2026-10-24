// The OpenGraph image for each docs page, at /og/<page id>.png. src/routeData.ts points the
// page's og:image here.
import { OGImageRoute } from "astro-og-canvas";
import { getCollection } from "astro:content";

const entries = await getCollection("docs");

export const { getStaticPaths, GET } = await OGImageRoute({
  pages: Object.fromEntries(entries.map(({ id, data }) => [id, data])),
  getImageOptions: (_id, page) => ({
    title: page.title,
    description: page.description,
    logo: { path: "./src/assets/og-logo.png", size: [100] },
    // Starlight's dark background, fading into the dark accent.
    bgGradient: [
      [23, 25, 28],
      [22, 29, 56],
    ],
    border: { color: [85, 118, 218], width: 16, side: "inline-start" },
    padding: 80,
    fonts: ["./src/assets/fonts/geist-latin-400-normal.ttf", "./src/assets/fonts/geist-latin-600-normal.ttf"],
    font: {
      title: { families: ["Geist"], weight: "SemiBold", size: 72, lineHeight: 1.1 },
      description: { families: ["Geist"], size: 36, lineHeight: 1.4, color: [201, 212, 246] },
    },
  }),
});
