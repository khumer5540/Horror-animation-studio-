import { computeFK, UP } from './skeleton.js';
import { HUMANOID_BONES, RIG_TYPES } from '../data/rigTypes.js';
import { warpVertices, drawWarpedMesh } from './meshWarp.js';

export function getBoneDefs(character, customRigs) {
  if (character.kind === 'custom') {
    const rig = customRigs[character.customRigId];
    return rig ? rig.boneDefs : [];
  }
  return HUMANOID_BONES;
}

export function computeCharacterWorld(character, customRigs) {
  const defs = getBoneDefs(character, customRigs);
  const rootAngle = character.kind === 'custom' ? 0 : UP;
  return computeFK(defs, character.bones || {}, { x: character.x, y: character.y }, rootAngle);
}

function drawLimb(ctx, a, b, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function drawFace(ctx, head, style) {
  const r = 15;
  ctx.save();
  ctx.translate(head.x, head.y);
  if (style.accessory === 'hat') {
    ctx.fillStyle = '#150a1c';
    ctx.beginPath();
    ctx.moveTo(-16, -6);
    ctx.lineTo(16, -6);
    ctx.lineTo(0, -46);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-20, -8, 40, 6);
  } else if (style.accessory === 'turban') {
    ctx.fillStyle = style.outline;
    ctx.beginPath();
    ctx.ellipse(0, -8, 18, 12, 0, Math.PI, 0);
    ctx.fill();
  }
  if (style.eyeStyle === 'x') {
    ctx.strokeStyle = style.eyeColor;
    ctx.lineWidth = 2;
    [-6, 6].forEach((ex) => {
      ctx.beginPath();
      ctx.moveTo(ex - 3, -3);
      ctx.lineTo(ex + 3, 3);
      ctx.moveTo(ex + 3, -3);
      ctx.lineTo(ex - 3, 3);
      ctx.stroke();
    });
  } else if (style.eyeStyle === 'hollow') {
    ctx.fillStyle = style.eyeColor;
    ctx.beginPath();
    ctx.ellipse(-6, -2, 3.5, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(6, -2, 3.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = style.eyeColor;
    ctx.shadowColor = style.eyeColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(-6, -2, 2.6, 0, Math.PI * 2);
    ctx.arc(6, -2, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.strokeStyle = style.outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 4, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
  return r;
}

function drawRobe(ctx, hips, lFoot, rFoot, color) {
  const hemY = Math.max(lFoot.y, rFoot.y) + 6;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(hips.x - 20, hips.y);
  ctx.quadraticCurveTo(hips.x - 26, (hips.y + hemY) / 2, lFoot.x - 14, hemY);
  ctx.lineTo(lFoot.x - 2, hemY - 10);
  ctx.lineTo(hips.x, hemY - 4);
  ctx.lineTo(rFoot.x + 2, hemY - 10);
  ctx.lineTo(rFoot.x + 14, hemY);
  ctx.quadraticCurveTo(hips.x + 26, (hips.y + hemY) / 2, hips.x + 20, hips.y);
  ctx.closePath();
  ctx.fill();
}

export function drawBuiltInCharacter(ctx, character, world, selected) {
  const style = RIG_TYPES[character.rigType] || RIG_TYPES.ghost;
  const j = (id) => world.get(id);

  if (style.smokeTrail) {
    ctx.strokeStyle = style.robeColor;
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(j('hips').x, j('hips').y);
    ctx.quadraticCurveTo(j('hips').x - 10, j('hips').y + 30, j('hips').x + 6, j('hips').y + 60);
    ctx.stroke();
  } else if (style.robeLegs) {
    drawRobe(ctx, j('hips'), j('lFoot'), j('rFoot'), style.robeColor);
  } else {
    drawLimb(ctx, j('lHip'), j('lKnee'), style.limbWidth, style.skin);
    drawLimb(ctx, j('lKnee'), j('lFoot'), style.limbWidth * 0.85, style.skin);
    drawLimb(ctx, j('rHip'), j('rKnee'), style.limbWidth, style.skin);
    drawLimb(ctx, j('rKnee'), j('rFoot'), style.limbWidth * 0.85, style.skin);
  }

  drawLimb(ctx, j('hips'), j('chest'), style.limbWidth * 1.3, style.skin);
  drawLimb(ctx, j('lShoulder'), j('lElbow'), style.limbWidth, style.skin);
  drawLimb(ctx, j('lElbow'), j('lHand'), style.limbWidth * 0.85, style.skin);
  drawLimb(ctx, j('rShoulder'), j('rElbow'), style.limbWidth, style.skin);
  drawLimb(ctx, j('rElbow'), j('rHand'), style.limbWidth * 0.85, style.skin);
  drawLimb(ctx, j('neck'), j('head'), style.limbWidth * 0.7, style.skin);

  const head = j('head');
  ctx.fillStyle = style.skin;
  ctx.beginPath();
  ctx.arc(head.x, head.y, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = style.outline;
  ctx.lineWidth = 2;
  ctx.stroke();

  if (character.rigType === 'zombie') {
    ctx.strokeStyle = '#1c1c1c';
    ctx.lineWidth = 1.5;
    [j('lElbow'), j('rKnee')].forEach((p) => {
      ctx.beginPath();
      ctx.moveTo(p.x - 6, p.y - 4);
      ctx.lineTo(p.x + 6, p.y + 4);
      ctx.moveTo(p.x - 6, p.y + 4);
      ctx.lineTo(p.x + 6, p.y - 4);
      ctx.stroke();
    });
  }

  drawFace(ctx, head, style);

  if (selected) {
    ctx.strokeStyle = style.glow;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(j('hips').x, j('hips').y, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

export function drawCustomCharacter(ctx, character, world, customRigs) {
  const rig = customRigs[character.customRigId];
  if (!rig || !rig.imageEl) return;
  // Mesh vertices are bound in image-local space; joint world positions
  // (from FK, rooted at character.x/y) are already in canvas world space,
  // so the blended warp output lands directly in world space too.
  const warped = warpVertices(rig.mesh, rig.weights, rig.bindPositions, Object.fromEntries(world), rig.bindWorldAngle);
  drawWarpedMesh(ctx, rig.imageEl, rig.mesh, warped);
}
