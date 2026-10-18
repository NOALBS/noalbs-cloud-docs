// A fake OBS (obs-websocket v5, no password) and a stats server for two stream servers.
//
// OBS: the requests NOALBS sends (`crates/obs-actions/src/types.rs` in the noalbs-cloud repo),
// scene/stream/record events, and audio levels while subscribed. Stats: `/belabox…` and `/sls…`
// both answer `{"publishers":{"live":{bitrate,rtt}}}`, the format of NOALBS's BELABOX and SLS kinds.
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** Scene UUIDs, for the seed's scene settings. */
export const SCENE_IDS = {
  starting: uuid(1),
  live: uuid(2),
  low: uuid(3),
  offline: uuid(4),
  chatting: uuid(5),
  privacy: uuid(6),
  ending: uuid(7),
};

const SCENES = [
  { name: "Starting soon", uuid: SCENE_IDS.starting, frame: "starting" },
  { name: "IRL", uuid: SCENE_IDS.live, frame: "irl" },
  { name: "IRL LOW", uuid: SCENE_IDS.low, frame: "low" },
  { name: "BRB", uuid: SCENE_IDS.offline, frame: "brb" },
  { name: "Just Chatting", uuid: SCENE_IDS.chatting, frame: "chatting" },
  { name: "Privacy", uuid: SCENE_IDS.privacy, frame: "privacy" },
  { name: "Ending", uuid: SCENE_IDS.ending, frame: "ending" },
];

const item = (id, name, n, inputKind, extra = {}) => ({
  sceneItemId: id,
  sceneItemEnabled: true,
  sourceName: name,
  sourceUuid: uuid(100 + n),
  sourceType: "OBS_SOURCE_TYPE_INPUT",
  inputKind,
  isGroup: null,
  ...extra,
});
const group = (id, name, n) => ({ ...item(id, name, n, null), sourceType: "OBS_SOURCE_TYPE_SCENE", isGroup: true });
const nested = (id, name, n) => ({ ...item(id, name, n, null), sourceType: "OBS_SOURCE_TYPE_SCENE", isGroup: false });

