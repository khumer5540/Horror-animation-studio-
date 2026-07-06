import { useEffect, useRef, useCallback } from 'react';
import { computeCharacterWorld, drawBuiltInCharacter, drawCustomCharacter } from '../engine/renderCharacter.js';
import { solveLocalAngleForTarget } from '../engine/skeleton.js';
import { DRAGGABLE_JOINTS, HUMANOID_BONES } from '../data/rigTypes.js';
import { PROP_TYPES } from '../data/props.js';

const HIT_PX = 15;
const BG_THEMES = {
  crypt: ['#0b0810', '#1c1420'],
  fog: ['#141821', '#26303f'],
  blood: ['#1a0508', '#3a0a10'],
  void: ['#000000', '#0a0a0a'],
};

export default function Stage({ state, dispatch }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const dragRef = useRef(null); // { mode, ... }
  const stateRef = useRef(state);
  stateRef.current = state;

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

    const [c1, c2] = BG_THEMES[state.settings.background] || BG_THEMES.crypt;
    const grad = ctx.createLinearGradient(0, 0, 0, rect.height);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, rect.width, rect.height);

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
        const joints = c.kind === 'custom' ? (state.customRigs[c.customRigId]?.joints || []).map((j) => j.id) : DRAGGABLE_JOINTS;
        joints.forEach((jid) => {
          const p = world.get(jid);
          if (!p) return;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5 / state.camera.zoom, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(57,255,106,0.85)';
          ctx.fill();
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1 / state.camera.zoom;
          ctx.stroke();
        });
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
          const rootId = c.kind === 'custom' ? s.customRigs[c.customRigId]?.rootId : 'hips';
          return { characterId: c.id, jointId: jid, isRoot: jid === rootId, world };
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
        if (Math.abs(lx) < 10 / zoom && ly < -r - 12 / zoom && ly > -r - 32 / zoom) return { propId: p.id, mode: 'rotate-prop', t };
        if (Math.abs(lx - r) < 12 / zoom && Math.abs(ly - r) < 12 / zoom) return { propId: p.id, mode: 'scale-prop', t };
      }
      if (Math.abs(lx) < r && Math.abs(ly) < r) return { propId: p.id, mode: 'move-prop', t };
    }
    return null;
  }

  function handlePointerDown(e) {
    const wp = getWorldPoint(e.clientX, e.clientY);
    const jointHit = findJointHit(wp);
    if (jointHit) {
      dispatch({ type: 'SELECT', selection: { type: 'character', id: jointHit.characterId } });
      dragRef.current = { mode: jointHit.isRoot ? 'move-character' : 'rotate-joint', ...jointHit, startWorld: wp };
      return;
    }
    const propHit = findPropHit(wp);
    if (propHit) {
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

  function handlePointerUp() {
    dragRef.current = null;
  }

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
      />
      <div className="zoom-indicator">{Math.round(state.camera.zoom * 100)}%</div>
    </div>
  );
}
