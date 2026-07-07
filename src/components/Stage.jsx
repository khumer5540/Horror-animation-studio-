import { useEffect, useRef, useCallback, useState } from 'react';
import {
  computeCharacterWorld,
  drawBuiltInCharacter,
  drawCustomCharacter,
  drawSkeletonOverlay,
  getRootJointId,
  computeSeverPayload,
  computeReattachPayload,
} from '../engine/renderCharacter.js';
import { solveLocalAngleForTarget } from '../engine/skeleton.js';
import { DRAGGABLE_JOINTS, HUMANOID_BONES } from '../data/rigTypes.js';
import { PROP_TYPES } from '../data/props.js';

const HIT_PX = 22; // generous enough for a fingertip, not just a mouse cursor
const BG_THEMES = {
  crypt: ['#0b0810', '#1c1420'],
  fog: ['#141821', '#26303f'],
  blood: ['#1a0508', '#3a0a10'],
  void: ['#000000', '#0a0a0a'],
};

// Draws `img` to fill (dw x dh) exactly, cropping instead of stretching —
// the canvas equivalent of CSS `background-size: cover`.
function drawImageCover(ctx, img, dw, dh) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const imageRatio = iw / ih;
  const destRatio = dw / dh;
  let sx = 0;
  let sy = 0;
  let sw = iw;
  let sh = ih;
  if (imageRatio > destRatio) {
    sw = ih * destRatio;
    sx = (iw - sw) / 2;
  } else {
    sh = iw / destRatio;
    sy = (ih - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
}

function drawLightingOverlays(ctx, lighting, w, h) {
  if (lighting?.vignette) {
    const cx = w / 2;
    const cy = h / 2;
    const outer = Math.hypot(cx, cy);
    const vg = ctx.createRadialGradient(cx, cy, outer * 0.35, cx, cy, outer);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
  if (lighting?.flicker) {
    const t = performance.now() / 1000;
    let alpha = 0.1 + 0.06 * Math.sin(t * 14) + 0.05 * Math.sin(t * 31 + 1.3);
    if (Math.random() < 0.02) alpha += 0.3; // occasional deeper dip, like a failing tube light
    alpha = Math.max(0, Math.min(0.6, alpha));
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(0, 0, w, h);
  }
}

export default function Stage({ state, dispatch }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const dragRef = useRef(null); // { mode, ... }
  const stateRef = useRef(state);
  stateRef.current = state;
  const [contextMenu, setContextMenu] = useState(null); // { sx, sy, characterId, jointId, isSevered }

  const getWorldPoint = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const { camera } = stateRef.current;
    const worldX = (sx - rect.width / 2) / camera.zoom + camera.x;
    const worldY = (sy - rect.height / 2) / camera.zoom + camera.y;
    return { x: worldX, y: worldY, sx, sy, rectW: rect.width, rectH: rect.height };
  }, []);

  function propRadius(prop) {
    if (prop.propType === 'custom-image') return Math.max(prop.width, prop.height) / 2;
    return (PROP_TYPES[prop.propType]?.size || 60) / 2;
  }

  function propWorldTransform(prop, worldMap) {
    if (prop.attachedTo) {
      const charWorld = worldMap.get(prop.attachedTo.characterId);
      const jointWorld = charWorld?.get(prop.attachedTo.jointId);
      if (jointWorld) {
        return { x: jointWorld.x, y: jointWorld.y, rotation: jointWorld.worldAngle + prop.rotation };
      }
    }
    return { x: prop.x, y: prop.y, rotation: prop.rotation };
  }

  // ---- Draw ----
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (state.settings.backgroundImage) {
      drawImageCover(ctx, state.settings.backgroundImage, rect.width, rect.height);
    } else {
      const [c1, c2] = BG_THEMES[state.settings.background] || BG_THEMES.crypt;
      const grad = ctx.createLinearGradient(0, 0, 0, rect.height);
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, rect.width, rect.height);
    }

    ctx.save();
    ctx.translate(rect.width / 2, rect.height / 2);
    ctx.scale(state.camera.zoom, state.camera.zoom);
    ctx.translate(-state.camera.x, -state.camera.y);

    // ground line
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2 / state.camera.zoom;
    ctx.beginPath();
    ctx.moveTo(-3000, 380);
    ctx.lineTo(3000, 380);
    ctx.stroke();

    const worldMap = new Map();
    state.characters.forEach((c) => worldMap.set(c.id, computeCharacterWorld(c, state.customRigs)));

    state.characters.forEach((c) => {
      const world = worldMap.get(c.id);
      const selected = state.selection?.type === 'character' && state.selection.id === c.id;
      if (c.kind === 'custom') drawCustomCharacter(ctx, c, world, state.customRigs);
      else drawBuiltInCharacter(ctx, c, world, selected);

      if (selected) {
        if (c.kind === 'custom') {
          drawSkeletonOverlay(ctx, c, world, state.customRigs, state.camera.zoom);
        } else {
          DRAGGABLE_JOINTS.forEach((jid) => {
            const p = world.get(jid);
            if (!p) return;
            const isSevered = !!(c.severed && c.severed[jid]);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5 / state.camera.zoom, 0, Math.PI * 2);
            ctx.fillStyle = isSevered ? 'rgba(255,215,107,0.9)' : 'rgba(57,255,106,0.85)';
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1 / state.camera.zoom;
            ctx.stroke();
          });
        }
      }
    });

    state.props.forEach((p) => {
      const t = propWorldTransform(p, worldMap);
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.rotation);
      ctx.scale(p.scale, p.scale);
      if (p.propType === 'custom-image' && p.image) {
        ctx.drawImage(p.image, -p.width / 2, -p.height / 2, p.width, p.height);
      } else if (PROP_TYPES[p.propType]) {
        PROP_TYPES[p.propType].draw(ctx);
      }
      ctx.restore();

      if (state.selection?.type === 'prop' && state.selection.id === p.id) {
        const r = propRadius(p) * p.scale;
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.rotation);
        ctx.strokeStyle = '#ff2e4d';
        ctx.setLineDash([5 / state.camera.zoom, 4 / state.camera.zoom]);
        ctx.lineWidth = 1.5 / state.camera.zoom;
        ctx.strokeRect(-r, -r, r * 2, r * 2);
        ctx.setLineDash([]);
        // rotate handle
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(0, -r - 22 / state.camera.zoom);
        ctx.stroke();
        ctx.fillStyle = '#39ff6a';
        ctx.beginPath();
        ctx.arc(0, -r - 22 / state.camera.zoom, 5 / state.camera.zoom, 0, Math.PI * 2);
        ctx.fill();
        // scale handle
        ctx.fillStyle = '#ffd76b';
        ctx.fillRect(r - 5 / state.camera.zoom, r - 5 / state.camera.zoom, 10 / state.camera.zoom, 10 / state.camera.zoom);
        ctx.restore();
      }
    });

    ctx.restore();

    drawLightingOverlays(ctx, state.lighting, rect.width, rect.height);
  }, [state]);

  useEffect(() => {
    let raf;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  // ---- Playback ----
  useEffect(() => {
    if (!state.timeline.playing) return undefined;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      const s = stateRef.current;
      let next = s.timeline.playhead + dt;
      if (next >= s.settings.duration) next -= s.settings.duration;
      dispatch({ type: 'SET_PLAYHEAD', time: next });
      dispatch({ type: 'APPLY_POSE_AT_TIME', time: next });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state.timeline.playing, dispatch]);

  // ---- Interaction ----
  function findJointHit(worldPoint) {
    const s = stateRef.current;
    for (let i = s.characters.length - 1; i >= 0; i -= 1) {
      const c = s.characters[i];
      const world = computeCharacterWorld(c, s.customRigs);
      const joints = c.kind === 'custom' ? (s.customRigs[c.customRigId]?.joints || []).map((j) => j.id) : DRAGGABLE_JOINTS;
      for (const jid of joints) {
        const p = world.get(jid);
        if (!p) continue;
        const d = Math.hypot(p.x - worldPoint.x, p.y - worldPoint.y);
        if (d < HIT_PX / s.camera.zoom) {
          const rootId = getRootJointId(c, s.customRigs);
          const isSevered = !!(c.severed && c.severed[jid]);
          return { characterId: c.id, jointId: jid, isRoot: jid === rootId, isSevered, world };
        }
      }
    }
    return null;
  }

  function findPropHit(worldPoint) {
    const s = stateRef.current;
    const worldMap = new Map();
    s.characters.forEach((c) => worldMap.set(c.id, computeCharacterWorld(c, s.customRigs)));
    for (let i = s.props.length - 1; i >= 0; i -= 1) {
      const p = s.props[i];
      const t = propWorldTransform(p, worldMap);
      const r = propRadius(p) * p.scale;
      const cos = Math.cos(-t.rotation);
      const sin = Math.sin(-t.rotation);
      const dx = worldPoint.x - t.x;
      const dy = worldPoint.y - t.y;
      const lx = dx * cos - dy * sin;
      const ly = dx * sin + dy * cos;
      if (state.selection?.type === 'prop' && state.selection.id === p.id) {
        const zoom = s.camera.zoom;
        if (Math.abs(lx) < 16 / zoom && ly < -r - 10 / zoom && ly > -r - 34 / zoom) return { propId: p.id, mode: 'rotate-prop', t };
        if (Math.abs(lx - r) < 18 / zoom && Math.abs(ly - r) < 18 / zoom) return { propId: p.id, mode: 'scale-prop', t };
      }
      if (Math.abs(lx) < r && Math.abs(ly) < r) return { propId: p.id, mode: 'move-prop', t };
    }
    return null;
  }

  function handlePointerDown(e) {
    if (e.button !== 0) return; // right/middle click: handled by onContextMenu instead
    // Pointer capture keeps move/up events routed to the canvas even once the
    // pointer travels outside its bounds — essential for fast touch drags,
    // which otherwise silently stop delivering pointermove past the edge.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const wp = getWorldPoint(e.clientX, e.clientY);
    const jointHit = findJointHit(wp);
    if (jointHit) {
      // One undo checkpoint per whole drag gesture, not per pointermove —
      // UPDATE_CHARACTER_POSE dispatches during the drag itself are transient.
      dispatch({ type: 'BEGIN_INTERACTION' });
      dispatch({ type: 'SELECT', selection: { type: 'character', id: jointHit.characterId } });
      const mode = jointHit.isRoot ? 'move-character' : jointHit.isSevered ? 'move-severed-joint' : 'rotate-joint';
      dragRef.current = { mode, ...jointHit, startWorld: wp };
      return;
    }
    const propHit = findPropHit(wp);
    if (propHit) {
      dispatch({ type: 'BEGIN_INTERACTION' });
      if (propHit.mode === 'move-prop') dispatch({ type: 'SELECT', selection: { type: 'prop', id: propHit.propId } });
      dragRef.current = { ...propHit, startWorld: wp };
      return;
    }
    dispatch({ type: 'SELECT', selection: null });
    dragRef.current = { mode: 'pan', lastClientX: e.clientX, lastClientY: e.clientY };
  }

  function handlePointerMove(e) {
    const drag = dragRef.current;
    if (!drag) return;
    e.preventDefault();
    const s = stateRef.current;

    if (drag.mode === 'pan') {
      const dx = e.clientX - drag.lastClientX;
      const dy = e.clientY - drag.lastClientY;
      drag.lastClientX = e.clientX;
      drag.lastClientY = e.clientY;
      dispatch({ type: 'SET_CAMERA', patch: { x: s.camera.x - dx / s.camera.zoom, y: s.camera.y - dy / s.camera.zoom } });
      return;
    }

    const wp = getWorldPoint(e.clientX, e.clientY);

    if (drag.mode === 'move-character') {
      dispatch({ type: 'UPDATE_CHARACTER_POSE', id: drag.characterId, x: wp.x, y: wp.y });
      return;
    }
    if (drag.mode === 'rotate-joint') {
      const c = s.characters.find((ch) => ch.id === drag.characterId);
      const world = computeCharacterWorld(c, s.customRigs);
      const defs = c.kind === 'custom' ? s.customRigs[c.customRigId]?.boneDefs : HUMANOID_BONES;
      const parentId = defs.find((d) => d.id === drag.jointId)?.parentId;
      const parentWorld = parentId ? world.get(parentId) : world.get(drag.jointId);
      const localAngle = solveLocalAngleForTarget(parentWorld, wp);
      dispatch({ type: 'UPDATE_CHARACTER_POSE', id: drag.characterId, bones: { [drag.jointId]: localAngle } });
      return;
    }
    if (drag.mode === 'move-severed-joint') {
      dispatch({ type: 'UPDATE_CHARACTER_POSE', id: drag.characterId, severed: { [drag.jointId]: { x: wp.x, y: wp.y } } });
      return;
    }
    if (drag.mode === 'move-prop') {
      const prop = s.props.find((p) => p.id === drag.propId);
      if (prop?.attachedTo) return;
      dispatch({ type: 'UPDATE_PROP', id: drag.propId, patch: { x: wp.x, y: wp.y } });
      return;
    }
    if (drag.mode === 'rotate-prop') {
      const angle = Math.atan2(wp.y - drag.t.y, wp.x - drag.t.x) + Math.PI / 2;
      dispatch({ type: 'UPDATE_PROP', id: drag.propId, patch: { rotation: angle } });
      return;
    }
    if (drag.mode === 'scale-prop') {
      const dist = Math.hypot(wp.x - drag.t.x, wp.y - drag.t.y);
      const prop = s.props.find((p) => p.id === drag.propId);
      const baseR = propRadius(prop);
      const scale = Math.max(0.2, Math.min(6, dist / (baseR * Math.SQRT2)));
      dispatch({ type: 'UPDATE_PROP', id: drag.propId, patch: { scale } });
    }
  }

  function handlePointerUp(e) {
    if (e?.currentTarget?.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  }

  function handleContextMenu(e) {
    e.preventDefault();
    const wp = getWorldPoint(e.clientX, e.clientY);
    const hit = findJointHit(wp);
    if (!hit || hit.isRoot) {
      setContextMenu(null);
      return;
    }
    setContextMenu({ sx: wp.sx, sy: wp.sy, characterId: hit.characterId, jointId: hit.jointId, isSevered: hit.isSevered });
  }

  function handleSever() {
    if (!contextMenu) return;
    const s = stateRef.current;
    const character = s.characters.find((c) => c.id === contextMenu.characterId);
    if (!character) return setContextMenu(null);
    const payload = computeSeverPayload(character, s.customRigs, contextMenu.jointId);
    if (payload) {
      dispatch({ type: 'SEVER_JOINT', id: character.id, jointId: contextMenu.jointId, x: payload.x, y: payload.y, angle: payload.angle });
    }
    setContextMenu(null);
  }

  function handleReattach() {
    if (!contextMenu) return;
    const s = stateRef.current;
    const character = s.characters.find((c) => c.id === contextMenu.characterId);
    if (!character) return setContextMenu(null);
    const payload = computeReattachPayload(character, s.customRigs, contextMenu.jointId);
    if (payload) {
      dispatch({ type: 'REATTACH_JOINT', id: character.id, jointId: contextMenu.jointId, angle: payload.angle });
    }
    setContextMenu(null);
  }

  useEffect(() => {
    if (!contextMenu) return undefined;
    function onDown(e) {
      if (e.target.closest?.('.stage-context-menu')) return;
      setContextMenu(null);
    }
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [contextMenu]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    function handleWheel(e) {
      e.preventDefault();
      const s = stateRef.current;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const worldBeforeX = (sx - rect.width / 2) / s.camera.zoom + s.camera.x;
      const worldBeforeY = (sy - rect.height / 2) / s.camera.zoom + s.camera.y;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newZoom = Math.max(0.3, Math.min(6, s.camera.zoom * factor));
      const newX = worldBeforeX - (sx - rect.width / 2) / newZoom;
      const newY = worldBeforeY - (sy - rect.height / 2) / newZoom;
      dispatch({ type: 'SET_CAMERA', patch: { zoom: newZoom, x: newX, y: newY } });
    }
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [dispatch]);

  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      const sel = stateRef.current.selection;
      if (!sel) return;
      if (sel.type === 'character') dispatch({ type: 'DELETE_CHARACTER', id: sel.id });
      else if (sel.type === 'prop') dispatch({ type: 'DELETE_PROP', id: sel.id });
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  return (
    <div className="stage-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="stage-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={handleContextMenu}
      />
      <div className="zoom-indicator">{Math.round(state.camera.zoom * 100)}%</div>
      {contextMenu && (
        <div className="stage-context-menu" style={{ left: contextMenu.sx, top: contextMenu.sy }}>
          {contextMenu.isSevered ? (
            <button onClick={handleReattach}>🔗 Reattach Bone</button>
          ) : (
            <button onClick={handleSever}>✂️ Sever Bone</button>
          )}
        </div>
      )}
    </div>
  );
}
