import { useRef, useEffect, useState } from 'react';
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

// Picks a "nice" tick spacing (1/2/5/10/15/30/60s, then minutes) so long
// scenes don't cram 60+ overlapping one-second labels onto the ruler.
const NICE_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900];
function pickTickStep(duration) {
  const target = duration / 12;
  return NICE_STEPS.find((step) => step >= target) ?? NICE_STEPS[NICE_STEPS.length - 1];
}
function formatTick(t) {
  if (t < 60) return `${t}s`;
  const m = Math.floor(t / 60);
  const s = t % 60;
  return s === 0 ? `${m}m` : `${m}m${s}s`;
}

export default function Timeline({ state, dispatch }) {
  const rulerRef = useRef(null);
  const audioRef = useRef(null);
  const audioFileInput = useRef(null);
  const settingsRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  const { duration, fps } = state.settings;
  const { playhead, playing, tracks } = state.timeline;
  const audio = state.audio;

  useEffect(() => {
    if (audioRef.current) audioRef.current.src = audio?.src || '';
  }, [audio?.src]);

  // Play/pause follows the timeline; seeking only happens while paused (a
  // scrub) or right as playback restarts from a loop, so real-time playback
  // doesn't fight the browser's own audio clock every frame.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !audio?.src) return;
    if (playing) {
      if (playhead < 0.05) el.currentTime = 0;
      if (el.paused) el.play().catch(() => {});
    } else {
      el.pause();
      el.currentTime = playhead;
    }
  }, [playing, playhead, audio?.src]);

  useEffect(() => {
    if (!showSettings) return undefined;
    function onDown(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
    }
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [showSettings]);

  function handleAudioFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (audio?.src) URL.revokeObjectURL(audio.src);
    dispatch({ type: 'SET_AUDIO_TRACK', src: URL.createObjectURL(file), name: file.name });
    e.target.value = '';
  }

  function clearAudio() {
    if (audio?.src) URL.revokeObjectURL(audio.src);
    dispatch({ type: 'SET_AUDIO_TRACK', src: null, name: null });
  }

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
    function onMove(ev) {
      ev.preventDefault();
      scrubTo(ev.clientX);
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    }
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  function addKeyframeFor(targetType, targetId) {
    const data = captureEntityData(state, targetType, targetId);
    if (!data) return;
    dispatch({ type: 'ADD_KEYFRAME', targetType, targetId, time: playhead, data });
  }

  const sel = state.selection;
  const cameraTrack = tracks['camera:null'];
  const entityTracks = Object.entries(tracks).filter(([key]) => key !== 'camera:null');
  const tickStep = pickTickStep(duration);
  const ticks = [];
  for (let t = 0; t <= duration + 1e-6; t += tickStep) ticks.push(Math.round(t * 100) / 100);

  return (
    <div className="timeline">
      <div className="timeline-toolbar">
        <button className="btn-icon" onClick={() => dispatch({ type: 'SET_PLAYING', playing: !playing })}>
          {playing ? '⏸' : '▶'}
        </button>
        <span className="time-readout">{playhead.toFixed(2)}s / {duration}s</span>

        <div className="scene-settings-wrap" ref={settingsRef}>
          <button className="btn-icon" title="Scene Settings" onClick={() => setShowSettings((v) => !v)}>⚙</button>
          {showSettings && (
            <div className="scene-settings-popover">
              <h4>Scene Settings</h4>
              <label className="field">
                FPS
                <select value={fps} onChange={(e) => dispatch({ type: 'SET_SETTINGS', patch: { fps: Number(e.target.value) } })}>
                  <option value={24}>24</option>
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                </select>
              </label>
              <label className="field">
                Scene Duration (seconds)
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={duration}
                  onChange={(e) => dispatch({ type: 'SET_SETTINGS', patch: { duration: Math.max(1, Number(e.target.value) || 1) } })}
                />
              </label>
            </div>
          )}
        </div>

        <button className="btn-ghost" onClick={() => addKeyframeFor('camera', null)}>◆ Key Camera</button>
        {sel && (
          <button className="btn-ghost accent" onClick={() => addKeyframeFor(sel.type, sel.id)}>
            ◆ Key Selected
          </button>
        )}
        <button
          className={`btn-icon ${state.timeline.onionSkin ? 'active' : ''}`}
          title="Onion Skin: ghost the previous/next frame at 30% opacity"
          onClick={() => dispatch({ type: 'SET_ONION_SKIN', enabled: !state.timeline.onionSkin })}
        >
          🧅
        </button>
      </div>

      <div className="timeline-ruler" ref={rulerRef} onPointerDown={handleRulerDown}>
        {ticks.map((t) => (
          <div key={t} className="ruler-tick" style={{ left: `${(t / duration) * 100}%` }}>{formatTick(t)}</div>
        ))}
        <div className="playhead" style={{ left: `${(playhead / duration) * 100}%` }} />
      </div>

      <div className="timeline-tracks">
        <div className="track-row audio-track-row">
          <div className="track-label">
            🔊 Audio
            {audio?.name && <button className="btn-ghost small" onClick={clearAudio}>✕</button>}
          </div>
          <div className="track-lane">
            {audio?.name ? (
              <div className="audio-clip" title={audio.name}>{audio.name}</div>
            ) : (
              <button className="btn-ghost small" onClick={() => audioFileInput.current.click()}>+ Add Audio</button>
            )}
          </div>
        </div>
        <input ref={audioFileInput} type="file" accept="audio/mpeg,audio/wav,audio/*" style={{ display: 'none' }} onChange={handleAudioFile} />
        <audio ref={audioRef} style={{ display: 'none' }} />

        <div className="track-row camera-track-row">
          <div className="track-label">🎥 Camera</div>
          <div className="track-lane">
            {(cameraTrack?.keyframes || []).map((kf) => (
              <div
                key={kf.time}
                className="keyframe-diamond"
                style={{ left: `${(kf.time / duration) * 100}%` }}
                title={`t=${kf.time}s (double-click to delete)`}
                onDoubleClick={() => dispatch({ type: 'DELETE_KEYFRAME', targetType: 'camera', targetId: null, time: kf.time })}
              />
            ))}
          </div>
        </div>

        {entityTracks.length === 0 && <p className="hint">No character/prop keyframes yet. Pose something, then click "Key Selected". Pan/zoom and click "Key Camera" for a V-Cam move.</p>}
        {entityTracks.map(([key, track]) => (
          <div className="track-row" key={key}>
            <div className="track-label">{labelFor(state, track.targetType, track.targetId)}</div>
            <div className="track-lane">
              {track.keyframes.map((kf) => (
                <div
                  key={kf.time}
                  className={`keyframe-diamond ${kf.data.visible === false ? 'hidden-key' : ''}`}
                  style={{ left: `${(kf.time / duration) * 100}%` }}
                  title={`t=${kf.time}s — click to toggle visibility, double-click to delete`}
                  onClick={() => dispatch({ type: 'TOGGLE_KEYFRAME_VISIBILITY', targetType: track.targetType, targetId: track.targetId, time: kf.time })}
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
