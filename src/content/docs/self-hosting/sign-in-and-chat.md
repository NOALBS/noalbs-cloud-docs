---
title: Sign-in and chat
description: Setting up the Twitch, Kick and YouTube apps for sign-in and the chat bot.
---

People sign in with Twitch, Kick or YouTube, and the chat bot uses the same apps. Create the
ones you want and put each client ID and secret in `.env`; a provider without both isn't offered.

## The apps

- **Twitch**: an application in the [Twitch developer console](https://dev.twitch.tv/console/apps).
- **Kick**: an app in Kick's developer settings.
- **YouTube**: a Google Cloud project. Enable the **YouTube Data API v3**, set up the OAuth consent
  screen with the scopes `youtube.readonly` and `youtube.force-ssl`, and create an OAuth client of
  type *Web application*. Optionally add an API key restricted to the YouTube Data API, to look
  channels up by handle (for ignored chatters).

Register **all three** redirect URLs per provider (with your domain):

```
https://noalbs.example.com/api/auth/twitch/callback
https://noalbs.example.com/api/auth/link/twitch/callback
https://noalbs.example.com/api/chat/connect/twitch/callback
```

and the same with `kick` and `youtube` instead of `twitch`. The first signs in, the second links
an account to an existing one, the third connects chat channels and bot accounts.

:::note[YouTube's limits]
Both YouTube scopes are *sensitive*: until Google has verified your app, only test users you add
can connect, and their grants expire after 7 days. The YouTube API also has a daily quota (10,000
units by default): each bot message costs 50, each look for a live broadcast 1. Ask Google for
more before many streamers use it.
:::

## The chat bot

Streamers connect their channels on a switcher's Chat page. Replies come from a **shared bot
account** per platform: create a Twitch and a Kick account and a YouTube channel for it (for
example `MyBot`), then, as staff (see [Operating](/self-hosting/operating/#the-first-staff-account)),
open **Admin → Chat bots**, press Connect and sign in **as that account**, not as yourself.

The chat service gets the same client IDs and secrets, and the same `DATA_ENCRYPTION_KEY`, as the
API.

- **Twitch** needs nothing more: the service connects out to Twitch.
- **Kick** delivers chat by webhook. In the Kick app's settings, turn webhooks on and set the URL to
  `https://noalbs.example.com/chat/webhooks/kick`.
- **YouTube** has no push events: while a switcher linked to a YouTube channel streams, the service
  looks for the channel's live broadcast and follows its chat.

For more chat traffic, run several instances (`docker compose up -d --scale chat=2`, or on several
machines with the same NATS and database). They share the work, and the others take over when one
stops.
