---
title: Chat commands
description: Every chat command, its default role and what it takes.
---

Commands start with the switcher's prefix (`!` by default). The **role** is who may use it by
default; change it or turn the command off on the Chat & commands page. See
[Chat bot](/guides/chat-bot/#who-may-use-what) for what the roles mean.

`<…>` is required, `[…]` optional. Scene, source and interface names are matched loosely:
`!switch brb` finds "BRB Scene".

## Stream info

| Command | Role | |
| --- | --- | --- |
| `!bitrate` | Public | The bitrate and RTT of each stream server, or that it's offline. Alias `!b`. |
| `!sourceinfo` | Moderator | The same as `!bitrate`. |
| `!serverinfo` | Moderator | OBS's stats: scene, bitrate (measured over 2 seconds), FPS, dropped frames by network, rendering lag and encoding lag, CPU, memory and free disk. |

## Scenes and sources

| Command | Role | |
| --- | --- | --- |
| `!switch <scene>` | Admin | Switch to the scene that best matches the name. Alias `!ss`. |
| `!live` | Admin | Switch to your LIVE scene. |
| `!privacy` | Admin | Switch to your Privacy scene. |
| `!starting` | Admin | Switch to your Starting scene. |
| `!ending` | Admin | Switch to your Ending scene. |
| `!source <name>` | Admin | Show or hide a source on the scene on air (nested scenes and groups included). |
| `!fix` | Moderator | Reconnect the media sources on the scene on air, to unfreeze a stuck feed. Alias `!f`. |
| `!refresh` | Moderator | Show the Refresh scene for 4 seconds, then switch back (unless someone switched meanwhile). Without a Refresh scene it does `!fix`. |

## Stream and recording

| Command | Role | |
| --- | --- | --- |
| `!start` | Admin | Start streaming in OBS. |
| `!stop` | Admin | Stop streaming in OBS. |
| `!record` | Admin | Start or stop recording. |
| `!marker [note]` | Moderator | Mark this moment on the running stream; the reply gives its time. The note is up to 200 characters. |

## Triggers

Without a value they say the current one; `off` turns it off.

| Command | Role | |
| --- | --- | --- |
| `!trigger [kbps\|off]` | Moderator | The bitrate at or below which NOALBS switches to LOW. |
| `!otrigger [kbps\|off]` | Moderator | The bitrate at or below which it switches to BRB. |
| `!rtrigger [ms\|off]` | Moderator | The RTT at or above which it switches to LOW. |
| `!ortrigger [ms\|off]` | Moderator | The RTT at or above which it switches to BRB. |

## Settings

Without `on` or `off`, these flip the setting.

| Command | Role | |
| --- | --- | --- |
| `!notify [on\|off]` | Admin | Chat notifications of automatic switches. |
| `!autostop [on\|off]` | Admin | Stop the stream after a raid. |
| `!public [on\|off]` | Admin | Public commands (off: they need a moderator). |
| `!mod [on\|off]` | Admin | Mod commands (off: the moderator badge doesn't count). |
| `!alias <alias> <command>` | Admin | Add an alias. `!alias rem <alias>` removes one. |
| `!noalbs version` | Admin | Which version is running. |
| `!noalbs prefix <new>` | Admin | Change the prefix (1 to 3 characters). |
| `!noalbs lang <code>` | Admin | The language of the replies. |
| `!noalbs ignore <name>` | Admin | Ignore a chatter's commands. `!noalbs unignore <name>` undoes it. |

## BELABOX

Only for switchers with [BELABOX](/guides/belabox/) connected; silent otherwise.

| Command | Role | |
| --- | --- | --- |
| `!bbstart` | Admin | Start the BELABOX stream. |
| `!bbstop` | Admin | Stop the BELABOX stream. |
| `!bbb [kbps]` | Admin | Say the max bitrate, or set it (rounded to 250 kbps). While not streaming, it's kept for the next start. |
| `!bbt <interface>` | Admin | Turn a network interface off or back on, by your name for it or its own (`usb0`). |
| `!bbs` | Public | The network interfaces with their bitrate, the modems and the total. Alias `!bbm`. |
| `!bbsensor` | Public | The BELABOX's sensors. |

## Moblin

Only for switchers with [Moblin](/guides/moblin/) connected; silent otherwise.

| Command | Role | |
| --- | --- | --- |
| `!mstart` | Admin | Make Moblin go live. |
| `!mstop` | Admin | Stop Moblin's stream. |
| `!mbitrate [kbps]` | Admin | Say the bitrate preset in use and the list, or pick the preset with exactly that bitrate. |
| `!mscene [name]` | Admin | Say the scene and the list, or switch Moblin's scene. |
| `!mstats` | Public | Live or not, bitrate, bonding, battery and heat. |

## Not available yet

`!collection` (scene collection and profile) and `!streamserver` (turn a stream server on or
off) answer that they're not available yet.
