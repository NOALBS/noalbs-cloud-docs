// The fake OBS's scenes, drawn as SVG and rendered to 1280x720 JPEGs (what the dashboard's
// Preview shows). Made-up art, so the screenshots carry no real footage.

// A seeded random, so the skyline is the same on every run.
let seed = 7;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

function skyline() {
  let x = 0;
  let out = "";
  while (x < 1280) {
    const w = 40 + rand() * 90;
    const h = 120 + rand() * 260;
    out += `<rect x="${x}" y="${470 - h}" width="${w}" height="${h}" fill="#1b1430"/>`;
    for (let wy = 470 - h + 14; wy < 450; wy += 26) {
      for (let wx = x + 8; wx < x + w - 12; wx += 18) {
        if (rand() < 0.35) {
          out += `<rect x="${wx}" y="${wy}" width="8" height="12" fill="#ffcf7a" opacity="${0.5 + rand() * 0.5}"/>`;
        }
      }
    }
    x += w + 4;
  }
  return out;
}

const street = (extra = "") => `
<svg viewBox="0 0 1280 720" width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2b1b5a"/><stop offset="0.55" stop-color="#c2547a"/><stop offset="1" stop-color="#ffb36b"/>
    </linearGradient>
    <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a2433"/><stop offset="1" stop-color="#121018"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#sky)"/>
  <circle cx="930" cy="330" r="80" fill="#ffd38a" opacity="0.9"/>
  ${skyline()}
  <rect x="0" y="470" width="1280" height="250" fill="#17121f"/>
  <polygon points="0,720 1280,720 760,470 520,470" fill="url(#road)"/>
  <polygon points="636,480 644,480 660,720 620,720" fill="#f3d36b" opacity="0.8"/>
  <rect x="0" y="470" width="1280" height="4" fill="#ffb36b" opacity="0.4"/>
  ${extra}
</svg>`;

const chatLine = (y, name, color, text) =>
  `<text x="52" y="${y}" font-size="20" font-family="sans-serif"><tspan fill="${color}" font-weight="700">${name}</tspan><tspan fill="#fff"> ${text}</tspan></text>`;

const overlay = `
  <rect x="32" y="520" width="360" height="168" rx="14" fill="#0b0d10" opacity="0.65"/>
  ${chatLine(556, "kiwi_irl", "#9fb3ff", "that sunset 😍")}
  ${chatLine(596, "moddy", "#ffb3c7", "!bitrate")}
  ${chatLine(636, "NOALBSBot", "#b8f5c8", "BELABOX 5840 kbps")}
  ${chatLine(672, "walker", "#9fb3ff", "where is this?")}`;

const card = (title, sub) => `
<svg viewBox="0 0 1280 720" width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0b0d10"/><stop offset="1" stop-color="#1c2a5c"/></linearGradient></defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  <g transform="translate(590 170) scale(0.38)" fill="#5576DA" stroke="#0B0D10" stroke-width="6" stroke-linejoin="round">
    <path d="M22 62 L90 169 L90 243 L22 243 Z"/><path d="M24 17 L93 17 L238 245 L169 245 Z"/><path d="M169 17 L237 17 L237 204 L169 97 Z"/>
  </g>
  <text x="640" y="400" text-anchor="middle" fill="#fff" font-size="72" font-family="sans-serif" font-weight="800">${title}</text>
  <text x="640" y="460" text-anchor="middle" fill="#c9d4f6" font-size="30" font-family="sans-serif">${sub}</text>
</svg>`;

const FRAMES = {
  irl: street(overlay),
  low: street(`<rect width="1280" height="720" fill="#0b0d10" opacity="0.35"/>
    <rect x="390" y="300" width="500" height="90" rx="16" fill="#0b0d10" opacity="0.8"/>
    <text x="640" y="358" text-anchor="middle" fill="#ffcf7a" font-size="34" font-family="sans-serif" font-weight="700">Weak signal, hang on…</text>`),
  brb: card("Be right back", "The connection dropped. Back in a moment."),
  starting: card("Starting soon", "Grab a drink, we're heading out."),
  ending: card("Thanks for watching", "See you next stream."),
  chatting: card("Just chatting", "Back on the street soon."),
  privacy: card("Privacy", "Camera off for a moment."),
};

/** Renders every frame with `browser`; returns name → `data:image/jpeg;base64,…`. */
export async function renderFrames(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const frames = {};
  for (const [name, svg] of Object.entries(FRAMES)) {
    await page.setContent(`<body style="margin:0">${svg}</body>`);
    const jpeg = await page.screenshot({ type: "jpeg", quality: 85 });
    frames[name] = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  }
  await page.close();
  return frames;
}
