// Expands an ACTION_PRESETS entry (data/actionPresets.js) into a concrete
// list of absolute-time keyframe payloads for one character, starting at the
// current playhead. Looping presets (walk/run) repeat their cycle until the
// scene ends, drifting the character forward on X by `strideX` per cycle to
// simulate travel; one-shot presets (sit/jumpscare) just play once.
export function generateActionKeyframes(preset, character, startTime, sceneDuration) {
  const baseBones = { ...(character.bones || {}) };
  const baseX = character.x;
  const baseY = character.y;
  const frames = [];
  const pushFrame = (time, xOffset, pose) => {
    if (time > sceneDuration + 1e-6) return;
    frames.push({
      time: Math.min(sceneDuration, Math.round(time * 100) / 100),
      x: baseX + xOffset,
      y: baseY,
      bones: { ...baseBones, ...pose },
    });
  };

  if (preset.loop) {
    let cycleStart = startTime;
    let cycleIndex = 0;
    while (cycleStart < sceneDuration - 1e-6) {
      preset.frames.forEach((f) => {
        const xOffset = preset.strideX ? (cycleIndex + f.t / preset.cycleDuration) * preset.strideX : 0;
        pushFrame(cycleStart + f.t, xOffset, f.pose);
      });
      cycleStart += preset.cycleDuration;
      cycleIndex += 1;
    }
  } else {
    preset.frames.forEach((f) => pushFrame(startTime + f.t, 0, f.pose));
  }
  return frames;
}
