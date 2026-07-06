// Rigid "cutout puppet" rendering for the Custom Rig Builder.
//
// A user uploads a flat image; we build a triangulated grid over it, then
// assign each QUAD (both its triangles together) to whichever single bone
// (Meta-Rig segment) it sits closest to in bind pose. At render time, every
// triangle is transformed by ONLY its owning bone's rigid rotation+
// translation (never blended with any other bone) and drawn with an affine
// image transform.
//
// This intentionally replaces an earlier linear-blend-skinning version: any
// blend across multiple bones interpolates position linearly while bones
// rotate, which stretches/tears the texture like a rubber band once a limb
// rotates far from its bind pose. A pure per-quad rigid transform can never
// stretch or shear the source pixels — each quad is always drawn at exactly
// its original size and shape, just rotated and moved, like a paper cutout.
//
// Two things kept the very first version of this looking like "shattered
// glass" instead of a clean cutout: (1) assigning bone ownership per
// TRIANGLE let the two triangles making up one quad split independently,
// tearing the interior of an otherwise-solid limb; fixed by assigning per
// quad. (2) for images with a transparent background, empty space still
// got carried along with whichever limb it was nearest to, scattering
// background fragments everywhere; fixed by computeTriangleVisibility()
// culling triangles that sit over fully-transparent pixels. What remains
// (and is inherent to this style, not a bug) is a visible seam at a joint
// once it bends a lot — the joint's own marker sits right on top of that
// seam, which is also how real paper-puppet rigs hide it.

function det3(m) {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

function solve3x3(M, rhs) {
  const D = det3(M);
  if (Math.abs(D) < 1e-12) return [1, 0, 0];
  const Mx = [
    [rhs[0], M[0][1], M[0][2]],
    [rhs[1], M[1][1], M[1][2]],
    [rhs[2], M[2][1], M[2][2]],
  ];
  const My = [
    [M[0][0], rhs[0], M[0][2]],
    [M[1][0], rhs[1], M[1][2]],
    [M[2][0], rhs[2], M[2][2]],
  ];
  const Mz = [
    [M[0][0], M[0][1], rhs[0]],
    [M[1][0], M[1][1], rhs[1]],
    [M[2][0], M[2][1], rhs[2]],
  ];
  return [det3(Mx) / D, det3(My) / D, det3(Mz) / D];
}

// Solve the affine map (a,b,c,d,e,f) taking src[i] -> dst[i] for 3 points.
function affineFrom3Points(src, dst) {
  const M = [
    [src[0].x, src[0].y, 1],
    [src[1].x, src[1].y, 1],
    [src[2].x, src[2].y, 1],
  ];
  const [a, c, e] = solve3x3(M, [dst[0].x, dst[1].x, dst[2].x]);
  const [b, d, f] = solve3x3(M, [dst[0].y, dst[1].y, dst[2].y]);
  return { a, b, c, d, e, f };
}

export function buildGrid(width, height, cols = 16, rows = 20) {
  const vertices = [];
  for (let r = 0; r <= rows; r += 1) {
    for (let c = 0; c <= cols; c += 1) {
      vertices.push({ x: (c / cols) * width, y: (r / rows) * height });
    }
  }
  const triangles = [];
  const stride = cols + 1;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const tl = r * stride + c;
      const tr = tl + 1;
      const bl = tl + stride;
      const br = bl + 1;
      triangles.push([tl, tr, br]);
      triangles.push([tl, br, bl]);
    }
  }
  return { vertices, triangles, width, height };
}

function pointToSegmentDistance(p, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abLenSq = abx * abx + aby * aby;
  let t = abLenSq > 1e-9 ? ((p.x - a.x) * abx + (p.y - a.y) * aby) / abLenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * abx;
  const cy = a.y + t * aby;
  return Math.hypot(p.x - cx, p.y - cy);
}

function closestBoneId(point, joints, byId) {
  let bestId = joints[0]?.id ?? null;
  let bestDist = Infinity;
  for (const j of joints) {
    const parent = j.parentId ? byId.get(j.parentId) : j;
    const d = pointToSegmentDistance(point, parent, j);
    if (d < bestDist) {
      bestDist = d;
      bestId = j.id;
    }
  }
  return bestId;
}

// joints: [{ id, x, y, parentId }] bind (image-space) positions. Assigns
// each QUAD (both of its triangles together, by buildGrid's [tl,tr,br] /
// [tl,br,bl] pairing) to the single bone whose segment its center sits
// closest to. Assigning per-quad rather than per-triangle matters: two
// triangles sharing a quad but picking different owners independently would
// tear apart even in the interior of an otherwise-unbroken limb, which is
// what produced the "shattered glass" look.
export function assignTriangleBones(mesh, joints) {
  const byId = new Map(joints.map((j) => [j.id, j]));
  const owners = new Array(mesh.triangles.length);
  for (let t = 0; t < mesh.triangles.length; t += 2) {
    const [tl, tr, br] = mesh.triangles[t];
    const bl = mesh.triangles[t + 1]?.[2] ?? br;
    const v = [tl, tr, br, bl].map((i) => mesh.vertices[i]);
    const center = {
      x: (v[0].x + v[1].x + v[2].x + v[3].x) / 4,
      y: (v[0].y + v[1].y + v[2].y + v[3].y) / 4,
    };
    const ownerId = closestBoneId(center, joints, byId);
    owners[t] = ownerId;
    if (t + 1 < owners.length) owners[t + 1] = ownerId;
  }
  return owners;
}

