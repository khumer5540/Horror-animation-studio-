// Mesh-based skinning for the Custom Rig Builder.
//
// A user uploads a flat image and drops "Joint Nodes" onto it. We build a
// regular grid mesh over the image, weight each grid vertex to nearby joints
// (bind-pose inverse-distance weighting — classic linear-blend "puppet"
// skinning), then each frame we recompute the joints' FK positions and warp
// the mesh, drawing it triangle-by-triangle with an affine image transform.
// This gives real per-joint deformation of a single raster image without
// requiring the user to pre-cut layers.

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

export function buildGrid(width, height, cols = 12, rows = 16) {
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

// joints: [{ id, x, y }] in bind (image-space) coordinates
export function computeWeights(mesh, joints, falloff = 2) {
  if (joints.length === 0) return mesh.vertices.map(() => ({}));
  return mesh.vertices.map((v) => {
    const raw = joints.map((j) => {
      const d = Math.hypot(v.x - j.x, v.y - j.y) + 1e-3;
      return 1 / Math.pow(d, falloff);
    });
    const sum = raw.reduce((s, w) => s + w, 0);
    const weights = {};
    joints.forEach((j, i) => {
      weights[j.id] = raw[i] / sum;
    });
    return weights;
  });
}

// jointsBind: { id: {x,y} } bind position (image space)
// jointsNow: { id: {x,y,worldAngle} } current FK position
// jointsBindAngle: { id: worldAngle } bind world angle
export function warpVertices(mesh, weights, jointsBind, jointsNow, jointsBindAngle) {
  const ids = Object.keys(jointsBind);
  return mesh.vertices.map((v, vi) => {
    let x = 0;
    let y = 0;
    const w = weights[vi];
    for (const id of ids) {
      const weight = w[id];
      if (!weight) continue;
      const bind = jointsBind[id];
      const now = jointsNow[id];
      if (!now) continue;
      const dTheta = now.worldAngle - jointsBindAngle[id];
      const dx = v.x - bind.x;
      const dy = v.y - bind.y;
      const cos = Math.cos(dTheta);
      const sin = Math.sin(dTheta);
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;
      x += weight * (now.x + rx);
      y += weight * (now.y + ry);
    }
    return { x, y };
  });
}

// Draw the warped image onto ctx. `image` is a CanvasImageSource sized to
// mesh.width x mesh.height. ctx should already have camera/character
// transform applied; this draws in the character's local space.
export function drawWarpedMesh(ctx, image, mesh, warped) {
  for (const [i0, i1, i2] of mesh.triangles) {
    const src = [mesh.vertices[i0], mesh.vertices[i1], mesh.vertices[i2]];
    const dst = [warped[i0], warped[i1], warped[i2]];
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
