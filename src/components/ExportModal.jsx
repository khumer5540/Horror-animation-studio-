import { useRef, useState } from 'react';

export default function ExportModal({ state, dispatch, onClose }) {
  const [recording, setRecording] = useState(false);
  const [done, setDone] = useState(null);
  const recorderRef = useRef(null);

  function startExport() {
    const canvas = document.querySelector('.stage-canvas');
    if (!canvas) return;
    dispatch({ type: 'SET_PLAYHEAD', time: 0 });
    dispatch({ type: 'APPLY_POSE_AT_TIME', time: 0 });

    const stream = canvas.captureStream(state.settings.fps);
    let recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    } catch {
      recorder = new MediaRecorder(stream);
    }
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setDone(url);
      setRecording(false);
      dispatch({ type: 'SET_PLAYING', playing: false });
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    setDone(null);
    dispatch({ type: 'SET_PLAYING', playing: true });

    setTimeout(() => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    }, state.settings.duration * 1000 + 150);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal export-modal">
        <div className="modal-header">
          <h2>Export Video</h2>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        <p>Records the stage for {state.settings.duration}s at {state.settings.fps}fps and downloads a WebM file (YouTube accepts WebM directly).</p>
        {!recording && !done && <button className="btn-primary" onClick={startExport}>Start Recording</button>}
        {recording && <p className="recording-indicator">● Recording…</p>}
        {done && (
          <a className="btn-primary" href={done} download="horror-studio-export.webm">
            Download horror-studio-export.webm
          </a>
        )}
      </div>
    </div>
  );
}
