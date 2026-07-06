import { useRef } from 'react';
import { RIG_TYPE_LIST, RIG_TYPES } from '../data/rigTypes.js';

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export default function Toolbar({ state, dispatch, onOpenBoneEditor, onOpenExport }) {
  const staticPropInput = useRef(null);

  async function handleStaticPropFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      const el = await loadImage(dataUrl);
      const maxDim = 220;
      const scaleDown = Math.min(1, maxDim / Math.max(el.naturalWidth, el.naturalHeight));
      dispatch({
        type: 'ADD_IMAGE_PROP',
        image: el,
        width: el.naturalWidth * scaleDown,
        height: el.naturalHeight * scaleDown,
        x: state.camera.x,
        y: state.camera.y,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div className="toolbar">
      <div className="brand">🩸 HORROR STUDIO</div>

      <div className="toolbar-group">
        <span className="group-label">Add Character</span>
        {RIG_TYPE_LIST.map((type) => (
          <button key={type} className="btn-rig" style={{ borderColor: RIG_TYPES[type].glow }} onClick={() => dispatch({ type: 'ADD_CHARACTER', rigType: type })}>
            {RIG_TYPES[type].label}
          </button>
        ))}
      </div>

      <div className="toolbar-group">
        <button className="btn-primary" onClick={onOpenBoneEditor}>+ Import &amp; Rig</button>
        <button className="btn-ghost" onClick={() => staticPropInput.current.click()}>+ Upload Static Prop</button>
        <input ref={staticPropInput} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleStaticPropFile} />
      </div>

      <div className="toolbar-group">
        <label className="field inline">
          Scene
          <select value={state.settings.background} onChange={(e) => dispatch({ type: 'SET_SETTINGS', patch: { background: e.target.value } })}>
            <option value="crypt">Crypt</option>
            <option value="fog">Foggy Woods</option>
            <option value="blood">Blood Moon</option>
            <option value="void">Void</option>
          </select>
        </label>
        <button className="btn-primary export-btn" onClick={onOpenExport}>Export</button>
      </div>
    </div>
  );
}
