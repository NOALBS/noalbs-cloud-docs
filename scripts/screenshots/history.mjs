// Stream history as SQL: past streams with 10 s stat buckets (like obs-link's `history.rs`
// writes them), the scene switches they would have caused, markers and activity, plus a backfill
// of the running stream up to its first real bucket.

let seed = 42;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const q = (s) => (s == null ? "NULL" : `'${String(s).replaceAll("'", "''")}'`);
const ts = (ms) => q(new Date(ms).toISOString());
const json = (v) => `${q(JSON.stringify(v))}::jsonb`;
const uuid = () => "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => Math.floor(rand() * 16).toString(16));
const hm = (h, m, s = 0) => h * 3600 + m * 60 + s;
/** `days` ago at `hour`:`minute` UTC. */
const daysAgo = (days, hour, minute, second = 0) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, minute, second, 0);
  return d.getTime();
};
const SCENE = { live: "IRL", low: "IRL LOW", offline: "BRB" };

/**
 * `running` is the open stream ({ id, started_at, first_bucket }); `servers` the stream server
 * IDs ({ belabox, backup }).
 */
export function historySql({ switcherId, servers, running }) {
  const sql = [];

  /**
   * One stream. `belabox` and `backup` are lists of [fromSecond, toSecond, state], state being
   * live | low | offline (outside them: live for BELABOX, not connected for the backup).
   */
  function stream({ id = uuid(), start, seconds, belabox = [], backup = [], markers = [], open = false, until }) {
    const end = start + seconds * 1000;
    const stateAt = (spans, t, fallback) => spans.find(([a, b]) => t >= a && t < b)?.[2] ?? fallback;
    let walk = 5600;
    const totals = { live: 0, low: 0, offline: 0 };
    const decided = [];
    const stats = [];
    const stop = until ? Math.min(seconds, Math.floor((until - start) / 1000)) : seconds;

    for (let b = 0; b < stop; b += 10) {
      const rows = { [servers.belabox]: [], [servers.backup]: [] };
      for (let t = b; t < Math.min(b + 10, stop); t++) {
        walk += (5600 - walk) * 0.05 + (rand() - 0.5) * 420;
        const bs = stateAt(belabox, t, "live");
        const ks = stateAt(backup, t, null);
        rows[servers.belabox].push({
          bitrate: bs === "live" ? Math.round(walk) : bs === "low" ? Math.round(450 + rand() * 450) : 0,
          rtt: bs === "live" ? 140 + rand() * 120 : bs === "low" ? 1500 + rand() * 900 : null,
          state: bs,
        });
        if (ks) {
          rows[servers.backup].push({ bitrate: ks === "live" ? Math.round(2300 + rand() * 300) : 0, rtt: 220 + rand() * 80, state: ks });
        }
        // The first server with a feed decides.
        const d = bs !== "offline" ? bs : ks && ks !== "offline" ? ks : "offline";
        totals[d]++;
        decided.push(d);
      }
      for (const [server, samples] of Object.entries(rows)) {
        if (samples.length === 0) continue;
        const bitrates = samples.map((s) => s.bitrate);
        const rtts = samples.map((s) => s.rtt).filter((r) => r != null);
        const count = (st) => samples.filter((s) => s.state === st).length;
        const last = samples.at(-1);
        const raw =
          server === servers.belabox
            ? { publishers: last.bitrate ? { live: { bitrate: last.bitrate, rtt: Math.round(last.rtt ?? 0) } } : {} }
            : { bitrate: last.bitrate, rtt: Math.round(last.rtt ?? 0) };
        stats.push(
          `INSERT INTO stream_stats (stream_id, server_id, bucket_at, samples, bitrate_sum, bitrate_min, bitrate_max, rtt_sum, rtt_samples, rtt_max, live_seconds, low_seconds, offline_seconds, raw) VALUES (${q(id)}, ${q(server)}, ${ts(start + b * 1000)}, ${samples.length}, ${bitrates.reduce((a, c) => a + c, 0)}, ${Math.min(...bitrates)}, ${Math.max(...bitrates)}, ${rtts.reduce((a, c) => a + c, 0)}, ${rtts.length}, ${rtts.length ? Math.max(...rtts) : "NULL"}, ${count("live")}, ${count("low")}, ${count("offline")}, ${json(raw)}) ON CONFLICT DO NOTHING;`,
        );
      }
    }

    // The stream row goes first: the stats point at it.
    if (open) {
      sql.push(
        `UPDATE streams SET live_seconds = live_seconds + ${totals.live}, low_seconds = low_seconds + ${totals.low}, offline_seconds = offline_seconds + ${totals.offline} WHERE id = ${q(id)};`,
      );
    } else {
      sql.push(
        `INSERT INTO streams (id, switcher_id, started_at, ended_at, last_sample_at, live_seconds, low_seconds, offline_seconds) VALUES (${q(id)}, ${q(switcherId)}, ${ts(start)}, ${ts(end)}, ${ts(end)}, ${totals.live}, ${totals.low}, ${totals.offline});`,
        `INSERT INTO stream_sources (stream_id, server_id, name, kind) VALUES (${q(id)}, ${q(servers.belabox)}, 'BELABOX Cloud', 'BELABOX');`,
      );
      if (backup.length) {
        sql.push(`INSERT INTO stream_sources (stream_id, server_id, name, kind) VALUES (${q(id)}, ${q(servers.backup)}, 'Backup SRT', 'SLS');`);
      }
    }
    sql.push(...stats);

    // Activity: the start, each switch after the checks before switching (5; from BRB at once), markers, the stop.
    const event = (atSecond, kind, data) =>
      sql.push(
        `INSERT INTO switcher_events (switcher_id, kind, data, created_at) VALUES (${q(switcherId)}, ${q(kind)}, ${json(data)}, ${ts(start + atSecond * 1000)});`,
      );
    if (!open) {
      event(0, "stream_started", { by: null });
      event(4, "scene_switched", { from: "Starting soon", to: "IRL", reason: "auto", by: null, server: "BELABOX Cloud", bitrate: 5480, rtt: 162 });
    }
    let previous = "live";
    let pending = null;
    decided.forEach((d, t) => {
      if (d === previous) {
        pending = null;
        return;
      }
      pending = pending?.to === d ? pending : { to: d, since: t };
      if (t - pending.since < (previous === "offline" ? 0 : 5)) return;
      const belaboxState = stateAt(belabox, t, "live");
      event(t, "scene_switched", {
        from: SCENE[previous],
        to: SCENE[d],
        reason: "auto",
        by: null,
        server: d === "offline" ? null : belaboxState === "offline" ? "Backup SRT" : "BELABOX Cloud",
        bitrate: d === "offline" ? null : belaboxState === "low" ? 610 : belaboxState === "offline" ? 2410 : 5200,
        rtt: d === "low" ? 1840 : null,
      });
      previous = d;
      pending = null;
    });
    for (const [atSecond, description, by] of markers) {
      const markerId = uuid();
      sql.push(
        `INSERT INTO stream_markers (id, stream_id, at, description, created_by) VALUES (${q(markerId)}, ${q(id)}, ${ts(start + atSecond * 1000)}, ${q(description)}, ${q(by)});`,
      );
      event(atSecond, "marker_created", { marker_id: markerId, description, offset_seconds: atSecond, by });
    }
    if (!open) event(seconds, "stream_stopped", { by: "kiwi_irl" });
  }

  // A long one: LOW dips, BELABOX lost in a tunnel with the backup taking over, and a real BRB.
  stream({
    start: daysAgo(2, 18, 5, 12),
    seconds: hm(3, 12, 40),
    belabox: [
      [hm(0, 42), hm(0, 42, 48), "low"],
      [hm(1, 18, 10), hm(1, 18, 41), "low"],
      [hm(1, 51), hm(1, 52, 35), "offline"],
      [hm(2, 5), hm(2, 6, 14), "low"],
      [hm(2, 40, 20), hm(2, 41, 25), "offline"],
      [hm(2, 58), hm(2, 58, 30), "low"],
    ],
    backup: [[hm(1, 49), hm(1, 54), "live"]],
    markers: [
      [hm(0, 31, 5), "Ferris wheel view", "moddy (Twitch chat)"],
      [hm(1, 24, 40), "Street food tour", "kiwi_irl"],
      [hm(2, 12, 15), "Met a viewer", "moddy (Twitch chat)"],
    ],
  });
  stream({
    start: daysAgo(3, 19, 30, 3),
    seconds: hm(1, 40, 12),
    belabox: [
      [hm(0, 25), hm(0, 25, 40), "low"],
      [hm(1, 2), hm(1, 3, 10), "offline"],
    ],
    markers: [[hm(0, 50, 30), "Sunset at the pier", "kiwi_irl"]],
  });
  stream({
    start: daysAgo(5, 17, 0, 41),
    seconds: hm(2, 28, 5),
    belabox: [
      [hm(0, 10), hm(0, 10, 30), "low"],
      [hm(1, 15), hm(1, 16, 5), "low"],
      [hm(1, 40), hm(1, 40, 50), "offline"],
    ],
  });
  stream({
    start: daysAgo(7, 20, 15, 20),
    seconds: hm(0, 55, 30),
    belabox: [[hm(0, 33), hm(0, 33, 25), "low"]],
  });

  // The running stream, from its start to its first real bucket.
  stream({
    id: running.id,
    start: Date.parse(running.started_at),
    seconds: 99_999,
    until: Date.parse(running.first_bucket),
    open: true,
    belabox: [
      [hm(0, 38), hm(0, 38, 35), "low"],
      [hm(1, 26), hm(1, 27, 20), "offline"],
    ],
    markers: [[hm(0, 47, 12), "Night market", "moddy (Twitch chat)"]],
  });

  return `BEGIN;\n${sql.join("\n")}\nCOMMIT;\n`;
}
