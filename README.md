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
- **Custom Rig Builder ("Import & Rig")** — upload any image, click to drop
  joint pins in the Bone Editor modal, wire up a parent chain, and save. The
  image is then deformed in real time using linear-blend mesh skinning
  (a triangulated grid warped per-joint via affine image transforms) as you
  pose it — no pre-cut layers required.
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
