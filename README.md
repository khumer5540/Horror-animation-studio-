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
  stage to Sever/Reattach it for decapitation-style effects. Rendering is a
  rigid "cutout puppet": each triangle of a grid over the image is assigned
  to a single bone and rigidly rotated/translated with it (no blending
  across bones), so posing can never stretch or tear the source image — a
  seam can appear at a joint once it bends a lot, but the pixels themselves
  are never distorted. No pre-cut layers required.
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
