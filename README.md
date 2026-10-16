# Kanya-Chan VR

WebXR companion for the Meta Quest browser: Kanya-Chan stands life-size about 1.2 m in front of you in a classroom.
Live at https://kampfguy.github.io/kanya-vr/ ; open it in Quest Browser and press **Enter VR**. On desktop and phones it runs as a normal 3D view (drag to orbit).

- three.js 0.169 WebXR + @pixiv/three-vrm 3.1, foveation on, framebuffer scale 0.9, no real-time shadows (blob shadow only).
- Chat panel next to her is a canvas texture with simple formatting (*italic*, **bold**, bullet lists).
- Point the controller ray at the panel buttons: **Keyboard** (focuses a text field, which brings up the Quest system keyboard), **Speak** (Web Speech API, shown only if the browser supports it), **Mute**, **Recentre**.
- Backend: the same `grokchan-api` Cloudflare Worker as the main site (`/chat` with `character: "kanya"`, `/tts` with VOICEVOX:四国めたん（ツンツン）, speaker 6). The access password is shared with the main site (same origin, stored in localStorage).
- Poses: `poses.js` copied from the main site (idle Handsonhip, talk Handsonbothhips / Fingersonchin).

## Model licence
`grokchan.vrm` is the owner's own model (author: Kampfguy; VRM 1.0 licence: personal non-profit use, credit required, modification prohibited). It is used here by its author; please don't reuse it elsewhere.

Voice: VOICEVOX:四国めたん（ツンツン） via tts.quest.
