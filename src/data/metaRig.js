// Pre-built humanoid Meta-Rig template for the Bone Editor — mirrors Blender's
// "metarig" workflow: instead of clicking to drop pins one at a time, a full
// skeleton (with fixed hierarchy) is overlaid on the uploaded image and the
// user just drags each node onto the matching anatomy. Ids intentionally
// match the built-in rig's joint names (see data/rigTypes.js) so custom and
// built-in characters share one attach/sever/timeline vocabulary.
//
// norm: {x,y} in 0..1 image-space, used to seed default node placement.
export const META_RIG_TEMPLATE = [
  { id: 'hips', label: 'Hips', parentId: null, shape: 'circle', norm: { x: 0.5, y: 0.56 } },
  { id: 'chest', label: 'Torso', parentId: 'hips', shape: 'circle', norm: { x: 0.5, y: 0.36 } },
  { id: 'neck', label: 'Neck', parentId: 'chest', shape: 'circle', norm: { x: 0.5, y: 0.27 } },
  { id: 'head', label: 'Head', parentId: 'neck', shape: 'triangle', norm: { x: 0.5, y: 0.14 } },
  { id: 'leftEye', label: 'Left Eye', parentId: 'head', shape: 'dot', facial: true, norm: { x: 0.46, y: 0.12 } },
  { id: 'rightEye', label: 'Right Eye', parentId: 'head', shape: 'dot', facial: true, norm: { x: 0.54, y: 0.12 } },
  { id: 'mouth', label: 'Mouth', parentId: 'head', shape: 'dot', facial: true, norm: { x: 0.5, y: 0.18 } },
  { id: 'lShoulder', label: 'L Shoulder', parentId: 'chest', shape: 'circle', norm: { x: 0.38, y: 0.33 } },
  { id: 'lElbow', label: 'L Elbow', parentId: 'lShoulder', shape: 'circle', norm: { x: 0.29, y: 0.47 } },
  { id: 'lHand', label: 'L Hand', parentId: 'lElbow', shape: 'circle', norm: { x: 0.25, y: 0.6 } },
  { id: 'rShoulder', label: 'R Shoulder', parentId: 'chest', shape: 'circle', norm: { x: 0.62, y: 0.33 } },
  { id: 'rElbow', label: 'R Elbow', parentId: 'rShoulder', shape: 'circle', norm: { x: 0.71, y: 0.47 } },
  { id: 'rHand', label: 'R Hand', parentId: 'rElbow', shape: 'circle', norm: { x: 0.75, y: 0.6 } },
  { id: 'lHip', label: 'L Hip', parentId: 'hips', shape: 'circle', norm: { x: 0.44, y: 0.57 } },
  { id: 'lKnee', label: 'L Knee', parentId: 'lHip', shape: 'circle', norm: { x: 0.43, y: 0.76 } },
  { id: 'lFoot', label: 'L Foot', parentId: 'lKnee', shape: 'circle', norm: { x: 0.43, y: 0.93 } },
  { id: 'rHip', label: 'R Hip', parentId: 'hips', shape: 'circle', norm: { x: 0.56, y: 0.57 } },
  { id: 'rKnee', label: 'R Knee', parentId: 'rHip', shape: 'circle', norm: { x: 0.57, y: 0.76 } },
  { id: 'rFoot', label: 'R Foot', parentId: 'rKnee', shape: 'circle', norm: { x: 0.57, y: 0.93 } },
];

export function instantiateMetaRig(imageWidth, imageHeight) {
  return META_RIG_TEMPLATE.map((j) => ({
    id: j.id,
    label: j.label,
    parentId: j.parentId,
    shape: j.shape,
    facial: !!j.facial,
    x: j.norm.x * imageWidth,
    y: j.norm.y * imageHeight,
  }));
}
