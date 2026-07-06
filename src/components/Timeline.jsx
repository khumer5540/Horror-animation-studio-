import { useRef } from 'react';
import { captureEntityData } from '../state/project.js';

function labelFor(state, targetType, targetId) {
  if (targetType === 'camera') return 'Camera';
  if (targetType === 'character') {
    const c = state.characters.find((ch) => ch.id === targetId);
    if (!c) return 'Character (deleted)';
    return c.kind === 'custom' ? `Rig: ${state.customRigs[c.customRigId]?.name || 'Custom'}` : `Char: ${c.rigType}`;
  }
  const p = state.props.find((pr) => pr.id === targetId);
  return p ? `Prop: ${p.propType}` : 'Prop (deleted)';
}

export default function Timeline({ state, dispatch }) {
  const rulerRef = useRef(null);
  const { duration, fps } = state.settings;
  const { playhead, playing, tracks } = state.timeline;

  function timeFromClientX(clientX) {
    const rect = rulerRef.current.getBoundingClientRect();
    const t = ((clientX - rect.left) / rect.width) * duration;
    return Math.max(0, Math.min(duration, t));
  }

  function scrubTo(clientX) {
    const t = timeFromClientX(clientX);
    dispatch({ type: 'SET_PLAYHEAD', time: t });
    dispatch({ type: 'APPLY_POSE_AT_TIME', time: t });
  }

  function handleRulerDown(e) {
    dispatch({ type: 'SET_PLAYING', playing: false });
    scrubTo(e.clientX);
    function onMove(ev) { scrubTo(ev.clientX); }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function addKeyframeFor(targetType, targetId) {
    const data = captureEntityData(state, targetType, targetId);
    if (!data) return;
    dispatch({ type: 'ADD_KEYFRAME', targetType, targetId, time: playhead, data });
  }

  const sel = state.selection;

  return (
    <div className="timeline">
      <div className="timeline-toolbar">
        <button className="btn-icon" onClick={() => dispatch({ type: 'SET_PLAYING', playing: !playing })}>
          {playing ? '⏸' : '▶'}
        </button>
        <span className="time-readout">{playhead.toFixed(2)}s / {duration}s</span>
        <label>
          FPS
          <select value={fps} onChange={(e) => dispatch({ type: 'SET_SETTINGS', patch: { fps: Number(e.target.value) } })}>
            <option value={24}>24</option>
            <option value={30}>30</option>
          </select>
        </label>
        <label>
          Duration
          <input
            type="number"
            min={1}
            max={60}
            value={duration}
            onChange={(e) => dispatch({ type: 'SET_SETTINGS', patch: { duration: Number(e.target.value) } })}
          />
        </label>
        <button className="btn-ghost" onClick={() => addKeyframeFor('camera', null)}>◆ Key Camera</button>
        {sel && (
          <button className="btn-ghost accent" onClick={() => addKeyframeFor(sel.type, sel.id)}>
            ◆ Key Selected
          </button>
        )}
      </div>

      <div className="timeline-ruler" ref={rulerRef} onPointerDown={handleRulerDown}>
        {Array.from({ length: Math.floor(duration) + 1 }).map((_, i) => (
          <div key={i} className="ruler-tick" style={{ left: `${(i / duration) * 100}%` }}>{i}s</div>
        ))}
        <div className="playhead" style={{ left: `${(playhead / duration) * 100}%` }} />
      </div>

      <div className="timeline-tracks">
        {Object.entries(tracks).length === 0 && <p className="hint">No keyframes yet. Pose a character or prop, then click "Key Selected" (or "Key Camera").</p>}
        {Object.entries(tracks).map(([key, track]) => (
          <div className="track-row" key={key}>
            <div className="track-label">{labelFor(state, track.targetType, track.targetId)}</div>
            <div className="track-lane">
              {track.keyframes.map((kf) => (
                <div
                  key={kf.time}
                  className="keyframe-diamond"
                  style={{ left: `${(kf.time / duration) * 100}%` }}
                  title={`t=${kf.time}s (double-click to delete)`}
                  onDoubleClick={() => dispatch({ type: 'DELETE_KEYFRAME', targetType: track.targetType, targetId: track.targetId, time: kf.time })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
