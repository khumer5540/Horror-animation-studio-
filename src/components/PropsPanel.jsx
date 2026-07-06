import { useState } from 'react';
import { PROP_CATEGORIES, getPropsByCategory } from '../data/props.js';

const CATEGORY_LABEL = {
  effects: 'Effects',
  weapons: 'Weapons',
  objects: 'Objects',
  environment: 'Environment',
};

export default function PropsPanel({ state, dispatch }) {
  const [category, setCategory] = useState('effects');
  const items = getPropsByCategory(category);

  function addProp(propType) {
    dispatch({
      type: 'ADD_PROP',
      propType,
      x: state.camera.x + (Math.random() * 80 - 40),
      y: state.camera.y + (Math.random() * 80 - 40),
    });
  }

  return (
    <div className="panel props-panel">
      <div className="panel-tabs">
        {PROP_CATEGORIES.map((cat) => (
          <button key={cat} className={cat === category ? 'tab active' : 'tab'} onClick={() => setCategory(cat)}>
            {CATEGORY_LABEL[cat]}
          </button>
        ))}
      </div>
      <div className="prop-grid">
        {items.map((p) => (
          <button key={p.id} className="prop-tile" onClick={() => addProp(p.id)} title={p.label}>
            <PropThumb draw={p.draw} />
            <span>{p.label}</span>
          </button>
        ))}
      </div>
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
