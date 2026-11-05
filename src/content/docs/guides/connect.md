---
title: NOALBS Cloud Connect
description: A desktop app that connects OBS to NOALBS Cloud and can start, stop and restart it.
---

## What Connect does

NOALBS Cloud Connect is an optional desktop app for Windows, macOS and Linux. It links OBS on
your computer to a switcher in NOALBS Cloud so you can see OBS's status and control it from the
app or dashboard. It can also restart OBS after a crash, upload OBS logs and crash reports, start
other programs such as Streamer.bot, and manage several OBS setups on one computer.

Connect is an alternative to the [browser source](/getting-started/quick-start/), which stays
supported. It connects OBS to the switcher the same way, so switching works through it too, and adds
the features above. Use one or the other for a switcher: if a browser source or another computer
connects to the same switcher, it takes over and Connect shows that it was disconnected.

## Download and install

1. In the dashboard, open the switcher's **Settings** page and find the **NOALBS Cloud Connect**
   card. Choose **Download for …** for your computer, or open the
   [GitHub releases page](https://github.com/NOALBS/noalbs-cloud/releases/latest) to choose another
   platform or Linux package.
2. The downloads use these names:

   | Platform | File |
   | --- | --- |
   | Windows | `NOALBS-Cloud-Connect-windows-x64-setup.exe` |
   | macOS | `NOALBS-Cloud-Connect-macos-universal.dmg` |
   | Linux AppImage | `NOALBS-Cloud-Connect-linux-x86_64.AppImage` |
   | Linux Debian/Ubuntu | `NOALBS-Cloud-Connect-linux-amd64.deb` |
   | Linux Fedora/RPM | `NOALBS-Cloud-Connect-linux-x86_64.rpm` |

3. The app is not code-signed yet, so Windows and macOS may warn before opening it:
   - On Windows SmartScreen, choose **More info**, then **Run anyway**.
   - On macOS, right-click the app and choose **Open**, or go to **System Settings** →
     **Privacy & Security** → **Open Anyway**.
   - On Linux, make the AppImage executable before opening it:
     `chmod +x NOALBS-Cloud-Connect-linux-x86_64.AppImage`. You can also install the `.deb` or
     `.rpm` package.
4. To verify a download, keep `SHA256SUMS` beside the downloaded file and run
   `sha256sum -c SHA256SUMS`.

On first run, **Start NOALBS Cloud Connect when my computer starts** is enabled by default. You can
change it in the app's settings.

## Updates

Connect checks for updates 30 seconds after it starts, then every 6 hours. It never installs an
update by itself. When an update is available, the **Updates** row in the Connect window shows it
with an **Install and restart** button. You can also select **Check for updates** at any time.

OBS and your programs keep running while Connect updates and restarts. Updates are signed, and
Connect only installs updates signed by NOALBS.

How the update is installed depends on your platform:

- On Windows, a small progress window shows the update; you don't have to answer any questions.
- On Linux, each format updates in its own way: an AppImage replaces the file, while `.deb` and
  `.rpm` packages ask for your password to install.
- On macOS, the app is replaced.

Only copies installed from the first public release onwards can update automatically.

## Pair a computer

1. In Connect, add a setup and give it a name. Select **Pair with NOALBS Cloud**.
2. Connect displays a code under **Enter this code on the NOALBS Cloud pairing page:**. Select
   **Open pairing page** in the app; it opens the browser page for you. Check that the code on the
   page matches the one in the app.
3. On the pairing page, choose a **Workspace** and **Switcher**, then select
   **Connect to this switcher**. You need switcher-management access in that workspace to pair a
   computer.
4. After pairing, the computer appears under **Paired computers** in the switcher's **Settings**
   page, in **NOALBS Cloud Connect**. Use **Revoke** there to stop the computer's token from
   connecting. **Unpair** in the app removes the token stored on that computer; revoke it in the
   dashboard as well to fully revoke access.

## Control OBS

The Connect app has **Start**, **Stop** and **Restart** controls for each setup. In the dashboard,
the paired-computer card has **Start OBS**, **Stop OBS** and **Restart OBS**; **Stop OBS** and
**Restart OBS** ask you to confirm. The Live page also offers **Start OBS** when a paired computer
reports **OBS not running** or **OBS crashed**. The app's **Stop** and **Restart** controls act
immediately without a confirmation dialog.

The switcher's **Who can start, stop and restart OBS** permission lets the owner allow only owners,
owners and admins, or everyone in the workspace (including operators). NOALBS support cannot use
this permission. Dashboard-issued OBS commands appear in the activity feed with the account that
issued them.

Connect can show these OBS states:

| State | Meaning |
| --- | --- |
| **OBS connected** | Connect can reach OBS over its WebSocket connection. |
| **Starting OBS…** | OBS is starting. |
| **OBS is running** | OBS is running on a setup that is not paired yet. |
| **OBS is waiting for input** | OBS is running but has not connected to Connect yet. |
| **OBS is asking about Safe Mode** | OBS is showing its Safe Mode prompt. |
| **OBS websocket is off** | OBS WebSocket is disabled. Select **Turn on OBS websocket** in Connect to enable it. |
| **OBS is not responding** | OBS stopped responding. |
| **OBS crashed** | OBS crashed. |
| **OBS not running** | No OBS process is running for this setup. |
| **OBS running, not started by Connect** | Connect cannot safely identify which OBS process belongs to this setup (for example, when multiple OBS processes match). **Start** remains available, but Connect refuses the request rather than choosing a process. |

In the dashboard's **OBS watchdog** setting, the owner can choose:

- **Off**: Connect reports a crash or an OBS process that stops responding, but does not restart OBS.
- **Restart OBS**: Connect restarts OBS after a crash or when it stops responding. It does not resume the stream automatically.
- **Restart OBS and go live again**: Connect restarts OBS and starts the stream again if it was live.

## Use several OBS setups on one computer

Add a separate setup in Connect for each OBS configuration you want to manage. On Linux, give each
setup its own OBS settings folder.

On Windows and macOS, setups that share an OBS settings folder need to use
**Share the OBS settings folder with another setup** and a different **Websocket port** for each
setup. On Windows, a separate portable OBS copy can keep its own settings next to `obs64.exe`;
Connect labels this option **Portable OBS (keeps its own settings next to obs64.exe)** and detects
the OBS `portable_mode` marker file.

## Logs and crash reports

The switcher's **Who can see OBS logs** permission controls access to logs. In the **Logs** card,
select **Get latest OBS log** to ask an online Connect computer to upload its latest OBS log.
Connect also uploads an OBS log after a detected crash and includes a matching crash report when
it can identify one for that OBS process.

Logs are kept for up to 30 days, with a limit of 20 logs per switcher. The dashboard viewer masks
common sensitive values by default, including stream keys in stream URLs, selected query-string
secrets, bearer tokens and IP addresses. Select **Show sensitive values** to reveal them. The
downloaded log is the raw file and is not redacted.

## Programs

The **Who can add, start and stop programs** permission is set to owners only by default. The owner
can allow admins or everyone in the workspace; NOALBS support is excluded. People without this
permission do not see the program list, paths or arguments in the dashboard.

You can add programs in Connect or from the dashboard. Give each program a full executable path
and its arguments, one per line. On macOS, you can choose the app itself (for example
`/Applications/TextEdit.app`); Connect opens it the way Finder does. In the dashboard, the fields
are **Full program path** and **Arguments (one per line)**. Choose **Start with OBS** or
**Stop with OBS** if the program should follow OBS's start or stop, whether OBS is started or closed
from Connect, the tray, the dashboard, or directly on your computer. If the watchdog restarts OBS
after a crash, programs set to follow OBS keep running. To let dashboard users add or edit programs,
enable
**Allow the dashboard to add and edit programs** in Connect on that computer.

**Stop** asks a program to close, then force-closes it after 5 seconds if it is still running. OBS
gets 20 seconds to close. **Stop** ends every running process that uses the program's executable.
You cannot change the executable path while that program is running.

:::caution
OBS control and program permissions let the people you allow run software on your computer. Keep
these permissions tight.
:::
