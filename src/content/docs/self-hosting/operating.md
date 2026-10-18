---
title: Operating
description: Staff accounts, updates, backups, billing and monitoring for your own NOALBS Cloud.
---

## The first staff account

Staff get an **Admin** section in their account menu: an overview, live status of every
switcher and the chat service, users and workspaces, plans, chat bots and an audit log.

The first staff account is made in the database. Sign in once, then:

```sh
docker compose exec postgres psql -U noalbs noalbs -c \
  "UPDATE users SET staff = true WHERE id = (SELECT user_id FROM oauth2_connections WHERE provider_username = 'your_name')"
```

From then on, staff can make others staff under **Admin → Users**.

Staff don't get into other people's workspaces by default: a workspace's owner or admin grants
[support access](/guides/workspaces/#noalbs-support-access), and everything staff do there is logged.

## Plans

Every workspace starts on **Free**. Without billing, staff move workspaces between plans by hand
in **Admin → Workspaces**, and change what each plan allows under **Admin → Products**. For a copy
just for you and your team, raising the Free plan's limits there is all you need.

To sell plans, NOALBS Cloud uses Stripe: see "Billing" in
[`deploy/README.md`](https://github.com/NOALBS/noalbs-cloud/blob/main/deploy/README.md#billing-stripe).

## Updating

```sh
docker compose pull && docker compose up -d
```

The migrator upgrades the database before the new services start. Migrations only go forward:
to go back to an older version after an update that changed the schema, restore the backup from
before it. Pin a version with `NOALBS_TAG=sha-<commit>` in `.env`.

## Backups

Back up Postgres (`docker compose exec postgres pg_dump -U noalbs noalbs > backup.sql`) and keep
`.env`: without its `DATA_ENCRYPTION_KEY`, the stored passwords in a backup are useless. NATS only
holds live data (current statuses and the last two minutes of stats) and needs no backup.

## Monitoring

The services log to stdout (`RUST_LOG`, `LOG_FORMAT=json`). With `OTEL_EXPORTER_OTLP_ENDPOINT`
set they also send logs, traces and metrics to any OpenTelemetry backend, and the repository has a
Grafana dashboard for them (`deploy/grafana/noalbs.json`). Logs and traces never hold IP
addresses, tokens, stats URLs or chat messages. See "Observability" in `deploy/README.md`.

## Everything else

[`deploy/README.md`](https://github.com/NOALBS/noalbs-cloud/blob/main/deploy/README.md) has the
full configuration reference, routing the services through your own proxy, and what each
service needs to reach.
