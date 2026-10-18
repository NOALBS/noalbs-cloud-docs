// Retakes the dashboard screenshots in src/assets/screenshots/ (see README.md here).
//
//   pnpm screenshots                  # all of them
//   pnpm screenshots live history     # only these
//   pnpm screenshots -- --keep        # leave the stack running afterwards, to look around
//
// Runs a throwaway NOALBS Cloud from a noalbs-cloud checkout (its own Postgres and NATS in
// Docker, on other ports than the dev setup's), fills it with made-up data, fakes OBS, the
// stream servers, BELABOX Cloud and a Moblin phone, captures with Chrome and tears it all down.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { createConnection } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { startFakeObs } from "./fake-obs.mjs";
import { renderFrames } from "./frames.mjs";
import { historySql } from "./history.mjs";
import { seed, USERNAME } from "./seed.mjs";
import { capture, SHOTS } from "./shots.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DOCS = resolve(HERE, "../..");
const WORK = join(HERE, ".work");
const ASSETS = join(DOCS, "src/assets/screenshots");

const PORTS = { pg: 15432, nats: 14222, api: 12100, obsLink: 11100, dashboard: 5190, obs: 4455, stats: 18300, belabox: 18200 };
const PG = "noalbs-screenshots-pg";
const NATS = "noalbs-screenshots-nats";
const DATABASE_URL = `postgres://postgres:postgres@localhost:${PORTS.pg}/shots`;
// How long the stats run before capturing: the Live chart shows the last 2 minutes.
const WARM_UP_MS = 130_000;

const args = process.argv.slice(2).filter((a) => a !== "--");
const keep = args.includes("--keep");
const names = args.filter((a) => !a.startsWith("--"));
for (const name of names) {
  if (!SHOTS[name]) throw new Error(`No shot called ${name}. There are: ${Object.keys(SHOTS).join(", ")}`);
}

const repo = [process.env.NOALBS_CLOUD_DIR, join(DOCS, "../noalbs-cloud"), join(DOCS, "../noalbs-cloud-v2")].find(
  (dir) => dir && existsSync(join(dir, "Cargo.toml")),
);
if (!repo) throw new Error("Can't find the noalbs-cloud checkout: set NOALBS_CLOUD_DIR.");
const which = (bin) => {
  try {
    return execFileSync("which", [bin], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
};
const chrome =
  process.env.CHROME ?? ["google-chrome-stable", "google-chrome", "chromium", "chromium-browser"].map(which).find(Boolean);
if (!chrome) throw new Error("Can't find Chrome or Chromium: set CHROME to its path.");

const log = (...line) => console.log("›", ...line);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const children = [];
const cleanups = [];

function run(cmd, cmdArgs, opts = {}) {
  return execFileSync(cmd, cmdArgs, { encoding: "utf8", stdio: ["pipe", "pipe", "inherit"], ...opts });
}
const sql = (text) => run("docker", ["exec", "-i", PG, "psql", "-U", "postgres", "-d", "shots", "-v", "ON_ERROR_STOP=1", "-qtA"], { input: text });

/** Starts a long-running process; its output goes to .work/<name>.log. */
function start(name, cmd, cmdArgs, opts = {}) {
  const logFile = join(WORK, `${name}.log`);
  const child = spawn("sh", ["-c", `exec "$0" "$@" > "${logFile}" 2>&1`, cmd, ...cmdArgs], {
    cwd: repo,
    // stdin stays open and silent: the fakes read commands from it line by line.
    stdio: ["pipe", "ignore", "ignore"],
    ...opts,
    env: { ...process.env, ...opts.env },
  });
  child.on("exit", (code, signal) => {
    if (!stopping) console.error(`! ${name} exited (${signal ?? code}); see ${logFile}`);
  });
  children.push(child);
  return child;
}

const portInUse = (port) =>
  new Promise((done) => {
    const socket = createConnection({ port, host: "127.0.0.1" });
    socket.once("connect", () => socket.end(done(true)));
    socket.once("error", () => done(false));
  });

async function until(what, check, timeoutMs = 60_000) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    try {
      const value = await check();
      if (value) return value;
    } catch {}
    if (Date.now() > end) throw new Error(`Timed out waiting for ${what}`);
    await sleep(1000);
  }
}

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  for (const cleanup of cleanups.reverse()) await Promise.resolve(cleanup()).catch(() => {});
  try {
    run("docker", ["rm", "-f", PG, NATS], { stdio: "ignore" });
  } catch {}
}
process.on("SIGINT", () => stop().then(() => process.exit(130)));
process.on("SIGTERM", () => stop().then(() => process.exit(143)));

