import { uid } from '../utils/id.js';
import { sampleTrack } from '../engine/tween.js';

export function createInitialProject() {
  return {
    settings: { fps: 24, duration: 10, resolution: '1080p', background: 'crypt', backgroundImage: null },
    characters: [],
    props: [],
    customRigs: {},
    camera: { x: 300, y: 220, zoom: 1 },
    selection: null, // { type: 'character'|'prop', id }
    lighting: { vignette: false, flicker: false },
    audio: { src: null, name: null },
    timeline: {
      playhead: 0,
      playing: false,
      onionSkin: false,
      tracks: {}, // key `${type}:${id}` -> { targetType, targetId, keyframes: [{time,data}] }
    },
  };
}

export const DEFAULT_DEFORM = { belly: 0, stretch: 1, warp: 0 };

function trackKey(targetType, targetId) {
  return `${targetType}:${targetId}`;
}

function cloneBones(bones) {
  return { ...(bones || {}) };
}

export function projectReducer(state, action) {
  switch (action.type) {
    case 'ADD_CHARACTER': {
      const char = {
        id: uid('char'),
        kind: 'built-in',
        rigType: action.rigType,
        x: action.x ?? 200 + state.characters.length * 60,
        y: action.y ?? 300,
        bones: {},
        severed: {},
        deform: { ...DEFAULT_DEFORM },
      };
      return { ...state, characters: [...state.characters, char], selection: { type: 'character', id: char.id } };
    }
    case 'ADD_CUSTOM_CHARACTER': {
      const char = {
        id: uid('char'),
        kind: 'custom',
        customRigId: action.customRigId,
        x: action.x ?? 300,
        y: action.y ?? 300,
        bones: {},
        severed: {},
        deform: { ...DEFAULT_DEFORM },
      };
      return { ...state, characters: [...state.characters, char], selection: { type: 'character', id: char.id } };
    }
    case 'SAVE_CUSTOM_RIG': {
      const rig = action.rig;
      return { ...state, customRigs: { ...state.customRigs, [rig.id]: rig } };
    }
    case 'UPDATE_CHARACTER_POSE': {
      return {
        ...state,
        characters: state.characters.map((c) =>
          c.id === action.id
            ? {
                ...c,
                x: action.x ?? c.x,
                y: action.y ?? c.y,
                bones: action.bones ? { ...cloneBones(c.bones), ...action.bones } : c.bones,
                severed: action.severed ? { ...(c.severed || {}), ...action.severed } : c.severed,
                deform: action.deform ? { ...(c.deform || DEFAULT_DEFORM), ...action.deform } : c.deform,
              }
            : c
        ),
      };
    }
    case 'SET_CHARACTER_DEFORM': {
      return {
        ...state,
        characters: state.characters.map((c) =>
          c.id === action.id ? { ...c, deform: { ...(c.deform || DEFAULT_DEFORM), ...action.patch } } : c
        ),
      };
    }
    case 'APPLY_ACTION_PRESET': {
      const key = trackKey('character', action.id);
      const character = state.characters.find((c) => c.id === action.id);
      if (!character) return state;
      const existing = state.timeline.tracks[key] || { targetType: 'character', targetId: action.id, keyframes: [] };
      let keyframes = existing.keyframes.slice();
      action.frames.forEach((f) => {
        keyframes = keyframes.filter((k) => Math.abs(k.time - f.time) > 0.001);
        keyframes.push({ time: f.time, data: { x: f.x, y: f.y, bones: f.bones, severed: character.severed || {}, deform: character.deform || DEFAULT_DEFORM } });
      });
      keyframes.sort((a, b) => a.time - b.time);
      return {
        ...state,
        timeline: { ...state.timeline, tracks: { ...state.timeline.tracks, [key]: { ...existing, keyframes } } },
      };
    }
    case 'SEVER_JOINT': {
      return {
        ...state,
        characters: state.characters.map((c) =>
          c.id === action.id
            ? {
                ...c,
                severed: { ...(c.severed || {}), [action.jointId]: { x: action.x, y: action.y } },
                bones: { ...(c.bones || {}), [action.jointId]: action.angle },
              }
            : c
        ),
      };
    }
    case 'REATTACH_JOINT': {
      return {
        ...state,
        characters: state.characters.map((c) => {
          if (c.id !== action.id) return c;
          const severed = { ...(c.severed || {}) };
          delete severed[action.jointId];
          return { ...c, severed, bones: { ...(c.bones || {}), [action.jointId]: action.angle } };
        }),
      };
    }
    case 'APPLY_POSE_PRESET': {
      return {
        ...state,
        characters: state.characters.map((c) => (c.id === action.id ? { ...c, bones: { ...action.pose } } : c)),
      };
    }
    case 'DELETE_CHARACTER': {
      const key = trackKey('character', action.id);
      const tracks = { ...state.timeline.tracks };
      delete tracks[key];
      return {
        ...state,
        characters: state.characters.filter((c) => c.id !== action.id),
        props: state.props.map((p) => (p.attachedTo?.characterId === action.id ? { ...p, attachedTo: null } : p)),
        selection: state.selection?.id === action.id ? null : state.selection,
        timeline: { ...state.timeline, tracks },
      };
    }
    case 'ADD_PROP': {
      const prop = {
        id: uid('prop'),
        propType: action.propType,
        x: action.x ?? 400,
        y: action.y ?? 300,
        rotation: 0,
        scale: 1,
        attachedTo: null,
      };
      return { ...state, props: [...state.props, prop], selection: { type: 'prop', id: prop.id } };
    }
    case 'ADD_IMAGE_PROP': {
      const prop = {
        id: uid('prop'),
        propType: 'custom-image',
        image: action.image,
        width: action.width,
        height: action.height,
        x: action.x ?? 400,
        y: action.y ?? 300,
        rotation: 0,
        scale: action.scale ?? 1,
        attachedTo: null,
      };
      return { ...state, props: [...state.props, prop], selection: { type: 'prop', id: prop.id } };
    }
    case 'UPDATE_PROP': {
      return {
        ...state,
        props: state.props.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)),
      };
    }
    case 'ATTACH_PROP': {
      return {
        ...state,
        props: state.props.map((p) =>
          p.id === action.id ? { ...p, attachedTo: { characterId: action.characterId, jointId: action.jointId } } : p
        ),
      };
    }
    case 'DETACH_PROP': {
      return { ...state, props: state.props.map((p) => (p.id === action.id ? { ...p, attachedTo: null } : p)) };
    }
    case 'DELETE_PROP': {
      const key = trackKey('prop', action.id);
      const tracks = { ...state.timeline.tracks };
      delete tracks[key];
      return {
        ...state,
        props: state.props.filter((p) => p.id !== action.id),
        selection: state.selection?.id === action.id ? null : state.selection,
        timeline: { ...state.timeline, tracks },
      };
    }
    case 'SELECT': {
      return { ...state, selection: action.selection };
    }
    case 'SET_CAMERA': {
      return { ...state, camera: { ...state.camera, ...action.patch } };
    }
    case 'SET_PLAYHEAD': {
      return { ...state, timeline: { ...state.timeline, playhead: action.time } };
    }
    case 'SET_PLAYING': {
      return { ...state, timeline: { ...state.timeline, playing: action.playing } };
    }
    case 'SET_ONION_SKIN': {
      return { ...state, timeline: { ...state.timeline, onionSkin: action.enabled } };
    }
    case 'SET_SETTINGS': {
      return { ...state, settings: { ...state.settings, ...action.patch } };
    }
    case 'SET_BACKGROUND_IMAGE': {
      return { ...state, settings: { ...state.settings, backgroundImage: action.image } };
    }
    case 'SET_LIGHTING': {
      return { ...state, lighting: { ...state.lighting, ...action.patch } };
    }
    case 'SET_AUDIO_TRACK': {
      return { ...state, audio: { src: action.src, name: action.name } };
    }
    case 'ADD_KEYFRAME': {
      const key = trackKey(action.targetType, action.targetId);
      const existing = state.timeline.tracks[key] || { targetType: action.targetType, targetId: action.targetId, keyframes: [] };
      const time = Math.round(action.time * 100) / 100;
      const keyframes = existing.keyframes.filter((k) => Math.abs(k.time - time) > 0.001);
      keyframes.push({ time, data: action.data });
      keyframes.sort((a, b) => a.time - b.time);
      return {
        ...state,
        timeline: { ...state.timeline, tracks: { ...state.timeline.tracks, [key]: { ...existing, keyframes } } },
      };
    }
    case 'DELETE_KEYFRAME': {
      const key = trackKey(action.targetType, action.targetId);
      const existing = state.timeline.tracks[key];
      if (!existing) return state;
      const keyframes = existing.keyframes.filter((k) => Math.abs(k.time - action.time) > 0.001);
      const tracks = { ...state.timeline.tracks };
      if (keyframes.length === 0) delete tracks[key];
      else tracks[key] = { ...existing, keyframes };
      return { ...state, timeline: { ...state.timeline, tracks } };
    }
    case 'TOGGLE_KEYFRAME_VISIBILITY': {
      const key = trackKey(action.targetType, action.targetId);
      const existing = state.timeline.tracks[key];
      if (!existing) return state;
      const keyframes = existing.keyframes.map((k) =>
        Math.abs(k.time - action.time) > 0.001 ? k : { ...k, data: { ...k.data, visible: k.data.visible === false } }
      );
      return {
        ...state,
        timeline: { ...state.timeline, tracks: { ...state.timeline.tracks, [key]: { ...existing, keyframes } } },
      };
    }
    case 'APPLY_POSE_AT_TIME': {
      const time = action.time;
      let characters = state.characters;
      let props = state.props;
      let camera = state.camera;
      for (const key of Object.keys(state.timeline.tracks)) {
        const track = state.timeline.tracks[key];
        const data = sampleTrack(track.keyframes, time);
        if (!data) continue;
        if (track.targetType === 'character') {
          characters = characters.map((c) =>
            c.id === track.targetId
              ? { ...c, x: data.x, y: data.y, bones: { ...data.bones }, severed: { ...(data.severed || {}) }, deform: { ...(data.deform || c.deform || DEFAULT_DEFORM) } }
              : c
          );
        } else if (track.targetType === 'prop') {
          props = props.map((p) => (p.id === track.targetId ? { ...p, x: data.x, y: data.y, rotation: data.rotation, scale: data.scale } : p));
        } else if (track.targetType === 'camera') {
          camera = { x: data.x, y: data.y, zoom: data.zoom };
        }
      }
      return { ...state, characters, props, camera };
    }
    default:
      return state;
  }
}

export function captureEntityData(state, targetType, targetId) {
  if (targetType === 'character') {
    const c = state.characters.find((ch) => ch.id === targetId);
    if (!c) return null;
    return { x: c.x, y: c.y, bones: { ...c.bones }, severed: { ...(c.severed || {}) }, deform: { ...(c.deform || DEFAULT_DEFORM) } };
  }
  if (targetType === 'prop') {
    const p = state.props.find((pr) => pr.id === targetId);
    if (!p) return null;
    return { x: p.x, y: p.y, rotation: p.rotation, scale: p.scale };
  }
  if (targetType === 'camera') {
    return { ...state.camera };
  }
  return null;
}
