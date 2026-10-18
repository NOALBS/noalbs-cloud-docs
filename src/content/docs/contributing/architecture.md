---
title: Architecture
description: How NOALBS Cloud's services fit together, for contributors and self-hosters.
---

NOALBS Cloud is a Rust workspace (services and shared crates) and a React dashboard. The services
talk to each other over [NATS](https://nats.io) and share a Postgres database.

```
OBS ── obs-websocket ── browser source ── WebSocket ──► obs-link ──┐
                         (in OBS)                                  │
                                              NATS (+ JetStream) ──┼── api ── dashboard (browser)
                                                                   │
Twitch · Kick · YouTube ◄──────────────────────────────────► chat ─┤
                                                                   │
                                                          Postgres ┘
```

## The parts

| Part | What it does |
| --- | --- |
| `services/obs-link` | The WebSocket server OBS's browser source connects to. While OBS is connected it reads the stream servers, decides the scene every second and switches OBS. It also keeps the BELABOX Cloud and Moblin connections. |
| `services/api` | The HTTP API the dashboard uses: sign-in, workspaces, settings, live data (server-sent events), remote control, history, billing. |
| `services/chat` | The chat bot for Twitch, Kick and YouTube. Runs as any number of instances that share the work. |
| `services/db-migrator` | Applies the database migrations, then exits. |
| `crates/db` | All SQL, and the migrations. |
| `crates/live` | The live-data contract between the services: NATS subjects, the status and stats stores, and their messages. |
| `crates/obs-actions` | A typed obs-websocket v5 client. |
| `crates/control` | Remote control of a switcher's OBS, BELABOX and Moblin, shared by the API and the chat bot so both follow the same rules. |
| `crates/common`, `crates/telemetry` | Settings, shutdown, private-address checks, logging and OpenTelemetry. |
| `web/dashboard` | The dashboard (React, TanStack Router and Query, Tailwind), the landing and legal pages, and the OBS browser source (`public/source/`). |

## Connecting OBS

The streamer adds a browser source to OBS with a link that holds a secret token (after the `#`, so
it's never sent to a server). The page connects **out** to obs-link and identifies with the token;
obs-link looks the switcher up by the token's hash and sends back OBS's WebSocket port and password.
The page then connects to OBS on `localhost` and relays obs-websocket messages both ways. Nothing has
to reach the streamer's network.

Only one browser source relays per switcher: a newer connection takes over and the older one closes.

## Every second

While OBS is connected, obs-link runs a switcher task for it:

1. It reads every enabled stream server's stats URL (`services/obs-link/src/stream_servers/`, one
   module per kind, ported from NOALBS).
2. `decide.rs` picks the scene from the readings, the triggers and what happened in the last few
   seconds. It's a pure function with tests, and follows NOALBS's rules.
3. If the scene should change, it tells OBS through the browser source.
4. It publishes a stats sample, updates the switcher's status and, while streaming, adds the second
   to the stream's history (10-second buckets in Postgres).

## Live data

| Where | What |
| --- | --- |
| NATS key-value `switcher-status` | Each switcher's current status (connected, streaming, scene, state). Written on change and every 10 s, so a vanished one expires. |
| JetStream `SWITCHER_STATS` | The stats samples, kept for a couple of minutes, so a dashboard that opens gets the recent chart at once. |
| `switcher.<id>.event` | Activity: switches, starts and stops, commands, who did them. Also stored in Postgres. |

The API turns these into server-sent events for the dashboard's Live page.

## Remote control

When someone presses a button in the dashboard or types a chat command, the API or chat service
(through `crates/control`) checks permissions, announces who is about to act, and sends the
obs-websocket request over NATS to `obslink.<switcher ID>.request`. obs-link relays it through the
browser source and returns OBS's answer. When OBS reports the change, obs-link logs it "by" whoever
announced it.

## Chat

Every chat instance can receive messages: Twitch through an EventSub conduit whose WebSocket shards
are spread over the instances, Kick through webhooks to any instance, YouTube by one instance at a
time following the live chat of streamers who are live. Each message goes to a NATS queue group, so
exactly one instance handles it. Coordination (shards, leases, cooldowns, send limits) lives in NATS
key-value buckets.

## BELABOX and Moblin

For a switcher with a BELABOX Cloud remote key, obs-link connects to BELABOX Cloud as a remote
client and publishes the BELABOX's status. For a switcher with a Moblin password, the phone connects
to obs-link (`/moblin/<switcher ID>`) as Moblin's remote-control "assistant". Both take commands
from the API and chat over NATS, like OBS does.

## Data and secrets

- Postgres holds accounts, workspaces, settings, activity and stream history. Migrations only go
  forward and must work with the previous release, which runs against the new schema for a moment
  during a deploy.
- Tokens for browser-source links and invites are stored as hashes only, so they're shown once.
- OBS and stream server passwords, BELABOX keys, Moblin passwords and chat tokens are encrypted with
  the data encryption key.
- Stats URLs are typed by users, so the services refuse private and loopback addresses (checked on
  every lookup) and don't follow redirects.
- Logs, traces and metrics never carry IP addresses, tokens, stats URLs or chat messages.

## Where to start reading

- Switching: `services/obs-link/src/decide.rs` and its tests.
- A stream server kind: any module in `services/obs-link/src/stream_servers/`.
- The live-data contract: the module doc of `crates/live`.
- A dashboard page: `web/dashboard/src/routes/`, which mirrors the URLs.

Setting up a development environment is in
[CONTRIBUTING.md](https://github.com/NOALBS/noalbs-cloud/blob/main/CONTRIBUTING.md#local-development).
