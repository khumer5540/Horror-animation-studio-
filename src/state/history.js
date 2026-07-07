// Wraps a plain reducer with an undo/redo history stack.
//
// Most actions push the pre-action state onto the undo stack automatically.
// Continuous drag actions (posing a joint, moving/rotating/scaling a prop,
// panning/zooming the camera, scrubbing the playhead, per-frame playback
// ticks) are "transient" — applied without pushing a new history entry,
// since dispatching one per pointermove or animation frame would flood the
// stack until Undo only ever reverted a single pixel of motion. Interactive
// drags instead dispatch BEGIN_INTERACTION once at drag-start to snapshot
// the pre-drag state, so a single Undo reverts the whole gesture.
const TRANSIENT_ACTIONS = new Set([
  'SELECT',
  'SET_CAMERA',
  'SET_PLAYHEAD',
  'SET_PLAYING',
  'APPLY_POSE_AT_TIME',
  'UPDATE_CHARACTER_POSE',
  'UPDATE_PROP',
]);

const HISTORY_LIMIT = 50;

export function createInitialHistory(initialPresent) {
  return { past: [], present: initialPresent, future: [] };
}

export function historyReducer(innerReducer) {
  return function reducer(history, action) {
    if (action.type === 'UNDO') {
      if (history.past.length === 0) return history;
      const previous = history.past[history.past.length - 1];
      return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] };
    }
    if (action.type === 'REDO') {
      if (history.future.length === 0) return history;
      const next = history.future[0];
      return { past: [...history.past, history.present], present: next, future: history.future.slice(1) };
    }
    if (action.type === 'BEGIN_INTERACTION') {
      return { past: [...history.past, history.present].slice(-HISTORY_LIMIT), present: history.present, future: [] };
    }
    const nextPresent = innerReducer(history.present, action);
    if (nextPresent === history.present) return history;
    if (TRANSIENT_ACTIONS.has(action.type)) {
      return { ...history, present: nextPresent };
    }
    return { past: [...history.past, history.present].slice(-HISTORY_LIMIT), present: nextPresent, future: [] };
  };
}
