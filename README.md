# NOALBS Cloud docs

The documentation site for [NOALBS Cloud](https://github.com/NOALBS/noalbs-cloud), at
[docs.noalbs.com](https://docs.noalbs.com). Built with [Starlight](https://starlight.astro.build).

The Nix flake (`direnv allow`, or `nix develop`) has Node 24 and pnpm; otherwise install those.

```sh
pnpm install
pnpm dev      # http://localhost:4321
pnpm build    # into dist/
```

Pages are Markdown in `src/content/docs/`; the sidebar is in `astro.config.mjs`. Pushing to
`main` deploys to GitHub Pages (`.github/workflows/deploy.yml`); pull requests are built but not
deployed.

## Keeping it true

The docs describe what the code does, so most pages follow a part of the
[main repository](https://github.com/NOALBS/noalbs-cloud). When that changes, update the page:

| Page | Follows |
| --- | --- |
| Quick start, Switching | `crates/db/migrations` (switcher defaults), `web/dashboard/src/routes/_app/$workspace/s/$switcher/{setup,triggers}.tsx`, `services/obs-link/src/decide.rs` |
| Stream servers, Stream server kinds | `web/dashboard/src/lib/stream-server-kinds.ts`, `services/obs-link/src/stream_servers/` |
| Chat commands, Chat bot | `noalbs_chat_commands` in the migrations (names, default roles), `services/chat/src/commands/` |
| BELABOX, Moblin | `web/dashboard/src/components/{belabox,moblin}-settings.tsx`, `components/live/` |
| Add to NOALBS Cloud links | `web/dashboard/src/lib/add-server.ts` |
| Self-hosting | `deploy/README.md` (which stays the full reference; link to it rather than copy settings) |

Use the dashboard's own words for buttons and settings, in **bold**.

## License

The docs are licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), the code
samples in them under the [MIT license](https://opensource.org/licenses/MIT).
