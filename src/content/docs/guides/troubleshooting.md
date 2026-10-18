---
title: Troubleshooting
description: The usual reasons NOALBS doesn't connect, read your server or switch.
---

The **Setup** page shows the status of each connection live, and the **Activity** box on the
Live page lists what NOALBS did and why. Start there.

## "Waiting for the browser source…"

The browser source isn't connected to NOALBS Cloud.

- Is OBS open, with the browser source in a scene and enabled?
- Did you paste the latest link? Creating a new link stops the old one.
- Is **Shutdown source when not visible** off in the browser source's properties?
- Right-click the source → **Refresh** (or **Interact**, to see its page).

## "Browser source is up; waiting for OBS"

The browser source runs but can't reach OBS's WebSocket server.

- **Tools → WebSocket Server Settings**: is **Enable WebSocket server** on?
- Do the port and password on the Setup page match **Show Connect Info**? Changing them on the
  Setup page applies right away.

## The stream server shows no numbers

- **Test connection** on the server: what does it say?
- An address on your home network (`192.168.…`, `10.…`, `localhost`) is refused: NOALBS Cloud
  reads stats from the internet. Use the server's public address.
- Redirects aren't followed. Use the final URL.
- For servers carrying several streams, check the publisher, application or stream key.
- **MediaMTX** reports only total bytes, so its bitrate appears after two readings, and again
  after the encoder reconnects.

## It doesn't switch

- **Only while streaming** is on by default: NOALBS leaves OBS alone until you're live.
- Is **Auto switch** on (Live page, or Settings → Switching)?
- Is a [scene NOALBS knows](/guides/scenes/#which-scenes-noalbs-switches-away-from) on air?
  It doesn't switch away from scenes you picked by hand, like Privacy.
- Are your LIVE, LOW and BRB scenes set on the Scenes page?
- It waits for **checks before switching** (5 by default, about 6 seconds) before leaving LIVE.
- Does the switcher show **PAUSED**? It's over your plan's switcher limit.

## OBS shows a frozen picture, but the server has the feed

Press **Fix feed** on the Live page (or `!fix` in chat). It reconnects the media sources on the
scene on air.

## The chat bot doesn't answer

- Is the channel connected on the Chat & commands page, and not **Needs reconnecting**?
- Is the command turned on, and does the chatter have its role?
- On YouTube, commands only work while you're live.
- BELABOX and Moblin commands stay silent for switchers without BELABOX or Moblin connected.
- Below moderator, each command has a 5-second cooldown.

## Still stuck?

Ask on [Discord](https://discord.gg/efWu5HWM2u) or email support@noalbs.com. If someone from
NOALBS needs to look, you can [grant support access](/guides/workspaces/#noalbs-support-access)
for a few hours.
