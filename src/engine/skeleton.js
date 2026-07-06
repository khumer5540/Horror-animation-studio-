// Generic forward-kinematics skeleton solver, shared by the built-in horror
// rigs and by user-built Custom Rigs (Bone Editor). A skeleton is just a
// flat list of bone definitions, each pointing at a parent by id.
//
// def: { id, parentId (null = root), length, defaultLocalAngle }
// angles: { [boneId]: localAngleOverride } (radians, relative to parent's world angle)
// severed: { [boneId]: { x, y } } — bones cut loose from their parent (the
// "Sever/Detach" mechanic). A severed bone becomes its own free-floating
// root at the given world position; its `angles` entry (if any) is read as
// an ABSOLUTE world angle instead of parent-relative. Everything still
// attached downstream of it (its children) keeps following it normally.

export const UP = -Math.PI / 2;
export const DOWN = Math.PI / 2;
export const LEFT = Math.PI;
export const RIGHT = 0;

export function computeFK(defs, angles, rootPos, rootAngle = UP, severed = {}) {
  const byId = new Map(defs.map((d) => [d.id, d]));
  const world = new Map();

  function solve(def) {
    if (world.has(def.id)) return world.get(def.id);
    const sev = severed[def.id];
    if (sev) {
      const worldAngle = angles[def.id] ?? 0;
      const result = { x: sev.x, y: sev.y, worldAngle };
      world.set(def.id, result);
      return result;
    }
    const localAngle = angles[def.id] ?? def.defaultLocalAngle ?? 0;
    if (!def.parentId) {
      const result = { x: rootPos.x, y: rootPos.y, worldAngle: rootAngle + localAngle };
      world.set(def.id, result);
      return result;
    }
    const parentDef = byId.get(def.parentId);
    const parent = solve(parentDef);
    const wa = parent.worldAngle + localAngle;
    const x = parent.x + Math.cos(wa) * def.length;
    const y = parent.y + Math.sin(wa) * def.length;
    const result = { x, y, worldAngle: wa };
    world.set(def.id, result);
    return result;
  }

  defs.forEach(solve);
  return world;
}

// Given a target world point for a bone's tip, solve the local angle needed
// so that bone points at that target (standard FK joint-drag interaction).
export function solveLocalAngleForTarget(parentWorld, targetPoint) {
  const worldAngle = Math.atan2(targetPoint.y - parentWorld.y, targetPoint.x - parentWorld.x);
  return worldAngle - parentWorld.worldAngle;
}

export function angleLerp(a, b, t) {
  // shortest-path angle interpolation
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
