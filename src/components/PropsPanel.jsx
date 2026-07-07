import { useState } from 'react';
import { PROP_CATEGORIES, getPropsByCategory } from '../data/props.js';
import { SFX_LIBRARY } from '../data/sfx.js';

const CATEGORY_LABEL = {
  effects: 'Effects',
  weapons: 'Weapons',
  objects: 'Objects',
  environment: 'Environment',
  sounds: 'Sounds',
  lighting: 'Lighting',
};

const SFX_ICON = { heartbeat: '💓', jumpscare: '👻', creakingdoor: '🚪', wind: '🌬️' };

const TABS = [...PROP_CATEGORIES, 'sounds', 'lighting'];

export default function PropsPanel({ state, dispatch }) {
  const [category, setCategory] = useState('effects');
  const isLighting = category === 'lighting';
  const isSounds = category === 'sounds';
  const items = isLighting || isSounds ? [] : getPropsByCategory(category);

  function addProp(propType) {
    dispatch({
      type: 'ADD_PROP',
      propType,
      x: state.camera.x + (Math.random() * 80 - 40),
      y: state.camera.y + (Math.random() * 80 - 40),
    });
  }

  function toggleLighting(key) {
    dispatch({ type: 'SET_LIGHTING', patch: { [key]: !state.lighting[key] } });
  }

  function applySfx(sfx) {
    if (state.audio?.src?.startsWith('blob:')) URL.revokeObjectURL(state.audio.src);
    dispatch({ type: 'SET_AUDIO_TRACK', src: sfx.dataUri, name: sfx.label });
  }

  return (
    <div className="panel props-panel">
      <div className="panel-tabs">
        {TABS.map((cat) => (
          <button key={cat} className={cat === category ? 'tab active' : 'tab'} onClick={() => setCategory(cat)}>
            {CATEGORY_LABEL[cat]}
          </button>
        ))}
      </div>

      {isLighting && (
        <div className="lighting-panel">
          <label className="toggle-row">
            <span>Vignette</span>
            <span
              className={`toggle-switch ${state.lighting.vignette ? 'on' : ''}`}
              role="switch"
              aria-checked={state.lighting.vignette}
              onClick={() => toggleLighting('vignette')}
            />
          </label>
          <p className="hint">Darkens the edges of the screen, focusing attention on the center.</p>

          <label className="toggle-row">
            <span>Flicker</span>
            <span
              className={`toggle-switch ${state.lighting.flicker ? 'on' : ''}`}
              role="switch"
              aria-checked={state.lighting.flicker}
              onClick={() => toggleLighting('flicker')}
            />
          </label>
          <p className="hint">Simulates a broken, jittering light source over the whole scene.</p>
        </div>
      )}

      {isSounds && (
        <div className="sfx-list">
          <p className="hint">Click a sound to drop it into the Audio Track (replaces whatever's there now).</p>
          {SFX_LIBRARY.map((sfx) => (
            <button
              key={sfx.id}
              className={`sfx-tile ${state.audio?.name === sfx.label ? 'active' : ''}`}
              onClick={() => applySfx(sfx)}
            >
              <span className="sfx-icon">{SFX_ICON[sfx.id] || '🔊'}</span>
              <span>{sfx.label}</span>
            </button>
          ))}
          <p className="hint">Have your own file? Use "+ Add Audio" on the Audio Track in the timeline below instead.</p>
        </div>
      )}

      {!isLighting && !isSounds && (
        <div className="prop-grid">
          {items.map((p) => (
            <button key={p.id} className="prop-tile" onClick={() => addProp(p.id)} title={p.label}>
              <PropThumb draw={p.draw} />
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PropThumb({ draw }) {
  return (
    <canvas
      className="prop-thumb-canvas"
      width={48}
      height={48}
      ref={(el) => {
        if (!el) return;
        const ctx = el.getContext('2d');
        ctx.clearRect(0, 0, 48, 48);
        ctx.save();
        ctx.translate(24, 24);
        ctx.scale(0.55, 0.55);
        draw(ctx);
        ctx.restore();
      }}
    />
  );
}