/** Starts both servers; `frames` maps a scene's frame name to a JPEG data URL. */
export function startFakeObs({ frames, obsPort = 4455, statsPort = 18300 }) {
  // Scene (or group) name → its items, top first like OBS's Sources dock.
  const items = {
    IRL: [group(1, "Overlay", 1), item(2, "Music", 2, "ffmpeg_source"), item(3, "SRT feed", 3, "ffmpeg_source"), nested(4, "Background", 4)],
    Overlay: [
      item(1, "Chat", 11, "browser_source"),
      item(2, "Alerts", 12, "browser_source"),
      item(3, "Speed and map", 13, "browser_source", { sceneItemEnabled: false }),
      item(4, "NOALBS", 14, "browser_source"),
    ],
    Background: [item(1, "Blur", 21, "image_source")],
    "IRL LOW": [item(1, "Weak signal", 31, "image_source"), item(2, "SRT feed", 3, "ffmpeg_source")],
    BRB: [item(1, "BRB card", 41, "image_source"), item(2, "Music", 2, "ffmpeg_source")],
    "Starting soon": [item(1, "Starting card", 51, "image_source"), item(2, "Music", 2, "ffmpeg_source")],
    "Just Chatting": [item(1, "Webcam", 61, "dshow_input"), item(2, "Chat", 11, "browser_source")],
    Privacy: [item(1, "Privacy card", 71, "image_source")],
    Ending: [item(1, "Ending card", 81, "image_source"), item(2, "Music", 2, "ffmpeg_source")],
  };
  // Inputs with audio; others answer 604, like OBS for an image or a camera without a microphone.
  const audio = {
    "Desktop Audio": { muted: false, db: -6 },
    "Mic/Aux": { muted: true, db: 0 },
    "SRT feed": { muted: false, db: 0 },
    Music: { muted: false, db: -18.5 },
  };
  const state = {
    scene: SCENES[1],
    streaming: true,
    // Live for a while already, so the uptime and history look lived in.
    streamStarted: Date.now() - (2 * 3600 + 14 * 60 + 37) * 1000,
    recording: false,
    recordStarted: 0,
    obsStarted: Date.now() - 3 * 3600 * 1000,
  };

  const timecode = (ms) => {
    const s = Math.floor(ms / 1000);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}.000`;
  };
  const frameCount = (since) => Math.floor(((Date.now() - since) / 1000) * 60);

  const clients = new Set();
  const broadcast = (eventType, eventData) => {
    for (const ws of clients) ws.send(JSON.stringify({ op: 5, d: { eventType, eventIntent: 1, eventData } }));
  };

  function answer(type, data) {
    switch (type) {
      case "GetVersion":
        return { obsVersion: "31.1.0", obsWebSocketVersion: "5.6.3", rpcVersion: 1 };
      case "GetSceneList":
        return {
          currentProgramSceneName: state.scene.name,
          currentProgramSceneUuid: state.scene.uuid,
          currentPreviewSceneName: null,
          // OBS lists the bottom scene first.
          scenes: SCENES.map((s, i) => ({ sceneIndex: SCENES.length - 1 - i, sceneName: s.name, sceneUuid: s.uuid })).reverse(),
        };
      case "GetCurrentProgramScene":
        return { currentProgramSceneName: state.scene.name, currentProgramSceneUuid: state.scene.uuid };
      case "SetCurrentProgramScene": {
        const next = SCENES.find((s) => s.uuid === data.sceneUuid || s.name === data.sceneName);
        if (!next) return { error: 600 };
        if (next !== state.scene) {
          state.scene = next;
          broadcast("CurrentProgramSceneChanged", { sceneName: next.name, sceneUuid: next.uuid });
        }
        return {};
      }
      case "GetSceneItemList":
      case "GetGroupSceneItemList":
        return items[data.sceneName] ? { sceneItems: items[data.sceneName] } : { error: 600 };
      case "SetSceneItemEnabled": {
        const found = items[data.sceneName]?.find((i) => i.sceneItemId === data.sceneItemId);
        if (!found) return { error: 600 };
        found.sceneItemEnabled = data.sceneItemEnabled;
        return {};
      }
      case "GetSpecialInputs":
        return { desktop1: "Desktop Audio", desktop2: null, mic1: "Mic/Aux", mic2: null, mic3: null, mic4: null };
      case "GetInputMute":
        return audio[data.inputName] ? { inputMuted: audio[data.inputName].muted } : { error: 604 };
      case "GetInputVolume":
        return audio[data.inputName]
          ? { inputVolumeDb: audio[data.inputName].db, inputVolumeMul: 10 ** (audio[data.inputName].db / 20) }
          : { error: 604 };
      case "SetInputMute":
        if (!audio[data.inputName]) return { error: 604 };
        audio[data.inputName].muted = data.inputMuted;
        broadcast("InputMuteStateChanged", { inputName: data.inputName, inputMuted: data.inputMuted });
        return {};
      case "SetInputVolume":
        if (!audio[data.inputName]) return { error: 604 };
        audio[data.inputName].db = data.inputVolumeDb;
        broadcast("InputVolumeChanged", { inputName: data.inputName, inputVolumeDb: data.inputVolumeDb });
        return {};
      case "GetInputSettings":
        return { inputSettings: { input: "srt://ingest.example.com:4000?streamid=live", is_local_file: false }, inputKind: "ffmpeg_source" };
      case "SetInputSettings":
      case "TriggerMediaInputAction":
      case "PauseRecord":
      case "ResumeRecord":
        return {};
      case "GetMediaInputStatus":
        return { mediaState: "OBS_MEDIA_STATE_PLAYING" };
      case "GetStats":
        return {
          cpuUsage: 7.4 + Math.random(),
          memoryUsage: 612.3,
          availableDiskSpace: 184_320,
          activeFps: 60,
          averageFrameRenderTime: 1.9,
          renderSkippedFrames: 12,
          renderTotalFrames: frameCount(state.obsStarted),
          outputSkippedFrames: 31,
          outputTotalFrames: frameCount(state.obsStarted),
          webSocketSessionIncomingMessages: 0,
          webSocketSessionOutgoingMessages: 0,
        };
      case "GetStreamStatus": {
        const ms = state.streaming ? Date.now() - state.streamStarted : 0;
        return {
          outputActive: state.streaming,
          outputReconnecting: false,
          outputTimecode: timecode(ms),
          outputDuration: ms,
          outputCongestion: 0,
          outputBytes: Math.floor((ms / 1000) * 750_000),
          outputSkippedFrames: state.streaming ? 31 : 0,
          outputTotalFrames: state.streaming ? frameCount(state.streamStarted) : 0,
        };
      }
      case "GetRecordStatus": {
        const ms = state.recording ? Date.now() - state.recordStarted : 0;
        return { outputActive: state.recording, outputPaused: false, outputTimecode: timecode(ms), outputDuration: ms, outputBytes: ms * 1000 };
      }
      case "StartStream":
      case "StopStream": {
        const on = type === "StartStream";
        if (state.streaming === on) return { error: on ? 500 : 501 };
        state.streaming = on;
        if (on) state.streamStarted = Date.now();
        broadcast("StreamStateChanged", { outputActive: on, outputState: on ? "OBS_WEBSOCKET_OUTPUT_STARTED" : "OBS_WEBSOCKET_OUTPUT_STOPPED" });
        return {};
      }
      case "StartRecord":
      case "StopRecord": {
        const on = type === "StartRecord";
        if (state.recording === on) return { error: on ? 500 : 501 };
        state.recording = on;
        if (on) state.recordStarted = Date.now();
        broadcast("RecordStateChanged", { outputActive: on, outputState: on ? "OBS_WEBSOCKET_OUTPUT_STARTED" : "OBS_WEBSOCKET_OUTPUT_STOPPED", outputPath: null });
        return {};
      }
      case "GetSourceScreenshot": {
        const scene = SCENES.find((s) => s.uuid === data.sourceUuid || s.name === data.sourceName) ?? state.scene;
        return { imageData: frames[scene.frame] };
      }
      default:
        return { error: 204 };
    }
  }

  const wss = new WebSocketServer({ port: obsPort });
  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ op: 0, d: { obsWebSocketVersion: "5.6.3", rpcVersion: 1 } }));
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      // Identify and Reidentify: remember whether audio levels are wanted.
      if (msg.op === 1 || msg.op === 3) {
        ws.meters = Boolean((msg.d.eventSubscriptions ?? 0) & (1 << 16));
        clients.add(ws);
        ws.send(JSON.stringify({ op: 2, d: { negotiatedRpcVersion: 1 } }));
        return;
      }
      if (msg.op !== 6) return;
      const { requestType, requestId, requestData = {} } = msg.d;
      const result = answer(requestType, requestData);
      const failed = typeof result?.error === "number";
      ws.send(
        JSON.stringify({
          op: 7,
          d: {
            requestType,
            requestId,
            requestStatus: failed ? { result: false, code: result.error, comment: "fake OBS refused" } : { result: true, code: 100 },
            responseData: failed ? undefined : result,
          },
        }),
      );
    });
    ws.on("close", () => clients.delete(ws));
  });

  // Audio levels at 20 a second for sessions that subscribed to them.
  let t = 0;
  const meters = setInterval(() => {
    t += 0.05;
    const level = (base, wobble) => {
      const mul = 10 ** ((base + Math.sin(t * 3.1 + wobble) * 5 + Math.random() * 4) / 20);
      return [[mul, mul * 1.3, mul * 1.3], [mul * 0.9, mul * 1.2, mul * 1.2]];
    };
    const inputs = [
      { inputName: "Desktop Audio", inputLevelsMul: level(-28, 0) },
      { inputName: "Mic/Aux", inputLevelsMul: [[0, 0, 0.02], [0, 0, 0.02]] },
      { inputName: "SRT feed", inputLevelsMul: level(-14, 1) },
      { inputName: "Music", inputLevelsMul: level(-32, 2) },
    ];
    for (const ws of clients) {
      if (ws.meters) ws.send(JSON.stringify({ op: 5, d: { eventType: "InputVolumeMeters", eventIntent: 1 << 16, eventData: { inputs } } }));
    }
  }, 50);

  // Stats: a slow random walk around a healthy bitrate, with a rare short dip.
  let main = 5600;
  let backup = 2400;
  let dip = 0;
  const walk = setInterval(() => {
    main += (5600 - main) * 0.08 + (Math.random() - 0.5) * 500;
    backup += (2400 - backup) * 0.1 + (Math.random() - 0.5) * 200;
    if (dip > 0) dip--;
    else if (Math.random() < 0.004) dip = 3;
  }, 1000);
  const stats = createServer((req, res) => {
    const live = req.url.startsWith("/belabox")
      ? { bitrate: Math.round(dip > 0 ? 1900 + Math.random() * 400 : main), rtt: Math.round(180 + Math.random() * 90) }
      : { bitrate: Math.round(backup), rtt: Math.round(240 + Math.random() * 60) };
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ publishers: { live } }));
  }).listen(statsPort);

  return {
    close() {
      clearInterval(meters);
      clearInterval(walk);
      for (const ws of clients) ws.terminate();
      wss.close();
      stats.close();
    },
  };
}
