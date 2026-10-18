// @ts-check
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://docs.noalbs.com",
  integrations: [
    starlight({
      title: "NOALBS Cloud",
      description:
        "Documentation for NOALBS Cloud, the hosted automatic OBS scene switcher for IRL streams.",
      logo: { src: "./src/assets/logo.svg" },
      favicon: "/favicon.svg",
      customCss: ["./src/styles/custom.css"],
      social: [
        { icon: "discord", label: "Discord", href: "https://discord.gg/efWu5HWM2u" },
        { icon: "x.com", label: "X", href: "https://x.com/noalbs" },
        { icon: "github", label: "GitHub", href: "https://github.com/NOALBS/noalbs-cloud" },
      ],
      editLink: { baseUrl: "https://github.com/NOALBS/noalbs-cloud-docs/edit/main/" },
      lastUpdated: true,
      sidebar: [
        {
          label: "Getting started",
          items: ["getting-started/introduction", "getting-started/quick-start"],
        },
        {
          label: "Guides",
          items: [
            "guides/stream-servers",
            "guides/scenes",
            "guides/switching",
            "guides/dashboard",
            "guides/chat-bot",
            "guides/belabox",
            "guides/moblin",
            "guides/workspaces",
            "guides/troubleshooting",
          ],
        },
        {
          label: "Reference",
          items: [
            "reference/chat-commands",
            "reference/stream-server-kinds",
            "reference/add-server-links",
          ],
        },
        {
          label: "Self-hosting",
          items: ["self-hosting/overview", "self-hosting/sign-in-and-chat", "self-hosting/operating"],
        },
        {
          label: "Contributing",
          items: ["contributing", "contributing/architecture"],
        },
      ],
    }),
  ],
});
