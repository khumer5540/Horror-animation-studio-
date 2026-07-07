import { useReducer, useState, useEffect } from 'react';
import { projectReducer, createInitialProject } from './state/project.js';
import { historyReducer, createInitialHistory } from './state/history.js';
import Toolbar from './components/Toolbar.jsx';
import Stage from './components/Stage.jsx';
import PropsPanel from './components/PropsPanel.jsx';
import PosePanel from './components/PosePanel.jsx';
import Timeline from './components/Timeline.jsx';
import BoneEditorModal from './components/BoneEditorModal.jsx';
import ExportModal from './components/ExportModal.jsx';

const reducer = historyReducer(projectReducer);

export default function App() {
  const [history, dispatch] = useReducer(reducer, undefined, () => createInitialHistory(createInitialProject()));
  const state = history.present;
  const [showBoneEditor, setShowBoneEditor] = useState(false);
  const [showExport, setShowExport] = useState(false);

  function handleSaveRig(rig) {
    dispatch({ type: 'SAVE_CUSTOM_RIG', rig });
    dispatch({ type: 'ADD_CUSTOM_CHARACTER', customRigId: rig.id, x: state.camera.x, y: state.camera.y });
    setShowBoneEditor(false);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <Toolbar
        state={state}
        dispatch={dispatch}
        onOpenBoneEditor={() => setShowBoneEditor(true)}
        onOpenExport={() => setShowExport(true)}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
      />
      <div className="app-body">
        <PropsPanel state={state} dispatch={dispatch} />
        <Stage state={state} dispatch={dispatch} />
        <PosePanel state={state} dispatch={dispatch} />
      </div>
      <Timeline state={state} dispatch={dispatch} />

      {showBoneEditor && <BoneEditorModal onClose={() => setShowBoneEditor(false)} onSave={handleSaveRig} />}
      {showExport && <ExportModal state={state} dispatch={dispatch} onClose={() => setShowExport(false)} />}
    </div>
  );
}
