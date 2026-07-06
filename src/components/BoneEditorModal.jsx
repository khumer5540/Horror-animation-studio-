import { useRef, useState } from 'react';
import { uid } from '../utils/id.js';
import { buildGrid, computeWeights } from '../engine/meshWarp.js';
import { instantiateMetaRig } from '../data/metaRig.js';

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export default function BoneEditorModal({ onClose, onSave }) {
  const [image, setImage] = useState(null); // { el, dataUrl, width, height }
  const [joints, setJoints] = useState([]); // { id, label, x, y, parentId, shape, facial }
  const [displayWidth, setDisplayWidth] = useState(0);
  const [rigName, setRigName] = useState('My Monster');
  const [draggingId, setDraggingId] = useState(null);
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
      setJoints(instantiateMetaRig(el.naturalWidth, el.naturalHeight));
    };
    reader.readAsDataURL(file);
  }

  function resetTemplate() {
    if (!image) return;
    setJoints(instantiateMetaRig(image.width, image.height));
  }

  function startDragNode(jointId) {
    return (e) => {
      e.stopPropagation();
      e.preventDefault();
      // Pointer capture so fast touch drags keep reporting to this node even
      // once the finger moves off it; window listeners still catch the
      // move/up regardless, but capture also stops iOS from treating the
      // gesture as a page scroll mid-drag.
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setDraggingId(jointId);
      // Dragging the root (Hips) translates the whole rig as one rigid unit
      // so the user can center/scale-align the template over their art
      // first, without stretching every bone into a spider-web. Dragging
      // any other node still moves just that node, stretching its bone —
      // that's how individual limbs get snapped onto the anatomy.
      const isRoot = joints.find((j) => j.id === jointId)?.parentId === null;
      function onMove(ev) {
        ev.preventDefault();
        const rect = imgRef.current.getBoundingClientRect();
        const scale = image.width / rect.width;
        const x = clamp((ev.clientX - rect.left) * scale, 0, image.width);
        const y = clamp((ev.clientY - rect.top) * scale, 0, image.height);
        setJoints((js) => {
          if (isRoot) {
            const current = js.find((j) => j.id === jointId);
            const dx = x - current.x;
            const dy = y - current.y;
            return js.map((j) => ({ ...j, x: j.x + dx, y: j.y + dy }));
          }
          return js.map((j) => (j.id === jointId ? { ...j, x, y } : j));
        });
      }
      function onUp() {
        setDraggingId(null);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      }
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    };
  }

  const scale = image ? displayWidth / image.width : 1;

  function canSave() {
    return !!image && joints.length > 0;
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

  const displayHeight = image ? displayWidth * (image.height / image.width) : 0;

  return (
    <div className="modal-backdrop">
      <div className="modal bone-editor">
        <div className="modal-header">
          <h2>Import &amp; Rig — Meta-Rig Bone Editor</h2>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        {!image && (
          <div className="bone-editor-upload">
            <p>Upload any image (a monster, a dog, anything) — a full humanoid skeleton drops onto it automatically. Just drag each node onto the matching anatomy.</p>
            <input type="file" accept="image/*" onChange={handleFile} />
          </div>
        )}

        {image && (
          <div className="bone-editor-body">
            <div className="bone-editor-canvas-wrap">
              <div className="bone-editor-canvas" style={{ width: displayWidth }}>
                <img ref={imgRef} src={image.dataUrl} alt="rig source" style={{ width: displayWidth }} draggable={false} />
                <svg className="bone-overlay bone-overlay-interactive" style={{ width: displayWidth, height: displayHeight }}>
                  <defs>
                    <filter id="boneGlow" x="-60%" y="-60%" width="220%" height="220%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {joints.map((j) => {
                    const parent = joints.find((p) => p.id === j.parentId);
                    if (!parent) return null;
                    const isFaceCluster = j.facial || j.id === 'head';
                    return (
                      <line
                        key={`l-${j.id}`}
                        x1={parent.x * scale}
                        y1={parent.y * scale}
                        x2={j.x * scale}
                        y2={j.y * scale}
                        stroke={isFaceCluster ? '#ff2e4d' : '#39ff6a'}
                        strokeWidth={isFaceCluster ? 1.5 : 2.5}
                        filter="url(#boneGlow)"
                      />
                    );
                  })}
                  {joints.map((j) => {
                    const cx = j.x * scale;
                    const cy = j.y * scale;
                    const isRootNode = j.parentId === null;
                    const fill = isRootNode ? '#ffd76b' : j.shape === 'triangle' ? '#ff2e4d' : j.facial ? '#ff8fa3' : '#39ff6a';
                    const isDragging = draggingId === j.id;
                    const r = isRootNode ? 11 : j.shape === 'dot' ? 5 : j.shape === 'triangle' ? 10 : 8;
                    return (
                      <g
                        key={j.id}
                        className="bone-node"
                        onPointerDown={startDragNode(j.id)}
                        filter={isDragging ? 'url(#boneGlow)' : undefined}
                      >
                        {/* Invisible, generously-sized hit area — the visible
                            markers (esp. facial dots) are too small to
                            reliably grab with a fingertip. */}
                        <circle cx={cx} cy={cy} r={j.facial ? 12 : 16} fill="transparent" />
                        {isRootNode && <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke="#ffd76b" strokeWidth={1.5} strokeDasharray="3,3" />}
                        {j.shape === 'triangle' ? (
                          <polygon
                            points={`${cx},${cy - r * 1.3} ${cx - r * 1.1},${cy + r * 0.8} ${cx + r * 1.1},${cy + r * 0.8}`}
                            fill={fill}
                            stroke="#000"
                            strokeWidth={1.5}
                          />
                        ) : (
                          <circle cx={cx} cy={cy} r={r} fill={fill} stroke="#000" strokeWidth={1.5} />
                        )}
                        <title>{isRootNode ? `${j.label} (drag to move whole rig)` : j.label}</title>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <p className="hint">Drag the gold ringed Hips node first to move the whole rig into place — it translates everything together without stretching. Then drag any other node to snap that limb onto the anatomy. Head = triangle, eyes/mouth = small dots, joints = circles.</p>
              <div className="bone-editor-actions-row">
                <button className="btn-ghost" onClick={resetTemplate}>Reset Template</button>
                <input type="text" value={rigName} onChange={(e) => setRigName(e.target.value)} placeholder="Rig name" />
              </div>
            </div>

            <div className="bone-editor-joint-list">
              <h3>Meta-Rig Nodes ({joints.length})</h3>
              <div className="joint-list-scroll">
                {joints.map((j) => (
                  <div key={j.id} className="joint-row">
                    <span
                      className={`joint-dot shape-${j.shape}`}
                      style={{ background: j.parentId === null ? '#ffd76b' : j.shape === 'triangle' ? '#ff2e4d' : j.facial ? '#ff8fa3' : '#39ff6a' }}
                    />
                    <span className="joint-name">{j.label}{j.parentId === null ? ' (root)' : ''}</span>
                  </div>
                ))}
              </div>
              <p className="hint">Hierarchy is fixed by the template — just drag to align. Once saved, you can right-click any joint on the stage to Sever/Reattach it for decapitation-style effects.</p>
              <button className="btn-primary" disabled={!canSave()} onClick={handleSave}>
                Save Rig &amp; Add to Stage
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
