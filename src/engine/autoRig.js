// 1-click Auto-Rigging: runs MediaPipe's PoseLandmarker (BlazePose, 33
// landmarks) on the uploaded image and maps the detected body points onto
// our Meta-Rig joint ids, so the user can skip manually dragging every node.
//
// The WASM runtime is self-hosted from public/mediapipe-wasm (copied out of
// the npm package by scripts/copy-mediapipe-wasm.js on install) rather than
// loaded from MediaPipe's default jsdelivr/unpkg CDN path, since some
// deployment/sandbox network policies block those hosts. The model weights
// themselves still come from Google's storage.googleapis.com at runtime —
// there's no reasonable way to bundle a multi-MB pose model into the repo.
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_BASE = `${import.meta.env.BASE_URL}mediapipe-wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

let landmarkerPromise = null;

function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = FilesetResolver.forVisionTasks(WASM_BASE)
      .then((vision) =>
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'IMAGE',
          numPoses: 1,
        })
      )
      .catch((err) => {
        landmarkerPromise = null; // allow retrying on the next call
        throw err;
      });
  }
  return landmarkerPromise;
}

function mid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// BlazePose's 33 landmarks are named from the SUBJECT's own left/right,
// which — for a person facing the camera, the common case for character
// art — appear mirrored on screen. Our Meta-Rig's l*/r* prefixes are
// screen/viewer-relative (see data/rigTypes.js), so left_* landmarks feed
// our r* joints and vice versa.
export async function detectMetaRigPose(imageEl) {
  const landmarker = await getLandmarker();
  const result = landmarker.detect(imageEl);
  const lm = result?.landmarks?.[0];
  if (!lm || lm.length < 33) return null;

  const toPx = (p) => ({ x: p.x * imageEl.naturalWidth, y: p.y * imageEl.naturalHeight });
  const L = (i) => toPx(lm[i]);

  const shoulderMid = mid(L(11), L(12));
  const hipMid = mid(L(23), L(24));

  return {
    hips: hipMid,
    chest: lerp(shoulderMid, hipMid, 0.25),
    neck: shoulderMid,
    head: L(0),
    leftEye: L(5),
    rightEye: L(2),
    mouth: mid(L(9), L(10)),
    lShoulder: L(12),
    lElbow: L(14),
    lHand: L(16),
    rShoulder: L(11),
    rElbow: L(13),
    rHand: L(15),
    lHip: L(24),
    lKnee: L(26),
    lFoot: L(28),
    rHip: L(23),
    rKnee: L(25),
    rFoot: L(27),
  };
}
