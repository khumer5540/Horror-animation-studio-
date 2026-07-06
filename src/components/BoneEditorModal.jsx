import { useRef, useState } from 'react';
import { uid } from '../utils/id.js';
import { buildGrid, computeWeights } from '../engine/meshWarp.js';

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export default function BoneEditorModal({ onClose, onSave }) {
  const [image, setImage] = useState(null); // { el, dataUrl, width, height }
  const [joints, setJoints] = useState([]); // { id, name, x, y, parentId }
  const [displayWidth, setDisplayWidth] = useState(0);
  const [rigName, setRigName] = useState('My Monster');
  const imgRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      const el = await loadImage(dataUrl);
      const maxW = 460;
      const dispW = Math.min(maxW, el.naturalWidth);
      setDisplayWidth(dispW);
      setImage({ el, dataUrl, width: el.naturalWidth, height: el.naturalHeight });
      setJoints([]);
    };
    reader.readAsDataURL(file);
  }

  function handleImageClick(e) {
    if (!image) return;
    const rect = imgRef.current.getBoundingClientRect();
    const scale = image.width / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;
    const parentId = joints.length > 0 ? joints[joints.length - 1].id : null;
    const joint = { id: uid('joint'), name: joints.length === 0 ? 'Root' : `Joint ${joints.length + 1}`, x, y, parentId };
    setJoints((j) => [...j, joint]);
  }

  function updateParent(jointId, parentId) {
    setJoints((js) => js.map((j) => (j.id === jointId ? { ...j, parentId: parentId || null } : j)));
  }

  function removeJoint(jointId) {
    setJoints((js) => {
      const target = js.find((j) => j.id === jointId);
      return js.filter((j) => j.id !== jointId).map((j) => (j.parentId === jointId ? { ...j, parentId: target?.parentId ?? null } : j));
    });
  }

  function undoLast() {
    setJoints((js) => js.slice(0, -1));
  }

  const scale = image ? displayWidth / image.width : 1;

  function canSave() {
    return image && joints.length >= 2 && joints.some((j) => j.parentId === null);
  }

  function handleSave() {
    if (!canSave()) return;
    const rootJoint = joints.find((j) => j.parentId === null);
    const byId = new Map(joints.map((j) => [j.id, j]));
    const bindWorldAngle = {};
    const bindPositions = {};
    const boneDefs = [];

    function resolve(j) {
      if (bindWorldAngle[j.id] !== undefined) return;
      bindPositions[j.id] = { x: j.x, y: j.y };
      if (!j.parentId) {
        bindWorldAngle[j.id] = 0;
        boneDefs.push({ id: j.id, parentId: null, length: 0, defaultLocalAngle: 0 });
        return;
      }
      const parent = byId.get(j.parentId);
      resolve(parent);
      const dx = j.x - parent.x;
      const dy = j.y - parent.y;
      const worldAngle = Math.atan2(dy, dx);
      const length = Math.hypot(dx, dy);
      bindWorldAngle[j.id] = worldAngle;
      boneDefs.push({ id: j.id, parentId: j.parentId, length, defaultLocalAngle: worldAngle - bindWorldAngle[j.parentId] });
    }
    joints.forEach(resolve);

    const cols = 12;
    const rows = Math.max(6, Math.min(20, Math.round((12 * image.height) / image.width)));
    const mesh = buildGrid(image.width, image.height, cols, rows);
    const weights = computeWeights(mesh, joints.map((j) => ({ id: j.id, x: j.x, y: j.y })));

    const rig = {
      id: uid('rig'),
      name: rigName || 'Custom Rig',
      imageEl: image.el,
      width: image.width,
      height: image.height,
      joints,
      boneDefs,
      rootId: rootJoint.id,
      bindPositions,
      bindWorldAngle,
      mesh,
      weights,
    };
    onSave(rig);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal bone-editor">
        <div className="modal-header">
          <h2>Import &amp; Rig — Bone Editor</h2>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        {!image && (
          <div className="bone-editor-upload">
            <p>Upload any image (a monster, a dog, anything) and click to place joint nodes.</p>
            <input type="file" accept="image/*" onChange={handleFile} />
          </div>
        )}

        {image && (
          <div className="bone-editor-body">
            <div className="bone-editor-canvas-wrap">
              <div className="bone-editor-canvas" style={{ width: displayWidth }}>
                <img ref={imgRef} src={image.dataUrl} alt="rig source" style={{ width: displayWidth }} onClick={handleImageClick} draggable={false} />
                <svg className="bone-overlay" style={{ width: displayWidth, height: displayWidth * (image.height / image.width) }}>
                  {joints.map((j) => {
                    const parent = joints.find((p) => p.id === j.parentId);
                    return parent ? (
                      <line key={`l-${j.id}`} x1={parent.x * scale} y1={parent.y * scale} x2={j.x * scale} y2={j.y * scale} stroke="#39ff6a" strokeWidth={2} />
                    ) : null;
                  })}
                  {joints.map((j, i) => (
                    <g key={j.id}>
                      <circle cx={j.x * scale} cy={j.y * scale} r={7} fill={i === 0 ? '#ff2e4d' : '#39ff6a'} stroke="#000" strokeWidth={1.5} />
                      <text x={j.x * scale + 10} y={j.y * scale + 4} fontSize="11" fill="#fff">{j.name}</text>
                    </g>
                  ))}
                </svg>
              </div>
              <p className="hint">Click on the image to drop a joint pin. First pin = root anchor. New pins auto-parent to the previous pin — change that below if needed.</p>
              <div className="bone-editor-actions-row">
                <button className="btn-ghost" onClick={undoLast} disabled={joints.length === 0}>Undo Last Pin</button>
                <input type="text" value={rigName} onChange={(e) => setRigName(e.target.value)} placeholder="Rig name" />
              </div>
            </div>

            <div className="bone-editor-joint-list">
              <h3>Joints ({joints.length})</h3>
              <div className="joint-list-scroll">
                {joints.map((j, i) => (
                  <div key={j.id} className="joint-row">
                    <span className="joint-dot" style={{ background: i === 0 ? '#ff2e4d' : '#39ff6a' }} />
                    <span className="joint-name">{j.name}</span>
                    <select value={j.parentId || ''} onChange={(e) => updateParent(j.id, e.target.value)}>
                      <option value="">root (no parent)</option>
                      {joints.filter((p) => p.id !== j.id).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button className="btn-ghost small" onClick={() => removeJoint(j.id)}>✕</button>
                  </div>
                ))}
                {joints.length === 0 && <p className="hint">No joints yet — click the image.</p>}
              </div>
              <button className="btn-primary" disabled={!canSave()} onClick={handleSave}>
                Save Rig &amp; Add to Stage
              </button>
              {!canSave() && joints.length > 0 && <p className="hint warn">Need at least 2 joints with one root.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
