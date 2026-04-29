// ============================================================
// camera.js  —  First-person camera, keyboard & mouse input
// Maze Escape 3D  |  CS 4053
// Primary author: Reese
// ============================================================

const MOVE_SPEED  = 3.5;  // units per second
const LOOK_SENS   = 0.002; // radians per pixel
const MAX_PITCH   = Math.PI / 2 - 0.05;

class Camera {
  constructor(startX, startY, startZ) {
    // Position
    this.x = startX;
    this.y = startY;
    this.z = startZ;

    // Euler angles (yaw = horizontal, pitch = vertical)
    this.yaw   = 0;   // radians — faces +X initially
    this.pitch = 0;

    // Input state
    this.keys = {
      w: false, a: false, s: false, d: false,
      ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false
    };

    this._bindEvents();
  }

  // ---- Input binding ----------------------------------------

  _bindEvents() {
    document.addEventListener('keydown', e => this._onKey(e.key, true));
    document.addEventListener('keyup',   e => this._onKey(e.key, false));
    document.addEventListener('mousemove', e => this._onMouseMove(e));
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = !!document.pointerLockElement;
    });
  }

  _onKey(key, down) {
    const k = key.toLowerCase();
    if (k in this.keys)         this.keys[k] = down;
    if (key in this.keys)       this.keys[key] = down;  // Arrow keys
  }

  requestPointerLock() {
    const canvas = document.getElementById('glCanvas');
    canvas.requestPointerLock();
  }

  _onMouseMove(e) {
    if (!this.pointerLocked) return;
    this.yaw   += e.movementX * LOOK_SENS;
    this.pitch -= e.movementY * LOOK_SENS;
    this.pitch  = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch));
  }

  // ---- Update -----------------------------------------------

  // Returns { dx, dz } — the attempted movement this frame (before collision)
  getMovementDelta(dt) {
    // Forward direction (ignore pitch for movement — stay on ground)
    const fwd = [Math.sin(this.yaw), 0, Math.cos(this.yaw)];
    const right = [fwd[2], 0, -fwd[0]];

    let dx = 0, dz = 0;

    if (this.keys.w || this.keys.arrowup)    { dx += fwd[0]; dz += fwd[2]; }
    if (this.keys.s || this.keys.arrowdown)  { dx -= fwd[0]; dz -= fwd[2]; }
    if (this.keys.a || this.keys.arrowleft)  { dx -= right[0]; dz -= right[2]; }
    if (this.keys.d || this.keys.arrowright) { dx += right[0]; dz += right[2]; }

    // Normalize diagonal movement
    const len = Math.sqrt(dx*dx + dz*dz);
    if (len > 0) { dx /= len; dz /= len; }

    return { dx: dx * MOVE_SPEED * dt, dz: dz * MOVE_SPEED * dt };
  }

  // Apply validated movement (after collision check)
  move(dx, dz) {
    this.x += dx;
    this.z += dz;
  }

  // ---- View matrix ------------------------------------------

  getViewMatrix() {
    // Direction vector from yaw/pitch
    const dirX = Math.sin(this.yaw) * Math.cos(this.pitch);
    const dirY = Math.sin(this.pitch);
    const dirZ = Math.cos(this.yaw) * Math.cos(this.pitch);

    // Target point
    const tx = this.x + dirX;
    const ty = this.y + dirY;
    const tz = this.z + dirZ;

    return this._lookAt(
      [this.x, this.y, this.z],
      [tx, ty, tz],
      [0, 1, 0]
    );
  }

  _lookAt(eye, center, up) {
    const f = Vec3.normalize(Vec3.sub(center, eye));
    const r = Vec3.normalize(Vec3.cross(f, up));
    const u = Vec3.cross(r, f);

    return new Float32Array([
      r[0],  u[0],  -f[0], 0,
      r[1],  u[1],  -f[1], 0,
      r[2],  u[2],  -f[2], 0,
      -Vec3.dot(r, eye), -Vec3.dot(u, eye), Vec3.dot(f, eye), 1
    ]);
  }

  get position() {
    return [this.x, this.y, this.z];
  }
}