// A believable streamer setup, made through the API like the dashboard would (plus a few rows
// written directly where the API needs OAuth): workspace "Kiwi IRL" on Pro, switcher "Main" with
// two stream servers, scenes, triggers, BELABOX and Moblin, two teammates, a linked Twitch
// channel and the shared bot. Everyone and everything in it is made up.
import { SCENE_IDS } from "./fake-obs.mjs";

export const USERNAME = "kiwi_irl";

async function login(base, username) {
  const res = await fetch(`${base}/api/auth/dev-login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error(`dev login ${username}: ${res.status} ${await res.text()}`);
  return res.headers.get("set-cookie").split(";")[0];
}

/** An API client signed in as `username`: `api(method, path, body)`. */
export async function client(base, username = USERNAME) {
  const cookie = await login(base, username);
  return async (method, path, body) => {
    const res = await fetch(`${base}/api${path}`, {
      method,
      headers: { cookie, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text}`);
    return text ? JSON.parse(text) : null;
  };
}

/** `sql(text)` runs SQL and returns psql's unaligned output. */
export async function seed({ base, sql, obsPort, statsPort }) {
  const api = await client(base);

  const workspace = await api("POST", "/workspaces", { name: "Kiwi IRL", url_slug: "kiwi" });
  // Pro (a staff comp, in effect): more members, and the plan the screenshots show.
  sql(`UPDATE workspaces SET plan_code = 'pro' WHERE id = '${workspace.id}';`);
  const w = `/workspaces/${workspace.id}`;

  const { switcher, browser_source_url: browserSourceUrl } = await api("POST", `${w}/switchers`, { name: "Main" });
  const s = `${w}/switchers/${switcher.id}`;
  await api("PUT", `${s}/obs`, { port: obsPort, password: null, clear_password: false });
  const belabox = await api("POST", `${s}/stream-servers`, {
    name: "BELABOX Cloud",
    kind: "belabox",
    stats_url: `http://localhost:${statsPort}/belabox/9f2c41d7e8b3`,
  });
  const backup = await api("POST", `${s}/stream-servers`, {
    name: "Backup SRT",
    kind: "sls",
    stats_url: `http://localhost:${statsPort}/sls/stats`,
    details: { publisher: "live" },
  });
  await api("PUT", `${s}/scenes`, {
    starting: SCENE_IDS.starting,
    live: SCENE_IDS.live,
    low: SCENE_IDS.low,
    offline: SCENE_IDS.offline,
    privacy: SCENE_IDS.privacy,
    ending: SCENE_IDS.ending,
    refresh: null,
  });
  await api("PUT", `${s}/triggers`, { low: 1000, offline: 300, rtt: 2000, rtt_offline: null });
  await api("PUT", `${s}/behaviour`, {
    bitrate_switcher_enabled: true,
    only_switch_when_streaming: true,
    instantly_switch_on_recover: true,
    auto_switch_notification: true,
    retry_attempts: 5,
    auto_stop_on_raid: true,
    announce_raid: true,
    record_while_streaming: false,
    recording_scene_ids: [],
    switch_to_starting: true,
    switch_to_live: true,
    offline_timeout: 15,
    ending_timeout: null,
  });
  // `test` is fake_belabox's key.
  await api("PUT", `${s}/belabox`, { remote_key: "test", start_with_stream: true, stop_with_stream: false });
  await api("PUT", `${s}/moblin`, { generate_password: true, start_with_stream: false, stop_with_stream: false });
  const moblin = await api("GET", `${s}/moblin/connection`);

  // Teammates: a moderator (operator) and an admin.
  for (const [name, role] of [
    ["moddy", "operator"],
    ["walker", "admin"],
  ]) {
    const { token } = await api("POST", `${w}/invites`, { role, expires_in_days: 7 });
    await (await client(base, name))("POST", `/invites/${token}/accept`);
  }

  // Everyone signed in with Twitch, as far as the dashboard can tell: it names the newest
  // connection (by `updated_at`, which every dev login bumps, hence the far-off date).
  // And the streamer's Twitch channel, linked to the switcher, with the shared bot replying.
  sql(`
    ALTER TABLE oauth2_connections DISABLE TRIGGER USER;
    INSERT INTO oauth2_connections (user_id, provider, access_token, provider_id, provider_username, created_at, updated_at)
    SELECT user_id, 'TWITCH', 'unused', '1000' || provider_username, provider_username, now() - interval '20 days', '2100-01-01'
    FROM oauth2_connections WHERE provider = 'DEV';
    ALTER TABLE oauth2_connections ENABLE TRIGGER USER;
    WITH owner AS (SELECT user_id FROM oauth2_connections WHERE provider = 'DEV' AND provider_username = '${USERNAME}'),
    channel AS (
      INSERT INTO chat_channels (platform, platform_channel_id, login, display_name, scopes, authorized_by)
      SELECT 'TWITCH', '1000${USERNAME}', '${USERNAME}', '${USERNAME}', '{channel:bot}', user_id FROM owner RETURNING id
    )
    INSERT INTO switcher_chat_channels (switcher_id, chat_channel_id, linked_by)
    SELECT '${switcher.id}', channel.id, owner.user_id FROM channel, owner;
    INSERT INTO chat_bots (platform, platform_user_id, login, display_name, scopes)
    VALUES ('TWITCH', '900800700', 'noalbsbot', 'NOALBSBot', '{user:read:chat,user:write:chat,user:bot}');
  `);

  return {
    api,
    workspace,
    switcher,
    switcherPath: s,
    servers: { belabox: belabox.id, backup: backup.id },
    browserSourceUrl,
    moblin,
  };
}
