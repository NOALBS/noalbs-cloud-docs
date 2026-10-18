# Dashboard screenshots

`run.mjs` retakes the screenshots in `src/assets/screenshots/`. Run it when the dashboard changes
how a page looks.

```sh
node scripts/screenshots/run.mjs                 # all of them, about 4 minutes
node scripts/screenshots/run.mjs live history    # only these (names from shots.mjs)
node scripts/screenshots/run.mjs --keep          # leave it running afterwards, to look around
```

Run it in the [noalbs-cloud](https://github.com/NOALBS/noalbs-cloud) dev shell, since it builds
the services with `cargo`. Use plain `node`, not `pnpm screenshots`: that shell's pnpm is a
different version from this repo's and would try to switch.

It needs:

- a noalbs-cloud checkout next to this repo (`../noalbs-cloud` or `../noalbs-cloud-v2`), or
  `NOALBS_CLOUD_DIR`, with the dashboard's packages installed (`cd web/dashboard && pnpm install`),
- Docker (it starts its own Postgres 18 and NATS),
- Chrome or Chromium (`CHROME` overrides the path),
- `pnpm install` here (Playwright and `ws`),
- these ports free: 4455 (close OBS), 5190, 11100, 12100, 14222, 15432, 18200, 18300.

## What it does

1. Builds `api`, `obs-link`, `db-migrator` and the `fake_belabox` / `fake_moblin` examples, then
   starts a throwaway stack on its own ports: Postgres and NATS in Docker, the API (dev login on,
   private stats URLs allowed), obs-link and the dashboard's Vite server.
2. Starts a fake OBS (`fake-obs.mjs`) on 4455 with seven scenes, nested sources, audio and preview
   frames drawn by `frames.mjs`, and a stats server for two stream servers with a slowly moving
   bitrate.
3. Fills it through the API (`seed.mjs`): the workspace "Kiwi IRL" on Pro, the switcher "Main", two
   stream servers, scenes, triggers, BELABOX, Moblin, two teammates, and in the database a linked
   Twitch channel, the shared bot and Twitch accounts.
4. Opens the real browser source in headless Chrome, which connects the fake OBS, and starts the
   fake Moblin phone. Starts BELABOX and Moblin streaming.
5. Writes past streams with dips, a failover to the backup and a BRB (`history.mjs`), dated a few
   days before today, and backfills the running stream.
6. Waits until the Live chart has two minutes of data, captures every shot in `shots.mjs` at 2× in
   dark mode, writes them as WebP to `src/assets/screenshots/`, and removes everything it started.

Logs and the PNGs are in `scripts/screenshots/.work/` (ignored by git).

All names, channels and data are made up. Keep it that way: no real stats URLs, keys or accounts.

## Adding a shot

Add an entry to `SHOTS` in `shots.mjs`: the page (`path`), and optionally a `viewport`, `full` for
the whole page height, `element` for one element, `click` to open something first and `wait` for
live data. Run it with its name, then use the image in a page:

```md
![What the screenshot shows, for screen readers.](../../../assets/screenshots/<name>.webp)
```

For narrow images (a phone, a card), use `<Image src={…} width={…} />` from `astro:assets` in an
`.mdx` page, as `guides/belabox.mdx` does, or they're shown far too big.
