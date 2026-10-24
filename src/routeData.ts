// Adds each page's OpenGraph image (from src/pages/og/[...slug].ts) to its <head>. Starlight
// already sets the other og: and twitter: tags.
import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

export const onRequest = defineRouteMiddleware((context) => {
  const { entry, head } = context.locals.starlightRoute;
  // Starlight's own 404 page isn't in the docs collection, so it has no image.
  if (entry.id === "404") return;

  // The home page's id is "" here but "index" in the collection the images are made from.
  const image = new URL(`/og/${entry.id || "index"}.png`, context.site).href;

  head.push(
    { tag: "meta", attrs: { property: "og:image", content: image } },
    { tag: "meta", attrs: { property: "og:image:width", content: "1200" } },
    { tag: "meta", attrs: { property: "og:image:height", content: "630" } },
    { tag: "meta", attrs: { name: "twitter:image", content: image } },
  );
});
