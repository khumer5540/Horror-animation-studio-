# Horror Animation Studio

A browser-based, zero-cost stickman-style animation studio, rebranded as a
horror toolkit: joint-rigged Ghost / Zombie / Witch / Jinn characters, a
horror props library, a keyframe timeline with camera zoom, and a **Custom
Rig Builder** that turns any uploaded image into a posable, animatable
character.

## Features

- **Horror theme UI** — deep blacks, blood reds, neon-green active states.
- **Built-in horror rigs** — Ghost, Zombie, Witch, Jinn, each a 14/16-joint
  FK skeleton with its own silhouette, palette, and face style. Drag any
  joint pin on stage to pose, or apply one-click pose presets.
- **Horror props** — blood splatter, fog/mist, lantern, axe, tombstone,
  candle, spiderweb, skull, coffin, bat, full moon, knife — all hand-drawn
  SVG-style canvas paths, draggable/scalable/rotatable, with an
  attach-to-hand system for weapons.
- **Custom Rig Builder ("Import & Rig")** — upload any image and a pre-built
  19-node humanoid Meta-Rig template overlays it automatically; drag the
  gold-ringed Hips node to move the whole skeleton into place, then drag any
  other node to snap that limb onto the anatomy. Right-click a joint on
  stage to Sever/Reattach it for decapitation-style effects.
  - **✨ Auto-Detect Skeleton** — runs MediaPipe's PoseLandmarker (BlazePose,
    on-device, no image ever leaves the browser) to find a person in the
    uploaded image and snap all 19 nodes onto the detected landmarks in one
    click. Falls back cleanly to manual dragging if no pose is found or the
    model can't load. Needs an internet connection the first time (to fetch
    the ~6MB model from Google's CDN); the WASM runtime itself is
    self-hosted from `public/mediapipe-wasm` (see "Development" below).
  - Rendering is a rigid "cutout puppet": each quad of a grid over the image
    is assigned to a single bone (whichever it sits closest to in bind
    pose) and rigidly rotated/translated with it — never blended across
    bones — so posing can never stretch or tear the source image. For
    images with a transparent background, empty regions are also excluded
    from the mesh so background pixels don't fly around with the nearest
    limb; a plain photo/JPEG without transparency will show a warning and
    move its background in chunks instead. A seam can appear at a joint
    once it bends a lot, which is inherent to (and expected of) this style,
    not a bug — the joint's own marker sits right on top of it, same as a
    real paper-puppet pin.
- **Image-to-Prop** — upload a static image as a scalable, rotatable prop
  without rigging it.
- **Timeline** — per-character/prop/camera keyframe tracks, ease-in-out
  auto-tweening, scrubbing, and playback. Camera zoom/pan is itself
  keyframeable for cinematic close-ups.
- **Export** — records the stage via `canvas.captureStream()` +
  `MediaRecorder` and downloads a WebM file.

## Stack

Plain React + Vite, canvas 2D rendering, no backend, no external assets —
everything (rigs, props, mesh warping) is procedural code running in the
browser.

## Development

```bash
npm install
npm run dev
```

`npm install` runs a `postinstall` step that copies MediaPipe's WASM runtime
(~30MB, used by Auto-Detect Skeleton) out of `node_modules` into
`public/mediapipe-wasm/` — that folder is gitignored and regenerated on every
install rather than committed, same as `node_modules`/`dist`.
