import { useRef, useState, useEffect } from 'react';
import { RIG_TYPE_LIST, RIG_TYPES } from '../data/rigTypes.js';
import { generateAiProp } from '../engine/aiPlaceholder.js';

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export default function Toolbar({ state, dispatch, onOpenBoneEditor, onOpenExport, canUndo, canRedo }) {
  const staticPropInput = useRef(null);
  const backgroundInput = useRef(null);
  const aiRef = useRef(null);
  const [showAiPopover, setShowAiPopover] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStatus, setAiStatus] = useState('idle'); // idle | loading | error

  useEffect(() => {
    if (!showAiPopover) return undefined;
    function onDown(e) {
      if (aiRef.current && !aiRef.current.contains(e.target)) setShowAiPopover(false);
    }
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [showAiPopover]);

  async function handleAiGenerate() {
    setAiStatus('loading');
    try {
      const { image } = await generateAiProp(aiPrompt);
      const maxDim = 180;
      const scaleDown = Math.min(1, maxDim / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
      dispatch({
        type: 'ADD_IMAGE_PROP',
        image,
        width: (image.naturalWidth || image.width) * scaleDown,
        height: (image.naturalHeight || image.height) * scaleDown,
        x: state.camera.x,
        y: state.camera.y,
      });
      setAiStatus('idle');
      setShowAiPopover(false);
      setAiPrompt('');
    } catch {
      setAiStatus('error');
    }
  }

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

  async function handleBackgroundFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const el = await loadImage(reader.result);
      dispatch({ type: 'SET_BACKGROUND_IMAGE', image: el });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div className="toolbar">
      <div className="brand">🩸 HORROR STUDIO</div>

      <div className="toolbar-group">
        <button className="btn-icon" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => dispatch({ type: 'UNDO' })}>↩️</button>
        <button className="btn-icon" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={() => dispatch({ type: 'REDO' })}>↪️</button>
      </div>

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

        <div className="ai-generate-wrap" ref={aiRef}>
          <button className="btn-ghost" onClick={() => setShowAiPopover((v) => !v)}>✨ AI Generate</button>
          {showAiPopover && (
            <div className="ai-generate-popover">
              <h4>AI Auto-Draw</h4>
              <input
                type="text"
                placeholder="e.g. floating skull"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
              />
              <button className="btn-primary small" disabled={aiStatus === 'loading'} onClick={handleAiGenerate}>
                {aiStatus === 'loading' ? 'Generating…' : 'Generate'}
              </button>
              {aiStatus === 'error' && <p className="hint">Couldn't generate art — try again.</p>}
              <p className="hint">Drops a riggable prop onto the stage from your prompt.</p>
            </div>
          )}
        </div>
      </div>

      <div className="toolbar-group">
        <label className="field inline">
          Scene
          <select
            value={state.settings.background}
            disabled={!!state.settings.backgroundImage}
            onChange={(e) => dispatch({ type: 'SET_SETTINGS', patch: { background: e.target.value } })}
          >
            <option value="crypt">Crypt</option>
            <option value="fog">Foggy Woods</option>
            <option value="blood">Blood Moon</option>
            <option value="void">Void</option>
          </select>
        </label>
        <button className="btn-ghost" onClick={() => backgroundInput.current.click()}>+ Upload Background</button>
        {state.settings.backgroundImage && (
          <button className="btn-ghost small" onClick={() => dispatch({ type: 'SET_BACKGROUND_IMAGE', image: null })}>✕ Clear</button>
        )}
        <input ref={backgroundInput} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleBackgroundFile} />
        <button className="btn-primary export-btn" onClick={onOpenExport}>Export</button>
      </div>
    </div>
  );
}
