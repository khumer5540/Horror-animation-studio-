import { angleLerp } from './skeleton.js';

export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Recursively lerp a plain-object "pose" payload. Keys ending in `Angle`
// (or nested under a `bones`/`angles` map) use shortest-path angle lerp,
// everything numeric uses linear lerp, everything else takes `b` once t>=0.5.
export function lerpPose(a, b, t) {
  if (a == null || b == null) return t < 0.5 ? a : b;
  if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, t);
  if (typeof a === 'object' && typeof b === 'object') {
    const out = Array.isArray(a) ? [] : {};
    for (const key of Object.keys(a)) {
      if (key === 'bones' || key === 'angles') {
        out[key] = {};
        for (const boneId of Object.keys(a[key])) {
          out[key][boneId] = angleLerp(a[key][boneId] ?? 0, b[key]?.[boneId] ?? a[key][boneId] ?? 0, t);
        }
      } else if (key === 'severed') {
        // Sever/reattach is a discrete state, not a continuous quantity: for
        // joints severed on both sides of the tween, lerp their free-floating
        // position; for joints that only appear on one side, snap at the
        // midpoint so the detach/reattach visibly happens mid-animation.
        out[key] = {};
        const ids = new Set([...Object.keys(a[key] || {}), ...Object.keys(b[key] || {})]);
        for (const jointId of ids) {
          const av = a[key]?.[jointId];
          const bv = b[key]?.[jointId];
          if (av && bv) out[key][jointId] = { x: lerp(av.x, bv.x, t), y: lerp(av.y, bv.y, t) };
          else if (t < 0.5 && av) out[key][jointId] = av;
          else if (t >= 0.5 && bv) out[key][jointId] = bv;
        }
      } else {
        out[key] = lerpPose(a[key], b[key] ?? a[key], t);
      }
    }
    return out;
  }
  return t < 0.5 ? a : b;
}

// "Blank keyframe" visibility (Adobe Animate style): the keyframe in effect
// at time `t` is whichever one's time is latest without exceeding `t`; if
// that keyframe's data.visible is explicitly false, the object stays hidden
// for that whole segment, until the next keyframe flips it back on.
export function isVisibleAtTime(keyframes, t) {
  if (!keyframes || keyframes.length === 0) return true;
  let governing = keyframes[0];
  for (const k of keyframes) {
    if (k.time <= t + 1e-6) governing = k;
    else break;
  }
  return governing.data?.visible !== false;
}

// Sample a track's keyframes at time `t`. Keyframes: [{ time, data }] sorted.
export function sampleTrack(keyframes, t) {
  if (!keyframes || keyframes.length === 0) return null;
  if (keyframes.length === 1) return keyframes[0].data;
  const sorted = keyframes;
  if (t <= sorted[0].time) return sorted[0].data;
  if (t >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].data;
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const k1 = sorted[i];
    const k2 = sorted[i + 1];
    if (t >= k1.time && t <= k2.time) {
      const span = k2.time - k1.time;
      const localT = span === 0 ? 0 : (t - k1.time) / span;
      return lerpPose(k1.data, k2.data, easeInOut(localT));
    }
  }
  return sorted[sorted.length - 1].data;
}
