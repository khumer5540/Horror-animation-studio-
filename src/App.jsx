import { useReducer, useState } from 'react';
import { projectReducer, createInitialProject } from './state/project.js';
import Toolbar from './components/Toolbar.jsx';
import Stage from './components/Stage.jsx';
import PropsPanel from './components/PropsPanel.jsx';
import PosePanel from './components/PosePanel.jsx';
import Timeline from './components/Timeline.jsx';
import BoneEditorModal from './components/BoneEditorModal.jsx';
import ExportModal from './components/ExportModal.jsx';

export default function App() {
  const [state, dispatch] = useReducer(projectReducer, undefined, createInitialProject);
  const [showBoneEditor, setShowBoneEditor] = useState(false);
  const [showExport, setShowExport] = useState(false);

  function handleSaveRig(rig) {
    dispatch({ type: 'SAVE_CUSTOM_RIG', rig });
    dispatch({ type: 'ADD_CUSTOM_CHARACTER', customRigId: rig.id, x: state.camera.x, y: state.camera.y });
    setShowBoneEditor(false);
  }

  return (
    <div className="app">
      <Toolbar state={state} dispatch={dispatch} onOpenBoneEditor={() => setShowBoneEditor(true)} onOpenExport={() => setShowExport(true)} />
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
