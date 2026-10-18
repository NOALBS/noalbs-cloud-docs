---
title: Hosting your own
description: Run NOALBS Cloud on your own machine with Docker Compose.
---

NOALBS Cloud is open source under the [AGPL-3.0](https://github.com/NOALBS/noalbs-cloud/blob/main/LICENSE).
You can run your own copy, for yourself, your team or your customers.

:::tip[Just for yourself?]
[NOALBS](https://github.com/NOALBS/nginx-obs-automatic-low-bitrate-switching), the program you
run next to OBS, has the same switching with far less to set up. Hosting NOALBS Cloud makes sense
when you want the dashboard, history and remote control, or run it for several streamers.
:::

These pages are an overview. The operator guide,
[`deploy/README.md`](https://github.com/NOALBS/noalbs-cloud/blob/main/deploy/README.md) in the
repository, has every setting and is kept up to date with the code.

## What runs

Every part is a published image (`ghcr.io/noalbs/noalbs-cloud/<service>`, `:latest` or
`:sha-<commit>`):

| Service | What it does |
| --- | --- |
| `dashboard` | Caddy serving the web app and the OBS browser source, and forwarding `/api`, `/link`, `/moblin/*` and `/chat/webhooks/*` to the services below, so one domain is enough. |
| `api` | The HTTP API: sign-in, workspaces, settings, live data. |
| `obs-link` | The WebSocket the OBS browser sources connect to. It reads the stream servers and does the switching. |
| `chat` | The chat bot for Twitch, Kick and YouTube. Run one or several. |
| `db-migrator` | Runs the database migrations, then exits. |
| Postgres 18 | Everything that's stored. |
| NATS 2.11+ with JetStream | Live status, stats and commands between the services. |

A small VPS runs it all. Streamers' OBS only makes outbound connections to your domain, so
nothing has to reach their PCs.

## Quick start

```sh
git clone https://github.com/NOALBS/noalbs-cloud
cd noalbs-cloud/deploy
cp .env.example .env
# In .env: your URL, and a secret for each of POSTGRES_PASSWORD, COOKIE_SECRET and
# DATA_ENCRYPTION_KEY (one each):
openssl rand -hex 32
docker compose up -d
```

The migrator runs first; the API and obs-link start once it's done. Then
[set up sign-in](/self-hosting/sign-in-and-chat/): without at least one provider, nobody can
sign in.

:::danger[Keep `DATA_ENCRYPTION_KEY` safe and unchanged]
It encrypts stored OBS and stream server passwords, BELABOX keys, Moblin passwords and chat
tokens. With another key they can't be read, and people have to enter them again. The API,
obs-link and chat must use the same one.
:::

## HTTPS

Sign-in cookies need HTTPS. Either:

- **Let the dashboard container do it**: set `SITE_ADDRESS=noalbs.example.com`, point the domain
  at the machine and open ports 80 and 443. Caddy gets and renews the certificate.
- **Use your own proxy** (Traefik, nginx, Cloudflare, …): keep `SITE_ADDRESS=:80`, send all traffic
  for the domain to the dashboard container, and set `CLIENT_IP_HEADER` to the header your proxy
  puts the visitor's IP in (Cloudflare: `cf-connecting-ip`), so rate limits see real visitors.

`deploy/README.md` also shows how to route the services yourself, without the dashboard's Caddy.

## Stream servers on your own network

Stats URLs are typed by users, so by default NOALBS refuses private, loopback and link-local
addresses. If your stream servers are on the same network as NOALBS, set
`ALLOW_PRIVATE_STATS_URLS=true`. Only do that if you trust everyone who can add a stream server.

## Running it for other people

- **Replace the privacy policy and terms** (`web/dashboard/privacy.html`, `terms.html`): they
  describe our service and name us as its operator. Change `support@noalbs.com` in the dashboard
  too.
- **Offer the source.** The AGPL asks that people using your copy over the network can get its
  source, including your changes. Point the link on `/licenses` (`web/dashboard/licenses.html`)
  at your fork.