try {
  for (const [what, port] of Object.entries(PORTS)) {
    if (await portInUse(port)) throw new Error(`Port ${port} (${what}) is in use${port === 4455 ? ": close OBS" : ""}.`);
  }
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(join(WORK, "out"), { recursive: true });

  log(`Building in ${repo}`);
  run("cargo", ["build", "-p", "api", "-p", "obs-link", "-p", "db-migrator"], { cwd: repo, stdio: "inherit" });
  run("cargo", ["build", "-p", "obs-link", "--example", "fake_belabox", "--example", "fake_moblin"], { cwd: repo, stdio: "inherit" });
  const vite = join(repo, "web/dashboard/node_modules/vite/bin/vite.js");
  if (!existsSync(vite)) throw new Error(`Install the dashboard's packages first: cd ${repo}/web/dashboard && pnpm install`);

  log("Postgres and NATS");
  run("docker", ["run", "-d", "--rm", "--name", PG, "-p", `${PORTS.pg}:5432`, "-e", "POSTGRES_PASSWORD=postgres", "-e", "POSTGRES_DB=shots", "postgres:18"]);
  run("docker", ["run", "-d", "--rm", "--name", NATS, "-p", `${PORTS.nats}:4222`, "nats:2", "-js"]);
  await until("Postgres", () => run("docker", ["exec", PG, "pg_isready", "-U", "postgres", "-d", "shots"]).includes("accepting"));
  run(join(repo, "target/debug/db-migrator"), [], { env: { ...process.env, DATABASE_URL } });

  const browser = await chromium.launch({ executablePath: chrome });
  cleanups.push(() => browser.close());
  const fakes = startFakeObs({ frames: await renderFrames(browser), obsPort: PORTS.obs, statsPort: PORTS.stats });
  cleanups.push(() => fakes.close());

  log("Services");
  const base = `http://localhost:${PORTS.dashboard}`;
  start("fake_belabox", "target/debug/examples/fake_belabox", [], { env: { PORT: String(PORTS.belabox) } });
  start("api", "target/debug/api", [], {
    env: {
      API_POSTGRES_URL: DATABASE_URL,
      API_NATS_URL: `nats://localhost:${PORTS.nats}`,
      API_PORT: String(PORTS.api),
      API_DEV_LOGIN: "true",
      API_ALLOW_PRIVATE_STATS_URLS: "true",
      API_BASE_URL: `${base}/api`,
      API_DASHBOARD_URL: base,
      // Links as production shows them (the Moblin Assistant URL); rewritten below to reach this stack.
      API_BROWSER_SOURCE_URL: "https://noalbs.com/source/",
      // A Twitch app that's never called, so the Chat page offers Twitch.
      API_OAUTH_TWITCH__CLIENT_ID: "placeholder",
      API_OAUTH_TWITCH__CLIENT_SECRET: "placeholder",
    },
  });
  start("obs-link", "target/debug/obs-link", [], {
    env: {
      OBS_LINK_POSTGRES_URL: DATABASE_URL,
      OBS_LINK_NATS_URL: `nats://localhost:${PORTS.nats}`,
      OBS_LINK_PORT: String(PORTS.obsLink),
      OBS_LINK_ALLOW_PRIVATE_STATS_URLS: "true",
      OBS_LINK_BELABOX_URL: `ws://localhost:${PORTS.belabox}`,
    },
  });
  start("dashboard", "node", [vite, "--port", String(PORTS.dashboard), "--strictPort"], {
    cwd: join(repo, "web/dashboard"),
    env: { NOALBS_API_URL: `http://localhost:${PORTS.api}`, NOALBS_OBS_LINK_URL: `http://localhost:${PORTS.obsLink}` },
  });
  await until("the API through the dashboard", async () => (await fetch(`${base}/api/auth/providers`)).ok);

  log("Seeding");
  const setup = await seed({ base, sql, obsPort: PORTS.obs, statsPort: PORTS.stats });
  const local = (url) => url.replace(/^https?:\/\/noalbs\.com/, base).replace(/^wss?:\/\/noalbs\.com/, `ws://localhost:${PORTS.dashboard}`);

  log("Browser source, Moblin");
  const source = await browser.newPage();
  await source.goto(local(setup.browserSourceUrl));
  start("fake_moblin", "target/debug/examples/fake_moblin", [], { env: { PASSWORD: setup.moblin.password, MOBLIN_URL: local(setup.moblin.url) } });
  const status = async () => (await setup.api("GET", `/workspaces/${setup.workspace.id}/switchers`))[0].status;
  await until("OBS through the browser source", async () => (await status())?.obs_connected && (await status()).streaming);
  const statsSince = Date.now();
  await until("BELABOX to stream", async () => {
    await setup.api("POST", `${setup.switcherPath}/belabox/stream`, { active: true });
    return true;
  });
  await until("Moblin to go live", async () => {
    await setup.api("POST", `${setup.switcherPath}/moblin/stream`, { active: true });
    return true;
  });

  log("History");
  const running = await until("the running stream's first stats", () => {
    const row = sql(
      `SELECT json_build_object('id', s.id, 'started_at', s.started_at, 'first_bucket', (SELECT min(bucket_at) FROM stream_stats WHERE stream_id = s.id)) FROM streams s WHERE ended_at IS NULL;`,
    ).trim();
    return row && JSON.parse(row).first_bucket ? JSON.parse(row) : null;
  });
  sql(historySql({ switcherId: setup.switcher.id, servers: setup.servers, running }));

  const wait = WARM_UP_MS - (Date.now() - statsSince);
  if (wait > 0) {
    log(`Letting the charts fill (${Math.round(wait / 1000)} s)`);
    await sleep(wait);
  }

  log("Capturing");
  const taken = await capture(browser, {
    base,
    workspaceSlug: setup.workspace.url_slug,
    switcherId: setup.switcher.id,
    username: USERNAME,
    outDir: join(WORK, "out"),
    names,
  });
  mkdirSync(ASSETS, { recursive: true });
  for (const name of taken) {
    await sharp(join(WORK, "out", `${name}.png`)).webp({ quality: 88 }).toFile(join(ASSETS, `${name}.webp`));
  }
  log(`Wrote ${taken.length} screenshots to src/assets/screenshots/`);

  if (keep) {
    log(`Still running: ${base}/${setup.workspace.url_slug} (dev login "${USERNAME}"). Ctrl+C to stop.`);
    await new Promise(() => {});
  }
} finally {
  if (!keep) await stop();
}
