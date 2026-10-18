// What to capture, and capturing it. Each shot becomes src/assets/screenshots/<name>.webp.

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

/**
 * `path` is relative to the switcher (`/kiwi/s/<id>`) unless it starts with `~` (the
 * workspace). `full` grows the viewport to the page's height, so the full-height sidebar covers
 * it; `element` captures just that element; `wait` is how long to let live data settle (ms).
 */
export const SHOTS = {
  live: { path: "/live", wait: 6000, levels: true },
  "live-phone": { path: "/live", viewport: PHONE, wait: 5000 },
  "obs-stats": { path: "/live", click: (page) => page.getByRole("button", { name: /^OBS/ }).first().click(), wait: 5000 },
  // The card's sparklines only hold what arrived since the page opened.
  "belabox-card": { path: "/live", element: '[aria-label="BELABOX"]', viewport: { width: 1440, height: 2400 }, wait: 45_000 },
  "belabox-settings": {
    path: "/live",
    click: (page) => page.getByRole("button", { name: /BELABOX settings/i }).first().click(),
    wait: 4000,
  },
  "moblin-card": { path: "/live", element: '[aria-label="Moblin"]', viewport: { width: 1440, height: 2400 }, wait: 4000 },
  setup: { path: "/setup", viewport: { width: 1440, height: 1240 } },
  switching: { path: "/triggers", full: true },
  scenes: { path: "/scenes" },
  servers: { path: "/servers" },
  history: { path: "/history" },
  // The second stream in the list: the long one with the dips, the backup taking over and a BRB.
  "history-stream": {
    path: "/history",
    click: async (page) => {
      await page.locator('a[href*="/history/"]').nth(1).click();
      await page.waitForLoadState("networkidle").catch(() => {});
    },
    wait: 3000,
    full: true,
  },
  chat: { path: "/chat", viewport: { width: 1440, height: 1100 } },
  members: { path: "~/settings/members" },
};

/** Captures `names` (all when empty) into `outDir` as PNGs; returns the names taken. */
export async function capture(browser, { base, workspaceSlug, switcherId, username, outDir, names = [] }) {
  const taken = [];
  for (const [name, shot] of Object.entries(SHOTS)) {
    if (names.length && !names.includes(name)) continue;
    const viewport = shot.viewport ?? DESKTOP;
    const phone = viewport === PHONE;
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2, colorScheme: "dark", isMobile: phone, hasTouch: phone });
    // The audio card's meters are off until a viewer turns them on.
    if (shot.levels) {
      await context.addInitScript(() => {
        try {
          localStorage.setItem("noalbs-audio-meters", "true");
        } catch {}
      });
    }
    const login = await context.request.post(`${base}/api/auth/dev-login`, { data: { username } });
    if (!login.ok()) throw new Error(`dev login: ${login.status()}`);
    const page = await context.newPage();
    const path = shot.path.startsWith("~") ? `/${workspaceSlug}${shot.path.slice(1)}` : `/${workspaceSlug}/s/${switcherId}${shot.path}`;
    await page.goto(`${base}${path}`, { waitUntil: "networkidle" }).catch(() => {});
    if (shot.click) await shot.click(page);
    await page.waitForTimeout(shot.wait ?? 2000);
    if (shot.full) {
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      if (height > viewport.height) {
        await page.setViewportSize({ width: viewport.width, height });
        await page.waitForTimeout(1500);
      }
    }
    const file = `${outDir}/${name}.png`;
    if (shot.element) await page.locator(shot.element).first().screenshot({ path: file });
    else await page.screenshot({ path: file });
    console.log(`  ${name}`);
    taken.push(name);
    await context.close();
  }
  return taken;
}
