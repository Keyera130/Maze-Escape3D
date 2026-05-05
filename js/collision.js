// collision.js — wall collision + crate AABB collision

const PLAYER_RADIUS = 0.3;

function resolveCollision(px, pz, dx, dz) {
  const newX = px + dx;
  const newZ = pz + dz;

  if (_collidesAtPoint(newX, newZ)) {
    if (!_collidesAtPoint(px + dx, pz)) return { dx, dz: 0 };
    if (!_collidesAtPoint(px, pz + dz)) return { dx: 0, dz };
    return { dx: 0, dz: 0 };
  }
  return { dx, dz };
}

function _collidesAtPoint(x, z) {
  const r = PLAYER_RADIUS;
  const pts = [
    [x+r, z  ],[x-r, z  ],[x,   z+r],[x,   z-r],
    [x+r, z+r],[x+r, z-r],[x-r, z+r],[x-r, z-r],
  ];
  for (const [tx,tz] of pts) {
    const {row,col} = Maze.worldToCell(tx,tz);
    if (Maze.isWall(row,col)) return true;
  }
  // Also check crate AABB collision
  if (typeof objects !== 'undefined' && objects.crates) {
    for (const cr of objects.crates) {
      const hs = cr.halfSize;
      if (x > cr.x-hs && x < cr.x+hs &&
          z > cr.z-hs && z < cr.z+hs) return true;
    }
  }
  return false;
}