// ============================================================
// collision.js  —  Wall collision detection
// Maze Escape 3D  |  CS 4053
// Primary author: Reese
// ============================================================

const PLAYER_RADIUS = 0.3; // collision circle radius (world units)

// ---- Collision resolution ----------------------------------
// Given the player's current position and desired movement (dx, dz),
// returns the safe { dx, dz } after wall checks.

function resolveCollision(px, pz, dx, dz) {
  // Try full movement
  let newX = px + dx;
  let newZ = pz + dz;

  // Check proposed position — if it collides, try axis-separated movement
  if (_collidesAtPoint(newX, newZ)) {
    // Try X only
    if (!_collidesAtPoint(px + dx, pz)) {
      return { dx, dz: 0 };
    }
    // Try Z only
    if (!_collidesAtPoint(px, pz + dz)) {
      return { dx: 0, dz };
    }
    // Fully blocked
    return { dx: 0, dz: 0 };
  }

  return { dx, dz };
}

// Test if a circle of PLAYER_RADIUS at (x, z) overlaps any wall cell
function _collidesAtPoint(x, z) {
  // Check the 4 "corners" of the player's bounding circle
  const r = PLAYER_RADIUS;
  const testPoints = [
    [x + r, z    ],
    [x - r, z    ],
    [x,     z + r],
    [x,     z - r],
    [x + r, z + r],
    [x + r, z - r],
    [x - r, z + r],
    [x - r, z - r],
  ];

  for (const [tx, tz] of testPoints) {
    const { row, col } = Maze.worldToCell(tx, tz);
    if (Maze.isWall(row, col)) return true;
  }
  return false;
}