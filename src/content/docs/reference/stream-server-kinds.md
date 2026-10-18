---
title: Stream server kinds
description: Every stream server NOALBS Cloud can read, its stats URL and the settings it needs.
---

The URLs below are examples; use your server's public address. See
[Stream servers](/guides/stream-servers/) for how servers are added and used.

| Kind | What | Stats URL | Settings | RTT |
| --- | --- | --- | --- | --- |
| **BELABOX** | BELABOX Cloud | `https://stats.srt.belabox.net/your-key`, from BELABOX Cloud | none | yes |
| **MediaMTX** | SRT / RTMP | `http://your-server:9997/v3/paths/get/live`: the API address of your stream's path | optional username and password | SRT |
| **SLS** | SRT Live Server | `http://your-server:8181/stats` | publisher (stream ID); optional API key | yes |
| **NGINX** | nginx-rtmp | `http://your-server/stat`: the `rtmp_stat` page (XML) | application, stream key | no |
| **NMS** | Node Media Server | `http://your-server:8000/api/streams` | application, stream key; optional username and password | no |
| **Nimble** | Nimble Streamer | `http://your-server:8082`: the API address, without `/manage/…` | SRT listener ID, application, stream key | yes |
| **Xiu** | Xiu media server | `http://your-server:8000/api/query_stream` | application, stream key | no |
| **OpenIRL** | OpenIRL SRT | `http://your-server:8080/stats/play_…` | none | yes |
| **OpenRTMP** | OpenRTMP | `https://your-server/stats?key=…`, including your stats key | none | yes |
| **RIST** | RIST receiver | `http://your-server:8080/stats` | none | yes |
| **IRLHosting** | SRT or RTMP | `http://your-server:8181/stats`, from IRLHosting | SRT: publisher; RTMP: application and stream key | yes |
| **IRLHosting WebSocket** | Live stats push | `wss://your-server/ws-stats` | token; optional feed (empty: the first active stream) | yes |

RTT is the round-trip time the [RTT triggers](/guides/switching/#latency-rtt) use. Kinds without
it switch on bitrate only.

## Notes per kind

**MediaMTX** needs its API turned on (`api: yes` in `mediamtx.yml`). It only reports the total
bytes received, so NOALBS needs two readings for a bitrate: the number appears a second after
the stream starts, and again after the encoder reconnects.

**Nimble** needs the SRT stream republished as RTMP; the bitrate comes from that. Like NOALBS,
Nimble reporting 0 kbps for a connected stream counts as LIVE.

**IRLHosting WebSocket** pushes stats instead of being read once a second. No message for 3
seconds counts as offline. Because it reports changes as they happen, it drops to LOW or BRB
without waiting for the [checks before switching](/guides/switching/#checks-before-switching).

## Your server isn't listed?

Ask on [Discord](https://discord.gg/efWu5HWM2u), or add it yourself: each kind is a small module
in the [source code](https://github.com/NOALBS/noalbs-cloud) (see
[Contributing](/contributing/)). Providers can give their customers a one-click
[Add to NOALBS Cloud link](/reference/add-server-links/).
