// "AI Auto-Draw" hook: simulates generating art from a text prompt. Tries a
// free placeholder-image API (Robohash, keyed off the prompt text so the
// same prompt always draws the same monster) and falls back to a locally
// drawn procedural monogram blob if that request fails or times out — this
// app has already run into sandboxed/deployed environments that block
// third-party CDNs entirely (see the self-hosted MediaPipe WASM setup and
// the base64-embedded SFX library), so the feature must degrade gracefully
// rather than leave the user stuck on a spinner.
function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function loadRemoteImage(prompt, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => reject(new Error('AI Generate: request timed out')), timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error('AI Generate: image host unreachable'));
    };
    img.src = `https://robohash.org/${encodeURIComponent(prompt)}.png?set=set2&size=220x220`;
  });
}

function drawLocalPlaceholder(prompt) {
  const canvas = document.createElement('canvas');
  canvas.width = 220;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');
  const hue = ((hashString(prompt) % 360) + 360) % 360;
  const grad = ctx.createRadialGradient(110, 110, 10, 110, 110, 100);
  grad.addColorStop(0, `hsla(${hue}, 70%, 55%, 0.95)`);
  grad.addColorStop(1, `hsla(${hue}, 70%, 18%, 0.95)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(110, 110, 96, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 68px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const initials = (prompt || '?').trim().slice(0, 2).toUpperCase() || '?';
  ctx.fillText(initials, 110, 118);
  return canvas.toDataURL();
}

function loadFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Returns { image, isFallback } — isFallback lets the caller mention that the
// generated art is a local stand-in rather than the real remote placeholder.
export async function generateAiProp(prompt) {
  const safePrompt = (prompt || 'ghost').trim() || 'ghost';
  try {
    const image = await loadRemoteImage(safePrompt);
    return { image, isFallback: false };
  } catch {
    const image = await loadFromDataUrl(drawLocalPlaceholder(safePrompt));
    return { image, isFallback: true };
  }
}
