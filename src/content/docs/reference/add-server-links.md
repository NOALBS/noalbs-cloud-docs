---
title: Add to NOALBS Cloud links
description: For stream server providers, a link that adds a customer's server to NOALBS Cloud in one click.
---

If you run a stream server or ingest service, you can put an **Add to NOALBS Cloud** button in
your customers' dashboard. It opens NOALBS Cloud with your server filled in: the customer picks
the switcher and confirms. Nothing is added without that click.

```
https://noalbs.com/add-server#kind=belabox&url=https%3A%2F%2Fstats.example.com%2Fyour-key&name=My%20ingest
```

Everything goes after the `#`. Browsers never send that part to a server, so the stats URL and
any key in it stay out of logs, including ours. Encode each value as in a query string
(`encodeURIComponent`).

| Parameter | |
| --- | --- |
| `kind` | Required. The kind, in lower case: `belabox`, `mediamtx`, `sls`, `nginx`, `nms`, `nimble`, `xiu`, `openirl`, `openrtmp`, `rist`, `irlhosting`, `irlhosting_websocket`. |
| `url` | Required. The stats URL (up to 2048 characters). |
| `name` | The server's name in NOALBS (up to 60 characters). |
| `publisher`, `application`, `key`, `listener_id` | The kind's settings (see [stream server kinds](/reference/stream-server-kinds/)). |
| `username`, `password` | For kinds with basic auth (MediaMTX, NMS). |
| `api_key` | For SLS's API key and IRLHosting WebSocket's token. |

Settings the kind doesn't use are ignored, and values are cut at 256 characters.

The **link builder** at [noalbs.com/integrate-stream-server](https://noalbs.com/integrate-stream-server)
makes one for you.
