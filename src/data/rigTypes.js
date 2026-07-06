import { UP, DOWN, LEFT, RIGHT } from '../engine/skeleton.js';

// Shared 14-joint humanoid chain (hips is root + implicit pelvis sockets for
// hips/shoulders). Bind pose expressed as intuitive world angles, then
// converted to local (parent-relative) angles below.
const WORLD_BIND = {
  hips: UP,
  chest: UP,
  neck: UP,
  head: UP,
  lShoulder: LEFT,
  lElbow: DOWN,
  lHand: DOWN,
  rShoulder: RIGHT,
  rElbow: DOWN,
  rHand: DOWN,
  lHip: DOWN + 0.25,
  lKnee: DOWN,
  lFoot: DOWN,
  rHip: DOWN - 0.25,
  rKnee: DOWN,
  rFoot: DOWN,
};

const PARENT = {
  hips: null,
  chest: 'hips',
  neck: 'chest',
  head: 'neck',
  lShoulder: 'chest',
  lElbow: 'lShoulder',
  lHand: 'lElbow',
  rShoulder: 'chest',
  rElbow: 'rShoulder',
  rHand: 'rElbow',
  lHip: 'hips',
  lKnee: 'lHip',
  lFoot: 'lKnee',
  rHip: 'hips',
  rKnee: 'rHip',
  rFoot: 'rKnee',
};

const LENGTH = {
  hips: 0,
  chest: 42,
  neck: 14,
  head: 16,
  lShoulder: 18,
  lElbow: 30,
  lHand: 26,
  rShoulder: 18,
  rElbow: 30,
  rHand: 26,
  lHip: 14,
  lKnee: 36,
  lFoot: 32,
  rHip: 14,
  rKnee: 36,
  rFoot: 32,
};

export const JOINT_ORDER = Object.keys(PARENT);

// Draggable joints exposed to the user (sockets/root excluded from direct drag
// noise, but still draggable if selected — kept simple: all are draggable).
export const DRAGGABLE_JOINTS = [
  'hips', 'chest', 'neck', 'head',
  'lElbow', 'lHand', 'rElbow', 'rHand',
  'lKnee', 'lFoot', 'rKnee', 'rFoot',
];

export function buildBoneDefs() {
  const worldByParent = {};
  const defs = [];
  for (const id of JOINT_ORDER) {
    const parentId = PARENT[id];
    const parentWorld = parentId ? worldByParent[parentId] : UP;
    const worldAngle = WORLD_BIND[id];
    const localAngle = parentId ? worldAngle - parentWorld : 0;
    worldByParent[id] = worldAngle;
    defs.push({ id, parentId, length: LENGTH[id], defaultLocalAngle: localAngle });
  }
  return defs;
}

export const HUMANOID_BONES = buildBoneDefs();

export const POSE_PRESETS = {
  stand: {},
  wave: { rShoulder: 0.1, rElbow: -1.6, rHand: -0.3 },
  punch: { rShoulder: -0.2, rElbow: 0.15, rHand: 0.05, chest: -0.15 },
  kick: { rHip: -0.9, rKnee: 0.9, lKnee: -0.2, chest: 0.15 },
  float: { lFoot: 0.1, rFoot: -0.1, head: -0.1 },
  crouch: { hips: 0.05, lHip: 0.4, lKnee: -1.1, rHip: 0.4, rKnee: -1.1, chest: 0.2 },
};

// Per-rig-type visual styling. The renderer (CharacterRenderer) reads this to
// decide colors, whether to draw legs as limbs or a flowing robe, and extras.
export const RIG_TYPES = {
  ghost: {
    label: 'Ghost',
    skin: 'rgba(226,238,255,0.85)',
    outline: 'rgba(150,200,255,0.9)',
    limbWidth: 10,
    robeLegs: true,
    robeColor: 'rgba(226,238,255,0.55)',
    eyeStyle: 'hollow',
    eyeColor: '#0a0a0f',
    accessory: 'none',
    glow: '#7fd6ff',
  },
  zombie: {
    label: 'Zombie',
    skin: '#6f8f4a',
    outline: '#2c3a1c',
    limbWidth: 13,
    robeLegs: false,
    eyeStyle: 'x',
    eyeColor: '#111',
    accessory: 'stitches',
    glow: '#8fff5c',
  },
  witch: {
    label: 'Witch',
    skin: '#c9b28c',
    outline: '#1a1015',
    limbWidth: 11,
    robeLegs: true,
    robeColor: 'rgba(30,10,40,0.92)',
    eyeStyle: 'glow',
    eyeColor: '#7cff6b',
    accessory: 'hat',
    glow: '#b060ff',
  },
  jinn: {
    label: 'Jinn',
    skin: '#3f6fae',
    outline: '#0d1b2e',
    limbWidth: 12,
    robeLegs: true,
    robeColor: 'rgba(60,110,190,0.35)',
    smokeTrail: true,
    eyeStyle: 'glow',
    eyeColor: '#ffd76b',
    accessory: 'turban',
    glow: '#5fd0ff',
  },
};

export const RIG_TYPE_LIST = Object.keys(RIG_TYPES);