// Marks triangles as hidden if the source image is fully (or almost fully)
// transparent under them, so background/empty regions of a cutout PNG don't
// get carried along with whichever limb happens to be nearest — the other
// major contributor to a "shattered" look when the uploaded art has a
// transparent background but the mesh still covers its full bounding box.
// Returns null (meaning "draw everything") if the image has no meaningful
// transparency at all — e.g. a plain photo/JPEG — since culling would just
// hide most of the puppet's actual content in that case.
function readAlphaChannel(image, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);
  try {
    return ctx.getImageData(0, 0, width, height).data;
  } catch {
    return null; // tainted canvas (cross-origin image) — can't inspect alpha
  }
}

// Quick check used right after upload to warn the user: does this image
// actually have a transparent background? Alpha-based culling (below) only
// helps cutout-style art — a plain photo/JPEG has no transparency to exploit
// and will show background pixels moving with whichever limb is nearest.
export function hasTransparentBackground(image, width, height, sampleSize = 120) {
  const scale = Math.min(1, sampleSize / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const data = readAlphaChannel(image, w, h);
  if (!data) return null;
  let transparentCount = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 16) transparentCount += 1;
  }
  return transparentCount / (w * h) >= 0.02;
}

// Marks triangles as hidden if the source image is fully (or almost fully)
// transparent under them, so background/empty regions of a cutout PNG don't
// get carried along with whichever limb happens to be nearest — the other
// major contributor to a "shattered" look when the uploaded art has a
// transparent background but the mesh still covers its full bounding box.
// Returns null (meaning "draw everything") if the image has no meaningful
// transparency at all — e.g. a plain photo/JPEG — since culling would just
// hide most of the puppet's actual content in that case.
export function computeTriangleVisibility(image, mesh) {
  const data = readAlphaChannel(image, mesh.width, mesh.height);
  if (!data) return null;
  if (hasTransparentBackground(image, mesh.width, mesh.height) !== true) return null;

  function alphaAt(x, y) {
    const xi = Math.max(0, Math.min(mesh.width - 1, Math.round(x)));
    const yi = Math.max(0, Math.min(mesh.height - 1, Math.round(y)));
    return data[(yi * mesh.width + xi) * 4 + 3];
  }
  return mesh.triangles.map(([i0, i1, i2]) => {
    const v0 = mesh.vertices[i0];
    const v1 = mesh.vertices[i1];
    const v2 = mesh.vertices[i2];
    const a = (alphaAt(v0.x, v0.y) + alphaAt(v1.x, v1.y) + alphaAt(v2.x, v2.y)) / 3;
    return a >= 16;
  });
}

// Rigidly transforms and draws each triangle by its assigned bone only (no
// blending), so the source image is rotated/translated but never stretched.
// bindPositions: { id: {x,y} }, jointsNow: { id: {x,y,worldAngle} } (Map or
// plain object both work since we only ever read by key), bindWorldAngle:
// { id: worldAngle }.
export function drawRigidCutoutMesh(ctx, image, mesh, triangleBones, bindPositions, jointsNow, bindWorldAngle, triangleVisible) {
  const now = jointsNow instanceof Map ? (id) => jointsNow.get(id) : (id) => jointsNow[id];
  for (let t = 0; t < mesh.triangles.length; t += 1) {
    if (triangleVisible && !triangleVisible[t]) continue;
    const ownerId = triangleBones[t];
    const bindOwner = bindPositions[ownerId];
    const nowOwner = now(ownerId);
    if (!bindOwner || !nowOwner) continue;
    const dTheta = nowOwner.worldAngle - bindWorldAngle[ownerId];
    const cos = Math.cos(dTheta);
    const sin = Math.sin(dTheta);
    const [i0, i1, i2] = mesh.triangles[t];
    const src = [mesh.vertices[i0], mesh.vertices[i1], mesh.vertices[i2]];
    const dst = src.map((v) => {
      const dx = v.x - bindOwner.x;
      const dy = v.y - bindOwner.y;
      return {
        x: nowOwner.x + (dx * cos - dy * sin),
        y: nowOwner.y + (dx * sin + dy * cos),
      };
    });
    const { a, b, c, d, e, f } = affineFrom3Points(src, dst);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(dst[0].x, dst[0].y);
    ctx.lineTo(dst[1].x, dst[1].y);
    ctx.lineTo(dst[2].x, dst[2].y);
    ctx.closePath();
    ctx.clip();
    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(image, 0, 0, mesh.width, mesh.height);
    ctx.restore();
  }
}
