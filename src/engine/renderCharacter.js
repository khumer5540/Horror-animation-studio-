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
  return computeFK(defs, character.bones || {}, { x: character.x, y: character.y }, rootAngle, character.severed || {});
}

export function getRootJointId(character, customRigs) {
  if (character.kind === 'custom') return customRigs[character.customRigId]?.rootId ?? 'hips';
  return 'hips';
}

// Payload for the "Sever Bone" action: freezes the joint's current world
// position/angle so detaching it doesn't cause a visual jump.
export function computeSeverPayload(character, customRigs, jointId) {
  const world = computeCharacterWorld(character, customRigs);
  const p = world.get(jointId);
  if (!p) return null;
  return { x: p.x, y: p.y, angle: p.worldAngle };
}

// Payload for "Reattach Bone": converts the joint's current (absolute,
// severed) world angle back into a parent-relative local angle so it holds
// its current pose instead of snapping.
export function computeReattachPayload(character, customRigs, jointId) {
  const world = computeCharacterWorld(character, customRigs);
  const defs = getBoneDefs(character, customRigs);
  const parentId = defs.find((d) => d.id === jointId)?.parentId ?? null;
  const p = world.get(jointId);
  if (!p) return null;
  const parent = parentId ? world.get(parentId) : null;
  const angle = parent ? p.worldAngle - parent.worldAngle : p.worldAngle;
  return { angle };
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
  const severed = character.severed || {};
  // Draw a limb segment only if its distal (child) joint hasn't been severed
  // — a severed joint should look detached, not rubber-banded to its parent.
  const seg = (parentId, childId, width, color) => {
    if (severed[childId]) return;
    drawLimb(ctx, j(parentId), j(childId), width, color);
  };

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
    seg('lHip', 'lKnee', style.limbWidth, style.skin);
    seg('lKnee', 'lFoot', style.limbWidth * 0.85, style.skin);
    seg('rHip', 'rKnee', style.limbWidth, style.skin);
    seg('rKnee', 'rFoot', style.limbWidth * 0.85, style.skin);
  }

  seg('hips', 'chest', style.limbWidth * 1.3, style.skin);
  seg('lShoulder', 'lElbow', style.limbWidth, style.skin);
  seg('lElbow', 'lHand', style.limbWidth * 0.85, style.skin);
  seg('rShoulder', 'rElbow', style.limbWidth, style.skin);
  seg('rElbow', 'rHand', style.limbWidth * 0.85, style.skin);
  seg('neck', 'head', style.limbWidth * 0.7, style.skin);

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

// Glowing skeleton overlay for a selected custom rig: bright connecting
// lines (blood red for the head/face cluster, neon green for the body) plus
// shape-distinct joint markers (triangle = head, small dot = facial node,
// circle = regular joint). Severed joints draw with no connecting line to
// their old parent and a gold marker, matching the Bone Editor's language.
export function drawSkeletonOverlay(ctx, character, world, customRigs, zoom) {
  const rig = customRigs[character.customRigId];
  if (!rig) return;
  const severed = character.severed || {};

  ctx.save();
  ctx.lineWidth = 2 / zoom;
  rig.joints.forEach((joint) => {
    if (!joint.parentId || severed[joint.id]) return;
    const a = world.get(joint.parentId);
    const b = world.get(joint.id);
    if (!a || !b) return;
    const color = joint.id === 'head' || joint.facial ? 'rgba(255,46,77,0.9)' : 'rgba(57,255,106,0.9)';
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8 / zoom;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });
  ctx.shadowBlur = 0;

  rig.joints.forEach((joint) => {
    const p = world.get(joint.id);
    if (!p) return;
    const isSevered = !!severed[joint.id];
    const r = (joint.shape === 'dot' ? 3 : joint.shape === 'triangle' ? 6 : 5) / zoom;
    ctx.fillStyle = isSevered ? '#ffd76b' : joint.shape === 'triangle' ? '#ff2e4d' : joint.facial ? '#ff8fa3' : '#39ff6a';
    ctx.beginPath();
    if (joint.shape === 'triangle') {
      ctx.moveTo(p.x, p.y - r * 1.3);
      ctx.lineTo(p.x - r * 1.1, p.y + r * 0.8);
      ctx.lineTo(p.x + r * 1.1, p.y + r * 0.8);
      ctx.closePath();
    } else {
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1 / zoom;
    ctx.stroke();
  });
  ctx.restore();
}
