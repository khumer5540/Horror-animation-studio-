import { POSE_PRESETS, DRAGGABLE_JOINTS, RIG_TYPES } from '../data/rigTypes.js';
import { computeReattachPayload } from '../engine/renderCharacter.js';
import { ACTION_PRESETS, ACTION_PRESET_LIST } from '../data/actionPresets.js';
import { generateActionKeyframes } from '../engine/actionGen.js';
import { DEFAULT_DEFORM } from '../state/project.js';

const PRESET_LABEL = {
  stand: 'Stand', wave: 'Wave', punch: 'Punch', kick: 'Kick', float: 'Float', crouch: 'Crouch',
};

const ACTION_ICON = { walk: '🚶', run: '🏃', sit: '🪑', jumpscare: '👻' };

function humanizeJointId(id) {
  if (id.length > 1 && (id[0] === 'l' || id[0] === 'r') && id[1] === id[1].toUpperCase()) {
    return `${id[0].toUpperCase()} ${id.slice(1)}`;
  }
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export default function PosePanel({ state, dispatch }) {
  const sel = state.selection;

  if (!sel) {
    return (
      <div className="panel pose-panel">
        <h3>Inspector</h3>
        <p className="hint">Select a character or prop on the stage to pose, attach, or delete it.</p>
        <p className="hint">Drag on empty stage to pan the camera. Scroll to zoom — camera zoom is itself keyframeable (Key Camera).</p>
      </div>
    );
  }

  if (sel.type === 'character') {
    const c = state.characters.find((ch) => ch.id === sel.id);
    if (!c) return null;
    const isCustom = c.kind === 'custom';
    const rig = isCustom ? state.customRigs[c.customRigId] : null;
    const style = isCustom ? null : RIG_TYPES[c.rigType];
    const joints = isCustom ? rig?.joints.map((j) => j.id) : DRAGGABLE_JOINTS;
    const jointLabel = (jointId) => (isCustom ? rig?.joints.find((j) => j.id === jointId)?.label || jointId : humanizeJointId(jointId));
    const severedIds = Object.keys(c.severed || {});

    function reattach(jointId) {
      const payload = computeReattachPayload(c, state.customRigs, jointId);
      if (payload) dispatch({ type: 'REATTACH_JOINT', id: c.id, jointId, angle: payload.angle });
    }

    function applyAction(key) {
      const preset = ACTION_PRESETS[key];
      const frames = generateActionKeyframes(preset, c, state.timeline.playhead, state.settings.duration);
      if (frames.length === 0) return;
      dispatch({ type: 'APPLY_ACTION_PRESET', id: c.id, frames });
    }

    const deform = c.deform || DEFAULT_DEFORM;
    function setDeform(patch) {
      dispatch({ type: 'SET_CHARACTER_DEFORM', id: c.id, patch });
    }

    return (
      <div className="panel pose-panel">
        <h3>{isCustom ? rig?.name : style?.label}</h3>
        {!isCustom && (
          <div className="preset-grid">
            {Object.keys(POSE_PRESETS).map((key) => (
              <button key={key} className="btn-ghost" onClick={() => dispatch({ type: 'APPLY_POSE_PRESET', id: c.id, pose: POSE_PRESETS[key] })}>
                {PRESET_LABEL[key]}
              </button>
            ))}
          </div>
        )}
        <p className="hint">{joints?.length || 0} draggable joints. Drag any glowing pin on the stage to pose. Right-click a joint to Sever/Reattach it.</p>

        <h4>Actions</h4>
        <div className="preset-grid">
          {ACTION_PRESET_LIST.map((key) => (
            <button key={key} className="btn-ghost" title={`Bakes a ${ACTION_PRESETS[key].label} sequence into keyframes starting at the playhead`} onClick={() => applyAction(key)}>
              {ACTION_ICON[key]} {ACTION_PRESETS[key].label}
            </button>
          ))}
        </div>
        <p className="hint">Injects real keyframes starting at the playhead — scrub or edit them like any other animation.</p>

        <h4>Deform</h4>
        <label className="field">
          Belly Size
          <input type="range" min={0} max={1} step={0.02} value={deform.belly} onChange={(e) => setDeform({ belly: Number(e.target.value) })} />
        </label>
        <label className="field">
          Height / Stretch
          <input type="range" min={0.5} max={1.8} step={0.02} value={deform.stretch} onChange={(e) => setDeform({ stretch: Number(e.target.value) })} />
        </label>
        <label className="field">
          Warp
          <input type="range" min={-1} max={1} step={0.02} value={deform.warp} onChange={(e) => setDeform({ warp: Number(e.target.value) })} />
        </label>
        <p className="hint">Deform is keyframeable too — click "Key Selected" to bake a shape tween.</p>

        {severedIds.length > 0 && (
          <>
            <h4>Severed Joints</h4>
            <div className="severed-list">
              {severedIds.map((jointId) => (
                <div key={jointId} className="severed-row">
                  <span>{jointLabel(jointId)}</span>
                  <button className="btn-ghost small" onClick={() => reattach(jointId)}>Reattach</button>
                </div>
              ))}
            </div>
          </>
        )}

        <button className="btn-danger" onClick={() => dispatch({ type: 'DELETE_CHARACTER', id: c.id })}>Delete Character</button>
      </div>
    );
  }

  if (sel.type === 'prop') {
    const p = state.props.find((pr) => pr.id === sel.id);
    if (!p) return null;
    return (
      <div className="panel pose-panel">
        <h3>{p.propType === 'custom-image' ? 'Custom Prop' : p.propType}</h3>
        <label className="field">
          Scale
          <input type="range" min={0.2} max={4} step={0.05} value={p.scale} onChange={(e) => dispatch({ type: 'UPDATE_PROP', id: p.id, patch: { scale: Number(e.target.value) } })} />
        </label>
        <label className="field">
          Rotation
          <input type="range" min={-3.14} max={3.14} step={0.02} value={p.rotation} onChange={(e) => dispatch({ type: 'UPDATE_PROP', id: p.id, patch: { rotation: Number(e.target.value) } })} />
        </label>

        <h4>Attach to Hand</h4>
        {p.attachedTo ? (
          <button className="btn-ghost" onClick={() => dispatch({ type: 'DETACH_PROP', id: p.id })}>
            Detach (currently attached)
          </button>
        ) : (
          <AttachControls state={state} prop={p} dispatch={dispatch} />
        )}

        <button className="btn-danger" onClick={() => dispatch({ type: 'DELETE_PROP', id: p.id })}>Delete Prop</button>
      </div>
    );
  }

  return null;
}

function AttachControls({ state, prop, dispatch }) {
  if (state.characters.length === 0) return <p className="hint">Add a character first.</p>;
  return (
    <div className="attach-controls">
      {state.characters.map((c) => {
        const isCustom = c.kind === 'custom';
        const rig = isCustom ? state.customRigs[c.customRigId] : null;
        const joints = isCustom ? rig?.joints || [] : [{ id: 'lHand', name: 'Left Hand' }, { id: 'rHand', name: 'Right Hand' }];
        const name = isCustom ? rig?.name : RIG_TYPE_NAME(c.rigType);
        return (
          <div key={c.id} className="attach-row">
            <span>{name}</span>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) dispatch({ type: 'ATTACH_PROP', id: prop.id, characterId: c.id, jointId: e.target.value });
              }}
            >
              <option value="" disabled>attach to…</option>
              {joints.map((j) => (
                <option key={j.id} value={j.id}>{j.name || j.label || j.id}</option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}

function RIG_TYPE_NAME(rigType) {
  return RIG_TYPES[rigType]?.label || rigType;
}
