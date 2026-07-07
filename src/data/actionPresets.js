// One-click "Action Preset" library. Each preset is a short pose sequence
// (relative time `t`, partial bone-angle deltas merged over the character's
// current base pose) that gets baked into real timeline keyframes when
// applied — see engine/actionGen.js. Joint ids match the shared humanoid
// vocabulary (data/rigTypes.js HUMANOID_BONES / data/metaRig.js Meta-Rig),
// so the same preset works on both built-in and custom-rigged characters.
export const ACTION_PRESETS = {
  walk: {
    label: 'Walk Cycle',
    loop: true,
    cycleDuration: 1.0,
    strideX: 34,
    frames: [
      { t: 0, pose: { lHip: 0.5, lKnee: -0.3, rHip: -0.5, rKnee: -0.1, lShoulder: -0.3, rShoulder: 0.3, chest: 0.04 } },
      { t: 0.25, pose: { lHip: 0.1, lKnee: -0.9, rHip: -0.1, rKnee: -0.1, lShoulder: -0.1, rShoulder: 0.1, chest: 0 } },
      { t: 0.5, pose: { lHip: -0.5, lKnee: -0.1, rHip: 0.5, rKnee: -0.3, lShoulder: 0.3, rShoulder: -0.3, chest: -0.04 } },
      { t: 0.75, pose: { lHip: -0.1, lKnee: -0.1, rHip: 0.1, rKnee: -0.9, lShoulder: 0.1, rShoulder: -0.1, chest: 0 } },
    ],
  },
  run: {
    label: 'Run',
    loop: true,
    cycleDuration: 0.5,
    strideX: 68,
    frames: [
      { t: 0, pose: { lHip: 0.95, lKnee: -1.2, rHip: -0.85, rKnee: -0.15, lShoulder: -0.8, rShoulder: 0.8, lElbow: -1.3, rElbow: -1.3, chest: 0.18, head: -0.05 } },
      { t: 0.25, pose: { lHip: -0.85, lKnee: -0.15, rHip: 0.95, rKnee: -1.2, lShoulder: 0.8, rShoulder: -0.8, lElbow: -1.3, rElbow: -1.3, chest: -0.18, head: -0.05 } },
    ],
  },
  sit: {
    label: 'Sit',
    loop: false,
    cycleDuration: 0.5,
    frames: [
      { t: 0, pose: {} },
      { t: 0.5, pose: { hips: 0.08, lHip: 0.95, lKnee: -1.5, rHip: 0.95, rKnee: -1.5, chest: 0.12, lShoulder: 0.15, rShoulder: -0.15 } },
    ],
  },
  jumpscare: {
    label: 'Jump Scare',
    loop: false,
    cycleDuration: 0.6,
    frames: [
      { t: 0, pose: {} },
      { t: 0.15, pose: { chest: -0.28, head: -0.22, lShoulder: -0.5, rShoulder: 0.5, lElbow: -0.3, rElbow: 0.3 } },
      { t: 0.3, pose: { chest: 0.38, head: 0.18, lShoulder: -1.5, rShoulder: 1.5, lElbow: -1.7, rElbow: 1.7, lHand: -0.4, rHand: 0.4 } },
      { t: 0.6, pose: { chest: 0.12, head: 0.06, lShoulder: -0.9, rShoulder: 0.9, lElbow: -1.1, rElbow: 1.1 } },
    ],
  },
};

export const ACTION_PRESET_LIST = Object.keys(ACTION_PRESETS);
