import { useState } from 'react';
import { PROP_CATEGORIES, getPropsByCategory } from '../data/props.js';

const CATEGORY_LABEL = {
  effects: 'Effects',
  weapons: 'Weapons',
  objects: 'Objects',
  environment: 'Environment',
  lighting: 'Lighting',
};

const TABS = [...PROP_CATEGORIES, 'lighting'];

export default function PropsPanel({ state, dispatch }) {
  const [category, setCategory] = useState('effects');
  const isLighting = category === 'lighting';
  const items = isLighting ? [] : getPropsByCategory(category);

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

  return (
    <div className="panel props-panel">
      <div className="panel-tabs">
        {TABS.map((cat) => (
          <button key={cat} className={cat === category ? 'tab active' : 'tab'} onClick={() => setCategory(cat)}>
            {CATEGORY_LABEL[cat]}
          </button>
        ))}
      </div>

      {isLighting ? (
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
      ) : (
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
